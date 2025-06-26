import { NextResponse } from 'next/server';
import { SessionData } from '@/types/pbl';
import { pblGCS } from '@/lib/storage/pbl-gcs-service';

// Shared in-memory storage (fallback when GCS is not available)
const sessions = new Map<string, SessionData>();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Check if request has body
    const text = await request.text();
    let updates = {};
    
    if (text.trim()) {
      try {
        updates = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Raw text:', text);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_JSON',
              message: 'Invalid JSON in request body'
            }
          },
          { status: 400 }
        );
      }
    }

    // Try to fetch from GCS first, then fallback to in-memory
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

    // Filter out special update fields that shouldn't be stored in session data
    const { newProcessLog, newStageResult, progress, ...otherUpdates } = updates;
    
    // Update session data (excluding special fields)
    const updatedSession: SessionData = {
      ...session,
      ...otherUpdates,
      lastActiveAt: new Date().toISOString()
    };

    // If updating progress
    if (progress) {
      updatedSession.progress = {
        ...session.progress,
        ...progress
      };
    }

    // If adding process logs
    if (newProcessLog) {
      console.log('Adding new process log to session:', sessionId);
      console.log('Current processLogs count:', session.processLogs?.length || 0);
      console.log('New process log:', newProcessLog);
      
      updatedSession.processLogs = [
        ...(session.processLogs || []),
        newProcessLog
      ];
      
      console.log('Updated processLogs count:', updatedSession.processLogs.length);
    }

    // If adding stage results
    if (newStageResult) {
      updatedSession.stageResults = [
        ...session.stageResults,
        newStageResult
      ];
    }

    // Update in memory first
    sessions.set(sessionId, updatedSession);

    // Save to GCS synchronously when adding process logs to ensure data consistency
    if (newProcessLog) {
      try {
        await pblGCS.updateSession(sessionId, updatedSession);
        console.log('Process log saved to GCS successfully');
      } catch (gcsError) {
        console.error('Failed to save process log to GCS:', gcsError);
        // Continue with in-memory storage
      }
    } else {
      // For other updates, save asynchronously
      pblGCS.updateSession(sessionId, updatedSession).catch(gcsError => {
        console.error('Failed to save to GCS (async):', gcsError);
      });
    }

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
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

    // Try to fetch from GCS first, then fallback to in-memory
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

    // Update session status
    const updatedSession: SessionData = {
      ...session,
      status: action === 'complete' ? 'completed' : 'paused',
      lastActiveAt: new Date().toISOString()
    };

    // Update in memory and GCS
    sessions.set(sessionId, updatedSession);

    // Save to GCS
    try {
      await pblGCS.updateSession(sessionId, updatedSession);
    } catch (gcsError) {
      console.error('Failed to save to GCS:', gcsError);
      // Continue with in-memory only
    }

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