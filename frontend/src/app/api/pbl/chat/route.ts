import { NextRequest, NextResponse } from 'next/server';
import { createPBLGeminiServerService, geminiServerResponseToConversation } from '@/lib/ai/gemini-server-service';
import { pblGCS } from '@/lib/storage/pbl-gcs-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sessionId, 
      message, 
      aiModule, 
      stageContext,
      userId 
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

    // Create Gemini service with PBL context (server-side with service account)
    const geminiService = createPBLGeminiServerService(aiModule, stageContext);

    // Send message and get response
    const geminiResponse = await geminiService.sendMessage(message, {
      userId,
      sessionId,
      timestamp: new Date().toISOString()
    });

    // Convert to conversation format
    const { processLog, ...conversation } = geminiServerResponseToConversation(
      geminiResponse,
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
    
    // Check if it's a Gemini API key error
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'API_KEY_ERROR',
            message: 'Gemini API key not configured'
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