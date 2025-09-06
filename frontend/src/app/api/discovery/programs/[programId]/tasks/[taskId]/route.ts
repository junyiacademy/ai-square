/**
 * Discovery Task Detail API
 * 管理單一 Discovery 任務
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

/**
 * PATCH /api/discovery/programs/[programId]/tasks/[taskId]
 * 更新任務狀態、分數、反饋等
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ programId: string; taskId: string }> }
) {
  try {
    // Check authentication
    const session = await getUnifiedAuth(request);
    if (!session?.user.email) {
      return createUnauthorizedResponse();
    }

    const { programId, taskId } = await context.params;
    const body = await request.json();

    // Get repositories
    const userRepo = repositoryFactory.getUserRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();

    // Get user
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get program and verify ownership
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }

    if (program.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get task and verify it belongs to program
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.programId !== programId) {
      return NextResponse.json(
        { success: false, error: 'Task does not belong to this program' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString()
    };

    // Handle status change
    if (body.status && body.status !== task.status) {
      updateData.status = body.status;
      
      // Set timestamps based on status
      if (body.status === 'active' && task.status === 'pending') {
        updateData.startedAt = new Date().toISOString();
      } else if (body.status === 'completed' && task.status !== 'completed') {
        updateData.completedAt = new Date().toISOString();
      }
    }

    // Update other fields if provided
    if (body.score !== undefined) {
      updateData.score = body.score;
    }

    if (body.feedback) {
      updateData.feedback = body.feedback;
    }

    if (body.timeSpentSeconds !== undefined) {
      updateData.timeSpentSeconds = body.timeSpentSeconds;
    }

    if (body.interactions) {
      updateData.interactions = body.interactions;
    }

    if (body.metadata) {
      updateData.metadata = { ...task.metadata, ...body.metadata };
    }

    // Update task
    const updatedTask = await taskRepo.update?.(taskId, updateData);

    // Update program progress if task was completed
    if (body.status === 'completed' && task.status !== 'completed') {
      const allTasks = await taskRepo.findByProgram(programId);
      const completedCount = allTasks.filter(t => 
        t.id === taskId ? body.status === 'completed' : t.status === 'completed'
      ).length;

      const nextPendingIndex = allTasks.findIndex(t => 
        t.id !== taskId && t.status === 'pending'
      );

      await programRepo.update?.(programId, {
        completedTaskCount: completedCount,
        currentTaskIndex: nextPendingIndex >= 0 ? nextPendingIndex : completedCount,
        lastActivityAt: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        task: updatedTask
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in PATCH /api/discovery/programs/[programId]/tasks/[taskId]:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        meta: {
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}