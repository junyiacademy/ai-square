import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';
import { VertexAI, SchemaType } from '@google-cloud/vertexai';

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
  systemInstruction: `You are an AI literacy education expert providing qualitative feedback for Problem-Based Learning scenarios. 
Your role is to analyze learners' performance based on their conversations and provide constructive, encouraging feedback.

Focus on:
1. Identifying strengths and positive behaviors
2. Highlighting areas for improvement with specific suggestions
3. Relating feedback to the scenario's learning objectives
4. Providing actionable next steps

Keep the tone supportive, encouraging, and educational.

You must always respond with a valid JSON object following the exact schema provided.`,
});

export async function POST(request: NextRequest) {
  try {
    const { programId, scenarioId } = await request.json();
    
    if (!programId || !scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Get user info from cookie
    let userEmail: string | undefined;
    try {
      const userCookie = request.cookies.get('user')?.value;
      if (userCookie) {
        const user = JSON.parse(userCookie);
        userEmail = user.email;
      }
    } catch {
      console.log('No user cookie found');
    }
    
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }
    
    // Get completion data
    const completionData = await pblProgramService.getProgramCompletion(
      userEmail,
      scenarioId,
      programId
    );
    
    if (!completionData) {
      return NextResponse.json(
        { success: false, error: 'Completion data not found' },
        { status: 404 }
      );
    }
    
    // Get current language
    const currentLang = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'en';
    
    // Check if feedback already exists for current language
    if (completionData.qualitativeFeedback) {
      // Handle legacy single-language feedback
      if (!completionData.qualitativeFeedback[currentLang] && 
          typeof completionData.qualitativeFeedback === 'object' &&
          completionData.qualitativeFeedback.overallAssessment) {
        // This is old format, check if it matches current language
        const feedbackLang = completionData.feedbackLanguage || 'en';
        if (feedbackLang === currentLang) {
          return NextResponse.json({
            success: true,
            feedback: completionData.qualitativeFeedback,
            cached: true
          });
        }
      } else if (completionData.qualitativeFeedback[currentLang]) {
        // New multi-language format
        return NextResponse.json({
          success: true,
          feedback: completionData.qualitativeFeedback[currentLang],
          cached: true
        });
      }
    }
    
    // Get scenario data - read directly from file system instead of API call
    const fs = await import('fs/promises');
    const path = await import('path');
    // Convert scenario ID from kebab-case to snake_case for filename
    const scenarioFilename = scenarioId.replace(/-/g, '_');
    const scenarioPath = path.join(process.cwd(), 'public', 'pbl_data', `${scenarioFilename}_scenario.yaml`);
    
    let scenarioData: any = {};
    try {
      const yaml = await import('yaml');
      const fileContent = await fs.readFile(scenarioPath, 'utf-8');
      scenarioData = yaml.parse(fileContent);
    } catch (error) {
      console.error('Error reading scenario data:', error);
    }
    
    // Prepare task summaries for AI analysis
    const taskSummaries = completionData.tasks?.map((task: any) => ({
      taskId: task.taskId,
      score: task.evaluation?.score || 0,
      conversations: task.log?.interactions?.filter((i: any) => i.role === 'user')
        .map((i: any) => i.content) || [],
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
${taskSummaries.map((task: any, index: number) => `
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

Provide all feedback in ${currentLang === 'zh' ? 'Traditional Chinese (zh-TW)' : 'English'} language.
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
    const feedbackText = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    let feedback;
    try {
      // Parse the JSON response
      feedback = JSON.parse(feedbackText);
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
          feedback = JSON.parse(repairedJson);
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
        overallAssessment: currentLang === 'zh' 
          ? "已完成效能分析評估" 
          : "Performance analysis completed",
        strengths: [{
          area: currentLang === 'zh' ? "任務完成" : "Task Completion",
          description: currentLang === 'zh' 
            ? "成功完成情境任務" 
            : "Successfully completed the scenario tasks",
          example: currentLang === 'zh'
            ? "積極與 AI 助手互動"
            : "Engaged actively with the AI assistant"
        }],
        areasForImprovement: [{
          area: currentLang === 'zh' ? "進階練習" : "Further Practice",
          description: currentLang === 'zh'
            ? "持續探索 AI 的能力"
            : "Continue exploring AI capabilities",
          suggestion: currentLang === 'zh'
            ? "嘗試更複雜的情境以加深理解"
            : "Try more complex scenarios to deepen understanding"
        }],
        nextSteps: currentLang === 'zh' 
          ? ["回顧情境目標並反思學習成果", "探索更多 AI 素養資源"]
          : ["Review the scenario objectives and reflect on learning", "Explore additional AI literacy resources"],
        encouragement: currentLang === 'zh'
          ? "做得很好！完成了這個情境！繼續探索和學習 AI 吧。"
          : "Great job completing this scenario! Keep exploring and learning about AI."
      };
    }
    
    // Save feedback to completion data with language info
    await pblProgramService.updateProgramCompletionFeedback(
      userEmail,
      scenarioId,
      programId,
      feedback,
      currentLang
    );
    
    return NextResponse.json({
      success: true,
      feedback,
      cached: false
    });
    
  } catch (error) {
    console.error('Error generating feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate feedback' },
      { status: 500 }
    );
  }
}