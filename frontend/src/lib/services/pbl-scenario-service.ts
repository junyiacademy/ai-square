/**
 * PBL Scenario Service
 * 處理 YAML Content Source → Scenario UUID 的轉換
 */

import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { IScenario, ITaskTemplate } from '@/types/unified-learning';
import { DifficultyLevel } from '@/types/database';

interface PBLYAMLData {
  scenario_info: {
    id: string;
    title: string;
    title_zhTW?: string;
    description: string;
    description_zhTW?: string;
    difficulty: string;
    estimated_duration: number;
    target_domains: string[];
    prerequisites?: string[];
    learning_objectives?: string[];
    learning_objectives_zhTW?: string[];
  };
  tasks?: Array<{
    id: string;
    title: string;
    title_zhTW?: string;
    description: string;
    description_zhTW?: string;
    category?: string;
    instructions?: string[];
    instructions_zhTW?: string[];
    expected_outcome?: string;
    expected_outcome_zhTW?: string;
    time_limit?: number;
  }>;
  ksa_mapping?: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
}

export class PBLScenarioService {
  
  /**
   * 從 YAML 載入並創建 Scenario UUID 檔案
   */
  async createScenarioFromYAML(yamlId: string, language: string = 'en'): Promise<IScenario> {
    // 載入 YAML Content Source
    const yamlData = await this.loadYAMLContent(yamlId, language);
    
    // 轉換成 IScenario 格式
    const scenario: Omit<IScenario, 'id'> = {
      mode: 'pbl' as const,
      sourceType: 'pbl' as const,
      sourcePath: `pbl_data/scenarios/${yamlId.replace(/-/g, '_')}`,
      sourceId: yamlId,
      sourceMetadata: {
        yamlId,
        language,
        originalId: yamlData.scenario_info.id
      },
      title: { [language]: this.getLocalizedField(yamlData.scenario_info, 'title', language) },
      description: { [language]: this.getLocalizedField(yamlData.scenario_info, 'description', language) },
      objectives: this.getLocalizedArrayField(yamlData.scenario_info, 'learning_objectives', language),
      difficulty: (yamlData.scenario_info.difficulty || 'intermediate') as DifficultyLevel,
      estimatedMinutes: yamlData.scenario_info.estimated_duration || 60,
      prerequisites: yamlData.scenario_info.prerequisites || [],
      taskTemplates: this.convertTasksToTemplates(yamlData.tasks || [], language),
      taskCount: (yamlData.tasks || []).length,
      xpRewards: {},
      unlockRequirements: {},
      pblData: {
        targetDomains: yamlData.scenario_info.target_domains,
        ksaMapping: yamlData.ksa_mapping
      },
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      status: 'active' as const,
      version: '1.0.0',
      metadata: {
        difficulty: yamlData.scenario_info.difficulty,
        estimatedDuration: yamlData.scenario_info.estimated_duration,
        targetDomains: yamlData.scenario_info.target_domains,
        prerequisites: yamlData.scenario_info.prerequisites || [],
        ksaMapping: yamlData.ksa_mapping,
        yamlData: yamlData // 保存完整的 YAML 資料
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 使用 Scenario Repository 創建 UUID 檔案
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    return scenarioRepo.create(scenario);
  }
  
  /**
   * 根據 YAML ID 尋找或創建 Scenario UUID
   */
  async findOrCreateScenarioByYAMLId(yamlId: string, language: string = 'en'): Promise<IScenario> {
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // 先嘗試找到現有的 Scenario (by sourceMetadata.yamlId)
    const existingScenarios = await scenarioRepo.findBySource('pbl');
    const existingScenario = existingScenarios.find((s: IScenario) => 
      s.sourceMetadata?.yamlId === yamlId
    );
    
    if (existingScenario) {
      return existingScenario;
    }
    
    // 如果不存在，則創建新的
    return this.createScenarioFromYAML(yamlId, language);
  }
  
  private async loadYAMLContent(yamlId: string, language: string): Promise<PBLYAMLData> {
    const scenarioFolder = yamlId.replace(/-/g, '_');
    const fileName = `${scenarioFolder}_${language}.yaml`;
    let yamlPath = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios', scenarioFolder, fileName);
    
    // 檢查語言特定檔案是否存在，否則回退到英文
    try {
      await fs.access(yamlPath);
    } catch {
      yamlPath = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios', scenarioFolder, `${scenarioFolder}_en.yaml`);
    }
    
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    return yaml.load(yamlContent) as PBLYAMLData;
  }
  
  private getLocalizedField(obj: Record<string, unknown>, fieldName: string, language: string): string {
    const langSuffix = language;
    const localizedField = `${fieldName}_${langSuffix}`;
    return obj[localizedField] || obj[fieldName] || '';
  }
  
  private getLocalizedArrayField(obj: Record<string, unknown>, fieldName: string, language: string): string[] {
    const langSuffix = language;
    const localizedField = `${fieldName}_${langSuffix}`;
    const value = obj[localizedField] || obj[fieldName] || [];
    return Array.isArray(value) ? value : [];
  }
  
  private convertTasksToTemplates(tasks: Array<Record<string, unknown>>, language: string): ITaskTemplate[] {
    return tasks.map(task => ({
      id: task.id,
      title: this.getLocalizedField(task, 'title', language),
      type: 'chat' as const, // PBL tasks are primarily chat-based
      description: this.getLocalizedField(task, 'description', language),
      metadata: {
        category: task.category,
        instructions: this.getLocalizedArrayField(task, 'instructions', language),
        expectedOutcome: this.getLocalizedField(task, 'expected_outcome', language),
        timeLimit: task.time_limit,
        originalTaskData: task
      }
    }));
  }
  
  /**
   * 列出所有可用的 YAML IDs
   */
  async listAvailableYAMLIds(): Promise<string[]> {
    const scenariosPath = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios');
    const folders = await fs.readdir(scenariosPath, { withFileTypes: true });
    
    return folders
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
      .map(dirent => dirent.name.replace(/_/g, '-')); // 轉換回 dash-style 供前端使用
  }
}

export const pblScenarioService = new PBLScenarioService();