/**
 * Base YAML Loader Abstract Class
 * 提供統一的 YAML 檔案載入和多語言處理
 */

import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { cacheService } from '@/lib/cache/cache-service';

export interface YAMLLoaderOptions {
  basePath?: string;
  useCache?: boolean;
  cacheTTL?: number;
  fallbackLanguage?: string;
  validateSchema?: boolean;
}

export interface LoadResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  metadata?: {
    source: 'file' | 'cache';
    language?: string;
    loadTime: number;
  };
}

export abstract class BaseYAMLLoader<T = unknown> {
  protected abstract readonly loaderName: string;
  
  protected readonly defaultOptions: YAMLLoaderOptions = {
    basePath: path.join(process.cwd(), 'public', 'rubrics_data'),
    useCache: true,
    cacheTTL: 60 * 60 * 1000, // 1 hour
    fallbackLanguage: 'en',
    validateSchema: true
  };

  /**
   * 載入 YAML 檔案
   */
  async load(
    fileName: string,
    language?: string,
    options: YAMLLoaderOptions = {}
  ): Promise<LoadResult<T>> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    
    try {
      // 檢查快取
      if (finalOptions.useCache) {
        const cacheKey = this.getCacheKey(fileName, language);
        const cached = await cacheService.get<T>(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            metadata: {
              source: 'cache',
              language,
              loadTime: Date.now() - startTime
            }
          };
        }
      }

      // 載入檔案
      const filePath = this.getFilePath(fileName, finalOptions.basePath!);
      const fileContents = await this.readFile(filePath);
      const rawData = yaml.load(fileContents) as unknown;

      // 驗證 schema
      if (finalOptions.validateSchema) {
        const validation = await this.validateData(rawData);
        if (!validation.valid) {
          throw new Error(`Schema validation failed: ${validation.error}`);
        }
      }

      // 處理多語言
      const processedData = language 
        ? await this.processLanguage(rawData, language, finalOptions.fallbackLanguage!)
        : rawData as T;

      // 後處理
      const finalData = await this.postProcess(processedData);

      // 儲存到快取
      if (finalOptions.useCache) {
        const cacheKey = this.getCacheKey(fileName, language);
        await cacheService.set(cacheKey, finalData, {
          ttl: finalOptions.cacheTTL,
          storage: 'both'
        });
      }

      return {
        success: true,
        data: finalData,
        metadata: {
          source: 'file',
          language,
          loadTime: Date.now() - startTime
        }
      };
    } catch (error) {
      console.error(`[${this.loaderName}] Load error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to load YAML file'),
        metadata: {
          source: 'file',
          language,
          loadTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * 批次載入多個檔案
   */
  async loadMultiple(
    fileNames: string[],
    language?: string,
    options: YAMLLoaderOptions = {}
  ): Promise<LoadResult<T[]>> {
    const startTime = Date.now();
    const results = await Promise.all(
      fileNames.map(fileName => this.load(fileName, language, options))
    );
    
    const successfulLoads = results.filter(r => r.success && r.data);
    const errors = results.filter(r => !r.success);
    
    return {
      success: errors.length === 0,
      data: successfulLoads.map(r => r.data!),
      error: errors.length > 0 
        ? new Error(`Failed to load ${errors.length} files`)
        : undefined,
      metadata: {
        source: 'file',
        language,
        loadTime: Date.now() - startTime
      }
    };
  }

  /**
   * 抽象方法 - 子類可覆寫
   */
  protected async validateData(): Promise<{ valid: boolean; error?: string }> {
    // 子類實作具體的 schema 驗證
    return { valid: true };
  }

  protected async processLanguage(
    data: unknown,
    language: string,
    fallbackLanguage: string
  ): Promise<T> {
    // 預設實作：遞迴處理所有物件的多語言欄位
    return this.processLanguageFields(data, language, fallbackLanguage) as T;
  }

  protected async postProcess(data: T): Promise<T> {
    // 子類可覆寫以進行額外的後處理
    return data;
  }

  /**
   * 輔助方法
   */
  protected getFilePath(fileName: string, basePath: string): string {
    // 確保檔案名稱有 .yaml 或 .yml 副檔名
    if (!fileName.endsWith('.yaml') && !fileName.endsWith('.yml')) {
      fileName += '.yaml';
    }
    return path.join(basePath, fileName);
  }

  protected async readFile(filePath: string): Promise<string> {
    try {
      return await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  protected getCacheKey(fileName: string, language?: string): string {
    const langSuffix = language ? `:${language}` : '';
    return `${this.loaderName}:${fileName}${langSuffix}`;
  }

  /**
   * 多語言處理
   */
  protected processLanguageFields(
    obj: unknown,
    language: string,
    fallbackLanguage: string
  ): unknown {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.processLanguageFields(item, language, fallbackLanguage));
    }

    const result: Record<string, unknown> = {};
    const record = obj as Record<string, unknown>;

    for (const [key, value] of Object.entries(record)) {
      // 檢查是否為需要翻譯的欄位
      if (this.isTranslatableField(key)) {
        const translatedValue = this.getTranslatedField(record, key, language, fallbackLanguage);
        if (translatedValue !== undefined) {
          result[key] = translatedValue;
        }
      } else if (typeof value === 'object' && value !== null) {
        // 遞迴處理巢狀物件
        result[key] = this.processLanguageFields(value, language, fallbackLanguage);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  protected isTranslatableField(fieldName: string): boolean {
    // 預設：包含這些關鍵字的欄位需要翻譯
    const translatablePatterns = [
      'title', 'name', 'description', 'summary', 'explanation',
      'content', 'label', 'message', 'text', 'question'
    ];
    
    return translatablePatterns.some(pattern => 
      fieldName.toLowerCase().includes(pattern) &&
      !fieldName.includes('_') // 排除已經有語言後綴的欄位
    );
  }

  protected getTranslatedField(
    obj: Record<string, unknown>,
    fieldName: string,
    language: string,
    fallbackLanguage: string
  ): unknown {
    // 處理 zh-TW -> zh 映射
    let langCode = language;
    if (language === 'zh-TW') {
      langCode = 'zh';
    }

    // 嘗試取得指定語言的欄位
    if (language !== 'en') {
      const translatedField = `${fieldName}_${langCode}`;
      if (obj[translatedField] !== undefined) {
        return obj[translatedField];
      }
    }

    // 回退到預設欄位（通常是英文）
    if (obj[fieldName] !== undefined) {
      return obj[fieldName];
    }

    // 嘗試 fallback 語言
    if (fallbackLanguage !== 'en' && fallbackLanguage !== language) {
      const fallbackField = `${fieldName}_${fallbackLanguage}`;
      if (obj[fallbackField] !== undefined) {
        return obj[fallbackField];
      }
    }

    return undefined;
  }

  /**
   * Schema 驗證輔助
   */
  protected validateRequired(data: unknown, requiredFields: string[]): string[] {
    const errors: string[] = [];
    const record = data as Record<string, unknown>;
    
    for (const field of requiredFields) {
      if (!(field in record) || record[field] === null || record[field] === undefined) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    return errors;
  }

  protected validateType(
    value: unknown,
    expectedType: 'string' | 'number' | 'boolean' | 'object' | 'array'
  ): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }
}