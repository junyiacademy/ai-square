/**
 * PBL Initialization Service
 *
 * Handles PBL scenario initialization from YAML files:
 * - Scans multilingual YAML files
 * - Transforms YAML data to IScenario format
 * - Creates/updates scenarios in database
 * - Manages cache invalidation
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import type { IScenario, ITaskTemplate } from '@/types/unified-learning';
import type { DifficultyLevel, TaskType } from '@/types/database';

interface PBLTaskYAML {
  id: string;
  title?: string;
  type?: string;
  category?: string;
  time_limit?: number;
  KSA_focus?: string[];
  ai_module?: string;
  ai_feedback?: boolean;
  instructions?: string;
  description?: string;
  content?: unknown;
  question?: {
    text?: string;
    type?: string;
    options?: unknown[];
    correct_answer?: unknown;
  };
  [key: string]: unknown;
}

interface PBLScenarioYAML {
  scenario_info?: {
    id: string;
    title?: string;
    description?: string;
    difficulty?: string;
    estimated_duration?: number;
    target_domains?: string[];
    prerequisites?: string[];
    learning_objectives?: string[];
  };
  challenge_statement?: string;
  real_world_context?: string;
  ksa_mapping?: Record<string, unknown>;
  tasks?: PBLTaskYAML[];
  ai_modules?: unknown[];
  [key: string]: unknown;
}

export interface ScenarioGroup {
  directory: string;
  languageFiles: Map<string, string>;
}

export interface InitializationOptions {
  force?: boolean;
  clean?: boolean;
}

export interface InitializationResult {
  scanned: number;
  existing: number;
  created: number;
  updated: number;
  errors: string[];
}

export interface CleanResult {
  deleted: number;
  errors: string[];
}

export interface CacheResult {
  cleared: number;
  errors: string[];
}

export interface ScenarioOperationResult {
  action: 'created' | 'updated' | 'skipped';
  scenario?: IScenario;
}

export class PBLInitializationService {
  private readonly pblDataPath: string;
  private readonly scenarioRepo = repositoryFactory.getScenarioRepository();

  constructor() {
    this.pblDataPath = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios');
  }

  /**
   * Main initialization method
   */
  async initializePBLScenarios(options: InitializationOptions): Promise<InitializationResult> {
    const result: InitializationResult = {
      scanned: 0,
      existing: 0,
      created: 0,
      updated: 0,
      errors: []
    };

    try {
      // Clean existing scenarios if requested
      if (options.clean) {
        await this.cleanAllScenarios();
      }

      // Scan scenario directories
      const scenarioGroups = await this.scanScenarioDirectories();
      result.scanned = scenarioGroups.length;

      // Process each scenario group
      for (const group of scenarioGroups) {
        try {
          const scenarioData = await this.buildMultilingualScenario(
            group.directory,
            group.languageFiles
          );

          const operationResult = await this.createOrUpdateScenario(
            scenarioData,
            options.force || false
          );

          if (operationResult.action === 'created') {
            result.created++;
          } else if (operationResult.action === 'updated') {
            result.updated++;
          } else {
            result.existing++;
          }
        } catch (error) {
          const errorMsg = `Failed to process ${group.directory}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Clear caches if any scenarios were modified
      if (result.created > 0 || result.updated > 0) {
        await this.clearPBLCaches();
      }

    } catch (error) {
      const errorMsg = `Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  /**
   * Clean all existing PBL scenarios
   */
  async cleanAllScenarios(): Promise<CleanResult> {
    const result: CleanResult = {
      deleted: 0,
      errors: []
    };

    try {
      const allPblScenarios = await this.scenarioRepo.findByMode?.('pbl', true) || [];
      console.log(`[PBL Init] Cleaning ${allPblScenarios.length} scenarios`);

      for (const scenario of allPblScenarios) {
        try {
          await this.scenarioRepo.delete(scenario.id);
          result.deleted++;
        } catch (error) {
          const errorMsg = `Failed to delete scenario ${scenario.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`[PBL Init] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Clean error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
    }

    return result;
  }

  /**
   * Scan PBL scenario directories and group by language
   */
  async scanScenarioDirectories(): Promise<ScenarioGroup[]> {
    const scenarioDirs = await fs.readdir(this.pblDataPath);
    const scenarioGroups: ScenarioGroup[] = [];

    for (const dir of scenarioDirs) {
      // Skip template directories and hidden files
      if (dir.startsWith('_') || dir.includes('template')) continue;

      const dirPath = path.join(this.pblDataPath, dir);
      const stat = await fs.stat(dirPath);

      if (!stat.isDirectory()) continue;

      // Read YAML files in this directory
      const files = await fs.readdir(dirPath);
      const yamlFiles = files.filter(f =>
        (f.endsWith('.yaml') || f.endsWith('.yml')) && !f.includes('template')
      );

      if (yamlFiles.length === 0) continue;

      // Group files by language
      const languageFiles = new Map<string, string>();

      for (const file of yamlFiles) {
        // Extract language code from filename (e.g., scenario_en.yaml -> en)
        const match = file.match(/_([a-zA-Z]{2,5})\.ya?ml$/);
        const lang = match ? match[1] : 'en';
        languageFiles.set(lang, path.join(dirPath, file));
      }

      scenarioGroups.push({
        directory: dir,
        languageFiles
      });
    }

    return scenarioGroups;
  }

  /**
   * Build multilingual scenario from language files
   */
  async buildMultilingualScenario(
    scenarioDir: string,
    languageFiles: Map<string, string>
  ): Promise<Omit<IScenario, 'id'>> {
    // Get primary language (English or first available)
    const primaryLang = languageFiles.has('en') ? 'en' : Array.from(languageFiles.keys())[0];
    const primaryFile = languageFiles.get(primaryLang)!;

    // Load primary data
    const primaryContent = await fs.readFile(primaryFile, 'utf-8');
    const primaryData = yaml.load(primaryContent) as PBLScenarioYAML;

    if (!primaryData?.scenario_info?.id) {
      throw new Error(`No scenario_info.id in ${scenarioDir}`);
    }

    const scenarioId = primaryData.scenario_info.id;

    // Initialize multilingual fields
    const title: Record<string, string> = {};
    const description: Record<string, string> = {};
    const objectives: Record<string, string[]> = {};
    const prerequisites: Record<string, string[]> = {};
    const challengeStatement: Record<string, string> = {};
    const realWorldContext: Record<string, string> = {};

    // Store tasks by ID with multilingual content
    const tasksByIdAndLang: Map<string, Map<string, PBLTaskYAML>> = new Map();

    // Process each language file
    for (const [lang, filePath] of languageFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content) as PBLScenarioYAML;

        // Collect multilingual scenario info
        if (data?.scenario_info?.title) {
          title[lang] = data.scenario_info.title;
        }
        if (data?.scenario_info?.description) {
          description[lang] = data.scenario_info.description;
        }
        if (data?.scenario_info?.learning_objectives && Array.isArray(data.scenario_info.learning_objectives)) {
          objectives[lang] = data.scenario_info.learning_objectives;
        }
        if (data?.scenario_info?.prerequisites && Array.isArray(data.scenario_info.prerequisites)) {
          prerequisites[lang] = data.scenario_info.prerequisites;
        }
        if (data?.challenge_statement) {
          challengeStatement[lang] = data.challenge_statement as string;
        }
        if (data?.real_world_context) {
          realWorldContext[lang] = data.real_world_context as string;
        }

        // Process tasks for this language
        if (Array.isArray(data?.tasks)) {
          for (const task of data.tasks) {
            if (!task.id) continue;

            if (!tasksByIdAndLang.has(task.id)) {
              tasksByIdAndLang.set(task.id, new Map());
            }

            tasksByIdAndLang.get(task.id)!.set(lang, task);
          }
        }
      } catch (error) {
        console.error(`Error reading ${lang} file for ${scenarioDir}:`, error);
      }
    }

    // Ensure English fallbacks
    this.ensureEnglishFallback(title);
    this.ensureEnglishFallback(description);
    this.ensureEnglishFallback(objectives);
    this.ensureEnglishFallback(prerequisites);

    // Build multilingual task templates
    const taskTemplates = this.buildMultilingualTasks(tasksByIdAndLang, primaryLang);

    // Build scenario data
    const scenarioData: Omit<IScenario, 'id'> = {
      mode: 'pbl',
      status: 'active',
      version: '1.0.0',
      sourceType: 'yaml',
      sourcePath: `pbl_data/scenarios/${scenarioDir}`,
      sourceId: scenarioId,
      sourceMetadata: {
        scenarioDir,
        scenarioId,
        languageFiles: Array.from(languageFiles.keys())
      },
      title,
      description,
      objectives,
      difficulty: (primaryData.scenario_info.difficulty as DifficultyLevel) || 'beginner',
      estimatedMinutes: primaryData.scenario_info.estimated_duration || 60,
      prerequisites: Array.isArray(primaryData.scenario_info.prerequisites)
        ? primaryData.scenario_info.prerequisites
        : [],
      taskTemplates,
      xpRewards: { completion: 100 },
      unlockRequirements: {},
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pblData: {
        challengeStatement,
        realWorldContext,
        targetDomains: Array.isArray(primaryData.scenario_info.target_domains)
          ? primaryData.scenario_info.target_domains
          : [],
        ksaMapping: primaryData.ksa_mapping || {},
        aiModules: Array.isArray(primaryData.ai_modules)
          ? primaryData.ai_modules
          : []
      },
      metadata: {
        originalYamlId: scenarioId,
        importedAt: new Date().toISOString(),
        importedBy: 'init-api',
        languagesAvailable: Array.from(languageFiles.keys()),
        multilingualPrerequisites: Object.keys(prerequisites).length > 0 ? prerequisites : undefined
      }
    };

    return scenarioData;
  }

  /**
   * Build multilingual task templates from task data
   */
  private buildMultilingualTasks(
    tasksByIdAndLang: Map<string, Map<string, PBLTaskYAML>>,
    primaryLang: string
  ): ITaskTemplate[] {
    const taskTemplates: ITaskTemplate[] = [];

    for (const [, langVersions] of tasksByIdAndLang) {
      // Get base task (English or primary language)
      const baseTask = langVersions.get('en') || langVersions.get(primaryLang) || Array.from(langVersions.values())[0];

      // Build multilingual task template
      const multilingualTask: ITaskTemplate = {
        id: baseTask.id,
        type: (baseTask.type as TaskType) || 'chat',
        category: baseTask.category,
        time_limit: baseTask.time_limit,
        KSA_focus: baseTask.KSA_focus,
        ai_module: baseTask.ai_module,
        ai_feedback: baseTask.ai_feedback,
        title: {},
        description: {},
        instructions: {},
        content: {}
      };

      // Build question if exists
      if (baseTask.question) {
        multilingualTask.question = {
          type: baseTask.question.type,
          options: baseTask.question.options,
          correct_answer: baseTask.question.correct_answer,
          text: {}
        };
      }

      // Merge all language versions
      for (const [lang, task] of langVersions) {
        if (task.title) {
          multilingualTask.title[lang] = task.title as string;
        }
        if (task.description) {
          multilingualTask.description = multilingualTask.description || {};
          multilingualTask.description[lang] = task.description as string;
        }
        if (task.instructions) {
          (multilingualTask as Record<string, unknown>).instructions = (multilingualTask as Record<string, unknown>).instructions || {};
          ((multilingualTask as Record<string, unknown>).instructions as Record<string, string>)[lang] = task.instructions as string;
        }
        if (task.content) {
          (multilingualTask.content as Record<string, unknown>)[lang] = task.content;
        }

        // Handle question text
        if (task.question?.text && multilingualTask.question) {
          const question = multilingualTask.question as Record<string, unknown>;
          question.text = {
            ...(question.text as Record<string, string>) || {},
            [lang]: task.question.text
          };
        }
      }

      // Ensure English fallbacks
      this.ensureEnglishFallback(multilingualTask.title);
      const instructionsObj = (multilingualTask as Record<string, unknown>).instructions as Record<string, string> || {};
      this.ensureEnglishFallback(instructionsObj);

      taskTemplates.push(multilingualTask);
    }

    return taskTemplates;
  }

  /**
   * Ensure English fallback for multilingual fields
   */
  private ensureEnglishFallback<T>(field: Record<string, T>): void {
    if (!field.en && Object.keys(field).length > 0) {
      field.en = Object.values(field)[0];
    }
  }

  /**
   * Create or update scenario in database
   */
  async createOrUpdateScenario(
    scenarioData: Omit<IScenario, 'id'>,
    force: boolean
  ): Promise<ScenarioOperationResult> {
    // Check if scenario exists
    const existingScenarios = await this.scenarioRepo.findByMode?.('pbl') || [];
    const existing = existingScenarios.find(s => s.sourceId === scenarioData.sourceId);

    if (existing && !force) {
      return { action: 'skipped' };
    }

    if (existing && force) {
      const updated = await this.scenarioRepo.update(existing.id, scenarioData);
      return { action: 'updated', scenario: updated };
    }

    const created = await this.scenarioRepo.create(scenarioData);
    return { action: 'created', scenario: created };
  }

  /**
   * Clear all PBL-related caches
   */
  async clearPBLCaches(): Promise<CacheResult> {
    const result: CacheResult = {
      cleared: 0,
      errors: []
    };

    try {
      console.log('[PBL Init] Clearing PBL caches...');

      // Clear specific PBL caches
      await distributedCacheService.delete('scenarios:by-mode:pbl');
      await distributedCacheService.delete('pbl:scenarios:*');

      // Get all cache keys and filter PBL-related ones
      const keys = await distributedCacheService.getAllKeys();
      const pblKeys = keys.filter(key =>
        key.includes('pbl') ||
        key.includes('scenario') ||
        key.startsWith('scenarios:')
      );

      // Delete each PBL-related key
      for (const key of pblKeys) {
        try {
          await distributedCacheService.delete(key);
          result.cleared++;
        } catch (error) {
          console.error(`Failed to delete cache key ${key}:`, error);
        }
      }

      console.log(`[PBL Init] Cleared ${result.cleared} cache entries`);
    } catch (error) {
      const errorMsg = `Cache clearing error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  /**
   * Get current PBL scenarios status
   */
  async getStatus(): Promise<{
    count: number;
    scenarios: Array<{
      id: string;
      sourceId: string;
      title: Record<string, string>;
      sourcePath: string;
      status: string;
      languages: string[];
    }>;
  }> {
    const scenarios = await this.scenarioRepo.findByMode?.('pbl') || [];

    return {
      count: scenarios.length,
      scenarios: scenarios.map(s => ({
        id: s.id,
        sourceId: s.sourceId || '',
        title: s.title,
        sourcePath: s.sourcePath || '',
        status: s.status,
        languages: (s.metadata as Record<string, unknown>)?.languagesAvailable as string[] || []
      }))
    };
  }
}

// Export singleton instance
export const pblInitializationService = new PBLInitializationService();
