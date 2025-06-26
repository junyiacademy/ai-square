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
      language = 'en',
      userProcessLog
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

    // Convert to conversation format with task ID
    const { processLog, ...conversation } = vertexAIResponseToConversation(
      vertexResponse,
      sessionId,
      stageContext.stageId,
      stageContext.taskId
    );

    // Update process log with user prompt
    processLog.detail.aiInteraction!.prompt = message;

    // Save both user and AI process logs together to avoid race conditions
    const saveProcessLogs = async () => {
      try {
        // Get current session
        const result = await pblGCS.getSession(sessionId);
        if (!result) {
          console.error(`Session ${sessionId} not found`);
          return;
        }
        
        const { sessionData, logId } = result;
        
        // Add both logs to session
        if (!sessionData.processLogs) {
          sessionData.processLogs = [];
        }
        
        // Add user process log first (if provided)
        if (userProcessLog) {
          sessionData.processLogs.push(userProcessLog);
        }
        
        // Add AI process log
        sessionData.processLogs.push(processLog);
        
        // Save session with both logs
        await pblGCS.saveSession(sessionId, sessionData, logId);
        console.log(`Saved ${userProcessLog ? 2 : 1} process logs for session ${sessionId}`);
      } catch (error) {
        console.error('Failed to save process logs:', error);
      }
    };
    
    // Save asynchronously but don't wait
    saveProcessLogs();

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