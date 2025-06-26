import { NextResponse } from 'next/server';
import { SessionData, ProcessLog } from '@/types/pbl';
import { pblGCS } from '@/lib/storage/pbl-gcs-service';

// Shared in-memory storage (fallback when GCS is not available)
const sessions = new Map<string, SessionData>();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    // Try to fetch from GCS first
    let session: SessionData | null = null;
    
    try {
      const result = await pblGCS.getSession(sessionId);
      session = result?.sessionData || null;
    } catch (gcsError) {
      console.error('Failed to fetch from GCS, trying in-memory:', gcsError);
      session = sessions.get(sessionId) || null;
    }

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: `Session with id '${sessionId}' not found`
          }
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_SESSION_ERROR',
          message: 'Failed to fetch session'
        }
      },
      { status: 500 }
    );
  }
}

// Update session progress
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const updates = await request.json();

    // TODO: In step 4, fetch from GCS instead
    const session = sessions.get(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: `Session with id '${sessionId}' not found`
          }
        },
        { status: 404 }
      );
    }

    // Update session data
    const updatedSession: SessionData = {
      ...session,
      ...updates,
      lastActiveAt: new Date().toISOString()
    };

    // If updating progress
    if (updates.progress) {
      updatedSession.progress = {
        ...session.progress,
        ...updates.progress
      };
    }

    // If adding process logs
    if (updates.newProcessLog) {
      updatedSession.processLogs = [
        ...session.processLogs,
        updates.newProcessLog
      ];
    }

    // If adding stage results
    if (updates.newStageResult) {
      updatedSession.stageResults = [
        ...session.stageResults,
        updates.newStageResult
      ];
    }

    // Update in memory (will save to GCS in step 4)
    sessions.set(sessionId, updatedSession);

    // TODO: Save to GCS in step 4
    // await updateInGCS(sessionId, updatedSession);

    return NextResponse.json({
      success: true,
      data: updatedSession,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPDATE_SESSION_ERROR',
          message: 'Failed to update session'
        }
      },
      { status: 500 }
    );
  }
}

// Complete or pause session
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const { action } = await request.json();

    if (!['complete', 'pause'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Action must be either "complete" or "pause"'
          }
        },
        { status: 400 }
      );
    }

    // TODO: In step 4, fetch from GCS instead
    const session = sessions.get(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: `Session with id '${sessionId}' not found`
          }
        },
        { status: 404 }
      );
    }

    // Update session status
    const updatedSession: SessionData = {
      ...session,
      status: action === 'complete' ? 'completed' : 'paused',
      lastActiveAt: new Date().toISOString()
    };

    // Update in memory (will save to GCS in step 4)
    sessions.set(sessionId, updatedSession);

    // TODO: Save to GCS in step 4
    // await updateInGCS(sessionId, updatedSession);

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        status: updatedSession.status,
        message: `Session ${action}d successfully`
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error updating session status:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPDATE_STATUS_ERROR',
          message: 'Failed to update session status'
        }
      },
      { status: 500 }
    );
  }
}