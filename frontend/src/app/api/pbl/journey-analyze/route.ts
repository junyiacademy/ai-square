import { NextRequest, NextResponse } from 'next/server';
import { pblJourneyService } from '@/lib/storage/pbl-journey-service';
import { StageResult } from '@/types/pbl';

/**
 * POST /api/pbl/journey-analyze
 * Analyze task completion within a journey
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      journeyId, 
      taskId, 
      stageId,
      taskTitle,
      conversations = []
    } = body;
    
    if (!journeyId || !taskId) {
      return NextResponse.json(
        { success: false, error: 'journeyId and taskId are required' },
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
    
    console.log(`Analyzing task: ${taskId} in journey: ${journeyId} for user: ${userEmail}`);
    
    // Get task log
    const taskLog = await pblJourneyService.getTaskLog(userEmail, journeyId, taskId);
    if (!taskLog) {
      return NextResponse.json(
        { success: false, error: 'Task log not found' },
        { status: 404 }
      );
    }
    
    // TODO: Implement actual AI analysis
    // For now, create a mock analysis result
    const mockScore = Math.floor(Math.random() * 40) + 60; // Score between 60-100
    
    const analysisResult: StageResult = {
      stageId: stageId || taskLog.stageId,
      taskId: taskId,
      status: 'completed',
      completedAt: new Date(),
      score: mockScore,
      feedback: `任務 ${taskTitle || taskId} 完成得很好！您展現了良好的問題解決能力。`,
      rubricScores: {
        'understanding': Math.floor(Math.random() * 20) + 80,
        'communication': Math.floor(Math.random() * 20) + 75,
        'critical_thinking': Math.floor(Math.random() * 20) + 85
      },
      improvements: [
        '可以更深入探討問題的根本原因',
        '嘗試提供更多具體的解決方案',
        '加強邏輯推理的表達'
      ]
    };
    
    // Complete the task with analysis
    await pblJourneyService.completeTask(userEmail, journeyId, taskId, analysisResult);
    
    return NextResponse.json({
      success: true,
      data: {
        stageResult: analysisResult,
        taskCompleted: true
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    });
    
  } catch (error) {
    console.error('Error analyzing journey task:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'JOURNEY_ANALYZE_ERROR',
          message: 'Failed to analyze task'
        }
      },
      { status: 500 }
    );
  }
}