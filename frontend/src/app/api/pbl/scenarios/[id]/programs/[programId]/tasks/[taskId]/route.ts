import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string; taskId: string }> }
) {
  try {
    const { id: scenarioId, programId, taskId } = await params;
    
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Use unified architecture to get task
    const { getTaskRepository, getProgramRepository } = await import('@/lib/implementations/gcs-v2');
    const taskRepo = getTaskRepository();
    const programRepo = getProgramRepository();
    
    // First verify the program exists and belongs to the user
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== session.user.email) {
      return NextResponse.json(
        { success: false, error: 'Program not found or access denied' },
        { status: 404 }
      );
    }
    
    // Get the task
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Verify the task belongs to the program
    if (task.programId !== programId) {
      return NextResponse.json(
        { success: false, error: 'Task does not belong to this program' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(task);
    
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}