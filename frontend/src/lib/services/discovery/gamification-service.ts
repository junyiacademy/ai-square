/**
 * Gamification Service — Orchestrator
 * Called after every task completion to update XP, skills, achievements, learner model, and streak.
 * This is the single entry point for all gamification side effects.
 */

import { getPool } from "@/lib/db/get-pool";
import { GamificationRepository } from "@/lib/repositories/postgresql/gamification-repository";
import { LearnerModelService } from "./learner-model-service";
import { AchievementEngine } from "./achievement-engine";
import { SkillProgressService } from "./skill-progress-service";
import type { EarnedAchievement } from "./gamification-types";

export interface GamificationResult {
  leveledUp: boolean;
  newLevel?: number;
  totalXp: number;
  skillLevelUps: string[];
  newAchievements: Array<{ id: string; name: string; xpReward: number }>;
  streak: { currentStreak: number; longestStreak: number };
}

export class GamificationService {
  private repo: GamificationRepository;
  private learnerModelService: LearnerModelService;
  private achievementEngine: AchievementEngine;
  private skillProgressService: SkillProgressService;

  constructor() {
    this.repo = new GamificationRepository(getPool());
    this.learnerModelService = new LearnerModelService();
    this.achievementEngine = new AchievementEngine();
    this.skillProgressService = new SkillProgressService();
  }

  /**
   * Process all gamification updates after a task completion.
   * Order matters: XP → Skills → Streak → Achievements (achievements check all other state)
   */
  async processTaskCompletion(
    userId: string,
    careerId: string,
    xpEarned: number,
    taskScore: number,
    attempts: number,
    skillsImproved: string[],
    taskType?: string,
  ): Promise<GamificationResult> {
    // 1. Add XP and update level
    const { totalXp, level, leveledUp } = await this.repo.addXpAndUpdateLevel(userId, xpEarned);

    // 2. Update skill progress
    const { levelUps: skillLevelUps } = await this.skillProgressService.updateSkillProgress(
      userId,
      careerId,
      skillsImproved,
      xpEarned,
    );

    // 3. Update streak
    const streak = await this.repo.updateStreak(userId);

    // 4. Update learner model
    const learnerModel = await this.learnerModelService.updateAfterTaskCompletion(
      userId,
      careerId,
      taskScore,
      attempts,
      skillsImproved,
      taskType,
    );

    // 5. Check and award achievements (needs all the updated state)
    const skillLevels = await this.skillProgressService.getSkillLevels(userId, careerId);
    const newAchievements: EarnedAchievement[] = await this.achievementEngine.checkAndAward({
      userId,
      careerId,
      totalTasksCompleted: learnerModel.totalTasksCompleted,
      skillLevels,
      currentLevel: level,
      streakDays: streak.currentStreak,
    });

    // 6. Award XP from achievements (bonus XP)
    if (newAchievements.length > 0) {
      const bonusXp = newAchievements.reduce((sum, a) => sum + a.xpReward, 0);
      if (bonusXp > 0) {
        await this.repo.addXpAndUpdateLevel(userId, bonusXp);
      }
    }

    return {
      leveledUp,
      newLevel: leveledUp ? level : undefined,
      totalXp,
      skillLevelUps,
      newAchievements: newAchievements.map((a) => ({
        id: a.id,
        name: a.name,
        xpReward: a.xpReward,
      })),
      streak: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
      },
    };
  }
}
