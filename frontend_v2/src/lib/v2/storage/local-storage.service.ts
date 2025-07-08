/**
 * Local Storage Service Implementation for V2 (Fallback)
 */

import { 
  IStorageService, 
  StorageOptions, 
  StorageResult, 
  ListOptions 
} from '@/lib/v2/abstractions/storage.interface';

export class LocalStorageService implements IStorageService {
  private prefix = 'ai-square-v2:';
  private initialized = false;

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('LocalStorage is not available in server environment');
    }
    
    // Ensure base structure exists
    const basePaths = ['scenarios', 'programs', 'tasks', 'logs', 'evaluations', 'source_content'];
    for (const path of basePaths) {
      await this.ensurePathExists(path);
    }
    
    this.initialized = true;
  }

  async ensurePathExists(path: string): Promise<void> {
    // For localStorage, we don't need to create actual paths
    // Just mark that we've initialized this path
    const initKey = `${this.prefix}init:${path}`;
    localStorage.setItem(initKey, 'true');
  }

  async get<T>(key: string): Promise<StorageResult<T>> {
    try {
      const fullKey = `${this.prefix}${key}`;
      const item = localStorage.getItem(fullKey);
      
      if (!item) {
        return { success: false, error: 'Item not found' };
      }
      
      const data = JSON.parse(item) as T;
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async save<T>(key: string, data: T, options?: StorageOptions): Promise<StorageResult<void>> {
    try {
      const fullKey = `${this.prefix}${key}`;
      const value = JSON.stringify(data);
      
      // Check storage quota
      if (this.wouldExceedQuota(value)) {
        return { success: false, error: 'Storage quota exceeded' };
      }
      
      localStorage.setItem(fullKey, value);
      
      // Store metadata
      if (options?.metadata) {
        localStorage.setItem(`${fullKey}:meta`, JSON.stringify({
          ...options.metadata,
          savedAt: new Date().toISOString()
        }));
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async delete(key: string): Promise<StorageResult<void>> {
    try {
      const fullKey = `${this.prefix}${key}`;
      localStorage.removeItem(fullKey);
      localStorage.removeItem(`${fullKey}:meta`);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = `${this.prefix}${key}`;
    return localStorage.getItem(fullKey) !== null;
  }

  async list<T>(prefix: string, options?: ListOptions): Promise<StorageResult<T[]>> {
    try {
      const items: T[] = [];
      const searchPrefix = `${this.prefix}${prefix}`;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(searchPrefix) && !key.endsWith(':meta')) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const data = JSON.parse(item) as T;
              items.push(data);
            } catch {
              // Skip invalid items
            }
          }
        }
      }
      
      // Apply sorting
      if (options?.orderBy) {
        items.sort((a: any, b: any) => {
          const aVal = a[options.orderBy!];
          const bVal = b[options.orderBy!];
          const direction = options.orderDirection === 'desc' ? -1 : 1;
          return aVal > bVal ? direction : -direction;
        });
      }
      
      // Apply pagination
      let result = items;
      if (options?.offset) {
        result = result.slice(options.offset);
      }
      if (options?.limit) {
        result = result.slice(0, options.limit);
      }
      
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      };
    }
  }

  async bulkSave<T>(items: Array<{ key: string; data: T }>, options?: StorageOptions): Promise<StorageResult<void>> {
    try {
      for (const item of items) {
        const result = await this.save(item.key, item.data, options);
        if (!result.success) {
          return result;
        }
      }
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async bulkDelete(keys: string[]): Promise<StorageResult<void>> {
    try {
      for (const key of keys) {
        const result = await this.delete(key);
        if (!result.success) {
          return result;
        }
      }
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async isHealthy(): Promise<boolean> {
    return typeof window !== 'undefined' && this.initialized;
  }

  async getHealthStatus(): Promise<{ healthy: boolean; message?: string; error?: Error }> {
    if (typeof window === 'undefined') {
      return { 
        healthy: false, 
        message: 'LocalStorage not available in server environment' 
      };
    }
    
    try {
      const testKey = `${this.prefix}health-check`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      return { 
        healthy: true, 
        message: 'LocalStorage is healthy' 
      };
    } catch (error) {
      return { 
        healthy: false, 
        message: 'LocalStorage is not accessible',
        error: error as Error
      };
    }
  }

  private wouldExceedQuota(value: string): boolean {
    try {
      // Estimate current usage
      let currentSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          currentSize += key.length + (localStorage.getItem(key)?.length || 0);
        }
      }
      
      // Most browsers have ~5-10MB limit
      const maxSize = 5 * 1024 * 1024; // 5MB
      return currentSize + value.length > maxSize;
    } catch {
      return false;
    }
  }
}