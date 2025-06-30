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
    
    const body = await request.json() as SaveTaskProgressRequest & { evaluation?: any };
    const { programId, taskId, progress, evaluation } = body;
    
    // Validate required fields
    if (!programId || !taskId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: programId, taskId'
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
    
    // Update task progress if provided
    if (progress) {
      await pblProgramService.updateTaskProgress(
        userEmail,
        scenarioId,
        programId,
        taskId,
        progress
      );
    }
    
    // Save evaluation if provided
    if (evaluation) {
      await pblProgramService.saveTaskEvaluation(
        userEmail,
        scenarioId,
        programId,
        taskId,
        evaluation
      );
      
      // Trigger feedback generation in the background (don't await)
      // This happens after each task evaluation, but the feedback generation
      // will check if completion.json exists and has feedback already
      const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;
      if (baseUrl) {
        // Pass the cookie header for authentication
        const cookieHeader = request.headers.get('cookie');
        // Get Accept-Language from original request
        const acceptLanguage = request.headers.get('accept-language') || 'en';
        fetch(`${baseUrl}/api/pbl/generate-feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept-Language': acceptLanguage,
            ...(cookieHeader && { 'Cookie': cookieHeader })
          },
          body: JSON.stringify({
            programId,
            scenarioId,
          }),
        }).catch(error => {
          // Log error but don't block the response
          console.error('Failed to trigger feedback generation:', error);
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Task data updated successfully'
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