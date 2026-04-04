/**
 * Achievement Engine
 * Checks and awards achievements after task completion.
 * Reads definitions from YAML, checks user progress, writes to users.achievements JSON.
 */

import { getPool } from "@/lib/db/get-pool";
import { GamificationRepository } from "@/lib/repositories/postgresql/gamification-repository";
import { DiscoveryYAMLLoader } from "@/lib/services/discovery-yaml-loader";
import type { EarnedAchievement } from "./gamification-types";

interface AchievementCheckContext {
  userId: string;
  careerId: string;
  totalTasksCompleted: number;
  skillLevels: Record<string, number>;
  currentLevel: number;
  streakDays: number;
}

export class AchievementEngine {
  private repo: GamificationRepository;
  private yamlLoader: DiscoveryYAMLLoader;

  constructor() {
    this.repo = new GamificationRepository(getPool());
    this.yamlLoader = new DiscoveryYAMLLoader();
  }

  /**
   * Called after task completion. Checks ALL achievement conditions and awards new ones.
   * Returns list of newly earned achievements.
   */
  async checkAndAward(ctx: AchievementCheckContext): Promise<EarnedAchievement[]> {
    const newlyEarned: EarnedAchievement[] = [];

    // 1. Check built-in milestone achievements
    const builtInAchievements = this.getBuiltInAchievements(ctx);
    for (const achievement of builtInAchievements) {
      const added = await this.repo.addAchievement(ctx.userId, achievement);
      if (added) newlyEarned.push(achievement);
    }

    // 2. Check YAML-defined achievements for this career
    try {
      const yamlData = await this.yamlLoader.loadPath(ctx.careerId);
      if (yamlData?.achievements) {
        const yamlAchievements = this.evaluateYAMLAchievements(yamlData.achievements, ctx);
        for (const achievement of yamlAchievements) {
          const added = await this.repo.addAchievement(ctx.userId, achievement);
          if (added) newlyEarned.push(achievement);
        }
      }
    } catch {
      // YAML not available for this career, skip
    }

    return newlyEarned;
  }

  private getBuiltInAchievements(ctx: AchievementCheckContext): EarnedAchievement[] {
    const now = new Date().toISOString();
    const achievements: EarnedAchievement[] = [];

    // First task completed
    if (ctx.totalTasksCompleted >= 1) {
      achievements.push({
        id: "first_task",
        type: "badge",
        careerId: ctx.careerId,
        name: "First Step",
        description: "Completed your first task",
        xpReward: 50,
        earnedAt: now,
      });
    }

    // 5 tasks completed
    if (ctx.totalTasksCompleted >= 5) {
      achievements.push({
        id: `tasks_5_${ctx.careerId}`,
        type: "milestone",
        careerId: ctx.careerId,
        name: "Getting Started",
        description: "Completed 5 tasks in a career path",
        xpReward: 100,
        earnedAt: now,
      });
    }

    // 10 tasks
    if (ctx.totalTasksCompleted >= 10) {
      achievements.push({
        id: `tasks_10_${ctx.careerId}`,
        type: "milestone",
        careerId: ctx.careerId,
        name: "Dedicated Learner",
        description: "Completed 10 tasks in a career path",
        xpReward: 200,
        earnedAt: now,
      });
    }

    // 25 tasks
    if (ctx.totalTasksCompleted >= 25) {
      achievements.push({
        id: `tasks_25_${ctx.careerId}`,
        type: "milestone",
        careerId: ctx.careerId,
        name: "Journeyman",
        description: "Completed 25 tasks in a career path",
        xpReward: 500,
        earnedAt: now,
      });
    }

    // Level milestones
    if (ctx.currentLevel >= 5) {
      achievements.push({
        id: "level_5",
        type: "badge",
        name: "Rising Star",
        description: "Reached level 5",
        xpReward: 100,
        earnedAt: now,
      });
    }

    if (ctx.currentLevel >= 10) {
      achievements.push({
        id: "level_10",
        type: "badge",
        name: "Seasoned Explorer",
        description: "Reached level 10",
        xpReward: 250,
        earnedAt: now,
      });
    }

    // Streak achievements
    if (ctx.streakDays >= 3) {
      achievements.push({
        id: "streak_3",
        type: "badge",
        name: "On a Roll",
        description: "3-day learning streak",
        xpReward: 50,
        earnedAt: now,
      });
    }

    if (ctx.streakDays >= 7) {
      achievements.push({
        id: "streak_7",
        type: "badge",
        name: "Week Warrior",
        description: "7-day learning streak",
        xpReward: 150,
        earnedAt: now,
      });
    }

    // Skill mastery (any skill at level 3+)
    const masteredSkills = Object.entries(ctx.skillLevels).filter(([, level]) => level >= 3);
    if (masteredSkills.length >= 1) {
      achievements.push({
        id: `skill_mastery_first_${ctx.careerId}`,
        type: "mastery",
        careerId: ctx.careerId,
        name: "Skill Apprentice",
        description: "Reached level 3 in any skill",
        xpReward: 100,
        earnedAt: now,
      });
    }

    if (masteredSkills.length >= 3) {
      achievements.push({
        id: `skill_mastery_3_${ctx.careerId}`,
        type: "mastery",
        careerId: ctx.careerId,
        name: "Multi-Talented",
        description: "Reached level 3 in 3 different skills",
        xpReward: 300,
        earnedAt: now,
      });
    }

    return achievements;
  }

  private evaluateYAMLAchievements(
    yamlAchievements: {
      exploration?: Array<{ id: string; name: string; description: string; condition: string; xp_bonus: number }>;
      mastery?: Array<{ id: string; name: string; description: string; skills_required: string[]; level_required: number; xp_bonus: number }>;
      special?: Array<{ id: string; name: string; description: string; hidden: boolean; xp_bonus: number }>;
    },
    ctx: AchievementCheckContext,
  ): EarnedAchievement[] {
    const now = new Date().toISOString();
    const earned: EarnedAchievement[] = [];

    // Exploration achievements — condition-based
    if (yamlAchievements.exploration) {
      for (const a of yamlAchievements.exploration) {
        if (this.evaluateCondition(a.condition, ctx)) {
          earned.push({
            id: `yaml_${ctx.careerId}_${a.id}`,
            type: "exploration",
            careerId: ctx.careerId,
            name: a.name,
            description: a.description,
            xpReward: a.xp_bonus,
            earnedAt: now,
          });
        }
      }
    }

    // Mastery achievements — skill level checks
    if (yamlAchievements.mastery) {
      for (const a of yamlAchievements.mastery) {
        const allMet = a.skills_required.every(
          (skillId) => (ctx.skillLevels[skillId] || 0) >= a.level_required,
        );
        if (allMet) {
          earned.push({
            id: `yaml_${ctx.careerId}_${a.id}`,
            type: "mastery",
            careerId: ctx.careerId,
            name: a.name,
            description: a.description,
            xpReward: a.xp_bonus,
            earnedAt: now,
          });
        }
      }
    }

    return earned;
  }

  /**
   * Simple condition evaluator for YAML exploration achievements.
   * Supports: "complete_N_tasks", "reach_level_N", "streak_N_days"
   */
  private evaluateCondition(condition: string, ctx: AchievementCheckContext): boolean {
    const taskMatch = condition.match(/complete_(\d+)_tasks/);
    if (taskMatch) {
      return ctx.totalTasksCompleted >= parseInt(taskMatch[1]);
    }

    const levelMatch = condition.match(/reach_level_(\d+)/);
    if (levelMatch) {
      return ctx.currentLevel >= parseInt(levelMatch[1]);
    }

    const streakMatch = condition.match(/streak_(\d+)_days/);
    if (streakMatch) {
      return ctx.streakDays >= parseInt(streakMatch[1]);
    }

    return false;
  }
}
