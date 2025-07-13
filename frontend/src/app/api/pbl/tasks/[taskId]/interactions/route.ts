import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { IInteraction } from '@/types/unified-learning';

// POST - Add interaction to task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { taskId } = await params;
    const body = await request.json();
    const { interaction } = body;

    // Validate required fields
    if (!interaction) {
      return NextResponse.json(
        { success: false, error: 'Missing interaction data' },
        { status: 400 }
      );
    }

    // Use unified architecture
    const { getTaskRepository } = await import('@/lib/implementations/gcs-v2');
    const taskRepo = getTaskRepository();

    // Create interaction in unified format
    const newInteraction: IInteraction = {
      timestamp: interaction.timestamp || new Date().toISOString(),
      type: interaction.type === 'user' ? 'user_input' : 
            interaction.type === 'ai' ? 'ai_response' : 'system_event',
      content: interaction.content,
      metadata: {
        role: interaction.role || interaction.type,
        originalType: interaction.type,
        ...interaction.metadata
      }
    };

    // Add interaction to task
    await taskRepo.addInteraction(taskId, newInteraction);

    return NextResponse.json({
      success: true,
      message: 'Interaction saved successfully'
    });

  } catch (error) {
    console.error('Error saving task interaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save interaction' },
      { status: 500 }
    );
  }
}

// GET - Get task interactions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { taskId } = await params;

    // Use unified architecture
    const { getTaskRepository } = await import('@/lib/implementations/gcs-v2');
    const taskRepo = getTaskRepository();

    // Get task with interactions
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return NextResponse.json({
        success: true,
        data: {
          interactions: []
        }
      });
    }

    // Transform interactions for frontend compatibility
    const transformedInteractions = (task.interactions || []).map(i => ({
      id: `${task.id}_${i.timestamp}`,
      type: i.type === 'user_input' ? 'user' : 
            i.type === 'ai_response' ? 'ai' : 'system',
      content: i.content,
      timestamp: i.timestamp,
      role: i.metadata?.role || i.type
    }));

    return NextResponse.json({
      success: true,
      data: {
        interactions: transformedInteractions,
        taskStatus: task.status,
        evaluationId: task.evaluationId
      }
    });

  } catch (error) {
    console.error('Error fetching task interactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch interactions' },
      { status: 500 }
    );
  }
}