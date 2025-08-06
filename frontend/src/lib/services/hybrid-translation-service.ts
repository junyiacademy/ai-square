/**
 * Hybrid Translation Service
 * 
 * Implements a hybrid architecture where:
 * - English content is stored in GCS (Google Cloud Storage)
 * - Other language translations are loaded from YAML files on demand
 * - Provides efficient caching for merged translations
 */

import { getScenarioStorageService } from './scenario-storage-service';
import { readFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import path from 'path';
import { IScenario, IProgram, ITask } from '@/types/unified-learning';
import { Scenario, Task } from '@/types/pbl';

// Extended types for legacy PBL data that includes stages
interface LegacyStage {
  id: string;
  title: string;
  description: string;
  tasks?: (Task | string)[];
  [key: string]: unknown; // For translated fields like title_zh, description_es, etc.
}

interface LegacyScenarioData extends Partial<IScenario> {
  scenario_info?: {
    id?: string;
    title?: string;
    description?: string;
    difficulty?: string;
    estimated_duration?: number;
    target_domains?: string[];
    [key: string]: unknown;
  };
  stages?: LegacyStage[];
  tasks?: Task[];
  [key: string]: unknown;
}

type CacheableData = IScenario | IScenario[] | IProgram | ITask | Scenario | Task;

export class HybridTranslationService {
  private cache: Map<string, CacheableData> = new Map();
  private storageService = getScenarioStorageService();

  /**
   * Get a scenario with translations applied
   */
  async getScenario(scenarioId: string, language: string): Promise<IScenario> {
    const cacheKey = `scenario:${scenarioId}:${language}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as IScenario;
    }

    try {
      // For English, return directly from GCS
      if (language === 'en') {
        const scenario = await this.storageService.getScenario(scenarioId);
        this.cache.set(cacheKey, scenario as unknown as CacheableData);
        return scenario as unknown as IScenario;
      }

      // For other languages, merge translations
      const englishScenario = await this.storageService.getScenario(scenarioId);
      const translatedScenario = await this.applyTranslations(
        englishScenario as unknown as IScenario,
        scenarioId,
        language,
        'scenario'
      );

      this.cache.set(cacheKey, translatedScenario as CacheableData);
      return translatedScenario;
    } catch (error) {
      // Clear cache on error
      this.cache.delete(cacheKey);
      
      // For non-English, try YAML fallback
      if (language !== 'en' && error instanceof Error && error.message.includes('GCS')) {
        return this.loadFromYaml(scenarioId, language);
      }
      
      throw error;
    }
  }

  /**
   * List all scenarios with translations applied
   */
  async listScenarios(language: string): Promise<IScenario[]> {
    const cacheKey = `list:scenarios:${language}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as IScenario[];
    }

    try {
      const scenarioIds = await this.storageService.list();
      const scenarios = await Promise.all(
        scenarioIds.map(id => this.getScenario(id, language))
      );

      this.cache.set(cacheKey, scenarios);
      return scenarios;
    } catch (error) {
      // Clear all list caches on error since storage failure might affect all languages
      for (const key of this.cache.keys()) {
        if (key.startsWith('list:scenarios:')) {
          this.cache.delete(key);
        }
      }
      throw error;
    }
  }

  /**
   * Get a program (no translation needed - user generated content)
   */
  async getProgram(scenarioId: string, programId: string, {}: string): Promise<IProgram> {
    return this.storageService.getProgram(scenarioId, programId) as unknown as IProgram;
  }

  /**
   * Get a task (no translation needed - user generated content)
   */
  async getTask(scenarioId: string, programId: string, taskId: string, {}: string): Promise<ITask> {
    return this.storageService.getTask(scenarioId, programId, taskId) as unknown as ITask;
  }

  /**
   * Apply translations from YAML to English base data
   */
  private async applyTranslations(
    englishData: IScenario,
    scenarioId: string,
    language: string,
    {}: 'scenario' | 'task'
  ): Promise<IScenario> {
    try {
      const yamlPath = path.join(
        process.cwd(),
        'public',
        'pbl_data',
        `${scenarioId}_scenario.yaml`
      );

      const yamlContent = await readFile(yamlPath, 'utf-8');
      const yamlData = yaml.load(yamlContent) as LegacyScenarioData;

      return this.mergeTranslations(englishData, yamlData, language);
    } catch (error) {
      console.warn(`Failed to load translations for ${scenarioId} in ${language}:`, error);
      return englishData; // Fall back to English
    }
  }

  /**
   * Merge translations from YAML into English data structure
   */
  private mergeTranslations(englishData: IScenario, yamlData: LegacyScenarioData, language: string): IScenario {
    const translated = JSON.parse(JSON.stringify(englishData)); // Deep clone

    // Helper to get translated field
    const getTranslated = (obj: Record<string, unknown>, field: string): string | undefined => {
      const langField = `${field}_${language}`;
      return obj[langField] as string || obj[field] as string;
    };

    // Translate scenario info
    if (yamlData.scenario_info) {
      translated.title = getTranslated(yamlData.scenario_info as Record<string, unknown>, 'title') || translated.title;
      translated.description = getTranslated(yamlData.scenario_info as Record<string, unknown>, 'description') || translated.description;
    }

    // Translate stages
    if ((translated as LegacyScenarioData).stages && yamlData.stages) {
      (translated as LegacyScenarioData).stages = (translated as LegacyScenarioData).stages!.map((stage) => {
        const yamlStage = yamlData.stages!.find((s) => s.id === stage.id);
        if (!yamlStage) return stage;

        const translatedStage = {
          ...stage,
          title: getTranslated(yamlStage, 'title') || stage.title,
          description: getTranslated(yamlStage, 'description') || stage.description
        };

        // Translate nested tasks within stages
        if (stage.tasks && Array.isArray(stage.tasks)) {
          if (typeof stage.tasks[0] === 'object' && yamlStage.tasks) {
            translatedStage.tasks = stage.tasks.map((task: Task | string) => {
              if (typeof task === 'string') return task;
              const yamlTask = (yamlStage.tasks as Task[]).find((t) => t.id === task.id);
              if (!yamlTask) return task;

              return {
                ...task,
                title: getTranslated(yamlTask as unknown as Record<string, unknown>, 'title') || task.title,
                description: getTranslated(yamlTask as unknown as Record<string, unknown>, 'description') || task.description
              };
            });
          } else {
            translatedStage.tasks = stage.tasks; // Keep task references if they're just IDs
          }
        }

        return translatedStage;
      });
    }

    // Translate nested tasks if present
    if ((translated as LegacyScenarioData).tasks && yamlData.stages) {
      yamlData.stages.forEach((yamlStage) => {
        if (yamlStage.tasks) {
          (yamlStage.tasks as Task[]).forEach((yamlTask) => {
            const task = (translated as LegacyScenarioData).tasks?.find((t) => t.id === yamlTask.id);
            if (task) {
              task.title = getTranslated(yamlTask as unknown as Record<string, unknown>, 'title') || task.title;
              task.description = getTranslated(yamlTask as unknown as Record<string, unknown>, 'description') || task.description;
              (task as unknown as Record<string, unknown>).instructions = getTranslated(yamlTask as unknown as Record<string, unknown>, 'instructions') || (task as unknown as Record<string, unknown>).instructions;
              (task as unknown as Record<string, unknown>).expected_outcome = getTranslated(yamlTask as unknown as Record<string, unknown>, 'expected_outcome') || (task as unknown as Record<string, unknown>).expected_outcome;
            }
          });
        }
      });
    }

    // Handle array translations (like options)
    const arrayField = `options_${language}`;
    if (yamlData[arrayField] && Array.isArray(yamlData[arrayField])) {
      translated.options = yamlData[arrayField].concat(
        translated.options?.slice(yamlData[arrayField].length) || []
      );
    }

    return translated;
  }

  /**
   * Load scenario directly from YAML (fallback method)
   */
  private async loadFromYaml(scenarioId: string, language: string): Promise<IScenario> {
    try {
      const yamlPath = path.join(
        process.cwd(),
        'public',
        'pbl_data',
        `${scenarioId}_scenario.yaml`
      );

      const yamlContent = await readFile(yamlPath, 'utf-8');
      const yamlData = yaml.load(yamlContent) as LegacyScenarioData;

      // Build scenario from YAML
      const scenario: Record<string, unknown> = {
        id: yamlData.scenario_info?.id || scenarioId,
        title: yamlData.scenario_info?.[`title_${language}`] || yamlData.scenario_info?.title,
        description: yamlData.scenario_info?.[`description_${language}`] || yamlData.scenario_info?.description,
        difficulty: yamlData.scenario_info?.difficulty,
        estimated_duration: yamlData.scenario_info?.estimated_duration,
        target_domains: yamlData.scenario_info?.target_domains,
        stages: []
      };

      // Process stages if present (for legacy compatibility)
      if (yamlData.stages) {
        (scenario as LegacyScenarioData).stages = yamlData.stages.map((stage) => ({
          id: stage.id,
          title: (stage[`title_${language}` as keyof LegacyStage] as string) || stage.title,
          description: (stage[`description_${language}` as keyof LegacyStage] as string) || stage.description,
          tasks: stage.tasks || []
        }));
      }

      return scenario as unknown as IScenario;
    } catch (error) {
      throw new Error(`Failed to load scenario ${scenarioId} from YAML: ${error}`);
    }
  }

  /**
   * Clear cache for a specific scenario or all scenarios
   */
  clearCache(scenarioId?: string): void {
    if (scenarioId) {
      // Clear specific scenario from cache
      for (const key of this.cache.keys()) {
        if (key.includes(scenarioId)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }
}