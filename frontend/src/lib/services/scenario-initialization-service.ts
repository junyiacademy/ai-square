/**
 * Unified Scenario Initialization Service
 * 統一的 YAML to Scenarios 初始化服務
 * 
 * 負責從 YAML 檔案初始化所有類型的 Scenarios (PBL, Discovery, Assessment)
 * 符合統一學習架構：Content Source → Scenario → Program → Task → Evaluation
 */

import { getScenarioRepository } from '@/lib/implementations/gcs-v2';
import { IScenario, IContentSource } from '@/types/unified-learning';
import { BaseYAMLLoader } from '@/lib/abstractions/base-yaml-loader';
import { AssessmentYAMLLoader } from './assessment-yaml-loader';
import { PBLYAMLLoader } from './pbl-yaml-loader';
import { DiscoveryYAMLLoader } from './discovery-yaml-loader';
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
  private scenarioRepo = getScenarioRepository();

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
            const updated = await this.scenarioRepo.update(
              existingScenario.id,
              scenarioData
            );
            result.updated++;
            result.scenarios.push(updated);
          } else {
            const created = await this.scenarioRepo.create(scenarioData);
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
    // 根據 sourceRef 查找
    const scenarios = await this.scenarioRepo.findBySource(sourceType);
    
    return scenarios.find(s => 
      s.sourceRef.type === 'yaml' && 
      s.sourceRef.path === yamlPath
    ) || null;
  }
}

/**
 * YAML 處理器介面
 */
interface IYAMLProcessor {
  scanYAMLFiles(basePath: string): Promise<string[]>;
  loadYAML(filePath: string): Promise<any>;
  transformToScenario(yamlData: any, filePath: string): Promise<Omit<IScenario, 'id'>>;
}

/**
 * PBL YAML 處理器
 */
class PBLYAMLProcessor implements IYAMLProcessor {
  private loader: PBLYAMLLoader;

  constructor() {
    const { PBLYAMLLoader } = require('./pbl-yaml-loader');
    this.loader = new PBLYAMLLoader();
  }

  async scanYAMLFiles(basePath: string): Promise<string[]> {
    const fs = await import('fs/promises');
    const fullPath = path.join(process.cwd(), 'public', basePath);
    
    try {
      const scenarios = await this.loader.scanScenarios();
      // Return full paths relative to project root
      return scenarios.map(scenarioId => 
        path.join(basePath, scenarioId, `${scenarioId}_scenario.yaml`)
      );
    } catch (error) {
      console.error('Error scanning PBL scenarios:', error);
      return [];
    }
  }

  async loadYAML(filePath: string): Promise<any> {
    // Extract scenario ID from path
    const parts = filePath.split(path.sep);
    const scenarioId = parts[parts.length - 2]; // Get folder name
    
    const data = await this.loader.loadScenario(scenarioId);
    if (!data) {
      throw new Error(`Failed to load PBL scenario: ${filePath}`);
    }
    
    return data;
  }

  async transformToScenario(yamlData: any, filePath: string): Promise<Omit<IScenario, 'id'>> {
    const parts = filePath.split(path.sep);
    const scenarioId = parts[parts.length - 2];
    
    return {
      sourceType: 'pbl',
      sourceRef: {
        type: 'yaml',
        path: filePath,
        metadata: {
          scenarioId,
          lastSync: new Date().toISOString()
        }
      },
      title: yamlData.scenario_info?.title || 'Untitled PBL Scenario',
      description: yamlData.scenario_info?.description || '',
      objectives: yamlData.scenario_info?.learning_objectives || [],
      taskTemplates: [], // PBL tasks are defined in the YAML
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        difficulty: yamlData.scenario_info?.difficulty,
        estimatedDuration: yamlData.scenario_info?.estimated_duration,
        targetDomains: yamlData.scenario_info?.target_domains,
        ksaMappings: yamlData.ksa_mappings || [],
        programs: yamlData.programs || []
      }
    };
  }
}

/**
 * Discovery YAML 處理器
 */
class DiscoveryYAMLProcessor implements IYAMLProcessor {
  private loader: DiscoveryYAMLLoader;

  constructor() {
    this.loader = new DiscoveryYAMLLoader();
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

  async loadYAML(filePath: string): Promise<any> {
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

  async transformToScenario(yamlData: any, filePath: string): Promise<Omit<IScenario, 'id'>> {
    const parts = filePath.split(path.sep);
    const careerType = parts[parts.length - 2];
    const fileName = parts[parts.length - 1];
    const match = fileName.match(/_(\w+)\.yml$/);
    const language = match ? match[1] : 'en';
    
    return {
      sourceType: 'discovery',
      sourceRef: {
        type: 'yaml',
        path: filePath,
        metadata: {
          careerType,
          category: yamlData.category,
          lastSync: new Date().toISOString()
        }
      },
      title: yamlData.metadata?.title || 'Untitled Discovery Path',
      description: yamlData.metadata?.long_description || yamlData.metadata?.short_description || '',
      objectives: [
        'Explore career possibilities',
        'Develop practical skills',
        'Complete challenges',
        'Build portfolio projects'
      ],
      taskTemplates: [], // Discovery generates tasks dynamically
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        category: yamlData.category,
        difficultyRange: yamlData.difficulty_range,
        estimatedHours: yamlData.metadata?.estimated_hours,
        skillFocus: yamlData.metadata?.skill_focus || [],
        worldSetting: yamlData.world_setting,
        skillTree: yamlData.skill_tree,
        milestoneQuests: yamlData.milestone_quests || []
      }
    };
  }
}

/**
 * Assessment YAML 處理器
 */
class AssessmentYAMLProcessor implements IYAMLProcessor {
  private loader: AssessmentYAMLLoader;

  constructor() {
    const { AssessmentYAMLLoader } = require('./assessment-yaml-loader');
    this.loader = new AssessmentYAMLLoader();
  }

  async scanYAMLFiles(basePath: string): Promise<string[]> {
    const assessments = await this.loader.scanAssessments();
    const allPaths: string[] = [];
    
    // For each assessment, check available languages
    for (const assessmentName of assessments) {
      const languages = await this.loader.getAvailableLanguages(assessmentName);
      
      // Add path for each language version
      for (const lang of languages) {
        allPaths.push(
          path.join(basePath, assessmentName, `${assessmentName}_questions_${lang}.yaml`)
        );
      }
    }
    
    return allPaths;
  }

  async loadYAML(filePath: string): Promise<any> {
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

  async transformToScenario(yamlData: any, filePath: string): Promise<Omit<IScenario, 'id'>> {
    const parts = filePath.split(path.sep);
    const assessmentName = parts[parts.length - 2];
    const fileName = parts[parts.length - 1];
    const match = fileName.match(/_questions_(\w+)\.yaml$/);
    const language = match ? match[1] : 'en';
    
    const config = yamlData.config || yamlData.assessment_config || {};
    
    return {
      sourceType: 'assessment',
      sourceRef: {
        type: 'yaml',
        path: filePath,
        metadata: {
          assessmentType: 'standard',
          assessmentName,
          language,
          lastSync: new Date().toISOString()
        }
      },
      title: this.loader.getTranslatedField(config, 'title', language) || `${assessmentName} Assessment`,
      description: this.loader.getTranslatedField(config, 'description', language) || '',
      objectives: [
        'Evaluate your knowledge and skills',
        'Identify areas for improvement',
        'Get personalized recommendations'
      ],
      taskTemplates: [{
        id: 'assessment-task',
        title: 'Complete Assessment',
        type: 'question'
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        totalQuestions: config.total_questions || 12,
        timeLimit: config.time_limit_minutes || 15,
        passingScore: config.passing_score || 60,
        domains: config.domains || [],
        questionBank: yamlData.questions || [],
        language
      }
    };
  }
}

// Export singleton instance
export const scenarioInitService = new ScenarioInitializationService();