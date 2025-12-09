import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { getLanguageFromHeader } from '@/lib/utils/language';
import { Task, Evaluation } from '@/lib/repositories/interfaces';
import {
  FeedbackGenerationService,
  QualitativeFeedback,
  TaskSummary,
} from '@/lib/services/pbl/feedback-generation.service';

interface CompletionData {
  overallScore: number;
  evaluatedTasks: number;
  totalTasks: number;
  totalTimeSeconds: number;
  domainScores: Record<string, number>;
  tasks?: Array<{
    taskId: string;
    evaluation?: {
      score: number;
      feedback: string;
      strengths: string[];
      improvements: string[];
    };
    log?: {
      interactions?: Array<{
        role: string;
        context: string;
      }>;
    };
  }>;
  qualitativeFeedback?: QualitativeFeedback | Record<string, QualitativeFeedback>;
  feedbackLanguage?: string;
}

interface GenerateFeedbackBody {
  programId: string;
  scenarioId: string;
  forceRegenerate?: boolean;
  language?: string;
}

interface ScenarioYAML {
  title?: string;
  learning_objectives?: string[];
  scenario_info?: {
    title?: string;
    learning_objectives?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const { programId, scenarioId, forceRegenerate: originalForceRegenerate = false, language }: GenerateFeedbackBody = await request.json();
    let forceRegenerate = originalForceRegenerate;

    if (!programId || !scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get user session
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }
    const userEmail = session.user.email;

    // Get repositories
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const programRepo = repositoryFactory.getProgramRepository();
    const evalRepo = repositoryFactory.getEvaluationRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const userRepo = repositoryFactory.getUserRepository();

    // Get user by email to get UUID
    const user = await userRepo.findByEmail(userEmail);
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

    // Get or create program evaluation
    let evaluation;
    const evaluationId = program.metadata?.evaluationId as string | undefined;
    if (evaluationId) {
      evaluation = await evalRepo.findById(evaluationId);
    }

    if (!evaluation) {
      // Trigger evaluation calculation if needed
      const completeUrl = new URL(`/api/pbl/programs/${programId}/complete`, request.url);
      const completeRes = await fetch(completeUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({})
      });

      if (!completeRes.ok) {
        return NextResponse.json(
          { success: false, error: 'Failed to create program evaluation' },
          { status: 500 }
        );
      }

      const completeData = await completeRes.json();
      evaluation = completeData.evaluation;
    }

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: 'Evaluation not found' },
        { status: 404 }
      );
    }

    // Build completion data from evaluation for backward compatibility
    const tasks = await taskRepo.findByProgram(programId);
    const taskEvaluations = await Promise.all(
      tasks.map(async (task: Task) => {
        if (task.metadata?.evaluationId) {
          const taskEval = await evalRepo.findById(task.metadata.evaluationId as string);
          return { task, evaluation: taskEval };
        }
        return { task, evaluation: null };
      })
    );

    const completionData: CompletionData = {
      overallScore: evaluation.score || 0,
      evaluatedTasks: evaluation.metadata?.evaluatedTasks as number || 0,
      totalTasks: evaluation.metadata?.totalTasks as number || tasks.length,
      totalTimeSeconds: evaluation.metadata?.totalTimeSeconds as number || 0,
      domainScores: evaluation.metadata?.domainScores as Record<string, number> || {},
      tasks: taskEvaluations.map(({ task, evaluation: taskEval }: { task: Task; evaluation: Evaluation | null }) => ({
        taskId: task.id,
        evaluation: taskEval ? {
          score: taskEval.score || 0,
          feedback: (taskEval.metadata?.feedback as string) || '',
          strengths: (taskEval.metadata?.strengths as string[]) || [],
          improvements: (taskEval.metadata?.improvements as string[]) || []
        } : undefined,
        log: {
          interactions: [] // Task interactions would need to be fetched separately if needed
        }
      })),
      qualitativeFeedback: evaluation.metadata?.qualitativeFeedback as QualitativeFeedback | Record<string, QualitativeFeedback> | undefined,
      feedbackLanguage: evaluation.metadata?.feedbackLanguage as string | undefined
    };

    // Get current language - prioritize explicit language parameter
    const currentLang = language || getLanguageFromHeader(request);

    // If forceRegenerate, mark existing feedback for current language as invalid
    const existingQualitativeFeedback = evaluation.metadata?.qualitativeFeedback as Record<string, {
      content?: QualitativeFeedback;
      isValid?: boolean;
      generatedAt?: string;
      evaluationVersion?: string;
    }> | undefined;
    if (forceRegenerate && existingQualitativeFeedback?.[currentLang]) {
      // Mark the feedback as invalid to trigger regeneration
      const updatedMetadata = {
        ...evaluation.metadata,
        qualitativeFeedback: {
          ...existingQualitativeFeedback,
          [currentLang]: {
            ...existingQualitativeFeedback[currentLang],
            isValid: false
          }
        }
      };

      // Update evaluation metadata directly
      await evalRepo.update?.(evaluation.id, {
        metadata: updatedMetadata
      });

      // Update local evaluation object
      evaluation.metadata = updatedMetadata;
    }

    // Check if valid feedback already exists for current language
    const feedbackData = evaluation.metadata?.qualitativeFeedback as Record<string, {
      content?: QualitativeFeedback;
      isValid?: boolean;
      generatedAt?: string;
      evaluationVersion?: string;
    }> | undefined;
    const existingFeedback = feedbackData?.[currentLang];

    // Check if feedback needs regeneration due to evaluation updates
    const currentEvaluationVersion = evaluation.metadata?.lastSyncedAt || evaluation.createdAt;
    const feedbackOutdated = existingFeedback?.evaluationVersion &&
                            currentEvaluationVersion &&
                            new Date(currentEvaluationVersion) > new Date(existingFeedback.evaluationVersion);

    // If evaluation is outdated, clear all language feedback
    if (feedbackOutdated && feedbackData) {
      console.log('Evaluation updated - clearing all language feedback');

      // Clear all language feedback since evaluation has been updated
      const clearedFeedback: Record<string, { isValid: boolean }> = {};
      Object.keys(feedbackData).forEach(lang => {
        clearedFeedback[lang] = { isValid: false };
      });

      // Update evaluation metadata to invalidate all feedback
      await evalRepo.update?.(evaluation.id, {
        metadata: {
          ...evaluation.metadata,
          qualitativeFeedback: clearedFeedback
        }
      });

      // Force regeneration for current language
      forceRegenerate = true;
    }

    if (!forceRegenerate && existingFeedback?.isValid && existingFeedback?.content && !feedbackOutdated) {
      return NextResponse.json({
        success: true,
        feedback: existingFeedback.content,
        cached: true,
        language: currentLang,
        debug: {
          feedbackGeneratedAt: existingFeedback.generatedAt,
          evaluationVersion: existingFeedback.evaluationVersion,
          currentEvaluationVersion,
          outdated: feedbackOutdated
        }
      });
    }

    // Get scenario data from unified architecture
    const scenarioRepo = repositoryFactory.getScenarioRepository();

    let scenarioData: ScenarioYAML = {};
    try {
      const scenario = await scenarioRepo.findById(scenarioId);
      if (scenario) {
        scenarioData = {
          title: typeof scenario.title === 'string' ? scenario.title : (scenario.title as Record<string, string>)?.[language || 'en'] || (scenario.title as Record<string, string>)?.en || '',
          learning_objectives: scenario.metadata?.learningObjectives as string[] || [],
          scenario_info: {
            title: typeof scenario.title === 'string' ? scenario.title : (scenario.title as Record<string, string>)?.[language || 'en'] || (scenario.title as Record<string, string>)?.en || '',
            learning_objectives: scenario.metadata?.learningObjectives as string[] || []
          }
        };
      }
    } catch (error) {
      console.error('Error reading scenario data:', error);
    }

    // Prepare task summaries for AI analysis
    const taskSummaries: TaskSummary[] = completionData.tasks?.map((task) => ({
      taskId: task.taskId,
      score: task.evaluation?.score || 0,
      conversations: task.log?.interactions?.filter((i: { role: string; context: string }) => i.role === 'user')
        .map((i: { role: string; context: string }) => (i as { content?: unknown }).content as string || '') || [],
      feedback: task.evaluation?.feedback || '',
      strengths: task.evaluation?.strengths || [],
      improvements: task.evaluation?.improvements || []
    })) || [];

    // Use FeedbackGenerationService to generate AI feedback
    const feedbackService = new FeedbackGenerationService();
    const feedback = await feedbackService.generateQualitativeFeedback(
      {
        overallScore: completionData.overallScore,
        evaluatedTasks: completionData.evaluatedTasks,
        totalTasks: completionData.totalTasks,
        totalTimeSeconds: completionData.totalTimeSeconds,
        domainScores: completionData.domainScores,
        taskSummaries,
      },
      {
        title: scenarioData.title || 'Learning Scenario',
        learningObjectives: scenarioData.learning_objectives || [],
      },
      currentLang
    );

    // Save feedback to evaluation with language info
    // Keep existing feedback for other languages unless they were invalidated
    const currentQualitativeFeedback = evaluation.metadata?.qualitativeFeedback as Record<string, unknown> || {};
    const updatedQualitativeFeedback = {
      ...currentQualitativeFeedback,
      [currentLang]: {
        content: feedback,
        generatedAt: new Date().toISOString(),
        isValid: true,
        evaluationVersion: evaluation.metadata?.lastSyncedAt || evaluation.createdAt
      }
    };

    // Store updated feedback in evaluation metadata
    await evalRepo.update?.(evaluation.id, {
      metadata: {
        ...evaluation.metadata,
        qualitativeFeedback: updatedQualitativeFeedback,
        generatedLanguages: [
          ...(evaluation.metadata?.generatedLanguages || []).filter((l: string) => l !== currentLang),
          currentLang
        ]
      }
    });

    return NextResponse.json({
      success: true,
      feedback,
      cached: false,
      language: currentLang,
      evaluationId: evaluation.id
    });

  } catch (error) {
    console.error('Error generating feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate feedback' },
      { status: 500 }
    );
  }
}
