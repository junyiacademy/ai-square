import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';
import { VertexAI } from '@google-cloud/vertexai';

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

Keep the tone supportive, encouraging, and educational.`,
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
    
    // Check if feedback already exists
    if (completionData.qualitativeFeedback) {
      return NextResponse.json({
        success: true,
        feedback: completionData.qualitativeFeedback,
        cached: true
      });
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

Please provide qualitative feedback in the following JSON format:
{
  "overallAssessment": "Brief overall assessment of performance",
  "strengths": [
    {
      "area": "Specific strength area",
      "description": "Detailed description of what they did well",
      "example": "Specific example from their conversations"
    }
  ],
  "areasForImprovement": [
    {
      "area": "Area needing improvement",
      "description": "What needs work",
      "suggestion": "Specific actionable suggestion"
    }
  ],
  "nextSteps": [
    "Specific next step 1",
    "Specific next step 2"
  ],
  "encouragement": "Personalized encouraging message"
}

Provide feedback in ${request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] === 'zh' ? 'Traditional Chinese (zh-TW)' : 'English'} language.
`;
    
    // Generate feedback
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      }
    });
    
    const response = result.response;
    const feedbackText = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const feedback = JSON.parse(feedbackText);
    
    // Save feedback to completion data
    await pblProgramService.updateProgramCompletionFeedback(
      userEmail,
      scenarioId,
      programId,
      feedback
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