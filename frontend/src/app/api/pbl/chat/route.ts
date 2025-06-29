import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { VertexAI } from '@google-cloud/vertexai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, context } = body;

    if (!message || !sessionId || !context) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { scenarioId, taskId, taskTitle, taskDescription, instructions, expectedOutcome, conversationHistory } = context;

    // Load scenario data to get AI module configuration
    const yamlPath = path.join(
      process.cwd(),
      'public',
      'pbl_data',
      `${scenarioId.replace(/-/g, '_')}_scenario.yaml`
    );
    
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    const scenarioData = yaml.load(yamlContent) as any;
    
    // Find the current task
    const currentTask = scenarioData.tasks?.find((t: any) => t.id === taskId);
    if (!currentTask || !currentTask.ai_module) {
      return NextResponse.json(
        { success: false, error: 'Task or AI module not found' },
        { status: 404 }
      );
    }

    const aiModule = currentTask.ai_module;
    
    // Build conversation context
    const conversationContext = conversationHistory?.map((entry: any) => 
      `${entry.type === 'user' ? 'User' : 'Assistant'}: ${entry.content}`
    ).join('\n');

    // Analyze user message for relevance
    const isGreetingOnly = /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|what's up|thanks|thank you|bye|goodbye)[\s\.,!?]*$/i.test(message.trim());
    const isOffTopic = !/(?:resume|cv|job|career|work|experience|skill|education|analysis|industry|trends|hiring|employer|application|interview|professional)/i.test(message) && message.length > 10;
    
    // Create the prompt with message filtering
    let systemPrompt = `${aiModule.initial_prompt}

Current Task: ${taskTitle}
Task Description: ${taskDescription}
Instructions: ${instructions.join(', ')}
Expected Outcome: ${expectedOutcome}

Previous conversation:
${conversationContext || 'No previous conversation'}

IMPORTANT GUIDELINES:
1. Stay focused on the current task and learning objectives
2. If the user sends only greetings or off-topic messages, politely redirect them to the task
3. Keep responses concise and task-focused
4. Encourage meaningful engagement with the learning material

Please respond as ${aiModule.persona} and help the user with this task.`;

    // Handle low-value messages
    if (isGreetingOnly) {
      systemPrompt += `\n\nNOTE: The user sent only a greeting. Respond briefly and immediately guide them to start working on the task.`;
    } else if (isOffTopic) {
      systemPrompt += `\n\nNOTE: The user's message appears off-topic. Politely redirect them to focus on the current task.`;
    }

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013',
      location: 'us-central1',
    });
    
    // Get the generative model
    const model = vertexAI.getGenerativeModel({
      model: aiModule.model || 'gemini-2.5-flash',
    });

    // Generate content
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: systemPrompt + '\n\nUser: ' + message
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });

    const response = result.response;
    const aiResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I was unable to generate a response. Please try again.';

    return NextResponse.json({
      success: true,
      response: aiResponse
    });

  } catch (error) {
    console.error('PBL chat error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}