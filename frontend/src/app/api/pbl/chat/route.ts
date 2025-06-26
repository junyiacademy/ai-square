import { NextRequest, NextResponse } from 'next/server';
import { createPBLVertexAIService, vertexAIResponseToConversation } from '@/lib/ai/vertex-ai-service';
import { pblGCS } from '@/lib/storage/pbl-gcs-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sessionId, 
      message, 
      aiModule, 
      stageContext,
      userId,
      language = 'en'
    } = body;

    if (!sessionId || !message || !aiModule || !stageContext) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Missing required parameters'
          }
        },
        { status: 400 }
      );
    }

    // Create Vertex AI service with PBL context (server-side with service account)
    const vertexService = createPBLVertexAIService(aiModule, stageContext, language);

    // Send message and get response
    const vertexResponse = await vertexService.sendMessage(message, {
      userId,
      sessionId,
      timestamp: new Date().toISOString()
    });

    // Convert to conversation format
    const { processLog, ...conversation } = vertexAIResponseToConversation(
      vertexResponse,
      sessionId,
      stageContext.stageId
    );

    // Update process log with user prompt
    processLog.detail.aiInteraction!.prompt = message;

    // Async save to GCS (don't wait)
    pblGCS.appendProcessLog(sessionId, processLog).catch(error => {
      console.error('Failed to save process log:', error);
    });

    return NextResponse.json({
      success: true,
      data: {
        conversation,
        processLog: {
          id: processLog.id,
          timestamp: processLog.timestamp,
          tokensUsed: processLog.detail.aiInteraction?.tokensUsed
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Check if it's a Vertex AI authentication error
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: 'Vertex AI authentication failed'
          }
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CHAT_ERROR',
          message: 'Failed to process chat message'
        }
      },
      { status: 500 }
    );
  }
}