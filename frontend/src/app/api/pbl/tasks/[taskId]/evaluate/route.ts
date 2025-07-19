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
    const { createRepositoryFactory } = await import('@/lib/db/repositories/factory');
    const repositoryFactory = createRepositoryFactory();
    const evalRepo = repositoryFactory.getEvaluationRepository();
    const taskRepo = repositoryFactory.getTaskRepository();

    // Check if task already has an evaluation
    const task = await taskRepo.findById(taskId);
    let evaluationRecord;
    
    if (task?.evaluationId) {
      // Update existing evaluation
      const existingEval = await evalRepo.findById(task.evaluationId);
      if (existingEval) {
        // Update the existing evaluation
        evaluationRecord = await evalRepo.update(task.evaluationId, {
          score: evaluation.score,
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
            updateCount: ((existingEval.metadata as Record<string, unknown>)?.updateCount || 0) + 1
          }
        });
      } else {
        // Evaluation ID exists but evaluation not found, create new one
        evaluationRecord = await evalRepo.create({
          targetType: 'task',
          targetId: taskId,
          evaluationType: 'pbl_task',
          score: evaluation.score,
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
        targetType: 'task',
        targetId: taskId,
        evaluationType: 'pbl_task',
        score: evaluation.score,
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
        evaluationId: evaluationRecord.id,
        status: 'completed' as const,
        completedAt: task?.completedAt || new Date().toISOString()
      });
    }
    
    // Mark program evaluation as outdated (async)
    setImmediate(async () => {
      try {
        const { createRepositoryFactory } = await import('@/lib/db/repositories/factory');
        const repositoryFactory = createRepositoryFactory();
        const programRepo = repositoryFactory.getProgramRepository();
        const program = await programRepo.findById(programId);
        
        if (program?.evaluationId) {
          const evalRepo = repositoryFactory.getEvaluationRepository();
          
          await evalRepo.update(program.evaluationId, {
            metadata: {
              isLatest: false,
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
      message: task?.evaluationId ? 'Evaluation updated successfully' : 'Evaluation created successfully',
      data: {
        evaluationId: evaluationRecord.id,
        evaluation: transformedEvaluation,
        isUpdate: !!task?.evaluationId
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
    const { createRepositoryFactory } = await import('@/lib/db/repositories/factory');
    const repositoryFactory = createRepositoryFactory();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evalRepo = repositoryFactory.getEvaluationRepository();

    // Get task to check if it has evaluationId
    const task = await taskRepo.findById(taskId);
    
    let evaluation = null;
    
    if (task?.evaluationId) {
      // Direct lookup by evaluation ID
      evaluation = await evalRepo.findById(task.evaluationId);
    } else {
      // Fallback: search by target
      const evaluations = await evalRepo.findByTarget('task', taskId);
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