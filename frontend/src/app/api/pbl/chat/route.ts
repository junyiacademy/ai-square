import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import { ErrorResponse } from '@/types/api';
import { ChatMessage } from '@/types/pbl-api';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';

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

    // Get user session
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get language from query params (default to 'en')
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('lang') || 'en';

    // Use unified architecture to get scenario and task data
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const taskRepo = repositoryFactory.getTaskRepository();

    // Get scenario to access AI module configuration from metadata
    const scenario = await scenarioRepo.findById(scenarioId);
    if (!scenario) {
      return NextResponse.json<ErrorResponse>(
        { error: `Scenario not found: ${scenarioId}` },
        { status: 404 }
      );
    }

    // Get task for AI module info
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Extract AI module configuration from task metadata
    const taskTemplate = task.metadata?.taskTemplate as Record<string, unknown> || {};
    let aiModule = taskTemplate.aiModule || taskTemplate.ai_module || 
                    (task.metadata?.originalTaskData as Record<string, unknown>)?.aiModule ||
                    (task.metadata?.originalTaskData as Record<string, unknown>)?.ai_module;

    if (!aiModule) {
      console.warn('AI module not found for task:', {
        taskId,
        taskTemplate,
        metadata: task.metadata
      });
      // Use default AI module configuration
      aiModule = {
        role: 'helpful AI tutor',
        persona: 'supportive learning assistant',
        initialPrompt: 'I am here to help you complete this task successfully.'
      };
      console.log('Using default AI module configuration');
    }

    // Build conversation context
    console.log('Conversation history received:', {
      count: conversationHistory?.length || 0,
      history: conversationHistory
    });
    
    const conversationContext = conversationHistory?.map((entry: ChatMessage) => 
      `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}`
    ).join('\n');
    
    console.log('Formatted conversation context:', conversationContext);

    // Initialize Vertex AI
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
      console.error('GOOGLE_CLOUD_PROJECT environment variable not set');
      return NextResponse.json<ErrorResponse>(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }
    
    const vertexAI = new VertexAI({
      project: projectId,
      location: 'us-central1',
    });

    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.95,
      },
    });

    // Build the prompt based on AI module configuration
    const systemPrompt = buildSystemPrompt(
      aiModule,
      taskTitle,
      taskDescription,
      instructions,
      expectedOutcome,
      language
    );

    const fullPrompt = conversationContext 
      ? `${systemPrompt}\n\nPrevious conversation:\n${conversationContext}\n\nUser: ${message}`
      : `${systemPrompt}\n\nUser: ${message}`;

    // Generate response
    try {
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I was unable to generate a response.';
      
      return NextResponse.json({
        response: text,
        sessionId,
      });
    } catch (vertexError) {
      console.error('Vertex AI error:', {
        error: vertexError,
        message: (vertexError as Error).message,
        stack: (vertexError as Error).stack,
        projectId,
        aiModule,
      });
      return NextResponse.json<ErrorResponse>(
        { error: `AI generation failed: ${(vertexError as Error).message}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(
  aiModule: unknown,
  taskTitle: string,
  taskDescription: string,
  instructions: string[],
  expectedOutcome: string,
  language: string
): string {
  const aiModuleData = aiModule as { role?: string; persona?: string; initialPrompt?: string; initial_prompt?: string };
  const role = aiModuleData.role || 'assistant';
  const persona = aiModuleData.persona || 'helpful AI assistant';
  const initialPrompt = aiModuleData.initialPrompt || aiModuleData.initial_prompt || '';

  // Language-specific instructions
  const langInstructions = getLanguageInstructions(language);

  return `You are acting as a ${persona} with the role of ${role}.

${initialPrompt}

Current Task: ${taskTitle}
Description: ${taskDescription}

Task Instructions:
${instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

Expected Outcome: ${expectedOutcome}

${langInstructions}

Please help the user complete this task while staying in character as the ${persona}. Guide them towards achieving the expected outcome through meaningful interaction and feedback.`;
}

function getLanguageInstructions(language: string): string {
  const languageMap: Record<string, string> = {
    'en': 'Please respond in English.',
    'zhTW': '請用繁體中文回應。',
    'zhCN': '请用简体中文回应。',
    'es': 'Por favor responde en español.',
    'ja': '日本語で応答してください。',
    'ko': '한국어로 응답해 주세요.',
    'fr': 'Veuillez répondre en français.',
    'de': 'Bitte antworten Sie auf Deutsch.',
    'ru': 'Пожалуйста, отвечайте на русском языке.',
    'it': 'Si prega di rispondere in italiano.',
    'pt': 'Por favor, responda em português.',
    'ar': 'يرجى الرد باللغة العربية.',
    'id': 'Harap balas dalam bahasa Indonesia.',
    'th': 'กรุณาตอบเป็นภาษาไทย'
  };

  return languageMap[language] || languageMap['en'];
}