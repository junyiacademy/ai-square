import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { cachedGET } from '@/lib/api/optimization-utils';
// Removed unused import

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
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const taskRepo = repositoryFactory.getTaskRepository();

    // Record user attempt or update metadata for other interactions
    if (interaction.type === 'user') {
      await taskRepo.recordAttempt?.(taskId, {
        response: interaction.content,
        timeSpent: interaction.metadata?.timeSpent || 0
      });
    } else {
      // For AI and system interactions, store in task metadata
      const task = await taskRepo.findById(taskId);
      if (task) {
        const metadata = task.metadata || {};
        const interactions = (metadata.interactions as Array<Record<string, unknown>>) || [];
        interactions.push({
          timestamp: interaction.timestamp || new Date().toISOString(),
          type: interaction.type,
          content: interaction.content,
          role: interaction.role || interaction.type,
          metadata: interaction.metadata
        });
        
        await taskRepo.update?.(taskId, {
          metadata: {
            ...metadata,
            interactions
          }
        });
      }
    }

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
  // Get user session
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { taskId } = await params;

  return cachedGET(request, async () => {
    // Use unified architecture
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const taskRepo = repositoryFactory.getTaskRepository();

    // Get task with interactions
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return {
        success: true,
        data: {
          interactions: []
        }
      };
    }

    // Transform interactions for frontend compatibility
    const interactions = (task.metadata?.interactions as Array<Record<string, unknown>>) || [];
    const transformedInteractions = interactions.map((i: Record<string, unknown>) => ({
      id: `${task.id}_${i.timestamp}`,
      type: i.type === 'user_input' ? 'user' : 
            i.type === 'ai_response' ? 'ai' : 'system',
      context: i.content,
      timestamp: i.timestamp,
      role: (i.metadata as Record<string, unknown>)?.role || i.type
    }));

    return {
      success: true,
      data: {
        interactions: transformedInteractions,
        taskStatus: task.status,
        evaluationId: task.metadata?.evaluationId as string | undefined
      }
    };
  }, {
    ttl: 120, // 2 minutes cache (interactions change frequently)
    staleWhileRevalidate: 600 // 10 minutes
  });
}