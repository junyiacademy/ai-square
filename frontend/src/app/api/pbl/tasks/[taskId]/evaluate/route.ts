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

    // Check if task already has an evaluation
    const task = await taskRepo.findById(taskId);
    let evaluationRecord;
    
    const existingEvaluationId = task?.metadata?.evaluationId as string | undefined;
    if (existingEvaluationId) {
      // Update existing evaluation
      const existingEval = await evalRepo.findById(existingEvaluationId);
      if (existingEval) {
        // Evaluation repository doesn't have update method, create new one
        evaluationRecord = await evalRepo.create({
          userId: task?.programId || '',
          taskId: taskId,
          evaluationType: 'pbl_task',
          score: evaluation.score,
          maxScore: 100,
          timeTakenSeconds: 0,
          metadata: {
            ...existingEval.metadata,
            programId: programId || '',
            ksaScores: evaluation.ksaScores,
            domainScores: evaluation.domainScores,
            rubricsScores: evaluation.rubricsScores,
            strengths: evaluation.strengths,
            improvements: evaluation.improvements,
            nextSteps: evaluation.nextSteps,
            conversationInsights: evaluation.conversationInsights,
            conversationCount: evaluation.conversationCount,
            evaluatedAt: evaluation.evaluatedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updateCount: ((existingEval.metadata as Record<string, unknown>)?.updateCount as number || 0) + 1
          }
        });
      } else {
        // Evaluation ID exists but evaluation not found, create new one
        evaluationRecord = await evalRepo.create({
          userId: task?.programId || '',
          taskId: taskId,
          evaluationType: 'pbl_task',
          score: evaluation.score,
          maxScore: 100,
          timeTakenSeconds: 0,
          metadata: {
            programId: programId || '',
            ksaScores: evaluation.ksaScores,
            domainScores: evaluation.domainScores,
            rubricsScores: evaluation.rubricsScores,
            strengths: evaluation.strengths,
            improvements: evaluation.improvements,
            nextSteps: evaluation.nextSteps,
            conversationInsights: evaluation.conversationInsights,
            conversationCount: evaluation.conversationCount,
            evaluatedAt: evaluation.evaluatedAt || new Date().toISOString()
          }
        });
      }
    } else {
      // No existing evaluation, create new one
      evaluationRecord = await evalRepo.create({
        userId: task?.programId || '',
        taskId: taskId,
        evaluationType: 'pbl_task',
        score: evaluation.score,
        maxScore: 100,
        timeTakenSeconds: 0,
        metadata: {
          programId: programId || '',
          ksaScores: evaluation.ksaScores,
          domainScores: evaluation.domainScores,
          rubricsScores: evaluation.rubricsScores,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          nextSteps: evaluation.nextSteps,
          conversationInsights: evaluation.conversationInsights,
          conversationCount: evaluation.conversationCount,
          evaluatedAt: evaluation.evaluatedAt || new Date().toISOString()
        }
      });
      
      // Update task with evaluation ID only if it's a new evaluation
      await taskRepo.update(taskId, {
        status: 'completed' as const,
        completedAt: task?.completedAt || new Date(),
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
          await programRepo.update(program.id, {
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
      ksaScores: evaluation.metadata?.ksaScores || {},
      domainScores: evaluation.metadata?.domainScores || {},
      rubricsScores: evaluation.metadata?.rubricsScores || {},
      strengths: evaluation.metadata?.strengths || [],
      improvements: evaluation.metadata?.improvements || [],
      nextSteps: evaluation.metadata?.nextSteps || [],
      conversationInsights: evaluation.metadata?.conversationInsights || {},
      conversationCount: evaluation.metadata?.conversationCount || 0,
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