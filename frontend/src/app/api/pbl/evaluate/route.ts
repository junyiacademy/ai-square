import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import { Task, TaskInteraction } from '@/types/pbl';

export async function POST(request: NextRequest) {
  try {
    // Get user info from cookie (same as other APIs)
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

    const { 
      conversations, 
      task,
      targetDomains,
      focusKSA,
      language = 'en'
    } = await request.json();

    if (!conversations || !task) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: conversations and task are required' },
        { status: 400 }
      );
    }
    
    console.log('Evaluating task:', task.id, 'with', conversations.length, 'conversations');

    // Prepare the evaluation prompt
    const evaluationPrompt = `
You are an AI literacy education expert evaluating a learner's performance on a PBL (Problem-Based Learning) task.

Task Information:
- Title: ${task.title}
- Description: ${task.description}
- Instructions: ${task.instructions?.join(', ')}
- Expected Outcome: ${task.expectedOutcome}
- Target Domains: ${targetDomains?.join(', ') || 'All domains'}
- Focus KSA: ${focusKSA?.join(', ') || 'All KSA'}

User Messages (learner's input only):
${conversations.filter((conv: any) => conv.type === 'user').slice(-10).map((conv: any, index: number) => `${index + 1}. ${conv.content.substring(0, 200)}`).join('\n')}

Evaluation Guidelines:
- No meaningful engagement (only greetings like "hi", "hello"): 10-25 points
- Minimal engagement (basic questions, simple statements): 25-40 points
- Basic engagement (shows interest, asks relevant questions): 40-60 points  
- Good engagement (thoughtful questions, follows up, explores ideas): 60-75 points
- Excellent engagement (deep exploration, insightful questions): 75-90 points
- Outstanding performance (exceptional understanding, creative approaches): 90-100 points

Note: For research/exploration tasks, value the learning process over "completion"

Please evaluate and provide:
1. Overall performance score (0-100): Based on actual effort and task completion

2. Individual KSA scores (0-100 each):
   Consider partial demonstration and learning progress

3. Domain scores (0-100):
   - engaging_with_ai: Quality of AI interaction and questioning
   - creating_with_ai: Creativity in using AI responses
   - managing_with_ai: Organization and planning in approach
   - designing_with_ai: Strategic thinking and problem-solving

4. Rubrics scores (1-4 levels):
   Level 1: Beginning (starting to explore)
   Level 2: Developing (showing progress)
   Level 3: Proficient (meeting expectations)
   Level 4: Advanced (exceeding expectations)

5. Conversation Insights: Quote specific learner messages with feedback
6. Strengths: 1-2 points with KSA codes
7. Areas for improvement: 2 points with KSA codes  
8. Next steps: 2 points with KSA codes

Please respond ONLY with a complete JSON object (no markdown, no extra text):
{
  "score": number (0-100),
  "ksaScores": {
    "knowledge": number (0-100),
    "skills": number (0-100),
    "attitudes": number (0-100)
  },
  "individualKsaScores": {},
  "domainScores": {
    "engaging_with_ai": number (0-100),
    "creating_with_ai": number (0-100),
    "managing_with_ai": number (0-100),
    "designing_with_ai": number (0-100)
  },
  "rubricsScores": {
    "Research Quality": number (1-4),
    "AI Utilization": number (1-4),
    "Content Quality": number (1-4),
    "Learning Progress": number (1-4)
  },
  "conversationInsights": {
    "effectiveExamples": [
      {
        "quote": "exact quote from learner's message",
        "reason": "why this was effective"
      }
    ],
    "improvementAreas": [
      {
        "quote": "exact quote from learner's message",
        "suggestion": "how this could be improved"
      }
    ]
  },
  "strengths": ["strength description (K1.1)", "another strength (S1.1, A1.1)"],
  "improvements": ["area needing improvement (K2.1)", "another improvement (S2.1)"],
  "nextSteps": ["specific action suggestion (K1.1, S1.1)", "another suggestion (S2.3)"]
}

CRITICAL: You are ONLY evaluating the LEARNER'S messages listed above. Do NOT consider or evaluate the AI assistant's responses.

Important evaluation principles:
1. **ONLY evaluate the learner's input messages shown above** - ignore all AI assistant responses completely
2. Consider the **stage type** and **task nature** when evaluating:
   - For research/exploration tasks: Value curiosity, questioning, and discovery process
   - For analysis tasks: Value critical thinking and systematic approach
   - For creation tasks: Value creativity and practical application
   - For practice tasks: Value skill demonstration and improvement
3. **Engagement quality matters more than quantity** - A thoughtful question or insight is valuable
4. Scoring should be based on:
   - Effort and engagement with the learning material
   - Progress toward learning objectives
   - Quality of interaction with AI (asking good questions, iterating on responses)
   - Understanding demonstrated through their responses
`;

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013',
      location: 'us-central1',
    });
    
    // Get the generative model
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
    
    // Call AI for evaluation
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: evaluationPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      }
    });
    
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse JSON from response
    let evaluation;
    try {
      // Try to extract JSON from the response
      // First try to find JSON within code blocks
      let jsonText = text;
      
      // Remove markdown code blocks if present
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
      }
      
      // Try to find a complete JSON object
      const jsonStart = jsonText.indexOf('{');
      if (jsonStart !== -1) {
        // Try to find the matching closing brace
        let braceCount = 0;
        let jsonEnd = -1;
        
        for (let i = jsonStart; i < jsonText.length; i++) {
          if (jsonText[i] === '{') braceCount++;
          else if (jsonText[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }
        
        if (jsonEnd > jsonStart) {
          const jsonString = jsonText.substring(jsonStart, jsonEnd);
          evaluation = JSON.parse(jsonString);
        } else {
          throw new Error('Incomplete JSON in response');
        }
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response:', text);
      
      // Fallback evaluation (conservative scoring)
      evaluation = {
        score: 20,
        ksaScores: {
          knowledge: 20,
          skills: 20,
          attitudes: 20
        },
        individualKsaScores: {},
        domainScores: {
          engaging_with_ai: 20,
          creating_with_ai: 20,
          managing_with_ai: 20,
          designing_with_ai: 20
        },
        rubricsScores: {
          "Research Quality": 1,
          "AI Utilization": 1,
          "Content Quality": 1,
          "Learning Progress": 1
        },
        conversationInsights: {
          effectiveExamples: [],
          improvementAreas: [
            {
              quote: conversations.filter((c: any) => c.type === 'user')[0]?.content || "No message",
              suggestion: "Instead of just greeting, try asking a specific question about the task"
            }
          ]
        },
        strengths: ["Initiated contact with learning system (A1.1)"],
        improvements: ["Need to engage more meaningfully with learning content (K1.1)", "Ask specific questions related to the task (S1.1)"],
        nextSteps: ["Read the task instructions carefully (K1.1)", "Formulate questions about the learning objectives (S1.1, A1.1)"]
      };
    }

    // Add timestamp and metadata
    const evaluationResult = {
      ...evaluation,
      evaluatedAt: new Date().toISOString(),
      taskId: task.id,
      conversationCount: conversations.length
    };

    return NextResponse.json({
      success: true,
      evaluation: evaluationResult
    });

  } catch (error) {
    console.error('Error in evaluation:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to evaluate';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error details:', error.stack);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: statusCode }
    );
  }
}