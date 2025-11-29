import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { FeedbackGenerationService } from './feedback-generation-service';
import { ITask } from '@/types/unified-learning';

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
    task: ITask & { interactions: Array<{ type: string; content: unknown }> }
  ): boolean {
    return task.interactions.some(
      i => i.type === 'ai_response' && (i.content as { completed?: boolean })?.completed === true
    );
  }

  /**
   * Complete a task with comprehensive evaluation
   */
  static async completeTaskWithEvaluation(
    task: ITask & { interactions: Array<{ type: string; content: unknown; metadata?: unknown }> },
    program: { scenarioId: string; metadata?: unknown },
    userId: string,
    userLanguage: string,
    careerType: string
  ): Promise<TaskCompletionResult> {
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    const taskRepo = repositoryFactory.getTaskRepository();

    // Generate comprehensive feedback
    let comprehensiveFeedback = 'Task completed successfully!';
    let bestXP = this.findBestXPEarned(task);
    let passedAttempts = this.countPassedAttempts(task);

    try {
      const result = await FeedbackGenerationService.generateComprehensiveFeedback(
        task,
        program,
        careerType,
        userLanguage
      );
      comprehensiveFeedback = result.feedback;
      bestXP = result.bestXP;
      passedAttempts = result.passedAttempts;
    } catch (error) {
      console.error('Error generating comprehensive feedback:', error);
      comprehensiveFeedback = FeedbackGenerationService.getFallbackMessage(userLanguage);
    }

    // Extract skills improved
    const allSkillsImproved = this.extractSkillsImproved(task);

    // Build feedback versions
    const feedbackVersions: Record<string, string> = {};
    feedbackVersions[userLanguage] = comprehensiveFeedback;
    if (userLanguage !== 'en') {
      feedbackVersions['en'] = comprehensiveFeedback;
    }

    // Create evaluation
    const evaluation = await evaluationRepo.create({
      userId: userId,
      programId: task.programId,
      taskId: task.id,
      mode: 'discovery',
      evaluationType: 'task',
      evaluationSubtype: 'discovery_task',
      score: Math.min(bestXP, 100),
      maxScore: 100,
      domainScores: {},
      feedbackText: feedbackVersions['en'],
      feedbackData: feedbackVersions,
      aiAnalysis: {},
      timeTakenSeconds: 0,
      createdAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {
        xpEarned: bestXP,
        totalAttempts: task.interactions.filter(i => i.type === 'user_input').length,
        passedAttempts: passedAttempts,
        skillsImproved: allSkillsImproved,
      },
      assessmentData: {},
      metadata: {
        feedbackVersions: feedbackVersions,
        completed: true,
        originalLanguage: userLanguage,
        actualXPEarned: bestXP
      }
    });

    // Update task status to completed
    await taskRepo.update?.(task.id, {
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
      metadata: {
        ...(task.metadata || {}),
        evaluation: {
          id: evaluation.id,
          score: evaluation.score,
          actualXP: bestXP,
          feedback: feedbackVersions[userLanguage] || evaluation.feedbackText,
          feedbackVersions: feedbackVersions,
          evaluatedAt: evaluation.createdAt
        }
      }
    });

    return {
      evaluation,
      xpEarned: bestXP,
      feedback: comprehensiveFeedback,
      feedbackVersions
    };
  }

  /**
   * Extract unique skills improved from all AI interactions
   */
  static extractSkillsImproved(
    task: ITask & { interactions: Array<{ type: string; content: unknown }> }
  ): string[] {
    const allSkillsImproved = new Set<string>();

    task.interactions
      .filter(i => i.type === 'ai_response')
      .forEach(i => {
        const content = i.content as { skillsImproved?: string[] };
        if (content.skillsImproved) {
          content.skillsImproved.forEach(skill => allSkillsImproved.add(skill));
        }
      });

    return Array.from(allSkillsImproved);
  }

  /**
   * Find the best (maximum) XP earned from passed attempts
   */
  static findBestXPEarned(
    task: ITask & { interactions: Array<{ type: string; content: unknown }> }
  ): number {
    const passedInteractions = task.interactions.filter(
      i => i.type === 'ai_response' && (i.content as { completed?: boolean })?.completed === true
    );

    if (passedInteractions.length === 0) {
      return 100; // Default if no passed attempts
    }

    return Math.max(
      ...passedInteractions.map(
        i => (i.content as { xpEarned?: number })?.xpEarned || 0
      )
    );
  }

  /**
   * Count number of passed attempts
   */
  static countPassedAttempts(
    task: ITask & { interactions: Array<{ type: string; content: unknown }> }
  ): number {
    return task.interactions.filter(
      i => i.type === 'ai_response' && (i.content as { completed?: boolean })?.completed === true
    ).length;
  }
}
