/**
 * Skill Progress Service
 * Updates skill XP based on skills_improved from task evaluations.
 * Reads skill definitions from YAML, overlays user progress from users.skills JSON.
 */

import { getPool } from "@/lib/db/get-pool";
import { GamificationRepository } from "@/lib/repositories/postgresql/gamification-repository";
import { DiscoveryYAMLLoader } from "@/lib/services/discovery-yaml-loader";
import type { SkillProgress } from "./gamification-types";
import type { SkillTreeSkill } from "@/lib/services/discovery-yaml-loader";

export interface SkillTreeNode extends SkillTreeSkill {
  progress: SkillProgress;
  isCore: boolean;
  isUnlocked: boolean;
}

export interface SkillTreeWithProgress {
  careerId: string;
  nodes: SkillTreeNode[];
}

export class SkillProgressService {
  private repo: GamificationRepository;
  private yamlLoader: DiscoveryYAMLLoader;

  constructor() {
    this.repo = new GamificationRepository(getPool());
    this.yamlLoader = new DiscoveryYAMLLoader();
  }

  /**
   * After task completion, update skill XP for each improved skill.
   * XP distributed equally among improved skills.
   */
  async updateSkillProgress(
    userId: string,
    careerId: string,
    skillsImproved: string[],
    totalXpEarned: number,
  ): Promise<{ levelUps: string[] }> {
    if (skillsImproved.length === 0) return { levelUps: [] };

    const xpPerSkill = Math.floor(totalXpEarned / skillsImproved.length);
    const levelUps: string[] = [];

    for (const skillId of skillsImproved) {
      const { leveledUp } = await this.repo.updateSkillProgress(
        userId,
        careerId,
        skillId,
        xpPerSkill,
      );
      if (leveledUp) {
        levelUps.push(skillId);
      }
    }

    return { levelUps };
  }

  /**
   * Get full skill tree from YAML with user progress overlaid.
   */
  async getSkillTreeWithProgress(
    userId: string,
    careerId: string,
    language: string = "en",
  ): Promise<SkillTreeWithProgress> {
    // Load YAML skill tree
    const yamlData = await this.yamlLoader.loadPath(careerId, language);
    if (!yamlData?.skill_tree) {
      return { careerId, nodes: [] };
    }

    // Get user progress
    const userProgress = await this.repo.getSkillTreeWithProgress(userId, careerId);

    // Map core skills
    const coreNodes: SkillTreeNode[] = (yamlData.skill_tree.core_skills || []).map((skill) => ({
      ...skill,
      progress: userProgress[skill.id] || { level: 0, maxLevel: skill.max_level, xp: 0, lastPracticedAt: null },
      isCore: true,
      isUnlocked: true, // Core skills always unlocked
    }));

    // Map advanced skills — check unlock requirements
    const unlockedSkillIds = new Set(
      coreNodes.filter((n) => n.progress.level > 0).map((n) => n.id),
    );

    const advancedNodes: SkillTreeNode[] = (yamlData.skill_tree.advanced_skills || []).map((skill) => {
      const requires = skill.requires || [];
      const isUnlocked = requires.length === 0 || requires.every((req) => unlockedSkillIds.has(req));

      return {
        ...skill,
        progress: userProgress[skill.id] || { level: 0, maxLevel: skill.max_level, xp: 0, lastPracticedAt: null },
        isCore: false,
        isUnlocked,
      };
    });

    return {
      careerId,
      nodes: [...coreNodes, ...advancedNodes],
    };
  }

  /**
   * Get a map of skillId → level for achievement checking.
   */
  async getSkillLevels(userId: string, careerId: string): Promise<Record<string, number>> {
    const progress = await this.repo.getSkillTreeWithProgress(userId, careerId);
    const levels: Record<string, number> = {};
    for (const [skillId, sp] of Object.entries(progress)) {
      levels[skillId] = sp.level;
    }
    return levels;
  }
}
