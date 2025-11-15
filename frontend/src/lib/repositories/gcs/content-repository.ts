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

  async getYamlContent(path: string): Promise<Record<string, unknown>> {
    try {
      const file = this.bucket.file(path);
      const [exists] = await file.exists();

      if (!exists) {
        throw new Error(`File not found: ${path}`);
      }

      const [content] = await file.download();
      return parseYaml(content.toString()) as Record<string, unknown>;
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
      } catch {
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

  private transformScenarioContent(raw: Record<string, unknown>, id: string): ScenarioContent {
    return {
      id,
      type: (raw.type as string) || 'pbl',
      title: this.extractMultilingualField(raw, 'title'),
      description: this.extractMultilingualField(raw, 'description'),
      tasks: ((raw.tasks as Array<Record<string, unknown>>) || []).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        type: t.type as string,
        title: t.title as string | undefined,
        description: t.description as string | undefined,
        estimatedTime: t.estimatedTime as number | undefined,
        requiredForCompletion: t.requiredForCompletion as boolean | undefined,
        ksaCodes: t.ksaCodes as string[] | undefined
      })),
      metadata: {
        difficulty: raw.difficulty as string | undefined,
        duration: raw.duration as number | undefined,
        prerequisites: raw.prerequisites as string[] | undefined,
        ...(raw.metadata as Record<string, unknown> | undefined)
      }
    };
  }

  private transformKSAMappings(raw: Record<string, unknown>): KSAMapping[] {
    const mappings: KSAMapping[] = [];

    // Process each type (knowledge, skills, attitudes)
    for (const [type, items] of Object.entries(raw)) {
      if (typeof items === 'object' && items !== null) {
        for (const [code, data] of Object.entries(items as Record<string, unknown>)) {
          if (typeof data === 'object' && data !== null) {
            mappings.push({
              code,
              type: (type === 'knowledge' ? 'knowledge' : type === 'skills' ? 'skill' : 'attitude') as 'knowledge' | 'skill' | 'attitude',
              domain: (data as Record<string, unknown>).domain as string || '',
              description: this.extractMultilingualField(data as Record<string, unknown>, 'description')
            });
          }
        }
      }
    }

    return mappings;
  }

  private transformAILiteracyDomains(raw: Record<string, unknown>): AILiteracyDomain[] {
    const domains: AILiteracyDomain[] = [];

    if (raw.domains && Array.isArray(raw.domains)) {
      for (const domain of raw.domains as Array<Record<string, unknown>>) {
        domains.push({
          id: domain.id as string,
          name: this.extractMultilingualField(domain, 'name'),
          description: this.extractMultilingualField(domain, 'description'),
          competencies: (domain.competencies as string[]) || []
        });
      }
    }

    return domains;
  }

  private extractMultilingualField(obj: Record<string, unknown>, fieldName: string): { [lang: string]: string } {
    const result: { [lang: string]: string } = {};

    // Check for direct field
    if (obj[fieldName]) {
      result.en = obj[fieldName] as string;
    }

    // Check for language-specific fields
    const languages = ['en', 'zh', 'zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
    for (const lang of languages) {
      const fieldKey = `${fieldName}_${lang}`;
      if (obj[fieldKey]) {
        result[lang] = obj[fieldKey] as string;
      }
    }

    return result;
  }
}
