import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Task, TaskInteraction } from '@/types/pbl';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
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
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

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

Conversation Records (last 10 interactions):
${conversations.map((conv: any) => `${conv.type}: ${conv.content}`).join('\n')}

Evaluation Guidelines:
- Minimal engagement (just greetings): 20-40 points
- Basic engagement (asks questions, shows interest): 40-60 points  
- Good engagement (thoughtful questions, follows up): 60-75 points
- Excellent engagement (deep exploration, insights): 75-90 points
- Outstanding performance (exceptional understanding): 90-100 points

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

5. Strengths (at least 1 point, each must include relevant KSA codes, format: "description (K1.1)" or "description (K1.1, S2.1)")
6. Areas for improvement (at least 2 points, each must include relevant KSA codes, same format)
7. Next steps (at least 2 points, each must include relevant KSA codes, same format)

Please respond in JSON format:
{
  "score": number,
  "ksaScores": {
    "knowledge": number (0-100),
    "skills": number (0-100),
    "attitudes": number (0-100)
  },
  "individualKsaScores": {
    "K1.1": number (0-100),
    ...
  },
  "domainScores": {
    "engaging_with_ai": number (0-100),
    "creating_with_ai": number (0-100),
    "managing_with_ai": number (0-100),
    "designing_with_ai": number (0-100)
  },
  "rubricsScores": {
    "Research Quality": level (1-4),
    "AI Utilization": level (1-4),
    "Content Quality": level (1-4),
    "Learning Progress": level (1-4)
  },
  "strengths": ["strength description (K1.1)", "another strength (S1.1, A1.1)"],
  "improvements": ["area needing improvement (K2.1)", "another improvement (S2.1)"],
  "nextSteps": ["specific action suggestion (K1.1, S1.1)", "another suggestion (S2.3)"]
}

Important evaluation principles:
1. **Only evaluate what the learner actually said**, do not evaluate the AI assistant's responses
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

    // Call AI for evaluation
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(evaluationPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    let evaluation;
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response:', text);
      
      // Fallback evaluation
      evaluation = {
        score: 50,
        ksaScores: {
          knowledge: 50,
          skills: 50,
          attitudes: 50
        },
        individualKsaScores: {},
        domainScores: {
          engaging_with_ai: 50,
          creating_with_ai: 50,
          managing_with_ai: 50,
          designing_with_ai: 50
        },
        rubricsScores: {
          "Research Quality": 2,
          "AI Utilization": 2,
          "Content Quality": 2,
          "Learning Progress": 2
        },
        strengths: ["Shows interest in learning (A1.1)"],
        improvements: ["Could ask more specific questions (K1.1)", "Try to explore different approaches (S2.1)"],
        nextSteps: ["Practice formulating clearer questions (K1.1, S1.1)", "Experiment with different AI prompts (S2.3)"]
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
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to evaluate'
      },
      { status: 500 }
    );
  }
}