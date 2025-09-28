import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { getLanguageFromHeader } from '@/lib/utils/language';

// POST - Create evaluation for task
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
    const { evaluation, programId } = body;
    
    // Get language from request
    const currentLang = getLanguageFromHeader(request);
    
    console.log('POST /api/pbl/tasks/[taskId]/evaluate - Received evaluation:');
    console.log('  domainScores:', JSON.stringify(evaluation?.domainScores || {}, null, 2));

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
      score: (evaluation.score as number) || 0,
      maxScore: 100,
      timeTakenSeconds: (evaluation.timeTakenSeconds as number) || 0,
      domainScores: (evaluation.domainScores as Record<string, number>) || {},
      feedbackText: (evaluation.feedback as string) || '',
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
        language: currentLang, // Store current evaluation language
        updateCount: (existingMetadata?.updateCount as number || 0) + 1
      }
    });
    
    const existingEvaluationId = task?.metadata?.evaluationId as string | undefined;
    if (existingEvaluationId) {
      // Re-evaluation: Create new evaluation and update task to point to it
      const existingEval = await evalRepo.findById(existingEvaluationId);
      evaluationRecord = await evalRepo.create(createEvaluationData(evaluation, existingEval?.metadata));
      
      console.log('Re-evaluated task, new evaluation record:');
      console.log('  Old evaluation ID:', existingEvaluationId);
      console.log('  New evaluation ID:', evaluationRecord.id);
      console.log('  domainScores:', JSON.stringify(evaluationRecord.domainScores || {}, null, 2));
      
      // Update task to point to the new evaluation
      await taskRepo.update?.(taskId, {
        status: 'completed' as const,
        completedAt: task?.completedAt || new Date().toISOString(),
        metadata: {
          ...task?.metadata,
          evaluationId: evaluationRecord.id,
          previousEvaluationId: existingEvaluationId,
          reEvaluatedAt: new Date().toISOString()
        }
      });
    } else {
      // No existing evaluation, create new one
      evaluationRecord = await evalRepo.create(createEvaluationData(evaluation));
      
      console.log('Created evaluation record:');
      console.log('  domainScores:', JSON.stringify(evaluationRecord.domainScores || {}, null, 2));
      
      // Update task with evaluation ID for the first time
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
        
        if (program) {
          // Always mark as outdated when a task is evaluated, regardless of whether program has evaluation
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
      ksaScores: evaluationRecord.pblData?.ksaScores || {},
      domainScores: evaluationRecord.domainScores || {},
      rubricsScores: evaluationRecord.pblData?.rubricsScores || {},
      strengths: evaluationRecord.feedbackData?.strengths || [],
      improvements: evaluationRecord.feedbackData?.improvements || [],
      nextSteps: evaluationRecord.feedbackData?.nextSteps || [],
      conversationInsights: evaluationRecord.aiAnalysis || {},
      conversationCount: evaluationRecord.pblData?.conversationCount || 0,
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
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const { taskId } = await params;

    // Get current language from request
    const currentLang = getLanguageFromHeader(request);

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
    
    // Check if evaluation language matches current language
    const evaluationLang = evaluation?.metadata?.language as string || 'en';
    const languageMatch = evaluationLang === currentLang;
    
    // Transform evaluation to match frontend expectations
    const transformedEvaluation = evaluation ? {
      ...evaluation,
      score: evaluation.score || 0,
      ksaScores: evaluation.pblData?.ksaScores || {},
      domainScores: evaluation.domainScores || {},
      rubricsScores: evaluation.pblData?.rubricsScores || {},
      strengths: evaluation.feedbackData?.strengths || [],
      improvements: evaluation.feedbackData?.improvements || [],
      nextSteps: evaluation.feedbackData?.nextSteps || [],
      conversationInsights: evaluation.aiAnalysis || {},
      conversationCount: evaluation.pblData?.conversationCount || 0,
      evaluatedAt: evaluation.metadata?.evaluatedAt || evaluation.createdAt,
      // Language mismatch info for frontend
      evaluationLanguage: evaluationLang,
      currentLanguage: currentLang,
      needsTranslation: !languageMatch
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