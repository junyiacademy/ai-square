import { NextRequest, NextResponse } from 'next/server';
import { VertexAI, SchemaType } from '@google-cloud/vertexai';
import { getServerSession } from '@/lib/auth/session';
import { getLanguageFromHeader, LANGUAGE_NAMES } from '@/lib/utils/language';

// Types for feedback structure
interface FeedbackStrength {
  area: string;
  description: string;
  example: string;
}

interface FeedbackImprovement {
  area: string;
  description: string;
  suggestion: string;
}

interface QualitativeFeedback {
  overallAssessment: string;
  strengths: FeedbackStrength[];
  areasForImprovement: FeedbackImprovement[];
  nextSteps: string[];
  encouragement: string;
}

interface CompletionData {
  overallScore: number;
  evaluatedTasks: number;
  totalTasks: number;
  totalTimeSeconds: number;
  domainScores: Record<string, number>;
  tasks?: Array<{
    taskId: string;
    evaluation?: {
      score: number;
      feedback: string;
      strengths: string[];
      improvements: string[];
    };
    log?: {
      interactions?: Array<{
        role: string;
        context: string;
      }>;
    };
  }>;
  qualitativeFeedback?: QualitativeFeedback | Record<string, QualitativeFeedback>;
  feedbackLanguage?: string;
}

interface TaskSummary {
  taskId: string;
  score: number;
  conversations: string[];
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface GenerateFeedbackBody {
  programId: string;
  scenarioId: string;
  forceRegenerate?: boolean;
  language?: string;
}

interface ScenarioYAML {
  title?: string;
  learning_objectives?: string[];
  scenario_info?: {
    title?: string;
    learning_objectives?: string[];
  };
}

// Use language names from the unified utility

// Define the feedback JSON schema
const feedbackSchema = {
  type: SchemaType.OBJECT,
  properties: {
    overallAssessment: {
      type: SchemaType.STRING,
      description: "Brief overall assessment of performance"
    },
    strengths: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          area: {
            type: SchemaType.STRING,
            description: "Specific strength area"
          },
          description: {
            type: SchemaType.STRING,
            description: "Detailed description of what they did well"
          },
          example: {
            type: SchemaType.STRING,
            description: "Specific example from their conversations"
          }
        },
        required: ["area", "description", "example"]
      }
    },
    areasForImprovement: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          area: {
            type: SchemaType.STRING,
            description: "Area needing improvement"
          },
          description: {
            type: SchemaType.STRING,
            description: "What needs work"
          },
          suggestion: {
            type: SchemaType.STRING,
            description: "Specific actionable suggestion"
          }
        },
        required: ["area", "description", "suggestion"]
      }
    },
    nextSteps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
        description: "Specific next step"
      }
    },
    encouragement: {
      type: SchemaType.STRING,
      description: "Personalized encouraging message"
    }
  },
  required: ["overallAssessment", "strengths", "areasForImprovement", "nextSteps", "encouragement"]
};

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013',
  location: 'us-central1',
});

const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: `You are a multilingual AI literacy education expert providing qualitative feedback for Problem-Based Learning scenarios. 
Your role is to analyze learners' performance based on their conversations and provide constructive, encouraging feedback.

Focus on:
1. Identifying strengths and positive behaviors
2. Highlighting areas for improvement with specific suggestions
3. Relating feedback to the scenario's learning objectives
4. Providing actionable next steps

Keep the tone supportive, encouraging, and educational.

CRITICAL: You must ALWAYS respond in the EXACT language specified in the prompt. If Japanese is requested, respond ONLY in Japanese. If French is requested, respond ONLY in French. Never mix languages.

You must always respond with a valid JSON object following the exact schema provided.`,
});

export async function POST(request: NextRequest) {
  try {
    const { programId, scenarioId, forceRegenerate = false, language }: GenerateFeedbackBody = await request.json();
    
    if (!programId || !scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const userEmail = session.user.email;
    
    // Get repositories
    const { createRepositoryFactory } = await import('@/lib/db/repositories/factory');
    const repositoryFactory = createRepositoryFactory();
    const programRepo = repositoryFactory.getProgramRepository();
    const evalRepo = repositoryFactory.getEvaluationRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    
    // Get program and verify ownership
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    if (program.userId !== userEmail) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get or create program evaluation
    let evaluation;
    if (program.evaluationId) {
      evaluation = await evalRepo.findById(program.evaluationId);
    }
    
    if (!evaluation) {
      // Trigger evaluation calculation if needed
      const completeUrl = new URL(`/api/pbl/programs/${programId}/complete`, request.url);
      const completeRes = await fetch(completeUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({})
      });
      
      if (!completeRes.ok) {
        return NextResponse.json(
          { success: false, error: 'Failed to create program evaluation' },
          { status: 500 }
        );
      }
      
      const completeData = await completeRes.json();
      evaluation = completeData.evaluation;
    }
    
    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: 'Evaluation not found' },
        { status: 404 }
      );
    }
    
    // Build completion data from evaluation for backward compatibility
    const tasks = await taskRepo.findByProgram(programId);
    const taskEvaluations = await Promise.all(
      tasks.map(async (task) => {
        if (task.evaluationId) {
          const taskEval = await evalRepo.findById(task.evaluationId);
          return { task, evaluation: taskEval };
        }
        return { task, evaluation: null };
      })
    );
    
    const completionData: CompletionData = {
      overallScore: evaluation.score || 0,
      evaluatedTasks: evaluation.metadata?.evaluatedTasks || 0,
      totalTasks: evaluation.metadata?.totalTasks || tasks.length,
      totalTimeSeconds: evaluation.metadata?.totalTimeSeconds || 0,
      domainScores: evaluation.metadata?.domainScores || {},
      tasks: taskEvaluations.map(({ task, evaluation: taskEval }) => ({
        taskId: task.id,
        evaluation: taskEval ? {
          score: taskEval.score || 0,
          feedback: taskEval.metadata?.feedback || '',
          strengths: taskEval.metadata?.strengths || [],
          improvements: taskEval.metadata?.improvements || []
        } : undefined,
        log: {
          interactions: task.interactions?.map(i => ({
            role: i.type === 'user_input' ? 'user' : 'assistant',
            context: i.context.message || i.content
          })) || []
        }
      })),
      qualitativeFeedback: evaluation.metadata?.qualitativeFeedback,
      feedbackLanguage: evaluation.metadata?.feedbackLanguage
    };
    
    // Get current language - prioritize explicit language parameter
    const currentLang = language || getLanguageFromHeader(request.headers.get('accept-language'));
    
    // If forceRegenerate, mark existing feedback for current language as invalid
    if (forceRegenerate && evaluation.metadata?.qualitativeFeedback?.[currentLang]) {
      // Mark the feedback as invalid to trigger regeneration
      const updatedMetadata = {
        ...evaluation.metadata,
        qualitativeFeedback: {
          ...evaluation.metadata.qualitativeFeedback,
          [currentLang]: {
            ...evaluation.metadata.qualitativeFeedback[currentLang],
            isValid: false
          }
        }
      };
      
      await evalRepo.update(evaluation.id, {
        metadata: updatedMetadata
      });
      
      // Update local evaluation object
      evaluation.metadata = updatedMetadata;
    }
    
    // Check if valid feedback already exists for current language
    const existingFeedback = evaluation.metadata?.qualitativeFeedback?.[currentLang];
    if (!forceRegenerate && existingFeedback?.isValid && existingFeedback?.content) {
      return NextResponse.json({
        success: true,
        feedback: existingFeedback.content,
        cached: true,
        language: currentLang
      });
    }
    
    // Get scenario data from unified architecture
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    let scenarioData: ScenarioYAML = {};
    try {
      const scenario = await scenarioRepo.findById(scenarioId);
      if (scenario) {
        scenarioData = {
          title: scenario.title,
          learning_objectives: scenario.metadata?.learningObjectives as string[] || [],
          scenario_info: {
            title: scenario.title,
            learning_objectives: scenario.metadata?.learningObjectives as string[] || []
          }
        };
      }
    } catch (error) {
      console.error('Error reading scenario data:', error);
    }
    
    // Prepare task summaries for AI analysis
    const taskSummaries: TaskSummary[] = completionData.tasks?.map((task) => ({
      taskId: task.taskId,
      score: task.evaluation?.score || 0,
      conversations: task.log?.interactions?.filter((i) => i.role === 'user')
        .map((i) => i.content) || [],
      feedback: task.evaluation?.feedback || '',
      strengths: task.evaluation?.strengths || [],
      improvements: task.evaluation?.improvements || []
    })) || [];
    
    // Generate prompt
    const prompt = `
Analyze this learner's performance in the "${scenarioData.title}" scenario.

Scenario Objectives:
${scenarioData.learning_objectives?.join('\n') || 'General AI literacy improvement'}

Overall Performance:
- Overall Score: ${completionData.overallScore}%
- Tasks Completed: ${completionData.evaluatedTasks}/${completionData.totalTasks}
- Total Time: ${Math.round((completionData.totalTimeSeconds || 0) / 60)} minutes

Task Performance:
${taskSummaries.map((task, index) => `
Task ${index + 1}: Score ${task.score}%
Key conversations: ${task.conversations.slice(0, 3).join('; ')}
Feedback: ${task.feedback}
`).join('\n')}

Domain Scores:
${Object.entries(completionData.domainScores || {}).map(([domain, score]) => 
  `${domain}: ${score}%`
).join('\n')}

Generate comprehensive qualitative feedback for this learner's performance.

The feedback should:
- Provide an overall assessment that summarizes their performance
- Identify at least 2 specific strengths with concrete examples from their conversations
- Highlight 2-3 areas for improvement with actionable suggestions
- Suggest 2-3 specific next steps for continued learning
- End with a personalized encouraging message

IMPORTANT: You MUST provide ALL feedback in ${LANGUAGE_NAMES[currentLang as keyof typeof LANGUAGE_NAMES] || LANGUAGE_NAMES['en']} language. 
Do not mix languages. The entire response must be in ${LANGUAGE_NAMES[currentLang as keyof typeof LANGUAGE_NAMES] || LANGUAGE_NAMES['en']}.
`;
    
    // Generate feedback with JSON schema
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 65535,  // Increased token limit
        responseMimeType: 'application/json',
        responseSchema: feedbackSchema,
      }
    });
    
    const response = result.response;
    const feedbackText = response.candidates?.[0]?.context?.parts?.[0]?.text || '{}';
    
    let feedback: QualitativeFeedback | undefined;
    try {
      // Parse the JSON response
      feedback = JSON.parse(feedbackText) as QualitativeFeedback;
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Response text:', feedbackText);
      
      // Try to repair truncated JSON
      if (feedbackText.includes('{') && !feedbackText.trim().endsWith('}')) {
        try {
          // Attempt to close unclosed strings and objects
          let repairedJson = feedbackText;
          
          // Count open braces and brackets
          const openBraces = (repairedJson.match(/{/g) || []).length;
          const closeBraces = (repairedJson.match(/}/g) || []).length;
          const openBrackets = (repairedJson.match(/\[/g) || []).length;
          const closeBrackets = (repairedJson.match(/]/g) || []).length;
          
          // Close any unclosed strings (look for last quote)
          const lastQuoteIndex = repairedJson.lastIndexOf('"');
          const secondLastQuoteIndex = repairedJson.lastIndexOf('"', lastQuoteIndex - 1);
          if (lastQuoteIndex > secondLastQuoteIndex && 
              repairedJson.substring(lastQuoteIndex + 1).trim().length > 0) {
            // There's an unclosed string
            repairedJson += '"';
          }
          
          // Close unclosed arrays and objects
          for (let i = 0; i < openBrackets - closeBrackets; i++) {
            repairedJson += ']';
          }
          for (let i = 0; i < openBraces - closeBraces; i++) {
            repairedJson += '}';
          }
          
          console.log('Attempting to parse repaired JSON...');
          feedback = JSON.parse(repairedJson) as QualitativeFeedback;
          console.log('Successfully parsed repaired JSON');
        } catch (repairError) {
          console.error('Failed to repair JSON:', repairError);
          throw parseError;
        }
      } else {
        throw parseError;
      }
    }
    
    // If we still don't have feedback, use fallback
    if (!feedback) {
      // Fallback to a default structured response
      feedback = {
        overallAssessment: currentLang === 'zhTW' 
          ? "已完成效能分析評估" 
          : "Performance analysis completed",
        strengths: [{
          area: currentLang === 'zhTW' ? "任務完成" : "Task Completion",
          description: currentLang === 'zhTW' 
            ? "成功完成情境任務" 
            : "Successfully completed the scenario tasks",
          example: currentLang === 'zhTW'
            ? "積極與 AI 助手互動"
            : "Engaged actively with the AI assistant"
        }],
        areasForImprovement: [{
          area: currentLang === 'zhTW' ? "進階練習" : "Further Practice",
          description: currentLang === 'zhTW'
            ? "持續探索 AI 的能力"
            : "Continue exploring AI capabilities",
          suggestion: currentLang === 'zhTW'
            ? "嘗試更複雜的情境以加深理解"
            : "Try more complex scenarios to deepen understanding"
        }],
        nextSteps: currentLang === 'zhTW' 
          ? ["回顧情境目標並反思學習成果", "探索更多 AI 素養資源"]
          : ["Review the scenario objectives and reflect on learning", "Explore additional AI literacy resources"],
        encouragement: currentLang === 'zhTW'
          ? "做得很好！完成了這個情境！繼續探索和學習 AI 吧。"
          : "Great job completing this scenario! Keep exploring and learning about AI."
      };
    }
    
    // Save feedback to evaluation with language info
    const updatedQualitativeFeedback = {
      ...evaluation.metadata?.qualitativeFeedback,
      [currentLang]: {
        context: feedback,
        generatedAt: new Date().toISOString(),
        isValid: true
      }
    };
    
    await evalRepo.update(evaluation.id, {
      metadata: {
        ...evaluation.metadata,
        qualitativeFeedback: updatedQualitativeFeedback,
        generatedLanguages: [
          ...(evaluation.metadata?.generatedLanguages || []).filter(l => l !== currentLang),
          currentLang
        ]
      }
    });
    
    return NextResponse.json({
      success: true,
      feedback,
      cached: false,
      language: currentLang,
      evaluationId: evaluation.id
    });
    
  } catch (error) {
    console.error('Error generating feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate feedback' },
      { status: 500 }
    );
  }
}