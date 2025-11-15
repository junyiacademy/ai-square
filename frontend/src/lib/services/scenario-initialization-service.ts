/**
 * Unified Scenario Initialization Service
 * 統一的 YAML to Scenarios 初始化服務
 *
 * 負責從 YAML 檔案初始化所有類型的 Scenarios (PBL, Discovery, Assessment)
 * 符合統一學習架構：Content Source → Scenario → Program → Task → Evaluation
 */

import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { IScenario } from '@/types/unified-learning';
import { DifficultyLevel, LearningMode as DBLearningMode } from '@/types/database';
import { assessmentYAMLLoader } from './assessment-yaml-loader';
import { pblYAMLLoader } from './pbl-yaml-loader';
import { discoveryYAMLLoader } from './discovery-yaml-loader';
import path from 'path';

export interface ScenarioInitConfig {
  sourceType: 'pbl' | 'discovery' | 'assessment';
  yamlBasePath: string;
  forceUpdate?: boolean;
  dryRun?: boolean;
}

export interface InitializationResult {
  sourceType: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  scenarios: IScenario[];
}

export class ScenarioInitializationService {
  private scenarioRepo = repositoryFactory.getScenarioRepository();

  /**
   * 初始化所有模組的 Scenarios
   */
  async initializeAll(): Promise<InitializationResult[]> {
    const results: InitializationResult[] = [];

    // 1. Initialize PBL Scenarios
    console.log('Initializing PBL scenarios...');
    const pblResult = await this.initializePBLScenarios();
    results.push(pblResult);

    // 2. Initialize Discovery Scenarios
    console.log('Initializing Discovery scenarios...');
    const discoveryResult = await this.initializeDiscoveryScenarios();
    results.push(discoveryResult);

    // 3. Initialize Assessment Scenarios
    console.log('Initializing Assessment scenarios...');
    const assessmentResult = await this.initializeAssessmentScenarios();
    results.push(assessmentResult);

    return results;
  }

  /**
   * 初始化 PBL Scenarios
   */
  async initializePBLScenarios(options?: { forceUpdate?: boolean; dryRun?: boolean }): Promise<InitializationResult> {
    const config: ScenarioInitConfig = {
      sourceType: 'pbl',
      yamlBasePath: 'pbl_data/scenarios',
      forceUpdate: options?.forceUpdate,
      dryRun: options?.dryRun
    };

    return this.initializeFromYAML(config, new PBLYAMLProcessor());
  }

  /**
   * 初始化 Discovery Scenarios
   */
  async initializeDiscoveryScenarios(options?: { forceUpdate?: boolean; dryRun?: boolean }): Promise<InitializationResult> {
    const config: ScenarioInitConfig = {
      sourceType: 'discovery',
      yamlBasePath: 'discovery_data',
      forceUpdate: options?.forceUpdate,
      dryRun: options?.dryRun
    };

    return this.initializeFromYAML(config, new DiscoveryYAMLProcessor());
  }

  /**
   * 初始化 Assessment Scenarios
   */
  async initializeAssessmentScenarios(options?: { forceUpdate?: boolean; dryRun?: boolean }): Promise<InitializationResult> {
    const config: ScenarioInitConfig = {
      sourceType: 'assessment',
      yamlBasePath: 'assessment_data',
      forceUpdate: options?.forceUpdate,
      dryRun: options?.dryRun
    };

    return this.initializeFromYAML(config, new AssessmentYAMLProcessor());
  }

  /**
   * 通用的 YAML 初始化邏輯
   */
  private async initializeFromYAML(
    config: ScenarioInitConfig,
    processor: IYAMLProcessor
  ): Promise<InitializationResult> {
    const result: InitializationResult = {
      sourceType: config.sourceType,
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      scenarios: []
    };

    try {
      // 1. 掃描 YAML 檔案
      const yamlFiles = await processor.scanYAMLFiles(config.yamlBasePath);
      result.total = yamlFiles.length;

      // 2. 處理每個 YAML 檔案
      for (const yamlFile of yamlFiles) {
        try {
          // 檢查是否已存在
          const existingScenario = await this.findExistingScenario(
            config.sourceType,
            yamlFile
          );

          if (existingScenario && !config.forceUpdate) {
            result.skipped++;
            result.scenarios.push(existingScenario);
            continue;
          }

          // 載入並處理 YAML
          const yamlData = await processor.loadYAML(yamlFile);
          const scenarioData = await processor.transformToScenario(yamlData, yamlFile);

          if (config.dryRun) {
            console.log(`[DRY RUN] Would create/update scenario:`, scenarioData.title);
            result.created++;
            continue;
          }

          // 創建或更新 Scenario
          if (existingScenario) {
            // Convert IScenario to UpdateScenarioDto
            const updateData: Partial<IScenario> = {
              status: 'active' as const,
              version: scenarioData.version,
              title: scenarioData.title,
              description: scenarioData.description,
              objectives: scenarioData.objectives
            };

            const updated = await this.scenarioRepo.update(
              existingScenario.id,
              updateData
            );
            result.updated++;
            result.scenarios.push(updated);
          } else {
            // Convert IScenario to CreateScenarioDto
            // Create scenario with all required IScenario fields
            const scenarioToCreate = {
              ...scenarioData,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            // Remove id as it will be generated
            delete (scenarioToCreate as Record<string, unknown>).id;

            const created = await this.scenarioRepo.create(scenarioToCreate as Omit<IScenario, 'id'>);
            result.created++;
            result.scenarios.push(created);
          }

        } catch (error) {
          const errorMsg = `Failed to process ${yamlFile}: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

    } catch (error) {
      result.errors.push(`Fatal error: ${error}`);
    }

    return result;
  }

  /**
   * 查找已存在的 Scenario
   */
  private async findExistingScenario(
    sourceType: string,
    yamlPath: string
  ): Promise<IScenario | null> {
    // Determine the mode based on the yamlPath
    let mode: DBLearningMode;
    if (yamlPath.includes('/pbl_data/') || yamlPath.includes('pbl')) {
      mode = 'pbl';
    } else if (yamlPath.includes('/discovery_data/') || yamlPath.includes('discovery')) {
      mode = 'discovery';
    } else if (yamlPath.includes('/assessment_data/') || yamlPath.includes('assessment')) {
      mode = 'assessment';
    } else {
      // Default to pbl if we can't determine from path
      mode = 'pbl';
    }

    // Use findByMode to get scenarios of specific mode
    const scenarios = await this.scenarioRepo.findByMode?.(mode) || [];

    // Find matching scenario by source path or sourceMetadata.configPath
    const match = scenarios.find((s) =>
      s.sourcePath === yamlPath ||
      (s.sourceMetadata as Record<string, unknown>)?.sourcePath === yamlPath ||
      (s.sourceMetadata as Record<string, unknown>)?.configPath === yamlPath
    );

    return match || null;
  }

  /**
   * Convert database Scenario to IScenario
   */
  private convertToIScenario(scenario: IScenario): IScenario {
    // Simply return the scenario as it's already in IScenario format
    return scenario;
  }

  /**
   * Convert DifficultyLevel enum to string
   */
  private getDifficultyString(level: DifficultyLevel): string {
    return level;
  }
}

/**
 * YAML 處理器介面
 */
interface IYAMLProcessor {
  scanYAMLFiles(basePath: string): Promise<string[]>;
  loadYAML(filePath: string): Promise<unknown>;
  transformToScenario(yamlData: unknown, filePath: string): Promise<Omit<IScenario, 'id'>>;
}

/**
 * PBL YAML 處理器
 */
class PBLYAMLProcessor implements IYAMLProcessor {
  private loader: typeof pblYAMLLoader;

  constructor() {
    this.loader = pblYAMLLoader;
  }

  async scanYAMLFiles(basePath: string): Promise<string[]> {
    // const fs = await import('fs/promises');
    // const fullPath = path.join(process.cwd(), 'public', basePath);

    try {
      const scenarios = await this.loader.scanScenarios();
      // Return full paths relative to project root (using English as default language)
      return scenarios.map(scenarioId =>
        path.join(basePath, scenarioId, `${scenarioId}_en.yaml`)
      );
    } catch (error) {
      console.error('Error scanning PBL scenarios:', error);
      return [];
    }
  }

  async loadYAML(filePath: string): Promise<unknown> {
    // Extract scenario ID from path
    const parts = filePath.split(path.sep);
    const scenarioId = parts[parts.length - 2]; // Get folder name

    const data = await this.loader.loadScenario(scenarioId);
    if (!data) {
      throw new Error(`Failed to load PBL scenario: ${filePath}`);
    }

    return data;
  }

  async transformToScenario(yamlData: unknown, filePath: string): Promise<Omit<IScenario, 'id'>> {
    const parts = filePath.split(path.sep);
    const scenarioId = parts[parts.length - 2];

    const pblData = yamlData as Record<string, unknown>;
    const scenarioInfo = (pblData.scenario_info || {}) as Record<string, unknown>;

    // Debug: log the data structure to understand the issue
    console.log('PBL YAML Data for', scenarioId, ':', JSON.stringify({
      scenarioInfo: scenarioInfo,
      ksaMapping: pblData.ksa_mapping,
      tasks: pblData.tasks,
      aiModules: pblData.ai_modules
    }, null, 2));

    return {
      mode: 'pbl' as const,
      status: 'active' as const,
      version: '1.0',
      sourceType: 'yaml' as const,
      sourcePath: filePath,
      sourceId: scenarioId,
      sourceMetadata: {
        scenarioId,
        configPath: filePath,
        lastSync: new Date().toISOString()
      },
      title: { en: (scenarioInfo.title as string) || 'Untitled PBL Scenario' },
      description: { en: (scenarioInfo.description as string) || '' },
      objectives: (scenarioInfo.learning_objectives as string[]) || [],
      difficulty: ((scenarioInfo.difficulty as string) || 'intermediate') as DifficultyLevel,
      estimatedMinutes: parseInt((scenarioInfo.estimated_duration as string)?.replace('minutes', '') || '60'),
      prerequisites: (scenarioInfo.prerequisites as string[]) || [],
      taskTemplates: [], // PBL tasks are defined in the YAML
      taskCount: ((pblData.tasks as Array<unknown>) || []).length,
      xpRewards: {},
      unlockRequirements: {},
      pblData: {
        targetDomains: (scenarioInfo.target_domains as string[]) || [],
        ksaMappings: JSON.parse(JSON.stringify((pblData.ksa_mapping as Record<string, unknown>) || {})),
        tasks: (pblData.tasks as Array<Record<string, unknown>>) || []
      },
      discoveryData: {},
      assessmentData: {},
      aiModules: JSON.parse(JSON.stringify((pblData.ai_modules as Record<string, unknown>) || {})),
      resources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        difficulty: scenarioInfo.difficulty,
        estimatedDuration: scenarioInfo.estimated_duration
      }
    };
  }
}

/**
 * Discovery YAML 處理器
 */
class DiscoveryYAMLProcessor implements IYAMLProcessor {
  private loader: typeof discoveryYAMLLoader;

  constructor() {
    this.loader = discoveryYAMLLoader;
  }

  async scanYAMLFiles(basePath: string): Promise<string[]> {
    const careerTypes = await this.loader.scanPaths();
    const allPaths: string[] = [];

    // For each career type, add paths for both languages
    for (const careerType of careerTypes) {
      // Add English version
      allPaths.push(path.join(basePath, careerType, `${careerType}_en.yml`));
      // Add Traditional Chinese version
      allPaths.push(path.join(basePath, careerType, `${careerType}_zhTW.yml`));
    }

    return allPaths;
  }

  async loadYAML(filePath: string): Promise<unknown> {
    // Extract career type and language from path
    const parts = filePath.split(path.sep);
    const careerType = parts[parts.length - 2];
    const fileName = parts[parts.length - 1];

    // Extract language from filename (e.g., app_developer_en.yml)
    const match = fileName.match(/_(\w+)\.yml$/);
    const language = match ? match[1] : 'en';

    const data = await this.loader.loadPath(careerType, language);
    if (!data) {
      throw new Error(`Failed to load Discovery path: ${filePath}`);
    }

    return data;
  }

  async transformToScenario(yamlData: unknown, filePath: string): Promise<Omit<IScenario, 'id'>> {
    const parts = filePath.split(path.sep);
    const careerType = parts[parts.length - 2];

    const discoveryData = yamlData as Record<string, unknown>;
    const metadata = (discoveryData.metadata || {}) as Record<string, unknown>;

    return {
      mode: 'discovery' as const,
      status: 'active' as const,
      version: '1.0',
      sourceType: 'yaml' as const,
      sourcePath: filePath,
      sourceId: careerType,
      sourceMetadata: {
        careerType,
        category: discoveryData.category,
        configPath: filePath,
        lastSync: new Date().toISOString()
      },
      title: { en: (metadata.title as string) || 'Untitled Discovery Path' },
      description: { en: (metadata.long_description as string) || (metadata.short_description as string) || '' },
      objectives: [
        'Explore career possibilities',
        'Develop practical skills',
        'Complete challenges',
        'Build portfolio projects'
      ],
      difficulty: 'intermediate' as DifficultyLevel,
      estimatedMinutes: ((metadata.estimated_hours as number) || 1) * 60,
      prerequisites: (metadata.prerequisites as string[]) || [],
      taskTemplates: [], // Discovery generates tasks dynamically
      taskCount: 0,
      xpRewards: {},
      unlockRequirements: {},
      pblData: {},
      discoveryData: {
        category: discoveryData.category,
        difficultyRange: discoveryData.difficulty_range,
        estimatedHours: metadata.estimated_hours as number,
        skillFocus: (metadata.skill_focus as string[]) || [],
        worldSetting: discoveryData.world_setting,
        skillTree: discoveryData.skill_tree,
        milestoneQuests: discoveryData.milestone_quests || []
      },
      assessmentData: {},
      aiModules: {},
      resources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        category: discoveryData.category,
        difficultyRange: discoveryData.difficulty_range
      }
    };
  }
}

/**
 * Assessment YAML 處理器
 */
class AssessmentYAMLProcessor implements IYAMLProcessor {
  private loader: typeof assessmentYAMLLoader;

  constructor() {
    this.loader = assessmentYAMLLoader;
  }

  async scanYAMLFiles(basePath: string): Promise<string[]> {
    const assessments = await this.loader.scanAssessments();

    // 根據 Rule #14: 每個 assessment 主題只返回一個路徑（主要語言版本）
    // 不要為每個語言版本創建獨立的路徑
    return assessments.map(assessmentName =>
      path.join(basePath, assessmentName, `${assessmentName}_questions_en.yaml`) // 使用英文作為主要版本
    );
  }

  async loadYAML(filePath: string): Promise<unknown> {
    // Extract assessment name and language from path
    const parts = filePath.split(path.sep);
    const fileName = parts[parts.length - 1];
    const assessmentName = parts[parts.length - 2];
    const match = fileName.match(/_questions_(\w+)\.yaml$/);
    const language = match ? match[1] : 'en';

    const data = await this.loader.loadAssessment(assessmentName, language);
    if (!data) {
      throw new Error(`Failed to load Assessment: ${filePath}`);
    }

    return data;
  }

  async transformToScenario(yamlData: unknown, filePath: string): Promise<Omit<IScenario, 'id'>> {
    const parts = filePath.split(path.sep);
    const assessmentName = parts[parts.length - 2];

    // 根據 Rule #14: 載入所有語言版本並合併
    const availableLanguages = await this.loader.getAvailableLanguages(assessmentName);
    const titles: Record<string, string> = {};
    const descriptions: Record<string, string> = {};
    const allQuestionsByLang: Record<string, unknown[]> = {};

    // 載入所有語言版本
    for (const lang of availableLanguages) {
      const langData = await this.loader.loadAssessment(assessmentName, lang);
      if (langData) {
        const config = (langData.config || langData.assessment_config || {}) as Record<string, unknown>;

        // 收集多語言 title 和 description
        const titleValue = this.loader.getTranslatedField(config, 'title', lang) || `${assessmentName} Assessment`;
        const descValue = this.loader.getTranslatedField(config, 'description', lang) || '';

        titles[lang] = titleValue;
        descriptions[lang] = descValue;

        // 儲存該語言的題目
        allQuestionsByLang[lang] = langData.questions || [];
      }
    }

    // 使用英文版本的配置作為基礎
    const baseData = yamlData as Record<string, unknown>;
    const config = (baseData.config || baseData.assessment_config || {}) as Record<string, unknown>;

    return {
      mode: 'assessment' as const,
      status: 'active' as const,
      version: '1.0',
      sourceType: 'yaml' as const,
      sourcePath: filePath,
      sourceId: assessmentName,
      sourceMetadata: {
        assessmentType: 'standard',
        assessmentName,
        availableLanguages,
        primaryLanguage: 'en',
        configPath: filePath,
        lastSync: new Date().toISOString()
      },
      title: titles, // 包含所有語言的標題
      description: descriptions, // 包含所有語言的描述
      objectives: [
        'Evaluate your knowledge and skills',
        'Identify areas for improvement',
        'Get personalized recommendations'
      ],
      difficulty: 'intermediate' as DifficultyLevel,
      estimatedMinutes: (config.time_limit_minutes as number) || 15,
      prerequisites: (config.prerequisites as string[]) || [],
      taskTemplates: [{
        id: 'assessment-task',
        title: {
          en: 'Complete Assessment',
          zh: '完成評估',
          es: 'Completar evaluación',
          ja: '評価を完了する',
          ko: '평가 완료',
          fr: 'Terminer l\'évaluation',
          de: 'Bewertung abschließen',
          ru: 'Завершить оценку',
          it: 'Completa valutazione'
        },
        type: 'question' as const
      }],
      taskCount: (config.total_questions as number) || 12,
      xpRewards: {},
      unlockRequirements: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {
        totalQuestions: (config.total_questions as number) || 12,
        timeLimit: (config.time_limit_minutes as number) || 15,
        passingScore: (config.passing_score as number) || 60,
        domains: (config.domains as string[]) || [],
        questionBankByLanguage: allQuestionsByLang, // 儲存所有語言的題目
        primaryLanguage: 'en'
      },
      aiModules: {},
      resources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        totalQuestions: (config.total_questions as number) || 12,
        timeLimit: (config.time_limit_minutes as number) || 15,
        passingScore: (config.passing_score as number) || 60
      }
    };
  }
}

// Export singleton instance
export const scenarioInitService = new ScenarioInitializationService();
