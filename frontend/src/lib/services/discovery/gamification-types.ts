/**
 * Gamification Type Definitions
 * All gamification data is stored in existing JSON columns (users.skills, users.achievements, users.metadata)
 * No new database tables required.
 */

// === Skill Progress (stored in users.skills JSON) ===

export interface SkillProgress {
  level: number;
  maxLevel: number;
  xp: number;
  lastPracticedAt: string | null;
}

/** users.skills JSON shape: { [careerId]: { [skillId]: SkillProgress } } */
export type UserSkillsData = Record<string, Record<string, SkillProgress>>;

// === Achievements (stored in users.achievements JSON) ===

export interface EarnedAchievement {
  id: string;
  type: "badge" | "milestone" | "career" | "exploration" | "mastery" | "special";
  careerId?: string;
  name: string;
  description: string;
  xpReward: number;
  earnedAt: string;
}

// === Learner Model (stored in users.metadata.learnerModels JSON) ===

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface LearnerModel {
  careerId: string;
  difficultyLevel: DifficultyLevel;
  recentScores: number[]; // last 10
  struggleAreas: string[]; // skill IDs scoring < 60%
  strengthAreas: string[]; // skill IDs scoring > 85%
  preferredTaskTypes: string[];
  totalTasksCompleted: number;
  averageScore: number;
  averageAttempts: number;
  updatedAt: string;
}

/** users.metadata.learnerModels shape */
export type LearnerModelsData = Record<string, LearnerModel>;

// === Streak (stored in users.metadata.streak JSON) ===

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
}

// === Quest Progress (stored in programs.metadata.quests JSON) ===

export type QuestStatus = "locked" | "available" | "active" | "completed";

export interface QuestProgress {
  questId: string;
  status: QuestStatus;
  startedAt?: string;
  completedAt?: string;
  xpReward: number;
}

// === User Metadata shape ===

export interface UserGamificationMetadata {
  learnerModels?: LearnerModelsData;
  streak?: UserStreak;
}

// === Adaptive Task Generation ===

export interface GeneratedTask {
  title: Record<string, string>;
  description: Record<string, string>;
  objectives: string[];
  hints: string[];
  completionCriteria: string;
  xpReward: number;
  skillsTargeted: string[];
  difficulty: DifficultyLevel;
  scaffolding: boolean;
}

// === Gamification Profile (aggregated for API response) ===

export interface GamificationProfile {
  level: number;
  totalXp: number;
  xpToNextLevel: number;
  achievements: EarnedAchievement[];
  streak: UserStreak;
  skillProgress: Record<string, Record<string, SkillProgress>>;
}
