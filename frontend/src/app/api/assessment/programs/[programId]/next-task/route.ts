import { NextRequest, NextResponse } from 'next/server';
import { 
  getProgramRepository, 
  getTaskRepository 
} from '@/lib/implementations/gcs-v2';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Get user from authentication
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { currentTaskId } = body;
    
    // Await params before using
    const { programId } = await params;
    
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== user.email) {
      return NextResponse.json(
        { error: 'Program not found or access denied' },
        { status: 404 }
      );
    }
    
    // Complete current task if specified
    if (currentTaskId) {
      await taskRepo.complete(currentTaskId);
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
    await programRepo.update(programId, {
      currentTaskIndex: nextIndex
    });
    
    // Start the next task
    let nextTask = tasks[nextIndex];
    if (nextTask && nextTask.status === 'not_started') {
      await taskRepo.update(nextTask.id, {
        status: 'pending',
        startedAt: new Date().toISOString()
      });
      // Re-fetch to get updated task
      nextTask = await taskRepo.findById(nextTask.id);
    }
    
    console.log('Next task details:', {
      id: nextTask?.id,
      title: nextTask?.title,
      hasContent: !!nextTask?.content,
      questionsCount: nextTask?.content?.context?.questions?.length || nextTask?.content?.questions?.length || 0
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