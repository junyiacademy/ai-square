/**
 * Service for handling program completion logic
 * Coordinates evaluation creation, score calculation, and sync verification
 */

import { ScoreCalculationService } from "./score-calculation.service";
import { SyncVerificationService } from "./sync-verification.service";
import type {
  IEvaluationRepository,
  IProgramRepository,
  ITaskRepository,
} from "@/lib/repositories/interfaces";

interface Task {
  id: string;
  programId: string;
  status?: string;
  score?: number;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

interface Evaluation {
  id: string;
  score?: number;
  domainScores?: Record<string, number>;
  pblData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface Program {
  id: string;
  userId: string;
  status?: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

// Use actual repository interfaces with extended capabilities
type TaskRepository = ITaskRepository & {
  getTaskWithInteractions?: (taskId: string) => Promise<{
    id: string;
    interactions: Array<{
      type: string;
      timestamp: string;
    }>;
  } | null>;
};

type EvaluationRepository = IEvaluationRepository;
type ProgramRepository = IProgramRepository;

interface CompletionMetrics {
  overallScore: number;
  domainScores: Record<string, number>;
  ksaScores: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
  totalTimeSeconds: number;
  conversationCount: number;
  syncChecksum: string;
}

export class ProgramCompletionService {
  private scoreCalculator: ScoreCalculationService;
  private syncVerifier: SyncVerificationService;

  constructor() {
    this.scoreCalculator = new ScoreCalculationService();
    this.syncVerifier = new SyncVerificationService();
  }

  /**
   * Calculate all metrics for program completion
   */
  async calculateCompletionMetrics(
    programId: string,
    tasks: Task[],
    taskRepo: TaskRepository,
    evalRepo: EvaluationRepository,
  ): Promise<CompletionMetrics> {
    // Get all task evaluations
    const taskEvaluations = await Promise.all(
      tasks.map(async (task) => {
        if (task.metadata?.evaluationId) {
          const evaluation = await evalRepo.findById(
            task.metadata.evaluationId as string,
          );
          return { task, evaluation };
        }
        return { task, evaluation: null };
      }),
    );

    const evaluatedTasks = taskEvaluations.filter(
      (te) => te.evaluation !== null,
    );
    const evaluations = evaluatedTasks.map((te) => te.evaluation!);

    // Calculate scores
    const overallScore =
      this.scoreCalculator.calculateOverallScore(evaluations);
    const domainScores =
      this.scoreCalculator.calculateDomainScores(evaluations);
    const ksaScores = this.scoreCalculator.calculateKSAScores(evaluations);

    // Calculate time and conversations
    let totalTimeSeconds = 0;
    let conversationCount = 0;

    for (const task of tasks) {
      const taskWithInteractions = await taskRepo.getTaskWithInteractions?.(
        task.id,
      );
      if (
        taskWithInteractions?.interactions &&
        taskWithInteractions.interactions.length > 0
      ) {
        const interactions = taskWithInteractions.interactions;
        const firstInteraction = interactions[0];
        const lastInteraction = interactions[interactions.length - 1];
        const taskTime = Math.floor(
          (new Date(lastInteraction.timestamp).getTime() -
            new Date(firstInteraction.timestamp).getTime()) /
            1000,
        );
        totalTimeSeconds += taskTime;
        conversationCount += interactions.filter(
          (i) => i.type === "user_input",
        ).length;
      }
    }

    // Generate checksum
    const tasksWithEvaluation = tasks.map((t) => ({
      id: t.id,
      evaluationId: t.metadata?.evaluationId as string | undefined,
      completedAt: t.completedAt,
    }));
    const syncChecksum =
      await this.syncVerifier.generateChecksum(tasksWithEvaluation);

    return {
      overallScore,
      domainScores,
      ksaScores,
      totalTimeSeconds,
      conversationCount,
      syncChecksum,
    };
  }

  /**
   * Clear feedback validity flags when evaluation changes
   */
  clearFeedbackFlags(
    qualitativeFeedback: Record<string, unknown> | undefined | null,
  ): Record<string, unknown> {
    if (!qualitativeFeedback || typeof qualitativeFeedback !== "object") {
      return {};
    }

    const clearedFeedback: Record<string, unknown> = {};
    Object.keys(qualitativeFeedback).forEach((lang) => {
      const langFeedback = qualitativeFeedback[lang];
      clearedFeedback[lang] = {
        ...(typeof langFeedback === "object" && langFeedback !== null
          ? langFeedback
          : {}),
        isValid: false,
      };
    });

    return clearedFeedback;
  }

  /**
   * Create or update program evaluation
   */
  async createOrUpdateEvaluation(
    program: Program,
    metrics: CompletionMetrics,
    userId: string,
    taskEvaluationIds: string[],
    totalTasks: number,
    evalRepo: EvaluationRepository,
    programRepo: ProgramRepository,
  ): Promise<{ evaluation: Evaluation; updateReason: string }> {
    const evaluatedTasksCount = taskEvaluationIds.length;
    let evaluation: Evaluation;
    let updateReason = "new_evaluation";

    const programEvaluationId = program.metadata?.evaluationId as
      | string
      | undefined;

    if (programEvaluationId) {
      const existing = await evalRepo.findById(programEvaluationId);

      if (
        existing &&
        (existing.score !== metrics.overallScore ||
          existing.metadata?.evaluatedTaskCount !== evaluatedTasksCount)
      ) {
        updateReason = "score_update";

        const updated = await evalRepo.update?.(programEvaluationId, {
          score: metrics.overallScore,
          domainScores: metrics.domainScores,
          metadata: {
            ...existing.metadata,
            overallScore: metrics.overallScore,
            totalTimeSeconds: metrics.totalTimeSeconds,
            evaluatedTasks: evaluatedTasksCount,
            totalTasks,
            domainScores: metrics.domainScores,
            ksaScores: metrics.ksaScores,
            isLatest: true,
            syncChecksum: metrics.syncChecksum,
            evaluatedTaskCount: evaluatedTasksCount,
            lastSyncedAt: new Date().toISOString(),
            qualitativeFeedback: this.clearFeedbackFlags(
              existing.metadata?.qualitativeFeedback as Record<string, unknown>,
            ),
            conversationInsights: {
              totalConversations: metrics.conversationCount,
            },
          },
        });

        evaluation = updated || existing;

        // Clear outdated flag
        await programRepo.update?.(program.id, {
          metadata: {
            ...program.metadata,
            evaluationOutdated: false,
          },
        });
      } else {
        evaluation = existing!;

        if (program.metadata?.evaluationOutdated === true) {
          await programRepo.update?.(program.id, {
            metadata: {
              ...program.metadata,
              evaluationOutdated: false,
            },
          });
        }
      }
    } else {
      // Create new evaluation
      const finalScore =
        typeof metrics.overallScore === "number" && !isNaN(metrics.overallScore)
          ? metrics.overallScore
          : 0;

      evaluation = await evalRepo.create({
        userId,
        programId: program.id,
        mode: "pbl",
        evaluationType: "pbl_complete",
        score: finalScore,
        maxScore: 100,
        timeTakenSeconds: metrics.totalTimeSeconds,
        domainScores: metrics.domainScores,
        feedbackText: "",
        feedbackData: {},
        aiAnalysis: {},
        createdAt: new Date().toISOString(),
        pblData: {
          taskEvaluationIds,
          ksaScores: metrics.ksaScores,
          evaluatedTasks: evaluatedTasksCount,
          totalTasks,
          conversationCount: metrics.conversationCount,
        },
        discoveryData: {},
        assessmentData: {},
        metadata: {
          overallScore: metrics.overallScore,
          totalTimeSeconds: metrics.totalTimeSeconds,
          evaluatedTasks: evaluatedTasksCount,
          totalTasks,
          domainScores: metrics.domainScores,
          ksaScores: metrics.ksaScores,
          isLatest: true,
          syncChecksum: metrics.syncChecksum,
          evaluatedTaskCount: evaluatedTasksCount,
          lastSyncedAt: new Date().toISOString(),
          qualitativeFeedback: {},
          generatedLanguages: [],
        },
      });

      // Update program with evaluation ID
      await programRepo.update?.(program.id, {
        status: "completed" as const,
        completedAt: new Date().toISOString(),
        metadata: {
          ...program.metadata,
          evaluationId: evaluation.id,
          evaluationOutdated: false,
          completedAt: program.completedAt || new Date().toISOString(),
        },
      });
    }

    return { evaluation, updateReason };
  }
}
