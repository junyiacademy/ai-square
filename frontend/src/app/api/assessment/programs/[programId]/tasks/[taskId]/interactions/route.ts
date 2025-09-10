import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string; taskId: string }> }
) {
  try {
    const { programId, taskId } = await params;
    
    // Only accept UUID format for all IDs
    if (!programId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid program ID format. UUID required.' },
        { status: 400 }
      );
    }
    
    if (!taskId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID format. UUID required.' },
        { status: 400 }
      );
    }
    
    // Get user session
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }
    
    // Use unified architecture to get task
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const taskRepo = repositoryFactory.getTaskRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    
    // First verify the program exists and belongs to the user
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== session.user.id) {
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
    
    // Get interactions from the task repository
    const taskWithInteractions = await taskRepo.getTaskWithInteractions?.(taskId);
    
    return NextResponse.json({
      success: true,
      interactions: taskWithInteractions?.interactions || []
    });
    
  } catch (error) {
    console.error('Error fetching assessment task interactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch interactions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string; taskId: string }> }
) {
  try {
    const { programId, taskId } = await params;
    const { type, content } = await request.json();
    
    // Only accept UUID format for all IDs
    if (!programId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid program ID format. UUID required.' },
        { status: 400 }
      );
    }
    
    if (!taskId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID format. UUID required.' },
        { status: 400 }
      );
    }
    
    // Validate interaction data
    if (!type || !content || type.trim() === '' || content.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Invalid interaction data' },
        { status: 400 }
      );
    }
    
    // Get user session
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }
    
    // Use unified architecture
    const taskRepo = repositoryFactory.getTaskRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    
    // First verify the program exists and belongs to the user
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== session.user.id) {
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
    
    // Create new interaction
    const newInteraction = {
      timestamp: new Date().toISOString(),
      type,
      content,
      metadata: {
        userId: session.user.id,
        userAgent: request.headers.get('User-Agent') || ''
      }
    };
    
    // Update task with the new interaction
    const existingInteractions = Array.isArray(task.metadata?.interactions) 
      ? task.metadata.interactions 
      : [];
    
    await taskRepo.update?.(taskId, {
      metadata: {
        ...task.metadata,
        interactions: [...existingInteractions, newInteraction]
      }
    });
    
    return NextResponse.json({
      success: true,
      interaction: newInteraction
    });
    
  } catch (error) {
    console.error('Error adding assessment task interaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add interaction' },
      { status: 500 }
    );
  }
}