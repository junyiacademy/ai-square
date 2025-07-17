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

interface TranslationCache {
  [key: string]: any;
}

export class HybridTranslationService {
  private cache: Map<string, TranslationCache> = new Map();
  private storageService = getScenarioStorageService();

  /**
   * Get a scenario with translations applied
   */
  async getScenario(scenarioId: string, language: string): Promise<any> {
    const cacheKey = `scenario:${scenarioId}:${language}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // For English, return directly from GCS
      if (language === 'en') {
        const scenario = await this.storageService.getScenario(scenarioId);
        this.cache.set(cacheKey, scenario);
        return scenario;
      }

      // For other languages, merge translations
      const englishScenario = await this.storageService.getScenario(scenarioId);
      const translatedScenario = await this.applyTranslations(
        englishScenario,
        scenarioId,
        language,
        'scenario'
      );

      this.cache.set(cacheKey, translatedScenario);
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
  async listScenarios(language: string): Promise<any[]> {
    const cacheKey = `list:scenarios:${language}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const scenarioIds = await this.storageService.list();
      const scenarios = await Promise.all(
        scenarioIds.map(id => this.getScenario(id, language))
      );

      this.cache.set(cacheKey, scenarios);
      return scenarios;
    } catch (error) {
      this.cache.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Get a program (no translation needed - user generated content)
   */
  async getProgram(scenarioId: string, programId: string, language: string): Promise<any> {
    return this.storageService.getProgram(scenarioId, programId);
  }

  /**
   * Get a task (no translation needed - user generated content)
   */
  async getTask(scenarioId: string, programId: string, taskId: string, language: string): Promise<any> {
    return this.storageService.getTask(scenarioId, programId, taskId);
  }

  /**
   * Apply translations from YAML to English base data
   */
  private async applyTranslations(
    englishData: any,
    scenarioId: string,
    language: string,
    dataType: 'scenario' | 'task'
  ): Promise<any> {
    try {
      const yamlPath = path.join(
        process.cwd(),
        'public',
        'pbl_data',
        `${scenarioId}_scenario.yaml`
      );

      const yamlContent = await readFile(yamlPath, 'utf-8');
      const yamlData = yaml.load(yamlContent) as any;

      return this.mergeTranslations(englishData, yamlData, language);
    } catch (error) {
      console.warn(`Failed to load translations for ${scenarioId} in ${language}:`, error);
      return englishData; // Fall back to English
    }
  }

  /**
   * Merge translations from YAML into English data structure
   */
  private mergeTranslations(englishData: any, yamlData: any, language: string): any {
    const translated = JSON.parse(JSON.stringify(englishData)); // Deep clone

    // Helper to get translated field
    const getTranslated = (obj: any, field: string): string | undefined => {
      const langField = `${field}_${language}`;
      return obj[langField] || obj[field];
    };

    // Translate scenario info
    if (yamlData.scenario_info) {
      translated.title = getTranslated(yamlData.scenario_info, 'title') || translated.title;
      translated.description = getTranslated(yamlData.scenario_info, 'description') || translated.description;
    }

    // Translate stages
    if (translated.stages && yamlData.stages) {
      translated.stages = translated.stages.map((stage: any) => {
        const yamlStage = yamlData.stages.find((s: any) => s.id === stage.id);
        if (!yamlStage) return stage;

        const translatedStage = {
          ...stage,
          title: getTranslated(yamlStage, 'title') || stage.title,
          description: getTranslated(yamlStage, 'description') || stage.description
        };

        // Translate nested tasks within stages
        if (stage.tasks && Array.isArray(stage.tasks)) {
          if (typeof stage.tasks[0] === 'object' && yamlStage.tasks) {
            translatedStage.tasks = stage.tasks.map((task: any) => {
              const yamlTask = yamlStage.tasks.find((t: any) => t.id === task.id);
              if (!yamlTask) return task;

              return {
                ...task,
                title: getTranslated(yamlTask, 'title') || task.title,
                description: getTranslated(yamlTask, 'description') || task.description
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
    if (translated.tasks && yamlData.stages) {
      yamlData.stages.forEach((yamlStage: any) => {
        if (yamlStage.tasks) {
          yamlStage.tasks.forEach((yamlTask: any) => {
            const task = translated.tasks?.find((t: any) => t.id === yamlTask.id);
            if (task) {
              task.title = getTranslated(yamlTask, 'title') || task.title;
              task.description = getTranslated(yamlTask, 'description') || task.description;
              task.instructions = getTranslated(yamlTask, 'instructions') || task.instructions;
              task.expected_outcome = getTranslated(yamlTask, 'expected_outcome') || task.expected_outcome;
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
  private async loadFromYaml(scenarioId: string, language: string): Promise<any> {
    try {
      const yamlPath = path.join(
        process.cwd(),
        'public',
        'pbl_data',
        `${scenarioId}_scenario.yaml`
      );

      const yamlContent = await readFile(yamlPath, 'utf-8');
      const yamlData = yaml.load(yamlContent) as any;

      // Build scenario from YAML
      const scenario: any = {
        id: yamlData.scenario_info?.id || scenarioId,
        title: yamlData.scenario_info?.[`title_${language}`] || yamlData.scenario_info?.title,
        description: yamlData.scenario_info?.[`description_${language}`] || yamlData.scenario_info?.description,
        difficulty: yamlData.scenario_info?.difficulty,
        estimated_duration: yamlData.scenario_info?.estimated_duration,
        target_domains: yamlData.scenario_info?.target_domains,
        stages: []
      };

      // Process stages
      if (yamlData.stages) {
        scenario.stages = yamlData.stages.map((stage: any) => ({
          id: stage.id,
          title: stage[`title_${language}`] || stage.title,
          description: stage[`description_${language}`] || stage.description,
          tasks: stage.tasks || []
        }));
      }

      return scenario;
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