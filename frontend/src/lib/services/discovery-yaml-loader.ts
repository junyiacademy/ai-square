import yaml from 'js-yaml';

export interface DiscoveryPath {
  path_id: string;
  category: string;
  difficulty_range: string;
  metadata: {
    title: string;
    short_description: string;
    long_description: string;
    estimated_hours: number;
    skill_focus: string[];
  };
  world_setting: {
    name: string;
    description: string;
    atmosphere: string;
    visual_theme: string;
  };
  starting_scenario: {
    title: string;
    description: string;
    initial_tasks: string[];
  };
  skill_tree: {
    core_skills: Array<{
      id: string;
      name: string;
      description: string;
      max_level: number;
      requires?: string[];
      unlocks?: string[];
    }>;
    advanced_skills: Array<{
      id: string;
      name: string;
      description: string;
      max_level: number;
      requires?: string[];
    }>;
  };
  milestone_quests: Array<{
    id: string;
    name: string;
    description: string;
    required_level: number;
    skills_tested: string[];
    xp_reward: number;
    unlocks: string[];
  }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    xp_reward: number;
    badge_type: string;
  }>;
  example_tasks: {
    beginner: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      skills_improved: string[];
      xp_reward: number;
    }>;
    intermediate: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      skills_improved: string[];
      xp_reward: number;
    }>;
    advanced: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      skills_improved: string[];
      xp_reward: number;
    }>;
  };
  learning_objectives: string[];
  career_outcomes: string[];
}

export class DiscoveryYAMLLoader {
  private static cache: Map<string, DiscoveryPath> = new Map();
  private static loadingPromises: Map<string, Promise<DiscoveryPath | null>> = new Map();

  static async loadPath(pathId: string, language: 'en' | 'zhTW' = 'zhTW'): Promise<DiscoveryPath | null> {
    const cacheKey = `${pathId}_${language}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    // Start loading
    const loadingPromise = this.loadPathInternal(pathId, language);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      if (result) {
        this.cache.set(cacheKey, result);
      }
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private static async loadPathInternal(pathId: string, language: 'en' | 'zhTW'): Promise<DiscoveryPath | null> {
    // Map path IDs to folder structure
    const pathCategoryMap: Record<string, string> = {
      'ai_engineer': 'technology',
      'ai_artist': 'arts',
      'ai_researcher': 'science',
      'ai_ethicist': 'society',
      'content_creator': 'arts',
      'startup_founder': 'society',
      'ai_developer': 'technology',
      'tech_entrepreneur': 'technology',
      'ux_designer': 'arts',
      'data_analyst': 'technology',
      'product_manager': 'society',
      'game_designer': 'arts',
      'app_developer': 'technology',
      'youtuber': 'arts'
    };

    const category = pathCategoryMap[pathId];
    if (!category) {
      console.warn(`Unknown path ID: ${pathId}`);
      return null;
    }

    const filename = language === 'zhTW' ? `${pathId}_zhTW.yml` : `${pathId}_en.yml`;
    const url = `/discovery_data/${category}/${pathId}/${filename}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to load Discovery path: ${url}`);
        return null;
      }

      const text = await response.text();
      const data = yaml.load(text) as DiscoveryPath;
      return data;
    } catch (error) {
      console.error(`Error loading Discovery path ${pathId}:`, error);
      return null;
    }
  }

  static async loadAllPaths(language: 'en' | 'zhTW' = 'zhTW'): Promise<DiscoveryPath[]> {
    const pathIds = [
      'ai_engineer',
      'ai_artist',
      'ai_researcher',
      'ai_ethicist'
    ];

    const promises = pathIds.map(id => this.loadPath(id, language));
    const results = await Promise.all(promises);
    return results.filter((path): path is DiscoveryPath => path !== null);
  }

  static clearCache(): void {
    this.cache.clear();
  }

  // Helper method to convert YAML data to the format expected by PathResults
  static convertToPathData(yamlData: DiscoveryPath): any {
    const firstBeginnerTask = yamlData.example_tasks.beginner[0];
    const firstIntermediateTask = yamlData.example_tasks.intermediate[0];
    const firstAdvancedTask = yamlData.example_tasks.advanced[0];

    return {
      id: yamlData.path_id,
      title: yamlData.metadata.title,
      subtitle: yamlData.metadata.short_description,
      description: yamlData.metadata.long_description,
      category: yamlData.category,
      skills: yamlData.metadata.skill_focus,
      aiAssistants: yamlData.skill_tree.core_skills.slice(0, 3).map(skill => skill.name),
      worldSetting: yamlData.world_setting.description,
      atmosphere: yamlData.world_setting.atmosphere,
      visualTheme: yamlData.world_setting.visual_theme,
      startingScenario: yamlData.starting_scenario,
      protagonist: {
        name: yamlData.metadata.title.split(' - ')[0],
        background: yamlData.starting_scenario.description.split('。')[0]
      },
      storyContext: {
        keyCharacters: yamlData.milestone_quests.map(quest => ({
          name: quest.name,
          role: quest.description.split('，')[0],
          personality: quest.description
        })),
        currentConflict: yamlData.starting_scenario.description
      },
      tasks: [
        firstBeginnerTask && {
          id: firstBeginnerTask.id,
          title: firstBeginnerTask.title,
          description: firstBeginnerTask.description,
          duration: `${firstBeginnerTask.xp_reward / 2}分鐘`
        },
        firstIntermediateTask && {
          id: firstIntermediateTask.id,
          title: firstIntermediateTask.title,
          description: firstIntermediateTask.description,
          duration: `${firstIntermediateTask.xp_reward / 4}分鐘`
        },
        firstAdvancedTask && {
          id: firstAdvancedTask.id,
          title: firstAdvancedTask.title,
          description: firstAdvancedTask.description,
          duration: `${firstAdvancedTask.xp_reward / 10}分鐘`
        }
      ].filter(Boolean),
      milestoneQuests: yamlData.milestone_quests,
      achievements: yamlData.achievements,
      learningObjectives: yamlData.learning_objectives,
      careerOutcomes: yamlData.career_outcomes,
      estimatedHours: yamlData.metadata.estimated_hours
    };
  }
}