import { NextRequest, NextResponse } from 'next/server';
import { pblJourneyService } from '@/lib/storage/pbl-journey-service';

/**
 * GET /api/pbl/journeys/[journeyId]/tasks/[taskId]
 * Get specific task log
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { journeyId: string; taskId: string } }
) {
  try {
    const { journeyId, taskId } = params;
    
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
    
    console.log(`Fetching task log: ${taskId} from journey: ${journeyId} for user: ${userEmail}`);
    
    const taskLog = await pblJourneyService.getTaskLog(userEmail, journeyId, taskId);
    
    if (!taskLog) {
      return NextResponse.json(
        { success: false, error: 'Task log not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: taskLog,
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    });
    
  } catch (error) {
    console.error('Error fetching task log:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_TASK_LOG_ERROR',
          message: 'Failed to fetch task log'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pbl/journeys/[journeyId]/tasks/[taskId]
 * Delete task log (reset task)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { journeyId: string; taskId: string } }
) {
  try {
    const { journeyId, taskId } = params;
    
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
    
    console.log(`Deleting task log: ${taskId} from journey: ${journeyId} for user: ${userEmail}`);
    
    await pblJourneyService.deleteTaskLog(userEmail, journeyId, taskId);
    
    return NextResponse.json({
      success: true,
      message: 'Task log deleted successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    });
    
  } catch (error) {
    console.error('Error deleting task log:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DELETE_TASK_LOG_ERROR',
          message: 'Failed to delete task log'
        }
      },
      { status: 500 }
    );
  }
}