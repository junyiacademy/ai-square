import { NextRequest, NextResponse } from 'next/server';
import { EvaluateRequestBody } from '@/types/pbl-evaluate';
import { ErrorResponse } from '@/types/api';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';
import { PBLTaskEvaluationService } from '@/lib/services/pbl/pbl-task-evaluation.service';

/**
 * POST /api/pbl/evaluate
 * Evaluates a PBL task based on learner conversations
 */
export async function POST(request: NextRequest) {
  try {
    // Use unified authentication
    const session = await getUnifiedAuth(request);

    if (!session?.user?.email) {
      return NextResponse.json<ErrorResponse>(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const {
      conversations,
      task,
      targetDomains,
      focusKSA,
      language = 'en'
    }: EvaluateRequestBody = await request.json();

    // Validate required fields
    if (!conversations || !task) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: conversations and task are required' },
        { status: 400 }
      );
    }

    console.log('Evaluating task:', task.id, 'with', conversations.length, 'conversations');

    // Use PBLTaskEvaluationService to evaluate
    const evaluationService = new PBLTaskEvaluationService();
    const result = await evaluationService.evaluateTask({
      task,
      conversations,
      targetDomains,
      focusKSA,
      language
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Evaluation failed',
          details: process.env.NODE_ENV === 'development' ? result.error : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      evaluation: result.evaluation
    });

  } catch (error) {
    console.error('Error in evaluation:', error);

    let errorMessage = 'Failed to evaluate';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error details:', error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
