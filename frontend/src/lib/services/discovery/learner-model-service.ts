/**
 * Learner Model Service
 * Tracks user performance per career path and computes difficulty adjustments.
 * Called after every task completion to update the model.
 */

import { getPool } from "@/lib/db/get-pool";
import { GamificationRepository } from "@/lib/repositories/postgresql/gamification-repository";
import type { DifficultyLevel, LearnerModel } from "./gamification-types";

const MAX_RECENT_SCORES = 10;

export class LearnerModelService {
  private repo: GamificationRepository;

  constructor() {
    this.repo = new GamificationRepository(getPool());
  }

  async getLearnerModel(userId: string, careerId: string): Promise<LearnerModel> {
    const existing = await this.repo.getLearnerModel(userId, careerId);
    if (existing) return existing;

    // Return default model for new learners
    return {
      careerId,
      difficultyLevel: "beginner",
      recentScores: [],
      struggleAreas: [],
      strengthAreas: [],
      preferredTaskTypes: [],
      totalTasksCompleted: 0,
      averageScore: 0,
      averageAttempts: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Called after EVERY task completion.
   * Updates the learner model with new performance data.
   */
  async updateAfterTaskCompletion(
    userId: string,
    careerId: string,
    taskScore: number,
    attempts: number,
    skillsImproved: string[],
    taskType?: string,
  ): Promise<LearnerModel> {
    const model = await this.getLearnerModel(userId, careerId);

    // Update recent scores (keep last N)
    model.recentScores.push(taskScore);
    if (model.recentScores.length > MAX_RECENT_SCORES) {
      model.recentScores = model.recentScores.slice(-MAX_RECENT_SCORES);
    }

    // Update totals
    model.totalTasksCompleted += 1;
    model.averageScore = this.computeAverage(model.recentScores);

    // Running average for attempts
    const prevTotal = model.averageAttempts * (model.totalTasksCompleted - 1);
    model.averageAttempts = (prevTotal + attempts) / model.totalTasksCompleted;

    // Update struggle / strength areas based on skill performance
    this.updateSkillAreas(model, skillsImproved, taskScore);

    // Update preferred task types
    if (taskType && !model.preferredTaskTypes.includes(taskType)) {
      model.preferredTaskTypes.push(taskType);
      if (model.preferredTaskTypes.length > 5) {
        model.preferredTaskTypes = model.preferredTaskTypes.slice(-5);
      }
    }

    // Recalculate difficulty
    model.difficultyLevel = this.calculateDifficulty(model);

    // Persist
    await this.repo.updateLearnerModel(userId, careerId, model);

    return model;
  }

  /**
   * Difficulty adjustment rules:
   * - avg score > 85% AND avg attempts < 1.5 → increase difficulty
   * - avg score < 50% OR avg attempts > 3 → decrease difficulty
   * - Otherwise → stay
   */
  private calculateDifficulty(model: LearnerModel): DifficultyLevel {
    const levels: DifficultyLevel[] = ["beginner", "intermediate", "advanced", "expert"];
    const currentIndex = levels.indexOf(model.difficultyLevel);

    if (model.recentScores.length < 3) {
      return model.difficultyLevel; // Not enough data
    }

    const avgScore = model.averageScore;
    const avgAttempts = model.averageAttempts;

    if (avgScore > 85 && avgAttempts < 1.5) {
      // Increase difficulty
      return levels[Math.min(currentIndex + 1, levels.length - 1)];
    }

    if (avgScore < 50 || avgAttempts > 3) {
      // Decrease difficulty
      return levels[Math.max(currentIndex - 1, 0)];
    }

    return model.difficultyLevel;
  }

  private updateSkillAreas(model: LearnerModel, skillsImproved: string[], score: number): void {
    for (const skill of skillsImproved) {
      if (score < 60) {
        // Add to struggle if not already there
        if (!model.struggleAreas.includes(skill)) {
          model.struggleAreas.push(skill);
        }
        // Remove from strength if it was there
        model.strengthAreas = model.strengthAreas.filter((s) => s !== skill);
      } else if (score > 85) {
        // Add to strength
        if (!model.strengthAreas.includes(skill)) {
          model.strengthAreas.push(skill);
        }
        // Remove from struggle
        model.struggleAreas = model.struggleAreas.filter((s) => s !== skill);
      }
    }
  }

  private computeAverage(scores: number[]): number {
    if (scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }
}
