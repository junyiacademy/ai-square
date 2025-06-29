import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';
import { SaveTaskLogRequest, SaveTaskProgressRequest, TaskInteraction } from '@/types/pbl';

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
    
    // Get scenario ID from the request or find it from program
    const scenarioId = body.scenarioId || request.headers.get('x-scenario-id');
    
    if (!scenarioId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario ID is required'
        },
        { status: 400 }
      );
    }
    
    // Add timestamp if not provided
    if (!interaction.timestamp) {
      interaction.timestamp = new Date().toISOString();
    }
    
    // Check if task has been initialized, if not, initialize it first
    const taskData = await pblProgramService.getTaskData(
      userEmail,
      scenarioId,
      programId,
      taskId
    );
    
    // If task doesn't exist, initialize it
    if (!taskData.metadata || !taskData.log || !taskData.progress) {
      console.log(`Task ${taskId} not initialized, initializing now...`);
      
      // Get task title from the request or use a default
      const taskTitle = body.taskTitle || `Task ${taskId}`;
      
      await pblProgramService.initializeTask(
        userEmail,
        scenarioId,
        programId,
        taskId,
        taskTitle
      );
    }
    
    // Add interaction to task log
    await pblProgramService.addTaskInteraction(
      userEmail,
      scenarioId,
      programId,
      taskId,
      interaction
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
        error: 'Failed to save task log'
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
    
    // Validate required fields
    if (!programId || !taskId || !progress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: programId, taskId, progress'
        },
        { status: 400 }
      );
    }
    
    // Get scenario ID
    const scenarioId = body.scenarioId || request.headers.get('x-scenario-id');
    
    if (!scenarioId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario ID is required'
        },
        { status: 400 }
      );
    }
    
    // Update task progress
    await pblProgramService.updateTaskProgress(
      userEmail,
      scenarioId,
      programId,
      taskId,
      progress
    );
    
    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully'
    });
    
  } catch (error) {
    console.error('Task progress error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update task progress'
      },
      { status: 500 }
    );
  }
}

// GET - Get task data (metadata, log, progress)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const taskId = searchParams.get('taskId');
    const scenarioId = searchParams.get('scenarioId');
    
    if (!programId || !taskId || !scenarioId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: programId, taskId, scenarioId'
        },
        { status: 400 }
      );
    }
    
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
    
    // Get task data from storage
    const taskData = await pblProgramService.getTaskData(
      userEmail,
      scenarioId,
      programId,
      taskId
    );
    
    return NextResponse.json({
      success: true,
      data: taskData
    });
    
  } catch (error) {
    console.error('Get task data error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get task data'
      },
      { status: 500 }
    );
  }
}