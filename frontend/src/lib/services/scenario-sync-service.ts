/**
 * Scenario Sync Service
 * 負責同步 YAML 內容到 GCS，支援多語言管理
 */

import { IScenario } from '@/types/unified-learning';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface MultilingualContent {
  [language: string]: {
    title: string;
    description: string;
    content?: any;
  };
}

export interface ScenarioWithTranslations extends IScenario {
  translations: MultilingualContent;
  lastSyncedAt: string;
}

export class ScenarioSyncService {
  private supportedLanguages = ['en', 'zhTW', 'zhCN', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ar', 'id', 'th', 'ru', 'it'];

  /**
   * 同步 YAML 檔案到 GCS
   */
  async syncYamlToGCS(
    folderPath: string,
    scenarioRepo: any
  ): Promise<ScenarioWithTranslations> {
    const translations: MultilingualContent = {};
    const folderName = path.basename(folderPath);
    
    // 讀取所有語言的 YAML 檔案
    for (const lang of this.supportedLanguages) {
      try {
        const filePath = path.join(folderPath, `${folderName}_questions_${lang}.yaml`);
        const content = await fs.readFile(filePath, 'utf-8');
        const yamlData = yaml.load(content) as any;
        const config = yamlData.config || yamlData.assessment_config || {};
        
        translations[lang] = {
          title: config.title || `${folderName} Assessment`,
          description: config.description || '',
          content: {
            totalQuestions: config.total_questions,
            timeLimit: config.time_limit_minutes,
            passingScore: config.passing_score,
            domains: config.domains
          }
        };
      } catch (error) {
        // 語言檔案不存在，跳過
        console.log(`No ${lang} translation found for ${folderName}`);
      }
    }

    // 建立或更新 Scenario
    const existingScenario = await scenarioRepo.findBySourceId(`assessment-${folderName}`);
    
    if (existingScenario) {
      // 更新現有 scenario
      return await scenarioRepo.update(existingScenario.id, {
        translations,
        lastSyncedAt: new Date().toISOString()
      });
    } else {
      // 建立新 scenario
      return await scenarioRepo.create({
        sourceType: 'assessment',
        sourceRef: {
          type: 'yaml',
          sourceId: `assessment-${folderName}`,
          metadata: {
            folderName,
            supportedLanguages: Object.keys(translations)
          }
        },
        title: translations.en?.title || translations.zhTW?.title || 'Assessment',
        description: translations.en?.description || translations.zhTW?.description || '',
        translations,
        lastSyncedAt: new Date().toISOString(),
        taskTemplates: [{
          id: 'assessment-task',
          title: 'Complete Assessment',
          type: 'question'
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  /**
   * 取得特定語言的內容
   */
  getTranslation(
    scenario: ScenarioWithTranslations,
    language: string,
    fallbackLanguage: string = 'en'
  ): {
    title: string;
    description: string;
    content?: any;
  } {
    return scenario.translations[language] || 
           scenario.translations[fallbackLanguage] || 
           scenario.translations.en || 
           { title: scenario.title, description: scenario.description };
  }

  /**
   * 檢查是否需要重新同步
   */
  needsSync(scenario: ScenarioWithTranslations, yamlModifiedTime: Date): boolean {
    if (!scenario.lastSyncedAt) return true;
    
    const lastSync = new Date(scenario.lastSyncedAt);
    return yamlModifiedTime > lastSync;
  }
}