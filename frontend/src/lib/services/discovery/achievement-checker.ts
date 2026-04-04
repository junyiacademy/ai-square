/**
 * AchievementChecker
 * Thin wrapper around AchievementEngine that exposes an event-driven API
 * suitable for calling directly from task completion routes.
 *
 * Delegates the actual award logic to AchievementEngine (which already reads
 * YAML definitions and writes to users.achievements JSON).
 */

import { getPool } from "@/lib/db/get-pool";
import { GamificationRepository } from "@/lib/repositories/postgresql/gamification-repository";
import { AchievementEngine } from "./achievement-engine";
import { SkillProgressService } from "./skill-progress-service";
import { LearnerModelService } from "./learner-model-service";
import type { EarnedAchievement } from "./gamification-types";

export interface AchievementEvent {
  type:
    | "task_completed"
    | "skill_leveled_up"
    | "milestone_completed"
    | "streak_updated";
  taskId?: string;
  skillId?: string;
  newLevel?: number;
  score?: number;
}

export class AchievementChecker {
  private repo: GamificationRepository;
  private engine: AchievementEngine;
  private skillService: SkillProgressService;
  private learnerModelService: LearnerModelService;

  constructor() {
    this.repo = new GamificationRepository(getPool());
    this.engine = new AchievementEngine();
    this.skillService = new SkillProgressService();
    this.learnerModelService = new LearnerModelService();
  }

  /**
   * Check and award achievements after a gamification event.
   * Returns the list of newly earned achievements (empty if none).
   */
  async checkAndAward(
    userId: string,
    careerId: string,
    _event: AchievementEvent,
  ): Promise<EarnedAchievement[]> {
    try {
      // Build context for the achievement engine
      const [profile, skillLevels, learnerModel] = await Promise.all([
        this.repo.getProfile(userId),
        this.skillService.getSkillLevels(userId, careerId),
        this.learnerModelService
          .getLearnerModel(userId, careerId)
          .catch(() => null),
      ]);

      const totalTasksCompleted =
        learnerModel?.totalTasksCompleted ?? 0;

      return await this.engine.checkAndAward({
        userId,
        careerId,
        totalTasksCompleted,
        skillLevels,
        currentLevel: profile.level,
        streakDays: profile.streak.currentStreak,
      });
    } catch (err) {
      // Non-blocking — log and return empty array
      console.error("[AchievementChecker] checkAndAward failed:", err);
      return [];
    }
  }
}
