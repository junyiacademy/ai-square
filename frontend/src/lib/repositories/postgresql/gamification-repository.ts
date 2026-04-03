/**
 * Gamification Repository
 * All gamification data stored in existing JSON columns — no new tables.
 *
 * Storage mapping:
 *  - users.skills (JSON)       → skill progress per career
 *  - users.achievements (JSON) → earned achievements array
 *  - users.metadata (JSON)     → learner models + streak
 *  - users.level (INT)         → computed from totalXp
 *  - users.total_xp (INT)     → accumulated XP
 */

import { Pool } from "pg";
import type {
  SkillProgress,
  UserSkillsData,
  EarnedAchievement,
  LearnerModel,
  LearnerModelsData,
  UserStreak,
  UserGamificationMetadata,
  GamificationProfile,
} from "@/lib/services/discovery/gamification-types";

const XP_PER_LEVEL = 500;

export function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

export function xpToNextLevel(totalXp: number): number {
  const currentLevel = calculateLevel(totalXp);
  return currentLevel * XP_PER_LEVEL - totalXp;
}

export class GamificationRepository {
  constructor(private pool: Pool) {}

  // ========================
  // XP & Level
  // ========================

  async addXpAndUpdateLevel(userId: string, xpEarned: number): Promise<{ totalXp: number; level: number; leveledUp: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `SELECT total_xp, level FROM users WHERE id = $1 FOR UPDATE`,
        [userId],
      );
      if (rows.length === 0) throw new Error(`User ${userId} not found`);

      const oldLevel = rows[0].level as number;
      const newTotalXp = (rows[0].total_xp as number) + xpEarned;
      const newLevel = calculateLevel(newTotalXp);

      await client.query(
        `UPDATE users SET total_xp = $1, level = $2, updated_at = NOW() WHERE id = $3`,
        [newTotalXp, newLevel, userId],
      );

      await client.query("COMMIT");
      return { totalXp: newTotalXp, level: newLevel, leveledUp: newLevel > oldLevel };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ========================
  // Skill Progress
  // ========================

  async getSkillProgress(userId: string): Promise<UserSkillsData> {
    const { rows } = await this.pool.query(
      `SELECT skills FROM users WHERE id = $1`,
      [userId],
    );
    if (rows.length === 0) return {};
    const raw = rows[0].skills;
    if (!raw || (Array.isArray(raw) && raw.length === 0)) return {};
    if (typeof raw === "object" && !Array.isArray(raw)) return raw as UserSkillsData;
    return {};
  }

  async updateSkillProgress(
    userId: string,
    careerId: string,
    skillId: string,
    xpGained: number,
  ): Promise<{ skill: SkillProgress; leveledUp: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `SELECT skills FROM users WHERE id = $1 FOR UPDATE`,
        [userId],
      );
      if (rows.length === 0) throw new Error(`User ${userId} not found`);

      const skills: UserSkillsData =
        rows[0].skills && typeof rows[0].skills === "object" && !Array.isArray(rows[0].skills)
          ? (rows[0].skills as UserSkillsData)
          : {};

      if (!skills[careerId]) skills[careerId] = {};
      if (!skills[careerId][skillId]) {
        skills[careerId][skillId] = { level: 0, maxLevel: 5, xp: 0, lastPracticedAt: null };
      }

      const prev = skills[careerId][skillId];
      const oldLevel = prev.level;
      prev.xp += xpGained;
      // Level up every 100 XP per skill, capped at maxLevel
      const newLevel = Math.min(Math.floor(prev.xp / 100), prev.maxLevel);
      prev.level = newLevel;
      prev.lastPracticedAt = new Date().toISOString();

      await client.query(
        `UPDATE users SET skills = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(skills), userId],
      );

      await client.query("COMMIT");
      return { skill: prev, leveledUp: newLevel > oldLevel };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getSkillTreeWithProgress(
    userId: string,
    careerId: string,
  ): Promise<Record<string, SkillProgress>> {
    const skills = await this.getSkillProgress(userId);
    return skills[careerId] || {};
  }

  // ========================
  // Achievements
  // ========================

  async getAchievements(userId: string): Promise<EarnedAchievement[]> {
    const { rows } = await this.pool.query(
      `SELECT achievements FROM users WHERE id = $1`,
      [userId],
    );
    if (rows.length === 0) return [];
    const raw = rows[0].achievements;
    if (Array.isArray(raw)) return raw as EarnedAchievement[];
    return [];
  }

  async addAchievement(userId: string, achievement: EarnedAchievement): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `SELECT achievements FROM users WHERE id = $1 FOR UPDATE`,
        [userId],
      );
      if (rows.length === 0) throw new Error(`User ${userId} not found`);

      const achievements: EarnedAchievement[] = Array.isArray(rows[0].achievements)
        ? (rows[0].achievements as EarnedAchievement[])
        : [];

      // Don't add duplicates
      if (achievements.some((a) => a.id === achievement.id)) {
        await client.query("ROLLBACK");
        return false;
      }

      achievements.push(achievement);

      await client.query(
        `UPDATE users SET achievements = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(achievements), userId],
      );

      await client.query("COMMIT");
      return true;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async hasAchievement(userId: string, achievementId: string): Promise<boolean> {
    const achievements = await this.getAchievements(userId);
    return achievements.some((a) => a.id === achievementId);
  }

  // ========================
  // Learner Model
  // ========================

  async getLearnerModel(userId: string, careerId: string): Promise<LearnerModel | null> {
    const metadata = await this.getUserGamificationMetadata(userId);
    return metadata.learnerModels?.[careerId] || null;
  }

  async updateLearnerModel(userId: string, careerId: string, model: LearnerModel): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `SELECT metadata FROM users WHERE id = $1 FOR UPDATE`,
        [userId],
      );
      if (rows.length === 0) throw new Error(`User ${userId} not found`);

      const metadata = (rows[0].metadata || {}) as Record<string, unknown>;
      const learnerModels = (metadata.learnerModels || {}) as LearnerModelsData;
      learnerModels[careerId] = { ...model, updatedAt: new Date().toISOString() };
      metadata.learnerModels = learnerModels;

      await client.query(
        `UPDATE users SET metadata = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(metadata), userId],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ========================
  // Streak
  // ========================

  async getStreak(userId: string): Promise<UserStreak> {
    const metadata = await this.getUserGamificationMetadata(userId);
    return metadata.streak || { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }

  async updateStreak(userId: string): Promise<UserStreak> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `SELECT metadata FROM users WHERE id = $1 FOR UPDATE`,
        [userId],
      );
      if (rows.length === 0) throw new Error(`User ${userId} not found`);

      const metadata = (rows[0].metadata || {}) as Record<string, unknown>;
      const streak: UserStreak = (metadata.streak as UserStreak) || {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
      };

      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      if (streak.lastActiveDate === today) {
        // Already active today
        await client.query("ROLLBACK");
        return streak;
      }

      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      if (streak.lastActiveDate === yesterday) {
        streak.currentStreak += 1;
      } else {
        streak.currentStreak = 1;
      }

      streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
      streak.lastActiveDate = today;
      metadata.streak = streak;

      await client.query(
        `UPDATE users SET metadata = $1::jsonb, last_active_date = $2, updated_at = NOW() WHERE id = $3`,
        [JSON.stringify(metadata), today, userId],
      );

      await client.query("COMMIT");
      return streak;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ========================
  // Gamification Profile (aggregated)
  // ========================

  async getProfile(userId: string): Promise<GamificationProfile> {
    const { rows } = await this.pool.query(
      `SELECT level, total_xp as "totalXp", achievements, skills, metadata FROM users WHERE id = $1`,
      [userId],
    );

    if (rows.length === 0) {
      return {
        level: 1,
        totalXp: 0,
        xpToNextLevel: XP_PER_LEVEL,
        achievements: [],
        streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
        skillProgress: {},
      };
    }

    const row = rows[0];
    const metadata = (row.metadata || {}) as UserGamificationMetadata;

    return {
      level: row.level || 1,
      totalXp: row.totalXp || 0,
      xpToNextLevel: xpToNextLevel(row.totalXp || 0),
      achievements: Array.isArray(row.achievements) ? row.achievements : [],
      streak: metadata.streak || { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
      skillProgress:
        row.skills && typeof row.skills === "object" && !Array.isArray(row.skills)
          ? row.skills
          : {},
    };
  }

  // ========================
  // Helpers
  // ========================

  private async getUserGamificationMetadata(userId: string): Promise<UserGamificationMetadata> {
    const { rows } = await this.pool.query(
      `SELECT metadata FROM users WHERE id = $1`,
      [userId],
    );
    if (rows.length === 0) return {};
    return (rows[0].metadata || {}) as UserGamificationMetadata;
  }
}
