/**
 * Task Completion API Route
 * POST /api/learning/tasks/[taskId]/complete - Complete a task with evaluation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { postgresqlLearningService } from '@/lib/services/postgresql-learning-service';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getUnifiedAuth(request);
    if (!session?.user.email) {
      return createUnauthorizedResponse();
    }

    // Get task ID from params
    const { taskId } = await params;
    
    // Parse request body
    const body = await request.json();
    const { response, evaluationData } = body;

    // Complete task
    const result = await postgresqlLearningService.completeTask(
      taskId,
      session.user.email,
      response,
      evaluationData
    );

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error completing task:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}