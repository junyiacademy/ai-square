/**
 * Discovery Scenario Service
 * 處理 Discovery YAML Content Source → Scenario UUID 的轉換
 */

import path from 'path';
import yaml from 'js-yaml';
import { IScenario, ITaskTemplate } from '@/types/unified-learning';

interface DiscoveryYAMLData {
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
  skill_tree?: {
    core_skills: Array<{
      id: string;
      name: string;
      description: string;
      max_level: number;
    }>;
  };
}

export class DiscoveryScenarioService {
  
  /**
   * 從 YAML 載入並創建 Scenario UUID 檔案
   */
  async createScenarioFromYAML(careerType: string, language: string = 'en'): Promise<IScenario> {
    // 載入 YAML Content Source
    const yamlData = await this.loadYAMLContent(careerType, language);
    
    // 轉換成 IScenario 格式
    const scenario: Omit<IScenario, 'id'> = {
      mode: 'discovery',
      status: 'active',
      version: '1.0.0',
      sourceType: 'yaml',
      sourcePath: `discovery_data/${careerType}`,
      sourceId: yamlData.path_id,
      sourceMetadata: {
        careerType,
        language,
        originalId: yamlData.path_id
      },
      title: { [language]: yamlData.metadata.title },
      description: { [language]: yamlData.metadata.short_description },
      objectives: this.extractObjectives(yamlData),
      difficulty: yamlData.difficulty_range?.[0] || 'beginner',
      estimatedMinutes: (yamlData.metadata.estimated_hours || 1) * 60,
      prerequisites: [],
      taskTemplates: this.createTaskTemplates(yamlData),
      xpRewards: { completion: 100, bonus: 20 },
      unlockRequirements: { level: 1 },
      discoveryData: {
        careerType,
        category: yamlData.category,
        difficultyRange: yamlData.difficulty_range,
        skillFocus: yamlData.metadata.skill_focus,
        worldSetting: yamlData.world_setting,
        startingScenario: yamlData.starting_scenario,
        longDescription: yamlData.metadata.long_description
      },
      aiModules: [],
      resources: [],
      metadata: {
        careerType,
        yamlData: yamlData // 保存完整的 YAML 資料供相容性使用
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 使用 Scenario Repository 創建 UUID 檔案
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    return scenarioRepo.create(scenario);
  }
  
  /**
   * 根據 career type 尋找或創建 Scenario UUID
   */
  async findOrCreateScenarioByCareerType(careerType: string, language: string = 'en'): Promise<IScenario> {
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // 先嘗試找到現有的 Scenario (by sourceMetadata.careerType)
    const existingScenarios = await scenarioRepo.findBySource('yaml');
    const existingScenario = existingScenarios.find((s: IScenario) => 
      s.mode === 'discovery' && s.sourceMetadata?.careerType === careerType
    );
    
    if (existingScenario) {
      return existingScenario;
    }
    
    // 如果不存在，則創建新的
    return this.createScenarioFromYAML(careerType, language);
  }
  
  private async loadYAMLContent(careerType: string, language: string): Promise<DiscoveryYAMLData> {
    // Import fs dynamically to avoid client-side issues
    const fs = await import('fs').then(m => m.promises);
    
    const fileName = `${careerType}_${language}.yml`;
    let yamlPath = path.join(process.cwd(), 'public', 'discovery_data', careerType, fileName);
    
    // 檢查語言特定檔案是否存在，否則回退到英文
    try {
      await fs.access(yamlPath);
    } catch {
      yamlPath = path.join(process.cwd(), 'public', 'discovery_data', careerType, `${careerType}_en.yml`);
    }
    
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    return yaml.load(yamlContent) as DiscoveryYAMLData;
  }
  
  private extractObjectives(yamlData: DiscoveryYAMLData): string[] {
    // Discovery 的目標從 skill focus 和 world setting 中提取
    const objectives = [
      `Explore the ${yamlData.world_setting.name} as a ${yamlData.metadata.title}`,
      `Master ${yamlData.metadata.skill_focus.join(', ')} skills`,
      `Complete challenges in ${yamlData.metadata.estimated_hours} hours of gameplay`,
      yamlData.starting_scenario.description.split('.')[0] // 取第一句作為目標
    ];
    
    return objectives;
  }
  
  private createTaskTemplates(yamlData: DiscoveryYAMLData): ITaskTemplate[] {
    // Discovery 的任務是動態生成的，這裡創建初始任務模板
    const templates: ITaskTemplate[] = [];
    
    // 從 initial_tasks 創建任務模板
    if (yamlData.starting_scenario.initial_tasks) {
      yamlData.starting_scenario.initial_tasks.forEach((taskId, index) => {
        templates.push({
          id: taskId,
          title: this.formatTaskTitle(taskId),
          type: 'chat' as const, // Use a valid TaskType
          description: `Initial task for ${yamlData.metadata.title}`,
          metadata: {
            order: index + 1,
            isInitial: true,
            careerType: yamlData.path_id,
            taskSubtype: 'discovery' // Store discovery type in metadata
          }
        });
      });
    }
    
    return templates;
  }
  
  private formatTaskTitle(taskId: string): string {
    // 將 snake_case 轉換為 Title Case
    return taskId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * 列出所有可用的 Career Types
   */
  async listAvailableCareerTypes(): Promise<string[]> {
    // Import fs dynamically to avoid client-side issues
    const fs = await import('fs').then(m => m.promises);
    
    const discoveryPath = path.join(process.cwd(), 'public', 'discovery_data');
    const folders = await fs.readdir(discoveryPath, { withFileTypes: true });
    
    return folders
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }
}

export const discoveryScenarioService = new DiscoveryScenarioService();