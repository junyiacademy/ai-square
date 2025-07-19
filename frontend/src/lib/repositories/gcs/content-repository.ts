/**
 * GCS Content Repository
 * 處理所有靜態內容（YAML、設定檔等）
 */

import { Storage, Bucket } from '@google-cloud/storage';
import { parse as parseYaml } from 'yaml';
import {
  IContentRepository,
  ScenarioContent,
  KSAMapping,
  AILiteracyDomain,
  ScenarioType
} from '../interfaces';

export class GCSContentRepository implements IContentRepository {
  private bucket: Bucket;

  constructor(
    private storage: Storage,
    private bucketName: string
  ) {
    this.bucket = storage.bucket(bucketName);
  }

  async getYamlContent(path: string): Promise<any> {
    try {
      const file = this.bucket.file(path);
      const [exists] = await file.exists();
      
      if (!exists) {
        throw new Error(`File not found: ${path}`);
      }

      const [content] = await file.download();
      return parseYaml(content.toString());
    } catch (error) {
      console.error(`Error reading YAML from GCS: ${path}`, error);
      throw error;
    }
  }

  async listYamlFiles(prefix: string): Promise<string[]> {
    try {
      const [files] = await this.bucket.getFiles({
        prefix,
        delimiter: '/'
      });

      return files
        .filter(file => file.name.endsWith('.yaml') || file.name.endsWith('.yml'))
        .map(file => file.name);
    } catch (error) {
      console.error(`Error listing YAML files: ${prefix}`, error);
      throw error;
    }
  }

  async getScenarioContent(scenarioId: string, language: string = 'en'): Promise<ScenarioContent> {
    // Try language-specific file first
    const paths = [
      `scenarios/${scenarioId}/content_${language}.yaml`,
      `scenarios/${scenarioId}/content.yaml`,
      `pbl_data/${scenarioId}_scenario.yaml`,
      `assessment_data/${scenarioId}_scenario.yaml`,
      `discovery_data/${scenarioId}_scenario.yaml`
    ];

    for (const path of paths) {
      try {
        const content = await this.getYamlContent(path);
        return this.transformScenarioContent(content, scenarioId);
      } catch (error) {
        // Continue to next path
      }
    }

    throw new Error(`Scenario content not found: ${scenarioId}`);
  }

  async getAllScenarios(type?: ScenarioType): Promise<ScenarioContent[]> {
    const prefixes = type 
      ? [`${type}_data/`]
      : ['pbl_data/', 'assessment_data/', 'discovery_data/'];

    const scenarios: ScenarioContent[] = [];

    for (const prefix of prefixes) {
      const files = await this.listYamlFiles(prefix);
      
      for (const file of files) {
        if (file.includes('_scenario.yaml')) {
          try {
            const content = await this.getYamlContent(file);
            const scenarioId = file.split('/').pop()?.replace('_scenario.yaml', '');
            if (scenarioId) {
              scenarios.push(this.transformScenarioContent(content, scenarioId));
            }
          } catch (error) {
            console.error(`Error loading scenario: ${file}`, error);
          }
        }
      }
    }

    return scenarios;
  }

  async getKSAMappings(): Promise<KSAMapping[]> {
    try {
      const content = await this.getYamlContent('rubrics_data/ksa_codes.yaml');
      return this.transformKSAMappings(content);
    } catch (error) {
      console.error('Error loading KSA mappings', error);
      return [];
    }
  }

  async getAILiteracyDomains(): Promise<AILiteracyDomain[]> {
    try {
      const content = await this.getYamlContent('rubrics_data/ai_lit_domains.yaml');
      return this.transformAILiteracyDomains(content);
    } catch (error) {
      console.error('Error loading AI literacy domains', error);
      return [];
    }
  }

  // ========================================
  // Private transformation methods
  // ========================================

  private transformScenarioContent(raw: any, id: string): ScenarioContent {
    return {
      id,
      type: raw.type || 'pbl',
      title: this.extractMultilingualField(raw, 'title'),
      description: this.extractMultilingualField(raw, 'description'),
      tasks: raw.tasks || [],
      metadata: {
        difficulty: raw.difficulty,
        duration: raw.duration,
        prerequisites: raw.prerequisites,
        ...raw.metadata
      }
    };
  }

  private transformKSAMappings(raw: any): KSAMapping[] {
    const mappings: KSAMapping[] = [];

    // Process each type (knowledge, skills, attitudes)
    for (const [type, items] of Object.entries(raw)) {
      if (typeof items === 'object' && items !== null) {
        for (const [code, data] of Object.entries(items as any)) {
          if (typeof data === 'object' && data !== null) {
            mappings.push({
              code,
              type: type.slice(0, -1) as 'knowledge' | 'skill' | 'attitude',
              domain: data.domain || '',
              description: this.extractMultilingualField(data, 'description')
            });
          }
        }
      }
    }

    return mappings;
  }

  private transformAILiteracyDomains(raw: any): AILiteracyDomain[] {
    const domains: AILiteracyDomain[] = [];

    if (raw.domains && Array.isArray(raw.domains)) {
      for (const domain of raw.domains) {
        domains.push({
          id: domain.id,
          name: this.extractMultilingualField(domain, 'name'),
          description: this.extractMultilingualField(domain, 'description'),
          competencies: domain.competencies || []
        });
      }
    }

    return domains;
  }

  private extractMultilingualField(obj: any, fieldName: string): { [lang: string]: string } {
    const result: { [lang: string]: string } = {};

    // Check for direct field
    if (obj[fieldName]) {
      result.en = obj[fieldName];
    }

    // Check for language-specific fields
    const languages = ['en', 'zh', 'zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
    for (const lang of languages) {
      const fieldKey = `${fieldName}_${lang}`;
      if (obj[fieldKey]) {
        result[lang] = obj[fieldKey];
      }
    }

    return result;
  }
}