import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { VertexAI } from '@google-cloud/vertexai';
import { v4 as uuidv4 } from 'uuid';
import { ChatSessionService } from '@/lib/services/chat/chat-session.service';
import { ChatContextBuilderService } from '@/lib/services/chat/chat-context-builder.service';
import { ChatMemoryService } from '@/lib/services/chat/chat-memory.service';
import { ChatTitleGenerationService } from '@/lib/services/chat/chat-title-generation.service';

// Initialize storage and AI services only when needed
let storage: Storage | null = null;
let vertexAI: VertexAI | null = null;
let bucket: ReturnType<Storage['bucket']> | null = null;

// Service instances
let chatSessionService: ChatSessionService | null = null;
let chatContextService: ChatContextBuilderService | null = null;
let chatMemoryService: ChatMemoryService | null = null;
let chatTitleService: ChatTitleGenerationService | null = null;

function initializeServices() {
  if (!storage && process.env.GOOGLE_CLOUD_PROJECT) {
    storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    bucket = storage.bucket('ai-square-db');
  }

  if (!vertexAI && process.env.GOOGLE_CLOUD_PROJECT) {
    vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    });
  }

  // Initialize chat services
  if (bucket && !chatSessionService) {
    chatSessionService = new ChatSessionService(bucket);
    chatContextService = new ChatContextBuilderService(bucket);
    chatMemoryService = new ChatMemoryService(bucket);
  }

  if (vertexAI && !chatTitleService) {
    chatTitleService = new ChatTitleGenerationService(vertexAI);
  }
}

// Old helper functions removed - now using services

export async function POST(req: NextRequest) {
  try {
    // Initialize services on first request
    initializeServices();

    if (!vertexAI || !chatSessionService || !chatContextService || !chatMemoryService || !chatTitleService) {
      return NextResponse.json({ error: 'AI services not configured' }, { status: 503 });
    }

    const { message, sessionId } = await req.json();

    // Get user info from request (passed from client)
    const userStr = req.headers.get('x-user-info');

    if (!userStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userInfo = JSON.parse(userStr);
    const userEmail = userInfo.email;

    // Get user context using service
    const userContext = await chatContextService.buildContext(userEmail);

    if (!userContext) {
      return NextResponse.json({ error: 'User context not found' }, { status: 404 });
    }

    // Build system prompt with user context
    const systemPrompt = chatContextService.buildSystemPrompt(userContext);

    // Generate AI response
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.8,
      },
    });

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I\'ll help guide the user based on their profile and learning progress.' }],
        },
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const aiResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I was unable to generate a response.';

    // Create or use session ID
    const currentSessionId = sessionId || uuidv4();

    // Save messages using service
    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user' as const,
      content: message,
      timestamp: new Date().toISOString()
    };

    const assistantMessage = {
      id: `${Date.now() + 1}-assistant`,
      role: 'assistant' as const,
      content: aiResponse,
      timestamp: new Date().toISOString(),
      context_used: ['assessment_score', 'user_identity', 'weak_domains']
    };

    await chatSessionService.addMessage(userEmail, currentSessionId, userMessage);
    const session = await chatSessionService.addMessage(userEmail, currentSessionId, assistantMessage);

    // Auto-generate title for new sessions or update title if still generic
    const shouldGenerateTitle = (
      (!sessionId && session.messages.length === 2) || // New session with first exchange
      (session.title === 'New Chat' && session.messages.length >= 4) // Update generic title after 2 exchanges
    );

    if (shouldGenerateTitle) {
      const title = await chatTitleService.generateTitle(session.messages);
      await chatSessionService.updateSessionTitle(userEmail, currentSessionId, title);
      session.title = title; // Update local session object
    }

    // Update short-term memory with recent topic using service
    await chatMemoryService.updateShortTermMemory(userEmail, message);

    return NextResponse.json({
      response: aiResponse,
      sessionId: currentSessionId,
      title: session.title
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

