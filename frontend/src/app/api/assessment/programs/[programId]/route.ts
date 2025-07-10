import { NextRequest, NextResponse } from 'next/server';
import { 
  getProgramRepository, 
  getTaskRepository 
} from '@/lib/implementations/gcs-v2';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Try to get user from authentication
    const user = await getAuthFromRequest(request);
    
    // If no auth, check if user info is in query params (for viewing history)
    let userEmail: string | null = null;
    
    if (user) {
      userEmail = user.email;
    } else {
      // Check for user info from query params
      const { searchParams } = new URL(request.url);
      const emailParam = searchParams.get('userEmail');
      
      if (emailParam) {
        userEmail = emailParam;
      } else {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }
    
    // Await params before using
    const { programId } = await params;
    
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership
    if (program.userId !== userEmail) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get current task (assessment usually has only one task)
    const tasks = await taskRepo.findByProgram(programId);
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