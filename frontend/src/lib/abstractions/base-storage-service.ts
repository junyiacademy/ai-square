/**
 * Base Storage Service Abstract Class
 * 提供統一的資料存取層抽象
 */

import { cacheService } from '@/lib/cache/cache-service';

export interface StorageOptions {
  bucket?: string;
  path?: string;
  ttl?: number;
  useCache?: boolean;
  fallbackToLocal?: boolean;
}

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  metadata?: {
    source: 'cloud' | 'local' | 'cache';
    timestamp: string;
    size?: number;
  };
}

export abstract class BaseStorageService<T = unknown> {
  protected abstract readonly serviceName: string;
  protected readonly defaultOptions: StorageOptions = {
    useCache: true,
    fallbackToLocal: true,
    ttl: 5 * 60 * 1000 // 5 minutes
  };

  /**
   * 儲存資料
   */
  async save(
    key: string,
    data: T,
    options: StorageOptions = {}
  ): Promise<StorageResult<string>> {
    const finalOptions = { ...this.defaultOptions, ...options };
    
    try {
      // 嘗試儲存到主要儲存
      const result = await this.saveToStorage(key, data, finalOptions);
      
      if (result.success) {
        // 更新快取
        if (finalOptions.useCache) {
          await this.updateCache(key, data, finalOptions.ttl);
        }
        
        return {
          success: true,
          data: result.id,
          metadata: {
            source: 'cloud',
            timestamp: new Date().toISOString(),
            size: this.getDataSize(data)
          }
        };
      }

      // 如果主要儲存失敗，嘗試本地儲存
      if (finalOptions.fallbackToLocal) {
        const localResult = await this.saveToLocal(key, data);
        if (localResult.success) {
          return {
            success: true,
            data: localResult.id,
            metadata: {
              source: 'local',
              timestamp: new Date().toISOString(),
              size: this.getDataSize(data)
            }
          };
        }
      }

      throw new Error('Failed to save data to any storage');
    } catch (error) {
      console.error(`[${this.serviceName}] Save error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * 讀取資料
   */
  async load(
    key: string,
    options: StorageOptions = {}
  ): Promise<StorageResult<T>> {
    const finalOptions = { ...this.defaultOptions, ...options };
    
    try {
      // 檢查快取
      if (finalOptions.useCache) {
        const cached = await this.getFromCache(key);
        if (cached) {
          return {
            success: true,
            data: cached,
            metadata: {
              source: 'cache',
              timestamp: new Date().toISOString()
            }
          };
        }
      }

      // 從主要儲存讀取
      const result = await this.loadFromStorage(key, finalOptions);
      
      if (result.success && result.data) {
        // 更新快取
        if (finalOptions.useCache) {
          await this.updateCache(key, result.data, finalOptions.ttl);
        }
        
        return {
          success: true,
          data: result.data,
          metadata: {
            source: 'cloud',
            timestamp: new Date().toISOString()
          }
        };
      }

      // 嘗試從本地讀取
      if (finalOptions.fallbackToLocal) {
        const localResult = await this.loadFromLocal(key);
        if (localResult.success && localResult.data) {
          return {
            success: true,
            data: localResult.data,
            metadata: {
              source: 'local',
              timestamp: new Date().toISOString()
            }
          };
        }
      }

      return {
        success: false,
        error: new Error('Data not found')
      };
    } catch (error) {
      console.error(`[${this.serviceName}] Load error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * 刪除資料
   */
  async delete(
    key: string,
    options: StorageOptions = {}
  ): Promise<StorageResult<void>> {
    const finalOptions = { ...this.defaultOptions, ...options };
    
    try {
      // 刪除主要儲存
      const result = await this.deleteFromStorage(key, finalOptions);
      
      // 刪除本地儲存
      if (finalOptions.fallbackToLocal) {
        await this.deleteFromLocal(key);
      }
      
      // 清除快取
      if (finalOptions.useCache) {
        await this.removeFromCache(key);
      }
      
      return {
        success: result.success,
        metadata: {
          source: 'cloud',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`[${this.serviceName}] Delete error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * 列出資料
   */
  async list(
    prefix: string,
    options: StorageOptions = {}
  ): Promise<StorageResult<T[]>> {
    const finalOptions = { ...this.defaultOptions, ...options };
    
    try {
      // 檢查快取
      const cacheKey = `list:${prefix}`;
      if (finalOptions.useCache) {
        const cached = await this.getFromCache<T[]>(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            metadata: {
              source: 'cache',
              timestamp: new Date().toISOString()
            }
          };
        }
      }

      // 從主要儲存列出
      const result = await this.listFromStorage(prefix, finalOptions);
      
      if (result.success && result.data) {
        // 更新快取
        if (finalOptions.useCache) {
          await this.updateCache(cacheKey, result.data, finalOptions.ttl);
        }
        
        return {
          success: true,
          data: result.data,
          metadata: {
            source: 'cloud',
            timestamp: new Date().toISOString()
          }
        };
      }

      // 從本地列出
      if (finalOptions.fallbackToLocal) {
        const localResult = await this.listFromLocal(prefix);
        if (localResult.success) {
          return localResult;
        }
      }

      return {
        success: true,
        data: [],
        metadata: {
          source: 'cloud',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`[${this.serviceName}] List error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * 抽象方法 - 子類必須實作
   */
  protected abstract saveToStorage(
    key: string,
    data: T,
    options: StorageOptions
  ): Promise<{ success: boolean; id: string }>;

  protected abstract loadFromStorage(
    key: string,
    options: StorageOptions
  ): Promise<{ success: boolean; data?: T }>;

  protected abstract deleteFromStorage(
    key: string,
    options: StorageOptions
  ): Promise<{ success: boolean }>;

  protected abstract listFromStorage(
    prefix: string,
    options: StorageOptions
  ): Promise<{ success: boolean; data?: T[] }>;

  /**
   * 本地儲存方法 - 子類可覆寫
   */
  protected async saveToLocal(
    key: string,
    data: T
  ): Promise<{ success: boolean; id: string }> {
    try {
      if (typeof window === 'undefined') {
        // Server-side: use file system
        const fs = await import('fs/promises');
        const path = await import('path');
        const dir = path.join(process.cwd(), 'data', this.serviceName);
        await fs.mkdir(dir, { recursive: true });
        const filePath = path.join(dir, `${key}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return { success: true, id: key };
      } else {
        // Client-side: use localStorage
        localStorage.setItem(`${this.serviceName}:${key}`, JSON.stringify(data));
        return { success: true, id: key };
      }
    } catch (error) {
      console.error('Local save error:', error);
      return { success: false, id: '' };
    }
  }

  protected async loadFromLocal(key: string): Promise<{ success: boolean; data?: T }> {
    try {
      if (typeof window === 'undefined') {
        // Server-side
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'data', this.serviceName, `${key}.json`);
        const data = await fs.readFile(filePath, 'utf-8');
        return { success: true, data: JSON.parse(data) };
      } else {
        // Client-side
        const data = localStorage.getItem(`${this.serviceName}:${key}`);
        if (data) {
          return { success: true, data: JSON.parse(data) };
        }
      }
    } catch (error) {
      console.error('Local load error:', error);
    }
    return { success: false };
  }

  protected async deleteFromLocal(key: string): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'data', this.serviceName, `${key}.json`);
        await fs.unlink(filePath);
      } else {
        localStorage.removeItem(`${this.serviceName}:${key}`);
      }
    } catch (error) {
      console.error('Local delete error:', error);
    }
  }

  protected async listFromLocal(prefix: string): Promise<StorageResult<T[]>> {
    try {
      const items: T[] = [];
      
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');
        const dir = path.join(process.cwd(), 'data', this.serviceName);
        const files = await fs.readdir(dir);
        
        for (const file of files) {
          if (file.startsWith(prefix) && file.endsWith('.json')) {
            const filePath = path.join(dir, file);
            const data = await fs.readFile(filePath, 'utf-8');
            items.push(JSON.parse(data));
          }
        }
      } else {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`${this.serviceName}:${prefix}`)) {
            const data = localStorage.getItem(key);
            if (data) {
              items.push(JSON.parse(data));
            }
          }
        }
      }
      
      return {
        success: true,
        data: items,
        metadata: {
          source: 'local',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Local list error:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to list from local')
      };
    }
  }

  /**
   * 快取輔助方法
   */
  protected async getFromCache<U = T>(key: string): Promise<U | null> {
    return cacheService.get<U>(this.getCacheKey(key));
  }

  protected async updateCache<U = T>(key: string, data: U, ttl?: number): Promise<void> {
    await cacheService.set(this.getCacheKey(key), data, {
      ttl,
      storage: 'both'
    });
  }

  protected async removeFromCache(key: string): Promise<void> {
    await cacheService.delete(this.getCacheKey(key));
  }

  protected getCacheKey(key: string): string {
    return `${this.serviceName}:${key}`;
  }

  /**
   * 工具方法
   */
  protected getDataSize(data: T): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * 批次操作
   */
  async batchSave(
    items: Array<{ key: string; data: T }>,
    options: StorageOptions = {}
  ): Promise<StorageResult<string[]>> {
    const results = await Promise.all(
      items.map(item => this.save(item.key, item.data, options))
    );
    
    const successIds = results
      .filter(r => r.success && r.data)
      .map(r => r.data!);
    
    const errors = results
      .filter(r => !r.success)
      .map(r => r.error);
    
    return {
      success: errors.length === 0,
      data: successIds,
      error: errors.length > 0 ? new Error(`Failed to save ${errors.length} items`) : undefined,
      metadata: {
        source: 'cloud',
        timestamp: new Date().toISOString()
      }
    };
  }

  async batchLoad(
    keys: string[],
    options: StorageOptions = {}
  ): Promise<StorageResult<T[]>> {
    const results = await Promise.all(
      keys.map(key => this.load(key, options))
    );
    
    const items = results
      .filter(r => r.success && r.data)
      .map(r => r.data!);
    
    return {
      success: items.length === keys.length,
      data: items,
      metadata: {
        source: 'cloud',
        timestamp: new Date().toISOString()
      }
    };
  }
}