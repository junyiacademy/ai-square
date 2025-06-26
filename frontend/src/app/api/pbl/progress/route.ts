import { NextRequest, NextResponse } from 'next/server';
import { pblGCS } from '@/lib/storage/pbl-gcs-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, stageId, progress, metadata } = body;

    if (!sessionId || !stageId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'sessionId and stageId are required'
          }
        },
        { status: 400 }
      );
    }

    // Get current session
    const result = await pblGCS.getSession(sessionId);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        },
        { status: 404 }
      );
    }

    const { sessionData } = result;

    // Update progress
    const updates = {
      ...sessionData,
      currentStage: stageId,
      progress: {
        ...sessionData.progress,
        ...progress,
        lastActiveAt: new Date().toISOString()
      },
      lastActiveAt: new Date().toISOString()
    };

    // Add stage result if task is completed
    if (metadata?.completed) {
      const existingStageIndex = sessionData.stageResults?.findIndex(
        result => result.stageId === stageId
      ) ?? -1;

      const stageResult = {
        stageId,
        completed: true,
        startedAt: new Date(),
        completedAt: new Date(),
        performanceMetrics: {
          completionTime: metadata.timeSpent || 0,
          interactionCount: 1,
          revisionCount: 0,
          resourceUsage: 1
        },
        ksaAchievement: {},
        rubricsScore: {},
        feedback: {
          strengths: [],
          improvements: [],
          nextSteps: []
        }
      };

      if (existingStageIndex >= 0) {
        updates.stageResults[existingStageIndex] = stageResult;
      } else {
        updates.stageResults = [...(sessionData.stageResults || []), stageResult];
      }

      // Update overall progress  
      const completedStageIds = updates.stageResults.filter(r => r.completed).map(r => r.stageId);
      // Convert stage IDs to indices (assuming they're numeric)
      updates.progress.completedStages = completedStageIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
    }

    // Save updated session
    const updatedSession = await pblGCS.updateSession(sessionId, updates);

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        progress: updatedSession?.progress,
        currentStage: updatedSession?.currentStage,
        stageResults: updatedSession?.stageResults
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Progress API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROGRESS_ERROR',
          message: 'Failed to update progress'
        }
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'sessionId is required'
          }
        },
        { status: 400 }
      );
    }

    // Get session progress
    const result = await pblGCS.getSession(sessionId);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        },
        { status: 404 }
      );
    }

    const { sessionData } = result;

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        currentStage: sessionData.currentStage,
        progress: sessionData.progress,
        stageResults: sessionData.stageResults || [],
        status: sessionData.status,
        startedAt: sessionData.startedAt,
        lastActiveAt: sessionData.lastActiveAt
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Progress GET API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROGRESS_GET_ERROR',
          message: 'Failed to get progress'
        }
      },
      { status: 500 }
    );
  }
}