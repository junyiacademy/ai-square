import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';

/**
 * YAML 檔案載入器，提供記憶體快取以提升效能
 */
class YAMLLoader {
  private cache = new Map<string, any>();
  private loadPromises = new Map<string, Promise<any>>();
  
  /**
   * 載入 YAML 檔案，支援記憶體快取
   */
  async load(fileName: string): Promise<any> {
    // 檢查快取
    if (this.cache.has(fileName)) {
      return this.cache.get(fileName);
    }
    
    // 如果正在載入中，返回現有的 Promise
    if (this.loadPromises.has(fileName)) {
      return this.loadPromises.get(fileName);
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
  private async loadFromFile(fileName: string): Promise<any> {
    const filePath = path.join(process.cwd(), 'public', 'rubrics_data', fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    return yaml.load(content);
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