import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { ITask } from '@/types/unified-learning';
import { TaskEvaluationService } from '@/lib/services/discovery/task-evaluation-service';
import { FeedbackGenerationService } from '@/lib/services/discovery/feedback-generation-service';
import { MultilingualHelper } from '@/lib/services/discovery/multilingual-helper';
import { EvaluationTranslationService } from '@/lib/services/discovery/evaluation-translation-service';
import { DiscoveryTaskCompletionService } from '@/lib/services/discovery/discovery-task-completion-service';
import { DiscoveryTaskProgressService } from '@/lib/services/discovery/discovery-task-progress-service';

// GET a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string; taskId: string }> }
) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const { programId, taskId } = await params;
    const userId = session.user.id;

    const url = new URL(request.url);
    const requestedLanguage = url.searchParams.get('lang') || 'en';

    console.log('GET task language:', requestedLanguage);

    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();

    const program = await programRepo.findById(programId);
    if (!program || program.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const taskWithInteractions = await taskRepo.getTaskWithInteractions?.(taskId);
    if (!taskWithInteractions || taskWithInteractions.programId !== programId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = taskWithInteractions;

    const scenario = await scenarioRepo.findById(program.scenarioId);

    let processedEvaluation = null;
    const evaluationId = (task.metadata?.evaluationId as string) || (task.metadata?.evaluation as { id?: string })?.id || null;

    if (evaluationId && task.status === 'completed') {
      const fullEvaluation = await evaluationRepo.findById(evaluationId);

      if (fullEvaluation) {
        const careerType = ((scenario?.metadata as Record<string, unknown>)?.careerType || 'general') as string;

        processedEvaluation = await EvaluationTranslationService.getOrTranslateFeedback(
          fullEvaluation,
          requestedLanguage,
          careerType,
          taskId,
          task.metadata || {}
        );
      }
    }

    return NextResponse.json({
      id: task.id,
      title: MultilingualHelper.extractTitle(task.title as string | Record<string, string> | undefined, requestedLanguage),
      type: task.type,
      status: task.status,
      content: MultilingualHelper.processContent(task.content as Record<string, unknown>, requestedLanguage),
      interactions: task.interactions,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      evaluation: processedEvaluation,
      careerType: ((scenario?.metadata as Record<string, unknown>)?.careerType || 'unknown') as string,
      scenarioTitle: MultilingualHelper.extractTitle(scenario?.title as string | Record<string, string> | undefined, requestedLanguage)
    });
  } catch (error) {
    console.error('Error in GET task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update task (submit response, update status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string; taskId: string }> }
) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const { programId, taskId } = await params;
    const userId = session.user.id;

    const body = await request.json();
    const { action, content } = body;

    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();

    const program = await programRepo.findById(programId);
    if (!program || program.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const taskWithInteractions = await taskRepo.getTaskWithInteractions?.(taskId);
    if (!taskWithInteractions || taskWithInteractions.programId !== programId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = taskWithInteractions;

    if (action === 'submit') {
      return handleSubmitAction(task, taskId, content, program, request, taskRepo);
    } else if (action === 'confirm-complete') {
      return handleConfirmCompleteAction(task, taskId, program, programId, userId, request, taskRepo, programRepo, evaluationRepo, session);
    } else if (action === 'regenerate-evaluation') {
      return handleRegenerateEvaluationAction(task, taskId, program, request, taskRepo);
    } else if (action === 'start') {
      await taskRepo.updateStatus?.(taskId, 'active');
      return NextResponse.json({ success: true, status: 'active' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in PATCH task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleSubmitAction(
  task: ITask & { interactions: Array<{ timestamp: string; type: string; content: unknown; metadata?: unknown }> },
  taskId: string,
  content: { response: string; timeSpent?: number },
  program: { metadata?: unknown },
  request: NextRequest,
  taskRepo: ReturnType<typeof repositoryFactory.getTaskRepository>
) {
  const newInteraction = TaskEvaluationService.createUserInteraction(content);
  const currentInteractions = task.interactions || [];
  const updatedInteractions = [...currentInteractions, newInteraction];

  await taskRepo.updateInteractions?.(taskId, updatedInteractions);
  await taskRepo.recordAttempt?.(taskId, {
    response: content.response,
    timeSpent: content.timeSpent || 0
  });

  const language = (program.metadata as { language?: string })?.language || 'en';
  const acceptLanguage = request.headers.get('accept-language')?.split(',')[0];
  const userLanguage = acceptLanguage || language;

  try {
    const evaluationResult = await TaskEvaluationService.evaluateTaskSubmission(
      task,
      content.response,
      userLanguage
    );

    const aiInteraction = TaskEvaluationService.createAIInteraction(evaluationResult);

    const latestTask = await taskRepo.getTaskWithInteractions?.(taskId);
    const latestInteractions = latestTask?.interactions || updatedInteractions;
    const finalInteractions = [...latestInteractions, aiInteraction];

    await taskRepo.updateInteractions?.(taskId, finalInteractions);
    await taskRepo.update?.(taskId, {
      metadata: {
        lastEvaluation: evaluationResult,
        lastEvaluatedAt: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      completed: evaluationResult.completed,
      feedback: evaluationResult.feedback,
      strengths: evaluationResult.strengths || [],
      improvements: evaluationResult.improvements || [],
      xpEarned: evaluationResult.xpEarned || 0,
      canComplete: evaluationResult.completed
    });
  } catch (aiError) {
    console.error('AI evaluation error:', aiError);
    return NextResponse.json({
      success: false,
      error: 'AI evaluation failed',
      feedback: '評估時發生錯誤，請稍後再試。',
      canComplete: false
    });
  }
}

async function handleConfirmCompleteAction(
  task: ITask & { interactions: Array<{ timestamp: string; type: string; content: unknown; metadata?: unknown }> },
  taskId: string,
  program: { scenarioId: string; metadata?: unknown },
  programId: string,
  userId: string,
  request: NextRequest,
  taskRepo: ReturnType<typeof repositoryFactory.getTaskRepository>,
  programRepo: ReturnType<typeof repositoryFactory.getProgramRepository>,
  evaluationRepo: ReturnType<typeof repositoryFactory.getEvaluationRepository>,
  session: { user: { id: string; email?: string } }
) {
  // Check if task has passed
  if (!DiscoveryTaskCompletionService.hasTaskPassed(task)) {
    return NextResponse.json({ error: 'Task has not been passed yet' }, { status: 400 });
  }

  // Get scenario and determine language
  const scenarioRepo = repositoryFactory.getScenarioRepository();
  const scenario = await scenarioRepo.findById(program.scenarioId);
  const careerType = (scenario?.metadata?.careerType || 'unknown') as string;
  const language = (program.metadata as { language?: string })?.language || 'en';
  const acceptLanguage = request.headers.get('accept-language')?.split(',')[0];
  const userLanguage = acceptLanguage || language;

  console.log('Confirm-complete language:', userLanguage, 'Career:', careerType);

  // Complete task with evaluation
  const { evaluation, xpEarned, feedback } = await DiscoveryTaskCompletionService.completeTaskWithEvaluation(
    task,
    program,
    userId,
    userLanguage,
    careerType
  );

  // Update program XP
  await DiscoveryTaskProgressService.updateProgramXP(
    programId,
    xpEarned,
    program.metadata as Record<string, unknown>
  );

  // Activate next task
  const taskIds = (program.metadata as { taskIds?: string[] })?.taskIds || [];
  const progressResult = await DiscoveryTaskProgressService.activateNextTask(
    programId,
    taskIds,
    {
      ...(program.metadata || {}),
      totalXP: ((program.metadata as { totalXP?: number })?.totalXP || 0) + xpEarned
    }
  );

  // If program completed, create completion evaluation
  if (progressResult.programCompleted) {
    await programRepo.update?.(programId, { status: "completed" });

    const finalXP = ((program.metadata as { totalXP?: number })?.totalXP || 0) + xpEarned;
    const allTasks = await taskRepo.findByProgram(programId);
    const taskMap = new Map(allTasks.map(t => [t.id, t]));
    const orderedTasks = taskIds.map((id: string) => taskMap.get(id)).filter(Boolean) as ITask[];

    await evaluationRepo.create({
      userId: session.user.id,
      programId: programId,
      mode: 'discovery',
      evaluationType: 'program',
      evaluationSubtype: 'discovery_completion',
      score: 100,
      maxScore: 100,
      timeTakenSeconds: 0,
      domainScores: {},
      feedbackText: 'Congratulations! You have completed all learning tasks in this program.',
      feedbackData: {},
      aiAnalysis: {},
      createdAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {
        totalXP: finalXP,
        tasksCompleted: orderedTasks.length
      },
      assessmentData: {},
      metadata: {
        domainScores: {},
        totalXP: finalXP,
        tasksCompleted: orderedTasks.length
      }
    });
  }

  return NextResponse.json({
    success: true,
    taskCompleted: true,
    evaluation: {
      id: evaluation.id,
      score: evaluation.score,
      xpEarned,
      feedback
    },
    nextTaskId: progressResult.nextTaskId,
    programCompleted: progressResult.programCompleted
  });
}

async function handleRegenerateEvaluationAction(
  task: ITask & { interactions: Array<{ timestamp: string; type: string; content: unknown; metadata?: unknown }> },
  taskId: string,
  program: { scenarioId: string; metadata?: unknown },
  request: NextRequest,
  taskRepo: ReturnType<typeof repositoryFactory.getTaskRepository>
) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  if (task.status !== 'completed') {
    return NextResponse.json({ error: 'Task must be completed to regenerate evaluation' }, { status: 400 });
  }

  const scenarioRepo = repositoryFactory.getScenarioRepository();
  const scenario = await scenarioRepo.findById(program.scenarioId);
  const careerType = (scenario?.metadata?.careerType || 'unknown') as string;
  const language = (program.metadata as { language?: string })?.language || 'en';
  const acceptLanguage = request.headers.get('accept-language')?.split(',')[0];
  const userLanguage = acceptLanguage || language;

  console.log('Regenerate evaluation language:', userLanguage);

  let comprehensiveFeedback = 'Successfully regenerated task evaluation!';
  let bestXP = 100;

  try {
    const result = await FeedbackGenerationService.generateComprehensiveFeedback(
      task,
      program,
      careerType,
      userLanguage
    );
    comprehensiveFeedback = result.feedback;
    bestXP = result.bestXP;
  } catch (error) {
    console.error('Error regenerating comprehensive feedback:', error);
    comprehensiveFeedback = 'Failed to regenerate feedback. Please try again.';
  }

  const evaluationId = (task.metadata?.evaluationId as string) || (task.metadata?.evaluation as { id?: string })?.id;

  if (evaluationId) {
    const { getPool } = await import('@/lib/db/get-pool');
    const pool = getPool();

    await pool.query(
      `UPDATE evaluations
       SET feedback_text = $1,
           feedback_data = feedback_data || $2::jsonb,
           metadata = metadata || $3::jsonb
       WHERE id = $4`,
      [
        comprehensiveFeedback,
        JSON.stringify({ [userLanguage]: comprehensiveFeedback }),
        JSON.stringify({
          regeneratedAt: new Date().toISOString(),
          regeneratedBy: 'api'
        }),
        evaluationId
      ]
    );

    console.log('Successfully updated evaluation:', evaluationId);

    await taskRepo.update?.(taskId, {
      metadata: {
        ...task.metadata,
        evaluation: {
          ...(task.metadata?.evaluation as Record<string, unknown> || {}),
          feedback: comprehensiveFeedback,
          feedbackVersions: {
            ...((task.metadata?.evaluation as { feedbackVersions?: Record<string, string> })?.feedbackVersions || {}),
            [userLanguage]: comprehensiveFeedback
          },
          lastRegeneratedAt: new Date().toISOString()
        }
      }
    });
  }

  return NextResponse.json({
    success: true,
    evaluation: {
      id: task.metadata?.evaluationId as string,
      score: bestXP,
      feedback: comprehensiveFeedback,
      regenerated: true
    }
  });
}
