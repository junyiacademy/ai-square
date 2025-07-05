/**
 * PBL Scenario Service
 * 統一管理 PBL scenario 資料載入和處理
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Scenario } from '@/types/pbl';
import { TaskType } from '../core/task/types';

export interface ScenarioTask {
  id: string;
  title: string;
  description?: string;
  instructions?: string[];
  expectedOutcome?: string;
  type?: string;
  aiModule?: {
    role: string;
    model: string;
    persona?: string;
    initialPrompt?: string;
  };
  ai_module?: {
    role: string;
    model: string;
    persona?: string;
    initial_prompt?: string;
  };
}

export interface ProcessedScenario {
  id: string;
  title: string;
  description?: string;
  domain?: string;
  difficulty?: string;
  estimatedTime?: number;
  language: string;
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    instructions?: string[];
    expectedOutcome?: string;
    type: TaskType;
    order: number;
    aiModule: {
      role: string;
      model: string;
      persona?: string;
      initialPrompt?: string;
    };
  }>;
  metadata: {
    loadedAt: Date;
    filePath: string;
    version?: string;
  };
}

export class PBLScenarioService {
  private scenarioCache = new Map<string, ProcessedScenario>();
  private cacheTimeout = 5 * 60 * 1000; // 5 分鐘快取

  /**
   * 載入並處理 scenario 資料
   */
  loadScenario(scenarioId: string, language: string = 'en'): ProcessedScenario {
    const cacheKey = `${scenarioId}:${language}`;
    
    // 檢查快取
    const cached = this.scenarioCache.get(cacheKey);
    if (cached && (Date.now() - cached.metadata.loadedAt.getTime()) < this.cacheTimeout) {
      return cached;
    }

    try {
      const scenarioFolder = scenarioId.replace(/-/g, '_');
      const fileName = `${scenarioFolder}_${language}.yaml`;
      let yamlPath = path.join(
        process.cwd(),
        'public',
        'pbl_data',
        'scenarios',
        scenarioFolder,
        fileName
      );
      
      // 檢查語言特定檔案是否存在，否則回退到英文
      let actualLanguage = language;
      if (!fs.existsSync(yamlPath)) {
        yamlPath = path.join(
          process.cwd(),
          'public',
          'pbl_data',
          'scenarios',
          scenarioFolder,
          `${scenarioFolder}_en.yaml`
        );
        actualLanguage = 'en';
      }
      
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      const loadedData = yaml.load(yamlContent) as any;
      
      // 從 scenario_info 中提取資料
      const scenarioData = loadedData.scenario_info || loadedData;

      // 處理和標準化資料
      const processedScenario: ProcessedScenario = {
        id: scenarioId,
        title: scenarioData.title,
        description: scenarioData.description,
        domain: scenarioData.target_domains?.[0], // 取第一個 domain
        difficulty: scenarioData.difficulty,
        estimatedTime: scenarioData.estimated_duration || scenarioData.estimatedTime,
        language: actualLanguage,
        tasks: this.processTasks(loadedData.tasks || scenarioData.tasks || []),
        metadata: {
          loadedAt: new Date(),
          filePath: yamlPath,
          version: scenarioData.version
        }
      };

      // 儲存到快取
      this.scenarioCache.set(cacheKey, processedScenario);

      return processedScenario;

    } catch (error) {
      console.error(`Error loading scenario ${scenarioId} (${language}):`, error);
      throw new Error(`Failed to load scenario: ${scenarioId}`);
    }
  }

  /**
   * 獲取可用的 scenarios 列表
   */
  getAvailableScenarios(language: string = 'en'): Array<{
    id: string;
    title: string;
    description?: string;
    domain?: string;
    difficulty?: string;
    estimatedTime?: number;
    language: string;
  }> {
    try {
      const scenariosPath = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios');
      const folders = fs.readdirSync(scenariosPath, { withFileTypes: true });
      
      const scenarios = [];
      
      for (const folder of folders) {
        if (folder.isDirectory()) {
          try {
            const scenarioId = folder.name.replace(/_/g, '-');
            const scenarioData = this.loadScenario(scenarioId, language);
            
            scenarios.push({
              id: scenarioId,
              title: scenarioData.title,
              description: scenarioData.description,
              domain: scenarioData.domain,
              difficulty: scenarioData.difficulty,
              estimatedTime: scenarioData.estimatedTime,
              language: scenarioData.language
            });
          } catch (error) {
            console.warn(`Failed to load scenario ${folder.name}:`, error);
            // 繼續處理其他 scenarios
          }
        }
      }
      
      return scenarios.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      
    } catch (error) {
      console.error('Error getting available scenarios:', error);
      return [];
    }
  }

  /**
   * 根據 task ID 查找 task 配置
   */
  async getTaskConfig(
    scenarioId: string, 
    taskId: string, 
    language: string = 'en'
  ): Promise<ProcessedScenario['tasks'][0] | null> {
    try {
      const scenario = await this.loadScenario(scenarioId, language);
      return scenario.tasks.find(task => 
        task.id === taskId || 
        task.title.toLowerCase().includes(taskId.toLowerCase())
      ) || null;
    } catch (error) {
      console.error(`Error getting task config for ${scenarioId}:${taskId}:`, error);
      return null;
    }
  }

  /**
   * 檢查 scenario 是否存在
   */
  async scenarioExists(scenarioId: string, language: string = 'en'): Promise<boolean> {
    try {
      await this.loadScenario(scenarioId, language);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 獲取支援的語言列表
   */
  async getSupportedLanguages(scenarioId: string): Promise<string[]> {
    try {
      const scenarioFolder = scenarioId.replace(/-/g, '_');
      const scenarioPath = path.join(
        process.cwd(),
        'public',
        'pbl_data',
        'scenarios',
        scenarioFolder
      );
      
      const files = await fs.readdir(scenarioPath);
      const languages = files
        .filter(file => file.endsWith('.yaml'))
        .map(file => {
          const match = file.match(new RegExp(`${scenarioFolder}_(\\w+)\\.yaml`));
          return match ? match[1] : null;
        })
        .filter((lang): lang is string => lang !== null);
      
      return languages;
    } catch (error) {
      console.error(`Error getting supported languages for ${scenarioId}:`, error);
      return ['en']; // 預設返回英文
    }
  }

  /**
   * 清理快取
   */
  clearCache(scenarioId?: string, language?: string): void {
    if (scenarioId && language) {
      this.scenarioCache.delete(`${scenarioId}:${language}`);
    } else if (scenarioId) {
      // 清理特定 scenario 的所有語言版本
      for (const key of this.scenarioCache.keys()) {
        if (key.startsWith(`${scenarioId}:`)) {
          this.scenarioCache.delete(key);
        }
      }
    } else {
      // 清理所有快取
      this.scenarioCache.clear();
    }
  }

  /**
   * 處理和標準化 tasks 資料
   */
  private processTasks(tasks: ScenarioTask[]): ProcessedScenario['tasks'] {
    return tasks.map((task, index) => {
      // 處理 AI 模組配置 (支援 camelCase 和 snake_case)
      const aiModuleData = task.aiModule || task.ai_module;
      const aiModule = {
        role: aiModuleData?.role || 'tutor',
        model: aiModuleData?.model || 'gemini-2.5-flash',
        persona: aiModuleData?.persona || 'AI Learning Assistant',
        initialPrompt: aiModuleData?.initialPrompt || 
                       aiModuleData?.initial_prompt ||
                       'You are an AI learning assistant helping students with problem-based learning.'
      };

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        instructions: task.instructions || [],
        expectedOutcome: task.expectedOutcome,
        type: this.mapTaskType(task.id, task.type),
        order: index + 1,
        aiModule
      };
    });
  }

  /**
   * 將舊的 task type 對應到新的 TaskType
   */
  private mapTaskType(taskId: string, taskType?: string): TaskType {
    // 如果有明確的 taskType，優先使用
    if (taskType) {
      switch (taskType.toLowerCase()) {
        case 'analysis': return TaskType.ANALYSIS;
        case 'design': return TaskType.DESIGN;
        case 'implementation': return TaskType.IMPLEMENTATION;
        case 'evaluation': return TaskType.EVALUATION;
      }
    }

    // 根據 taskId 推斷
    const taskIdLower = taskId.toLowerCase();
    
    if (taskIdLower.includes('analysis') || taskIdLower.includes('analyze')) {
      return TaskType.ANALYSIS;
    } else if (taskIdLower.includes('design') || taskIdLower.includes('create')) {
      return TaskType.DESIGN;
    } else if (taskIdLower.includes('implement') || taskIdLower.includes('build')) {
      return TaskType.IMPLEMENTATION;
    } else if (taskIdLower.includes('evaluate') || taskIdLower.includes('assess')) {
      return TaskType.EVALUATION;
    } else {
      return TaskType.ANALYSIS; // 預設
    }
  }

  /**
   * 獲取快取統計
   */
  getCacheStats(): {
    totalCached: number;
    cacheKeys: string[];
    memoryUsage: string;
  } {
    return {
      totalCached: this.scenarioCache.size,
      cacheKeys: Array.from(this.scenarioCache.keys()),
      memoryUsage: `${Math.round(JSON.stringify(Array.from(this.scenarioCache.values())).length / 1024)} KB`
    };
  }
}

// 單例導出
export const pblScenarioService = new PBLScenarioService();