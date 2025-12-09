import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { ProgramCompletionService } from '@/lib/services/pbl/program-completion.service';
import { SyncVerificationService } from '@/lib/services/pbl/sync-verification.service';

const completionService = new ProgramCompletionService();
const syncService = new SyncVerificationService();

// POST - Calculate or update Program Evaluation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> },
  internalCall?: { userEmail: string; userId: string }
) {
  try {
    const { programId } = await params;

    // Authenticate user
    let userId: string;
    if (internalCall) {
      userId = internalCall.userId;
    } else {
      const session = await getUnifiedAuth(request);
      if (!session?.user?.email) {
        return createUnauthorizedResponse();
      }

      const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
      const userRepo = repositoryFactory.getUserRepository();
      const user = await userRepo.findByEmail(session.user.email);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
      userId = user.id;
    }

    // Get repositories
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evalRepo = repositoryFactory.getEvaluationRepository();

    // Get and verify program
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json(
        { success: false, error: 'Program not found' },
        { status: 404 }
      );
    }

    if (program.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get tasks and their evaluations
    const tasks = await taskRepo.findByProgram(programId);
    const taskEvaluations = await Promise.all(
      tasks.map(async (task) => {
        if (task.metadata?.evaluationId) {
          const evaluation = await evalRepo.findById(task.metadata.evaluationId as string);
          return { task, evaluation };
        }
        return { task, evaluation: null };
      })
    );

    const evaluatedTasks = taskEvaluations.filter(te => te.evaluation !== null);

    // Calculate completion metrics
    const metrics = await completionService.calculateCompletionMetrics(
      programId,
      tasks,
      taskRepo,
      evalRepo
    );

    // Create or update evaluation
    const taskEvaluationIds = evaluatedTasks.map(te => te.evaluation!.id);
    const { evaluation, updateReason } = await completionService.createOrUpdateEvaluation(
      program,
      metrics,
      userId,
      taskEvaluationIds,
      tasks.length,
      evalRepo,
      programRepo
    );

    // Debug information
    const debugInfo = {
      programId,
      totalTasks: tasks.length,
      evaluatedTasks: evaluatedTasks.length,
      taskDetails: tasks.map(t => ({
        id: t.id,
        hasEvaluation: !!t.metadata?.evaluationId,
        status: t.status
      })),
      calculatedScores: {
        overall: metrics.overallScore,
        domains: metrics.domainScores,
        ksa: metrics.ksaScores
      },
      syncChecksum: metrics.syncChecksum,
      calculatedAt: new Date().toISOString()
    };

    console.log('Program evaluation calculation debug:', debugInfo);

    return NextResponse.json({
      success: true,
      evaluation,
      debug: {
        updateReason,
        ...debugInfo
      }
    });
  } catch (error) {
    console.error('Error completing program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete program' },
      { status: 500 }
    );
  }
}

// GET - Get Program Evaluation with optional recalculation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'en';

    // Authenticate
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    // Get repositories and user
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const programRepo = repositoryFactory.getProgramRepository();
    const evalRepo = repositoryFactory.getEvaluationRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const userRepo = repositoryFactory.getUserRepository();

    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get and verify program
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Program not found or access denied' },
        { status: 404 }
      );
    }

    let evaluation = null;
    let verificationResult = null;

    const evaluationId = program.metadata?.evaluationId as string | undefined;

    if (evaluationId) {
      evaluation = await evalRepo.findById(evaluationId);

      if (evaluation) {
        // Verify evaluation status
        const tasks = await taskRepo.findByProgram(programId);
        const tasksWithEval = tasks.map(t => ({
          id: t.id,
          evaluationId: t.metadata?.evaluationId as string | undefined,
          completedAt: t.completedAt
        }));

        verificationResult = await syncService.verifyEvaluationStatus(program, evaluation, tasksWithEval);

        console.log('GET /api/pbl/programs/[programId]/complete - Verification result:', {
          programId,
          evaluationId: evaluation.id,
          needsUpdate: verificationResult.needsUpdate,
          reason: verificationResult.reason,
          debug: verificationResult.debug
        });

        if (verificationResult.needsUpdate) {
          console.log('Triggering program evaluation recalculation due to:', verificationResult.reason);

          // Trigger recalculation
          const recalcResponse = await POST(request, { params }, { userEmail: session.user.email, userId: user.id });
          const recalcData = await recalcResponse.json();

          if (recalcData.success) {
            evaluation = recalcData.evaluation;
          } else {
            console.error('Failed to recalculate program evaluation:', recalcData);
          }
        }
      }
    } else {
      // No evaluation yet, create one
      const calcResponse = await POST(request, { params }, { userEmail: session.user.email, userId: user.id });
      const calcData = await calcResponse.json();

      if (calcData.success) {
        evaluation = calcData.evaluation;
      }
    }

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: 'Failed to get or create evaluation' },
        { status: 500 }
      );
    }

    // Check if qualitative feedback exists for the requested language
    const langFeedback = evaluation.metadata?.qualitativeFeedback?.[language];
    const hasValidFeedback = langFeedback?.isValid;

    return NextResponse.json({
      success: true,
      evaluation,
      needsFeedbackGeneration: !hasValidFeedback && evaluation.metadata?.evaluatedTasks > 0,
      currentLanguage: language,
      debug: {
        verificationResult,
        feedbackStatus: {
          exists: !!langFeedback,
          isValid: langFeedback?.isValid,
          generatedAt: langFeedback?.generatedAt
        }
      }
    });
  } catch (error) {
    console.error('Error fetching program evaluation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch evaluation' },
      { status: 500 }
    );
  }
}
