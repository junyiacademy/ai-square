import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

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
    
    return NextResponse.json({
      success: true,
      interactions: task.interactions || []
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
    if (!type || !content) {
      return NextResponse.json(
        { success: false, error: 'Invalid interaction data' },
        { status: 400 }
      );
    }
    
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Use unified architecture
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
    
    // Create new interaction
    const newInteraction = {
      timestamp: new Date().toISOString(),
      type,
      content,
      metadata: {
        userId: session.user.email,
        userAgent: request.headers.get('User-Agent') || ''
      }
    };
    
    // Update task with new interaction
    const updatedInteractions = [...(task.interactions || []), newInteraction];
    await taskRepo.updateInteractions(taskId, updatedInteractions);
    
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