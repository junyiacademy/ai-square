import { NextRequest, NextResponse } from 'next/server';
import { pblProgramService } from '@/lib/storage/pbl-program-service';
import { CompletionTask } from '@/types/pbl-completion';

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
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');
    const scenarioId = searchParams.get('scenarioId');
    const taskId = searchParams.get('taskId');

    if (!programId || !scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get completion data
    const completionData = await pblProgramService.getProgramCompletion(
      userEmail,
      scenarioId,
      programId
    );

    if (!completionData) {
      return NextResponse.json(
        { success: false, error: 'Completion data not found' },
        { status: 404 }
      );
    }

    // If taskId is provided, return only that task's data
    if (taskId) {
      const taskData = completionData.tasks?.find((t: CompletionTask) => t.taskId === taskId);
      if (!taskData) {
        return NextResponse.json(
          { success: false, error: 'Task not found in completion data' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          task: taskData,
          program: {
            programId: completionData.programId,
            status: completionData.status,
            overallScore: completionData.overallScore,
            domainScores: completionData.domainScores,
            ksaScores: completionData.ksaScores,
            completedTasks: completionData.completedTasks,
            totalTasks: completionData.totalTasks,
            evaluatedTasks: completionData.evaluatedTasks
          }
        }
      });
    }

    // Return full completion data
    return NextResponse.json({
      success: true,
      data: completionData
    });

  } catch (error) {
    console.error('Error getting completion data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get completion data' },
      { status: 500 }
    );
  }
}

// PUT - Update completion data (called after evaluation)
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
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { programId, scenarioId } = body;

    if (!programId || !scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update completion data
    await pblProgramService.updateProgramCompletion(
      userEmail,
      scenarioId,
      programId
    );

    return NextResponse.json({
      success: true,
      message: 'Completion data updated successfully'
    });

  } catch (error) {
    console.error('Error updating completion data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update completion data' },
      { status: 500 }
    );
  }
}