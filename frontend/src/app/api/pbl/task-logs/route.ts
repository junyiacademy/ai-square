import { NextRequest, NextResponse } from 'next/server';
import { ensureServices } from '@/lib/core/services/api-helpers';
import { SaveTaskLogRequest, SaveTaskProgressRequest } from '@/types/pbl';
import { TaskEvaluation } from '@/types/pbl-completion';

// POST - Add interaction to task log
export async function POST(request: NextRequest) {
  try {
    // Get user info from cookie
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
          error: 'User authentication required'
        },
        { status: 401 }
      );
    }
    
    const body = await request.json() as SaveTaskLogRequest;
    const { programId, taskId, interaction } = body;
    
    // Validate required fields
    if (!programId || !taskId || !interaction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: programId, taskId, interaction'
        },
        { status: 400 }
      );
    }
    
    // Use new architecture
    const services = await ensureServices();
    
    // Log the interaction
    await services.logService.logInteraction(
      userEmail,
      programId,
      taskId,
      interaction.type,
      interaction.action,
      interaction.data || {}
    );
    
    return NextResponse.json({
      success: true,
      message: 'Interaction added successfully'
    });
    
  } catch (error) {
    console.error('Task log error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save task log',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Get task logs
export async function GET(request: NextRequest) {
  try {
    // Get user info from cookie
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
          error: 'User authentication required'
        },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const taskId = searchParams.get('taskId');
    
    if (!programId || !taskId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: programId, taskId'
        },
        { status: 400 }
      );
    }
    
    // Use new architecture
    const services = await ensureServices();
    
    // Only accept UUID format for task IDs
    const task = await services.taskService.getTask(userEmail, programId, taskId);
    
    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found'
        },
        { status: 404 }
      );
    }
    
    // Get logs for this task
    const logs = await services.logService.queryLogs({
      userId: userEmail,
      programId: programId,
      taskId: taskId
    });
    
    // Transform logs to match the expected format
    const interactionLogs = logs.filter(log => log.type === 'INTERACTION');
    
    const taskData = {
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        startedAt: task.createdAt.toISOString(),
        lastUpdated: task.updatedAt.toISOString()
      },
      log: interactionLogs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        type: log.data?.action || log.metadata?.type || 'unknown',
        action: log.data?.action || log.metadata?.action || 'unknown',
        data: log.data || log.metadata?.data || {}
      })),
      progress: task.progress || {
        status: 'not_started',
        attempts: 0
      }
    };
    
    return NextResponse.json({
      success: true,
      data: taskData
    });
    
  } catch (error) {
    console.error('Get task logs error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get task logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update task progress
export async function PUT(request: NextRequest) {
  try {
    // Get user info from cookie
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
          error: 'User authentication required'
        },
        { status: 401 }
      );
    }
    
    const body = await request.json() as SaveTaskProgressRequest;
    const { programId, taskId, progress } = body;
    
    if (!programId || !taskId || !progress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: programId, taskId, progress'
        },
        { status: 400 }
      );
    }
    
    // Use new architecture
    const services = await ensureServices();
    
    // Update task progress
    await services.taskService.updateTask(userEmail, programId, taskId, {
      progress: {
        ...progress,
        lastUpdated: new Date()
      }
    });
    
    // Log the progress update
    await services.logService.logSystemEvent(
      userEmail,
      programId,
      taskId,
      'task-progress-updated',
      { progress }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Task progress updated successfully'
    });
    
  } catch (error) {
    console.error('Update task progress error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update task progress',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}