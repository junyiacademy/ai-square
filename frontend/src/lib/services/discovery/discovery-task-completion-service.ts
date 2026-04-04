import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { FeedbackGenerationService } from "./feedback-generation-service";
import { ITask } from "@/types/unified-learning";
import { GamificationService } from "./gamification-service";

export interface TaskCompletionResult {
  evaluation: {
    id: string;
    score: number;
    feedbackText?: string;
    createdAt: string;
  };
  xpEarned: number;
  feedback: string;
  feedbackVersions: Record<string, string>;
  gamification?: {
    leveledUp: boolean;
    newLevel?: number;
    totalXp: number;
    skillLevelUps: string[];
    newAchievements: Array<{ id: string; name: string; xpReward: number }>;
    streak: { currentStreak: number; longestStreak: number };
    isFirstWin?: boolean;
  };
}

/**
 * Service for completing Discovery mode tasks
 * Handles evaluation creation, feedback generation, and task status updates
 */
export class DiscoveryTaskCompletionService {
  /**
   * Check if task has at least one passing interaction
   */
  static hasTaskPassed(
    task: ITask & { interactions: Array<{ type: string; content: unknown }> },
  ): boolean {
    return task.interactions.some(
      (i) =>
        i.type === "ai_response" &&
        (i.content as { completed?: boolean })?.completed === true,
    );
  }

  /**
   * Complete a task with comprehensive evaluation
   */
  static async completeTaskWithEvaluation(
    task: ITask & {
      interactions: Array<{
        type: string;
        content: unknown;
        metadata?: unknown;
      }>;
    },
    program: { scenarioId: string; metadata?: unknown },
    userId: string,
    userLanguage: string,
    careerType: string,
  ): Promise<TaskCompletionResult> {
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    const taskRepo = repositoryFactory.getTaskRepository();

    // Generate comprehensive feedback
    let comprehensiveFeedback = "Task completed successfully!";
    let bestXP = this.findBestXPEarned(task);
    let passedAttempts = this.countPassedAttempts(task);

    try {
      const result =
        await FeedbackGenerationService.generateComprehensiveFeedback(
          task,
          program,
          careerType,
          userLanguage,
        );
      comprehensiveFeedback = result.feedback;
      bestXP = result.bestXP;
      passedAttempts = result.passedAttempts;
    } catch (error) {
      console.error("Error generating comprehensive feedback:", error);
      comprehensiveFeedback =
        FeedbackGenerationService.getFallbackMessage(userLanguage);
    }

    // Extract skills improved
    const allSkillsImproved = this.extractSkillsImproved(task);

    // Build feedback versions
    const feedbackVersions: Record<string, string> = {};
    feedbackVersions[userLanguage] = comprehensiveFeedback;
    if (userLanguage !== "en") {
      feedbackVersions["en"] = comprehensiveFeedback;
    }

    // Create evaluation
    const evaluation = await evaluationRepo.create({
      userId: userId,
      programId: task.programId,
      taskId: task.id,
      mode: "discovery",
      evaluationType: "task",
      evaluationSubtype: "discovery_task",
      score: Math.min(bestXP, 100),
      maxScore: 100,
      domainScores: {},
      feedbackText: feedbackVersions["en"],
      feedbackData: feedbackVersions,
      aiAnalysis: {},
      timeTakenSeconds: 0,
      createdAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {
        xpEarned: bestXP,
        totalAttempts: task.interactions.filter((i) => i.type === "user_input")
          .length,
        passedAttempts: passedAttempts,
        skillsImproved: allSkillsImproved,
      },
      assessmentData: {},
      metadata: {
        feedbackVersions: feedbackVersions,
        completed: true,
        originalLanguage: userLanguage,
        actualXPEarned: bestXP,
      },
    });

    // Update task status to completed
    await taskRepo.update?.(task.id, {
      status: "completed" as const,
      completedAt: new Date().toISOString(),
      metadata: {
        ...(task.metadata || {}),
        evaluation: {
          id: evaluation.id,
          score: evaluation.score,
          actualXP: bestXP,
          feedback: feedbackVersions[userLanguage] || evaluation.feedbackText,
          feedbackVersions: feedbackVersions,
          evaluatedAt: evaluation.createdAt,
        },
      },
    });

    // === Gamification Pipeline ===
    let gamification: TaskCompletionResult["gamification"];
    try {
      const gamificationService = new GamificationService();

      // Feature 6: First Win Acceleration
      // If this is the user's very first completed task, award a 500 XP bonus
      // so they immediately level up and feel the achievement.
      let effectiveXP = bestXP;
      let isFirstWin = false;
      try {
        const { GamificationRepository } = await import(
          "@/lib/repositories/postgresql/gamification-repository"
        );
        const { getPool } = await import("@/lib/db/get-pool");
        const repo = new GamificationRepository(getPool());
        const profile = await repo.getProfile(userId);
        // totalXp === 0 means no XP has ever been awarded → first ever task
        if (profile.totalXp === 0) {
          effectiveXP += 500;
          isFirstWin = true;
          console.log(
            `[FirstWin] User ${userId} completed their first task. Granting +500 bonus XP.`,
          );
        }
      } catch (firstWinErr) {
        console.error("[FirstWin] Failed to check first-win status:", firstWinErr);
      }

      gamification = await gamificationService.processTaskCompletion(
        userId,
        careerType,
        effectiveXP,
        Math.min(effectiveXP, 100), // score (0-100)
        task.interactions.filter((i) => i.type === "user_input").length, // attempts
        allSkillsImproved,
      );

      if (isFirstWin && gamification) {
        // Surface first-win flag so the frontend can show special messaging
        (gamification as typeof gamification & { isFirstWin: boolean }).isFirstWin = true;
      }
    } catch (error) {
      console.error("Gamification update failed (non-blocking):", error);
    }

    return {
      evaluation,
      xpEarned: bestXP,
      feedback: comprehensiveFeedback,
      feedbackVersions,
      gamification,
    };
  }

  /**
   * Extract unique skills improved from all AI interactions
   */
  static extractSkillsImproved(
    task: ITask & { interactions: Array<{ type: string; content: unknown }> },
  ): string[] {
    const allSkillsImproved = new Set<string>();

    task.interactions
      .filter((i) => i.type === "ai_response")
      .forEach((i) => {
        const content = i.content as { skillsImproved?: string[] };
        if (content.skillsImproved) {
          content.skillsImproved.forEach((skill) =>
            allSkillsImproved.add(skill),
          );
        }
      });

    return Array.from(allSkillsImproved);
  }

  /**
   * Find the best (maximum) XP earned from passed attempts
   */
  static findBestXPEarned(
    task: ITask & { interactions: Array<{ type: string; content: unknown }> },
  ): number {
    const passedInteractions = task.interactions.filter(
      (i) =>
        i.type === "ai_response" &&
        (i.content as { completed?: boolean })?.completed === true,
    );

    if (passedInteractions.length === 0) {
      return 100; // Default if no passed attempts
    }

    return Math.max(
      ...passedInteractions.map(
        (i) => (i.content as { xpEarned?: number })?.xpEarned || 0,
      ),
    );
  }

  /**
   * Count number of passed attempts
   */
  static countPassedAttempts(
    task: ITask & { interactions: Array<{ type: string; content: unknown }> },
  ): number {
    return task.interactions.filter(
      (i) =>
        i.type === "ai_response" &&
        (i.content as { completed?: boolean })?.completed === true,
    ).length;
  }
}
