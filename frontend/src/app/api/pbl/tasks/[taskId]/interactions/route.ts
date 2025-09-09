import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { cachedGET } from '@/lib/api/optimization-utils';
import { cacheService } from '@/lib/cache/cache-service';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import type { Interaction } from '@/lib/repositories/interfaces';

// POST - Add interaction to task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Get user session
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
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

    // Store interaction in task.interactions column
    const task = await taskRepo.findById(taskId);
    if (!task) {
      console.error(`Task not found: ${taskId}`);
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    const currentInteractions = task.interactions || [];
    
    // Add the new interaction with consistent format
    const newInteraction: Interaction = {
      timestamp: interaction.timestamp || new Date().toISOString(),
      type: interaction.type === 'user' ? 'user_input' : 
            interaction.type === 'ai' ? 'ai_response' : 
            'system_event',
      content: interaction.content,
      metadata: interaction.metadata
    };
    
    const updatedInteractions = [...currentInteractions, newInteraction];
    
    // Update task interactions using updateInteractions method
    if (taskRepo.updateInteractions) {
      await taskRepo.updateInteractions(taskId, updatedInteractions);
    } else {
      // Fallback to update method
      await taskRepo.update?.(taskId, {
        interactions: updatedInteractions
      });
    }
    
    // For user interactions, also record attempt for scoring
    if (interaction.type === 'user') {
      await taskRepo.recordAttempt?.(taskId, {
        response: interaction.content,
        timeSpent: interaction.metadata?.timeSpent || 0
      });
    }

    // Clear cache for this task's interactions
    const cacheKey = `api:/api/pbl/tasks/${taskId}/interactions:`;
    
    // Clear both local and distributed cache
    await Promise.all([
      cacheService.delete(cacheKey),
      distributedCacheService.delete(cacheKey)
    ]);

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
  const session = await getUnifiedAuth(request);
  if (!session?.user?.email) {
    return createUnauthorizedResponse();
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

    // Get interactions from task.interactions column
    const interactions = task.interactions || [];
    
    // Transform interactions for frontend compatibility
    const transformedInteractions = interactions.map((i: Interaction) => ({
      id: `${task.id}_${i.timestamp}`,
      type: i.type === 'user_input' ? 'user' : 
            i.type === 'ai_response' ? 'ai' : 
            'system',
      content: i.content,
      timestamp: i.timestamp
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
    ttl: 10, // Reduced to 10 seconds for interactions (they change frequently)
    staleWhileRevalidate: 30, // 30 seconds
    useDistributedCache: false // Disable distributed cache for frequently changing data
  });
}