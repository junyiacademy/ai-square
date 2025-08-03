/**
 * Discovery YAML Loader
 * 繼承自 BaseYAMLLoader，專門處理 Discovery Path YAML 檔案
 */

import { BaseYAMLLoader, LoadResult } from '@/lib/abstractions/base-yaml-loader';
import path from 'path';

export interface DiscoveryMetadata {
  title: string;
  short_description: string;
  long_description: string;
  estimated_hours: number;
  skill_focus: string[];
}

export interface WorldSetting {
  name: string;
  description: string;
  atmosphere: string;
  visual_theme: string;
}

export interface SkillTreeSkill {
  id: string;
  name: string;
  description: string;
  max_level: number;
  requires?: string[];
  unlocks?: string[];
}

export interface MilestoneQuest {
  id: string;
  name: string;
  description: string;
  required_level: number;
  skills_tested: string[];
  xp_reward: number;
  rewards?: {
    skills?: string[];
    achievements?: string[];
  };
}

export interface DiscoveryPath {
  path_id: string;
  category: string;
  difficulty_range: string;
  metadata: DiscoveryMetadata;
  world_setting: WorldSetting;
  starting_scenario: {
    title: string;
    description: string;
    initial_tasks: string[];
  };
  skill_tree: {
    core_skills: SkillTreeSkill[];
    advanced_skills: SkillTreeSkill[];
  };
  milestone_quests: MilestoneQuest[];
  achievements?: {
    exploration: Array<{
      id: string;
      name: string;
      description: string;
      condition: string;
      xp_bonus: number;
    }>;
    mastery: Array<{
      id: string;
      name: string;
      description: string;
      skills_required: string[];
      level_required: number;
      xp_bonus: number;
    }>;
    special: Array<{
      id: string;
      name: string;
      description: string;
      hidden: boolean;
      hint?: string;
      xp_bonus: number;
    }>;
  };
  daily_challenges?: {
    categories: Array<{
      type: string;
      title: string;
      description: string;
      skills_improved: string[];
      xp_reward: number;
    }>;
  };
  learning_objectives?: string[];
  career_outcomes?: string[];
}

export class DiscoveryYAMLLoader extends BaseYAMLLoader<DiscoveryPath> {
  protected readonly loaderName = 'DiscoveryYAMLLoader';

  constructor() {
    super({
      basePath: path.join(process.cwd(), 'public', 'discovery_data')
    });
  }

  /**
   * Implement abstract load method
   */
  async load(fileName: string): Promise<LoadResult<DiscoveryPath>> {
    try {
      const filePath = this.getFilePath(fileName);
      const { promises: fs } = await import('fs');
      const yaml = await import('js-yaml');
      
      const content = await fs.readFile(filePath, 'utf8');
      const data = yaml.load(content) as DiscoveryPath;
      
      return { data };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get file path for discovery path
   */
  protected getFilePath(fileName: string): string {
    return path.join(this.options.basePath!, `${fileName}.yml`);
  }

  /**
   * Load discovery path YAML file
   */
  async loadPath(
    careerType: string,
    language: string = 'en'
  ): Promise<DiscoveryPath | null> {
    // Discovery paths use format: careertype/careertype_lang.yml
    const langCode = language === 'zh-TW' ? 'zhTW' : language;
    const fileName = `${careerType}/${careerType}_${langCode}`;
    const result = await this.load(fileName);

    if (result.data) {
      return result.data;
    }

    // Fallback to English if language not found
    if (language !== 'en') {
      const fallbackFileName = `${careerType}/${careerType}_en`;
      const fallbackResult = await this.load(fallbackFileName);
      
      if (fallbackResult.data) {
        return fallbackResult.data;
      }
    }

    return null;
  }

  /**
   * Scan all available discovery paths
   */
  async scanPaths(): Promise<string[]> {
    const fs = await import('fs/promises');
    const pathsDir = this.options.basePath!;
    
    try {
      const items = await fs.readdir(pathsDir, { withFileTypes: true });
      // Return directories that are career types
      return items
        .filter(item => item.isDirectory())
        .map(item => item.name);
    } catch (error) {
      console.error('Error scanning Discovery paths:', error);
      return [];
    }
  }

  /**
   * Get path metadata without loading full content
   */
  async getPathMetadata(careerType: string): Promise<DiscoveryMetadata | null> {
    const data = await this.loadPath(careerType);
    return data?.metadata || null;
  }

  /**
   * Override to handle Discovery-specific validation
   */
  protected async validateData(): Promise<{ valid: boolean; error?: string }> {
    // Discovery-specific validation can be added here
    return { valid: true };
  }

  /**
   * Override to handle Discovery-specific post-processing
   */
  protected async postProcess(data: DiscoveryPath): Promise<DiscoveryPath> {
    // Ensure path_id exists
    if (!data.path_id && data.metadata) {
      // Try to infer from other fields
      data.path_id = 'discovery_path';
    }

    // Ensure all skills have IDs
    if (data.skill_tree) {
      const processSkills = (skills: SkillTreeSkill[]) => {
        return skills.map((skill, index) => ({
          ...skill,
          id: skill.id || `skill_${index + 1}`
        }));
      };

      data.skill_tree.core_skills = processSkills(data.skill_tree.core_skills || []);
      data.skill_tree.advanced_skills = processSkills(data.skill_tree.advanced_skills || []);
    }

    return data;
  }

  /**
   * Get all skills in a path
   */
  extractAllSkills(data: DiscoveryPath): SkillTreeSkill[] {
    const skills: SkillTreeSkill[] = [];
    
    if (data.skill_tree) {
      skills.push(...(data.skill_tree.core_skills || []));
      skills.push(...(data.skill_tree.advanced_skills || []));
    }
    
    return skills;
  }

  /**
   * Get skill dependencies
   */
  getSkillDependencies(data: DiscoveryPath): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    const allSkills = this.extractAllSkills(data);
    
    allSkills.forEach(skill => {
      if (skill.requires && skill.requires.length > 0) {
        dependencies.set(skill.id, skill.requires);
      }
    });
    
    return dependencies;
  }
}

// Export singleton instance
export const discoveryYAMLLoader = new DiscoveryYAMLLoader();