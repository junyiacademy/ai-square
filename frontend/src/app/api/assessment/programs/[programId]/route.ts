import { NextRequest, NextResponse } from 'next/server';
import { 
  getProgramRepository, 
  getTaskRepository 
} from '@/lib/implementations/gcs-v2';
import { getUserFromRequest } from '@/lib/auth/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { programId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    
    // Get program
    const program = await programRepo.findById(params.programId);
    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership
    if (program.userId !== user.email) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get current task (assessment usually has only one task)
    const tasks = await taskRepo.findByProgram(params.programId);
    const currentTask = tasks[0]; // Assessment typically has one task
    
    if (!currentTask) {
      return NextResponse.json(
        { error: 'No task found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      program,
      currentTask,
      totalTasks: tasks.length
    });
  } catch (error) {
    console.error('Error getting program:', error);
    return NextResponse.json(
      { error: 'Failed to load program' },
      { status: 500 }
    );
  }
}