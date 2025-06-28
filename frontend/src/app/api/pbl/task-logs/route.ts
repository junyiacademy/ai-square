import { NextRequest, NextResponse } from 'next/server';
import { pblGCS } from '@/lib/storage/pbl-gcs-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    
    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'taskId is required'
          }
        },
        { status: 400 }
      );
    }
    
    // Get user email from cookie
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
        {
          success: false,
          error: 'User authentication required (no email found)'
        },
        { status: 401 }
      );
    }
    
    console.log(`Fetching task logs for taskId: ${taskId}, userEmail: ${userEmail}`);
    
    // Get all logs for this task
    const taskLogs = await pblGCS.getTaskLogs(userEmail, taskId);
    
    // Transform logs to include conversation data
    const logsWithConversations = taskLogs.map(log => {
      // Extract conversations from processLogs
      const conversations = log.session_data.processLogs?.map(processLog => {
        if (processLog.actionType === 'interaction' && processLog.detail?.aiInteraction) {
          return {
            id: processLog.id,
            timestamp: processLog.timestamp,
            userMessage: processLog.detail.aiInteraction.prompt || '',
            aiResponse: processLog.detail.aiInteraction.response || '',
            tokensUsed: processLog.detail.aiInteraction.tokensUsed
          };
        }
        return null;
      }).filter(Boolean) || [];
      
      return {
        sessionId: log.session_id,
        status: log.status,
        startedAt: log.session_data.startedAt,
        completedAt: log.progress.completed_at,
        score: log.progress.score,
        conversationCount: log.progress.conversation_count,
        totalTimeSeconds: log.progress.total_time_seconds,
        conversations,
        stageResult: log.session_data.stageResults?.find(
          result => result.taskId === taskId
        )
      };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        taskId,
        totalSessions: logsWithConversations.length,
        logs: logsWithConversations
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Error fetching task logs:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_TASK_LOGS_ERROR',
          message: 'Failed to fetch task logs'
        }
      },
      { status: 500 }
    );
  }
}