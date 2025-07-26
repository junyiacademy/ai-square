import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

// POST - Create evaluation for task
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
    const { evaluation, programId } = body;

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: 'Missing evaluation data' },
        { status: 400 }
      );
    }

    // Use unified architecture
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const evalRepo = repositoryFactory.getEvaluationRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const userRepo = repositoryFactory.getUserRepository();
    
    // Get user by email to get UUID
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if task already has an evaluation
    const task = await taskRepo.findById(taskId);
    let evaluationRecord;
    
    // Helper to create evaluation with proper structure
    const createEvaluationData = (evaluation: Record<string, unknown>, existingMetadata?: Record<string, unknown>) => ({
      userId: user.id,
      programId: programId || undefined,
      taskId: taskId,
      mode: 'pbl' as const,
      evaluationType: 'task',
      evaluationSubtype: 'pbl_task',
      score: evaluation.score || 0,
      maxScore: 100,
      timeTakenSeconds: (evaluation.timeTakenSeconds as number) || 0,
      domainScores: (evaluation.domainScores as Record<string, number>) || {},
      feedbackText: evaluation.feedback || '',
      feedbackData: {
        strengths: (evaluation.strengths as string[]) || [],
        improvements: (evaluation.improvements as string[]) || [],
        nextSteps: (evaluation.nextSteps as string[]) || []
      },
      aiAnalysis: (evaluation.conversationInsights as Record<string, unknown>) || {},
      createdAt: new Date().toISOString(),
      pblData: {
        ksaScores: (evaluation.ksaScores as Record<string, number>) || (evaluation.domainScores as Record<string, number>) || {},
        rubricsScores: (evaluation.rubricsScores as Record<string, number>) || {},
        conversationCount: (evaluation.conversationCount as number) || 0
      },
      discoveryData: {},
      assessmentData: {},
      metadata: {
        ...existingMetadata,
        programId: programId || '',
        evaluatedAt: evaluation.evaluatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updateCount: (existingMetadata?.updateCount as number || 0) + 1
      }
    });
    
    const existingEvaluationId = task?.metadata?.evaluationId as string | undefined;
    if (existingEvaluationId) {
      // Update existing evaluation
      const existingEval = await evalRepo.findById(existingEvaluationId);
      if (existingEval) {
        // Evaluation repository doesn't have update method, create new one
        evaluationRecord = await evalRepo.create(createEvaluationData(evaluation, existingEval.metadata));
      } else {
        // Evaluation ID exists but evaluation not found, create new one
        evaluationRecord = await evalRepo.create(createEvaluationData(evaluation));
      }
    } else {
      // No existing evaluation, create new one
      evaluationRecord = await evalRepo.create(createEvaluationData(evaluation));
      
      // Update task with evaluation ID only if it's a new evaluation
      await taskRepo.update?.(taskId, {
        status: 'completed' as const,
        completedAt: task?.completedAt || new Date().toISOString(),
        metadata: {
          ...task?.metadata,
          evaluationId: evaluationRecord.id
        }
      });
    }
    
    // Mark program evaluation as outdated (async)
    setImmediate(async () => {
      try {
        const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
        const programRepo = repositoryFactory.getProgramRepository();
        const program = await programRepo.findById(programId);
        
        if (program?.metadata?.evaluationId) {
          // Just update the program metadata instead
          await programRepo.update?.(program.id, {
            metadata: {
              ...program.metadata,
              evaluationOutdated: true,
              lastTaskEvaluationAt: new Date().toISOString()
            }
          });
        }
      } catch (error) {
        console.error('Failed to mark program evaluation as outdated:', error);
      }
    });

    // Transform evaluation to match frontend expectations
    const transformedEvaluation = {
      ...evaluationRecord,
      score: evaluationRecord.score || 0,
      ksaScores: evaluationRecord.metadata?.ksaScores || {},
      domainScores: evaluationRecord.metadata?.domainScores || {},
      rubricsScores: evaluationRecord.metadata?.rubricsScores || {},
      strengths: evaluationRecord.metadata?.strengths || [],
      improvements: evaluationRecord.metadata?.improvements || [],
      nextSteps: evaluationRecord.metadata?.nextSteps || [],
      conversationInsights: evaluationRecord.metadata?.conversationInsights || {},
      conversationCount: evaluationRecord.metadata?.conversationCount || 0,
      evaluatedAt: evaluationRecord.metadata?.evaluatedAt || evaluationRecord.createdAt
    };
    
    return NextResponse.json({
      success: true,
      message: existingEvaluationId ? 'Evaluation updated successfully' : 'Evaluation created successfully',
      data: {
        evaluationId: evaluationRecord.id,
        evaluation: transformedEvaluation,
        isUpdate: !!existingEvaluationId
      }
    });

  } catch (error) {
    console.error('Error creating evaluation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create evaluation' },
      { status: 500 }
    );
  }
}

// GET - Get task evaluation
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
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const taskRepo = repositoryFactory.getTaskRepository();
    const evalRepo = repositoryFactory.getEvaluationRepository();

    // Get task to check if it has evaluationId
    const task = await taskRepo.findById(taskId);
    
    let evaluation = null;
    
    const evaluationId = task?.metadata?.evaluationId as string | undefined;
    if (evaluationId) {
      // Direct lookup by evaluation ID
      evaluation = await evalRepo.findById(evaluationId);
    } else {
      // Fallback: search by task
      const evaluations = await evalRepo.findByTask(taskId);
      evaluation = evaluations[0] || null;
    }
    
    // Transform evaluation to match frontend expectations
    const transformedEvaluation = evaluation ? {
      ...evaluation,
      score: evaluation.score || 0,
      ksaScores: (evaluation as Record<string, unknown> & { pbl_data?: { ksaScores?: Record<string, number> } }).pbl_data?.ksaScores || evaluation.pblData?.ksaScores || {},
      domainScores: evaluation.domainScores || (evaluation as Record<string, unknown> & { domain_scores?: Record<string, number> }).domain_scores || {},
      rubricsScores: (evaluation as Record<string, unknown> & { pbl_data?: { rubricsScores?: Record<string, number> } }).pbl_data?.rubricsScores || evaluation.metadata?.rubricsScores || {},
      strengths: evaluation.feedbackData?.strengths || evaluation.metadata?.strengths || [],
      improvements: evaluation.feedbackData?.improvements || evaluation.metadata?.improvements || [],
      nextSteps: evaluation.feedbackData?.nextSteps || evaluation.metadata?.nextSteps || [],
      conversationInsights: evaluation.aiAnalysis || (evaluation as Record<string, unknown> & { ai_analysis?: Record<string, unknown> }).ai_analysis || evaluation.metadata?.conversationInsights || {},
      conversationCount: (evaluation as Record<string, unknown> & { pbl_data?: { conversationCount?: number } }).pbl_data?.conversationCount || evaluation.metadata?.conversationCount || 0,
      evaluatedAt: evaluation.metadata?.evaluatedAt || evaluation.createdAt
    } : null;

    return NextResponse.json({
      success: true,
      data: {
        evaluation: transformedEvaluation,
        hasEvaluation: !!evaluation
      }
    });

  } catch (error) {
    console.error('Error fetching evaluation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch evaluation' },
      { status: 500 }
    );
  }
}