import { NextRequest, NextResponse } from 'next/server';
import { pblJourneyService } from '@/lib/storage/pbl-journey-service';
import { ConversationTurn, ProcessLog, ActionType } from '@/types/pbl';

/**
 * POST /api/pbl/journey-chat
 * Handle chat within a journey context
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      journeyId, 
      taskId, 
      message, 
      userId, 
      language = 'zh-TW',
      aiModule,
      stageContext
    } = body;
    
    if (!journeyId || !taskId || !message) {
      return NextResponse.json(
        { success: false, error: 'journeyId, taskId, and message are required' },
        { status: 400 }
      );
    }
    
    // Get user email from cookie
    const userCookie = request.cookies.get('user')?.value;
    if (!userCookie) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }
    
    const user = JSON.parse(userCookie);
    const userEmail = user.email;
    
    console.log(`Processing chat for journey: ${journeyId}, task: ${taskId}, user: ${userEmail}`);
    
    // Get task log
    const taskLog = await pblJourneyService.getTaskLog(userEmail, journeyId, taskId);
    if (!taskLog) {
      return NextResponse.json(
        { success: false, error: 'Task log not found' },
        { status: 404 }
      );
    }
    
    const timestamp = new Date();
    
    // Create user conversation turn
    const userTurn: ConversationTurn = {
      id: `user-${timestamp.getTime()}`,
      timestamp,
      role: 'user',
      content: message
    };
    
    // Create user process log
    const userProcessLog: ProcessLog = {
      id: `log-${timestamp.getTime()}`,
      timestamp,
      sessionId: journeyId, // Use journeyId as sessionId for compatibility
      stageId: stageContext?.stageId || taskLog.stageId,
      actionType: 'write' as ActionType,
      detail: {
        userInput: message,
        taskId: taskId,
        timeSpent: 1 // TODO: Calculate actual time spent
      }
    };
    
    // Add user conversation and log
    taskLog.conversations.push(userTurn);
    taskLog.processLogs.push(userProcessLog);
    
    // TODO: Call AI API to get response
    // For now, create a mock AI response
    const aiResponse = `這是針對任務 ${taskId} 的 AI 回應。您的訊息是：${message}`;
    
    const aiTurn: ConversationTurn = {
      id: `ai-${timestamp.getTime() + 1}`,
      timestamp: new Date(),
      role: 'ai',
      content: aiResponse,
      metadata: {
        tokensUsed: Math.floor(Math.random() * 500) + 100, // Mock token usage
        processingTime: Math.floor(Math.random() * 2000) + 500 // Mock processing time
      }
    };
    
    const aiProcessLog: ProcessLog = {
      id: `log-${timestamp.getTime() + 1}`,
      timestamp: new Date(),
      sessionId: journeyId,
      stageId: stageContext?.stageId || taskLog.stageId,
      actionType: 'interaction' as ActionType,
      detail: {
        aiInteraction: {
          prompt: message,
          response: aiResponse,
          tokensUsed: aiTurn.metadata?.tokensUsed || 0
        },
        taskId: taskId
      }
    };
    
    // Add AI conversation and log
    taskLog.conversations.push(aiTurn);
    taskLog.processLogs.push(aiProcessLog);
    
    // Update time spent (mock calculation)
    taskLog.timeSpent += Math.floor(Math.random() * 30) + 10; // Add 10-40 seconds
    
    // Save updated task log
    await pblJourneyService.saveTaskLog(userEmail, journeyId, taskLog);
    
    // Update journey metadata
    const journey = await pblJourneyService.getJourney(userEmail, journeyId);
    if (journey) {
      journey.taskLogs[taskId] = taskLog;
      await pblJourneyService.updateJourney(userEmail, journey);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        conversation: aiTurn,
        taskLog: taskLog
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    });
    
  } catch (error) {
    console.error('Error processing journey chat:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'JOURNEY_CHAT_ERROR',
          message: 'Failed to process chat'
        }
      },
      { status: 500 }
    );
  }
}