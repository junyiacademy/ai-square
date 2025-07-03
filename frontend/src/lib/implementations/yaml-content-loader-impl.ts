/**
 * YAML Content Loader Implementation
 * 基於 BaseYAMLLoader 的內容載入實作
 */

import { BaseYAMLLoader, LoadResult } from '@/lib/abstractions/base-yaml-loader';

// KSA Codes 資料結構
export interface KSACode {
  summary: string;
  questions?: string[];
}

export interface KSATheme {
  explanation: string;
  codes: Record<string, KSACode>;
}

export interface KSASection {
  description: string; // Note: typo in original YAML
  themes: Record<string, KSATheme>;
}

export interface KSAData {
  knowledge_codes: KSASection;
  skill_codes: KSASection;
  attitude_codes: KSASection;
}

// AI Literacy Domains 資料結構
export interface Competency {
  summary: string;
  ksa_codes: {
    knowledge: string[];
    skill: string[];
    attitude: string[];
  };
}

export interface Domain {
  description: string;
  competencies: Record<string, Competency>;
}

export interface DomainsData {
  [key: string]: Domain;
}

/**
 * KSA Codes YAML Loader
 */
export class KSACodesLoader extends BaseYAMLLoader<KSAData> {
  protected readonly loaderName = 'KSACodesLoader';

  protected async validateData(): Promise<{ valid: boolean; error?: string }> {
    // Note: Base class loads data before calling this method
    // For now, we'll return valid as the actual validation would need the data parameter
    // In a full implementation, this would validate the loaded KSA data structure
    
    // Base class validates schema - we'll just return valid for now
    // In a full implementation, this could perform additional KSA-specific validation
    return { valid: true };
  }

  protected isTranslatableField(fieldName: string): boolean {
    // KSA 特定的可翻譯欄位
    return ['summary', 'explanation', 'description', 'questions'].includes(fieldName);
  }
}

/**
 * AI Literacy Domains YAML Loader
 */
export class DomainsLoader extends BaseYAMLLoader<DomainsData> {
  protected readonly loaderName = 'DomainsLoader';

  protected async validateData(): Promise<{ valid: boolean; error?: string }> {
    // Base class validates schema - we'll just return valid for now
    // In a full implementation, this could perform additional domains-specific validation
    return { valid: true };
  }

  protected async postProcess(data: DomainsData): Promise<DomainsData> {
    // 將 domain key 標準化（例如 Engaging_with_AI -> engaging_with_ai）
    const processed: DomainsData = {};
    
    for (const [key, value] of Object.entries(data)) {
      const normalizedKey = key.toLowerCase();
      processed[normalizedKey] = value;
    }
    
    return processed;
  }
}

/**
 * Combined Content Loader
 * 載入並組合 KSA 和 Domains 資料
 */
export interface CombinedContent {
  domains: DomainsData;
  ksa: KSAData;
  ksaMap?: Map<string, { type: 'K' | 'S' | 'A'; data: KSACode }>;
}

export class ContentLoader {
  private ksaLoader = new KSACodesLoader();
  private domainsLoader = new DomainsLoader();

  async loadAll(language?: string): Promise<LoadResult<CombinedContent>> {
    const startTime = Date.now();
    
    try {
      // 平行載入兩個檔案
      const [ksaResult, domainsResult] = await Promise.all([
        this.ksaLoader.load('ksa_codes', language),
        this.domainsLoader.load('ai_lit_domains', language)
      ]);

      if (!ksaResult.success || !domainsResult.success) {
        return {
          success: false,
          error: new Error('Failed to load content files')
        };
      }

      // 建立 KSA 代碼映射表
      const ksaMap = this.buildKSAMap(ksaResult.data!);

      return {
        success: true,
        data: {
          domains: domainsResult.data!,
          ksa: ksaResult.data!,
          ksaMap
        },
        metadata: {
          source: 'file',
          language,
          loadTime: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to load content')
      };
    }
  }

  private buildKSAMap(ksaData: KSAData): Map<string, { type: 'K' | 'S' | 'A'; data: KSACode }> {
    const map = new Map<string, { type: 'K' | 'S' | 'A'; data: KSACode }>();

    // Process knowledge codes
    for (const [, theme] of Object.entries(ksaData.knowledge_codes.themes)) {
      for (const [codeKey, code] of Object.entries(theme.codes)) {
        map.set(codeKey, { type: 'K', data: code });
      }
    }

    // Process skill codes
    for (const [, theme] of Object.entries(ksaData.skill_codes.themes)) {
      for (const [codeKey, code] of Object.entries(theme.codes)) {
        map.set(codeKey, { type: 'S', data: code });
      }
    }

    // Process attitude codes
    for (const [, theme] of Object.entries(ksaData.attitude_codes.themes)) {
      for (const [codeKey, code] of Object.entries(theme.codes)) {
        map.set(codeKey, { type: 'A', data: code });
      }
    }

    return map;
  }
}

// 匯出單例
export const contentLoader = new ContentLoader();
export const ksaLoader = new KSACodesLoader();
export const domainsLoader = new DomainsLoader();