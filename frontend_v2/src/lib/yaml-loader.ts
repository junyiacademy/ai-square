import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';

/**
 * YAML 檔案載入器，提供記憶體快取以提升效能
 */
class YAMLLoader<T = unknown> {
  private cache = new Map<string, T>();
  private loadPromises = new Map<string, Promise<T>>();
  
  /**
   * 載入 YAML 檔案，支援記憶體快取
   */
  async load(fileName: string): Promise<T> {
    // 檢查快取
    const cached = this.cache.get(fileName);
    if (cached !== undefined) {
      return cached;
    }
    
    // 如果正在載入中，返回現有的 Promise
    const existingPromise = this.loadPromises.get(fileName);
    if (existingPromise) {
      return existingPromise;
    }
    
    // 開始新的載入
    const loadPromise = this.loadFromFile(fileName);
    this.loadPromises.set(fileName, loadPromise);
    
    try {
      const data = await loadPromise;
      this.cache.set(fileName, data);
      return data;
    } finally {
      this.loadPromises.delete(fileName);
    }
  }
  
  /**
   * 從檔案系統載入 YAML
   */
  private async loadFromFile(fileName: string): Promise<T> {
    const filePath = path.join(process.cwd(), 'public', 'rubrics_data', fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    return yaml.load(content) as T;
  }
  
  /**
   * 清除快取
   */
  clearCache(fileName?: string) {
    if (fileName) {
      this.cache.delete(fileName);
    } else {
      this.cache.clear();
    }
  }
  
  /**
   * 預載入多個檔案
   */
  async preload(fileNames: string[]): Promise<void> {
    await Promise.all(fileNames.map(fileName => this.load(fileName)));
  }
}

// 匯出單例
export const yamlLoader = new YAMLLoader();

// 在應用啟動時預載入常用的 YAML 檔案
if (process.env.NODE_ENV === 'production') {
  yamlLoader.preload(['ai_lit_domains.yaml', 'ksa_codes.yaml']).catch(console.error);
}