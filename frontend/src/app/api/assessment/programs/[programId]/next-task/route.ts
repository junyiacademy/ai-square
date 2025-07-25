import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Get user from authentication
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { currentTaskId } = body;
    
    // Await params before using
    const { programId } = await params;
    
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership by getting user ID from email
    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findByEmail(session.user.email);
    if (!user || program.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Complete current task if specified
    if (currentTaskId) {
      await taskRepo.updateStatus?.(currentTaskId, "completed");
    }
    
    // Get all tasks
    const tasks = await taskRepo.findByProgram(programId);
    const currentIndex = program.currentTaskIndex || 0;
    const nextIndex = currentIndex + 1;
    
    console.log('Tasks loaded:', tasks.length);
    console.log('Moving from task', currentIndex, 'to', nextIndex);
    
    // Check if there are more tasks
    if (nextIndex >= tasks.length) {
      // No more tasks, assessment is complete
      return NextResponse.json({
        complete: true,
        nextTask: null
      });
    }
    
    // Update program's current task index
    await programRepo.update?.(programId, {
      currentTaskIndex: nextIndex
    });
    
    // Start the next task if it's still pending
    let nextTask = tasks[nextIndex];
    if (nextTask && nextTask.status === 'pending' && !nextTask.startedAt) {
      await taskRepo.update?.(nextTask.id, {
        status: 'active',
        metadata: {
          ...nextTask.metadata,
          startedAt: new Date().toISOString()
        }
      });
      // Re-fetch to get updated task
      const updatedTask = await taskRepo.findById(nextTask.id);
      if (updatedTask) {
        nextTask = updatedTask;
      }
    }
    
    console.log('Next task details:', {
      id: nextTask?.id,
      title: nextTask?.title,
      hasContent: !!nextTask?.content,
      hasContext: !!nextTask?.content,
      questionsInContext: Array.isArray((nextTask?.content as Record<string, unknown>)?.questions) 
        ? ((nextTask?.content as Record<string, unknown>)?.questions as unknown[]).length 
        : 0,
      questionsDirect: 0,
      contentKeys: nextTask?.content ? Object.keys(nextTask.content) : [],
      contextKeys: nextTask?.content ? Object.keys(nextTask.content) : []
    });
    
    return NextResponse.json({
      complete: false,
      nextTask,
      currentTaskIndex: nextIndex,
      totalTasks: tasks.length
    });
  } catch (error) {
    console.error('Error moving to next task:', error);
    return NextResponse.json(
      { error: 'Failed to move to next task' },
      { status: 500 }
    );
  }
}