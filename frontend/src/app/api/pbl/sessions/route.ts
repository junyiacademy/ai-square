import { NextRequest, NextResponse } from 'next/server';
import { SessionData, SessionMetadata } from '@/types/pbl';
import { v4 as uuidv4 } from 'uuid';
import { pblGCS } from '@/lib/storage/pbl-gcs-service';

// In-memory session storage (fallback when GCS is not available)
const sessions = new Map<string, SessionData>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenarioId, scenarioTitle, userId, stageIndex = 0, stageId } = body;

    if (!scenarioId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'scenarioId and userId are required'
          }
        },
        { status: 400 }
      );
    }

    // Extract user email from cookies if available
    let userEmail = 'demo@example.com'; // fallback
    try {
      const userCookie = request.cookies.get('user')?.value;
      if (userCookie) {
        const user = JSON.parse(userCookie);
        userEmail = user.email || userEmail;
      }
    } catch {
      console.log('No user cookie found, using demo email');
    }

    // Generate session ID
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    // Create new session with stage info
    const sessionData: SessionData = {
      id: sessionId,
      userId,
      userEmail,
      scenarioId,
      scenarioTitle,
      status: 'in_progress',
      currentStage: stageIndex || 0,  // Set from parameter
      progress: {
        percentage: 0,
        completedStages: [],
        timeSpent: 0
      },
      startedAt: now,
      lastActiveAt: now,
      stageResults: [],
      processLogs: []
    };

    // Create metadata for GCS
    const metadata: SessionMetadata = {
      session_id: sessionId,
      user_id: userId,
      activity_type: 'pbl_practice',
      activity_id: scenarioId,
      status: 'in_progress',
      created_at: now,
      last_active_at: now,
      version: 1
    };

    // Try to save to GCS
    let logId: string | undefined;
    try {
      logId = await pblGCS.saveSession(sessionId, sessionData);
      console.log(`Session ${sessionId} saved to GCS with logId: ${logId}`);
    } catch (gcsError) {
      console.error('Failed to save to GCS, using in-memory storage:', gcsError);
      // Fallback to in-memory storage
      sessions.set(sessionId, sessionData);
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        logId,
        sessionData,
        metadata
      },
      meta: {
        timestamp: now,
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error creating PBL session:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREATE_SESSION_ERROR',
          message: 'Failed to create PBL session'
        }
      },
      { status: 500 }
    );
  }
}

// GET active sessions for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const scenarioId = searchParams.get('scenarioId');
    const status = searchParams.get('status') as 'in_progress' | 'completed' | 'paused' | null;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'userId is required'
          }
        },
        { status: 400 }
      );
    }

    // Extract user email from cookies if available
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

    // Try to fetch from GCS first
    let userSessions: SessionData[] = [];
    
    try {
      const logDataList = await pblGCS.listUserSessions(
        userId, 
        status || undefined,
        userEmail
      );
      
      // Extract session data from log data
      userSessions = logDataList.map(logData => {
        // Restore processLogs from root level
        return {
          ...logData.session_data,
          processLogs: logData.process_logs || []
        };
      });
      
      // Filter by scenarioId if provided
      if (scenarioId) {
        userSessions = userSessions.filter(session => session.scenarioId === scenarioId);
      }
    } catch (gcsError) {
      console.error('Failed to fetch from GCS, using in-memory storage:', gcsError);
      // Fallback to in-memory storage
      sessions.forEach((session) => {
        const matchesUserId = session.userId === userId;
        const matchesStatus = !status || session.status === status;
        const matchesScenarioId = !scenarioId || session.scenarioId === scenarioId;
        
        if (matchesUserId && matchesStatus && matchesScenarioId) {
          userSessions.push(session);
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        sessions: userSessions,
        total: userSessions.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_SESSIONS_ERROR',
          message: 'Failed to fetch active sessions'
        }
      },
      { status: 500 }
    );
  }
}