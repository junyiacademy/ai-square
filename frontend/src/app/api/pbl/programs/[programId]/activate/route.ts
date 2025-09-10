import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;
    
    // Get user session using unified auth
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }
    const userEmail = session.user.email;
    
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
    await programRepo.update?.(programId, { status: "active" });
    
    // Initialize the first task if not already initialized
    const existingTasks = await taskRepo.findByProgram(programId);
    const taskExists = existingTasks.some(t => t.taskIndex === 0);
    
    if (!taskExists) {
      // Create the first task
      await taskRepo.create({
        programId: programId,
        mode: 'pbl' as const,
        taskIndex: 0,
        type: 'chat' as const,
        status: 'active' as const,
        title: taskTitle,
        content: {
          context: {
            scenarioId: scenarioId
          }
        },
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {
          taskId: taskId,
          title: taskTitle
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
        completedTaskCount: updatedProgram!.completedTaskCount,
        totalTaskCount: updatedProgram!.totalTaskCount,
        startedAt: updatedProgram!.startedAt || updatedProgram!.createdAt,
        updatedAt: updatedProgram!.lastActivityAt
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