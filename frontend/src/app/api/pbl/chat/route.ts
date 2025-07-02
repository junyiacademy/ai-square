import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { VertexAI } from '@google-cloud/vertexai';
import { ErrorResponse } from '@/types/api';
import { ChatMessage } from '@/types/pbl-api';
import { Scenario, AIModule, AIRole } from '@/types/pbl';

interface ChatRequestBody {
  message: string;
  sessionId: string;
  context: {
    scenarioId: string;
    taskId: string;
    taskTitle: string;
    taskDescription: string;
    instructions: string[];
    expectedOutcome: string;
    conversationHistory?: ChatMessage[];
  };
}

interface TaskWithAIModule {
  id: string;
  aiModule?: {
    role: string;
    model: string;
    persona?: string;
    initialPrompt?: string;
  };
  ai_module?: {
    role: string;
    model: string;
    persona?: string;
    initial_prompt?: string;
  };
}

interface AIModuleData {
  role: string;
  model: string;
  persona: string;
  initialPrompt?: string;
  initial_prompt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { message, sessionId, context } = body;

    if (!message || !sessionId || !context) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing required fields' },
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
    
    let scenarioData: Scenario;
    try {
      const yamlContent = await fs.readFile(yamlPath, 'utf8');
      scenarioData = yaml.load(yamlContent) as Scenario;
    } catch (error) {
      console.error(`Error loading scenario file: ${yamlPath}`, error);
      return NextResponse.json<ErrorResponse>(
        { error: `Scenario file not found: ${scenarioId}` },
        { status: 404 }
      );
    }
    
    // Find the current task
    const currentTask = scenarioData.tasks?.find((t: TaskWithAIModule) => t.id === taskId);
    if (!currentTask) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Handle both camelCase and snake_case for aiModule
    const aiModuleData = currentTask.aiModule || (currentTask as TaskWithAIModule).ai_module;
    if (!aiModuleData) {
      return NextResponse.json<ErrorResponse>(
        { error: 'AI module not found for this task' },
        { status: 404 }
      );
    }

    const aiModule: AIModule = {
      role: aiModuleData.role as AIRole,
      model: aiModuleData.model,
      persona: aiModuleData.persona,
      initialPrompt: (aiModuleData as AIModuleData).initialPrompt || (aiModuleData as AIModuleData).initial_prompt
    };
    
    // Build conversation context
    const conversationContext = conversationHistory?.map((entry: ChatMessage) => 
      `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}`
    ).join('\n');

    // Get language from Accept-Language header
    const acceptLanguage = request.headers.get('accept-language') || 'en';
    let userLang = acceptLanguage.split('-')[0] || 'en';
    
    // Map zh to zhTW for Traditional Chinese
    if (userLang === 'zh') {
      userLang = 'zhTW';
    }
    
    // Language mapping for AI instructions
    const languageInstructions: Record<string, string> = {
      'zhTW': 'IMPORTANT: You must respond ONLY in Traditional Chinese (繁體中文). All your responses must be in 繁體中文.',
      'ja': 'IMPORTANT: You must respond ONLY in Japanese (日本語). All your responses must be in 日本語.',
      'ko': 'IMPORTANT: You must respond ONLY in Korean (한국어). All your responses must be in 한국어.',
      'es': 'IMPORTANT: You must respond ONLY in Spanish (Español). All your responses must be in Español.',
      'fr': 'IMPORTANT: You must respond ONLY in French (Français). All your responses must be in Français.',
      'de': 'IMPORTANT: You must respond ONLY in German (Deutsch). All your responses must be in Deutsch.',
      'ru': 'IMPORTANT: You must respond ONLY in Russian (Русский). All your responses must be in Русский.',
      'it': 'IMPORTANT: You must respond ONLY in Italian (Italiano). All your responses must be in Italiano.',
      'en': 'IMPORTANT: You must respond in English.'
    };
    
    // Analyze user message for relevance
    const isGreetingOnly = /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|what's up|thanks|thank you|bye|goodbye)[\s\.,!?]*$/i.test(message.trim());
    const isOffTopic = !/(?:resume|cv|job|career|work|experience|skill|education|analysis|industry|trends|hiring|employer|application|interview|professional)/i.test(message) && message.length > 10;
    
    // Create the prompt with message filtering
    let systemPrompt = `${aiModule.initialPrompt || ''}

Current Task: ${taskTitle}
Task Description: ${taskDescription}
Instructions: ${Array.isArray(instructions) ? instructions.join(', ') : instructions}
Expected Outcome: ${expectedOutcome}

Previous conversation:
${conversationContext || 'No previous conversation'}

IMPORTANT GUIDELINES:
1. Stay focused on the current task and learning objectives
2. If the user sends only greetings or off-topic messages, politely redirect them to the task
3. Keep responses concise and task-focused
4. Encourage meaningful engagement with the learning material

${languageInstructions[userLang] || languageInstructions['en']}

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