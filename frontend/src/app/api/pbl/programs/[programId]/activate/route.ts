import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;
    
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
    
    // Get repositories
    const userRepo = repositoryFactory.getUserRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    
    // Get user by email
    const user = await userRepo.findByEmail(userEmail);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Update program status from pending to active
    await programRepo.update(programId, { status: "active" });
    
    // Initialize the first task if not already initialized
    const existingTasks = await taskRepo.findByProgram(programId);
    const taskExists = existingTasks.some(t => t.taskIndex === 0);
    
    if (!taskExists) {
      // Create the first task
      await taskRepo.create({
        programId: programId,
        taskIndex: 0,
        type: 'task',
        context: {
          taskId: taskId,
          title: taskTitle,
          scenarioId: scenarioId
        }
      });
    }
    
    // Get updated program
    const updatedProgram = await programRepo.findById(programId);
    
    return NextResponse.json({
      success: true,
      program: {
        id: updatedProgram!.id,
        scenarioId: updatedProgram!.scenarioId,
        status: updatedProgram!.status,
        currentTaskIndex: updatedProgram!.currentTaskIndex,
        completedTasks: updatedProgram!.completedTasks,
        totalTasks: updatedProgram!.totalTasks,
        startedAt: updatedProgram!.startTime.toISOString(),
        updatedAt: updatedProgram!.lastActivityAt.toISOString()
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