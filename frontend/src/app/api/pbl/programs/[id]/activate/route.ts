import { NextRequest, NextResponse } from 'next/server';
import { ensureServices } from '@/lib/core/services/api-helpers';
import { ProgramStatus } from '@/lib/core/program/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
    
    // Get request body
    const body = await request.json();
    const { scenarioId, taskId, taskTitle } = body;
    
    if (!scenarioId || !taskId || !taskTitle) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Use new architecture
    const services = await ensureServices();
    
    // Get the program
    const program = await services.programService.getProgram(userEmail, id);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Update program status from draft to in_progress
    const updatedProgram = await services.programService.updateProgram(
      userEmail,
      id,
      {
        status: ProgramStatus.IN_PROGRESS,
        startedAt: program.startedAt || new Date(),
        progress: {
          ...program.progress,
          currentTaskId: taskId,
          lastActivityAt: new Date()
        }
      }
    );
    
    if (!updatedProgram) {
      return NextResponse.json(
        { success: false, error: 'Failed to update program' },
        { status: 500 }
      );
    }
    
    // Check if task exists, if not it should already be created during draft creation
    const tasks = await services.taskService.queryTasks({
      programId: id,
      userId: userEmail
    });
    
    const taskExists = tasks.some(t => t.config?.taskId === taskId);
    
    if (!taskExists) {
      // This shouldn't happen as tasks are created during draft creation
      console.warn(`Task ${taskId} not found for program ${id}`);
    }
    
    // Log the activation
    await services.logService.logSystemEvent(
      userEmail,
      id,
      taskId,
      'program-activated',
      { 
        previousStatus: program.status,
        newStatus: ProgramStatus.IN_PROGRESS,
        currentTaskId: taskId 
      }
    );
    
    // Return in the expected format
    return NextResponse.json({
      success: true,
      program: {
        id: updatedProgram.id,
        scenarioId: updatedProgram.config?.scenarioId || scenarioId,
        status: updatedProgram.status === ProgramStatus.IN_PROGRESS ? 'in_progress' : 'draft',
        startedAt: updatedProgram.startedAt?.toISOString(),
        updatedAt: updatedProgram.updatedAt.toISOString(),
        currentTaskId: taskId,
        totalTasks: updatedProgram.progress.totalTasks,
        completedTasks: updatedProgram.progress.completedTasks
      }
    });
    
  } catch (error) {
    console.error('Error activating program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to activate program' },
      { status: 500 }
    );
  }
}