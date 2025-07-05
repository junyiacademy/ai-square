/**
 * LocalStorage Provider
 * 實作瀏覽器 localStorage 的 Storage Provider
 */

import { 
  IStorageProvider, 
  StorageOptions, 
  ListOptions, 
  BatchOperation, 
  BatchResult,
  StorageMetadata 
} from '../interfaces';
import { 
  StorageError, 
  StorageQuotaExceededError,
  StoragePermissionError 
} from '../../errors';

interface StoredItem<T> {
  value: T;
  metadata: StorageMetadata;
}

export class LocalStorageProvider implements IStorageProvider {
  private prefix: string;
  private isAvailable: boolean;
  
  constructor(prefix: string = 'ai_square_') {
    this.prefix = prefix;
    this.isAvailable = this.checkAvailability();
  }
  
  /**
   * 檢查 localStorage 是否可用
   */
  private checkAvailability(): boolean {
    try {
      const testKey = `${this.prefix}_test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 獲取完整的 key（加上前綴）
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }
  
  /**
   * 序列化資料
   */
  private serialize<T>(value: T, options?: StorageOptions): string {
    const storedItem: StoredItem<T> = {
      value,
      metadata: {
        version: 1,
        timestamp: Date.now(),
        ttl: options?.ttl,
        tags: options?.tags
      }
    };
    return JSON.stringify(storedItem);
  }
  
  /**
   * 反序列化資料
   */
  private deserialize<T>(data: string): StoredItem<T> | null {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  
  /**
   * 檢查 TTL 是否過期
   */
  private isExpired(metadata: StorageMetadata): boolean {
    if (!metadata.ttl) return false;
    const expiresAt = metadata.timestamp + (metadata.ttl * 1000);
    return Date.now() > expiresAt;
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable) {
      throw new StoragePermissionError('LocalStorage is not available');
    }
    
    try {
      const fullKey = this.getFullKey(key);
      const item = localStorage.getItem(fullKey);
      
      if (!item) {
        return null;
      }
      
      const storedItem = this.deserialize<T>(item);
      if (!storedItem) {
        return null;
      }
      
      // Check TTL
      if (this.isExpired(storedItem.metadata)) {
        await this.delete(key);
        return null;
      }
      
      return storedItem.value;
    } catch (error) {
      throw new StorageError(
        `Failed to get item: ${key}`,
        'STORAGE_GET_ERROR',
        error as Error
      );
    }
  }
  
  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    if (!this.isAvailable) {
      throw new StoragePermissionError('LocalStorage is not available');
    }
    
    try {
      const fullKey = this.getFullKey(key);
      const serialized = this.serialize(value, options);
      
      // Try to set item
      try {
        localStorage.setItem(fullKey, serialized);
      } catch (error) {
        if (error instanceof DOMException && 
            (error.name === 'QuotaExceededError' || error.code === 22)) {
          throw new StorageQuotaExceededError('LocalStorage quota exceeded');
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        `Failed to set item: ${key}`,
        'STORAGE_SET_ERROR',
        error as Error
      );
    }
  }
  
  async delete(key: string): Promise<void> {
    if (!this.isAvailable) {
      throw new StoragePermissionError('LocalStorage is not available');
    }
    
    try {
      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
    } catch (error) {
      throw new StorageError(
        `Failed to delete item: ${key}`,
        'STORAGE_DELETE_ERROR',
        error as Error
      );
    }
  }
  
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }
    
    const fullKey = this.getFullKey(key);
    const item = localStorage.getItem(fullKey);
    
    if (!item) return false;
    
    // Check if expired
    const storedItem = this.deserialize<any>(item);
    if (storedItem && this.isExpired(storedItem.metadata)) {
      await this.delete(key);
      return false;
    }
    
    return true;
  }
  
  async list<T>(prefix: string, options?: ListOptions): Promise<T[]> {
    if (!this.isAvailable) {
      throw new StoragePermissionError('LocalStorage is not available');
    }
    
    try {
      const results: Array<{ key: string; value: T; timestamp: number }> = [];
      const searchPrefix = this.getFullKey(prefix);
      
      // Collect all matching items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(searchPrefix)) {
          const shortKey = key.substring(this.prefix.length);
          const value = await this.get<T>(shortKey);
          
          if (value !== null) {
            const item = localStorage.getItem(key);
            const storedItem = this.deserialize<T>(item!);
            
            results.push({
              key: shortKey,
              value,
              timestamp: storedItem!.metadata.timestamp
            });
          }
        }
      }
      
      // Sort if needed
      if (options?.orderBy) {
        results.sort((a, b) => {
          const aVal = options.orderBy === 'key' ? a.key : a.timestamp;
          const bVal = options.orderBy === 'key' ? b.key : b.timestamp;
          
          if (options.orderDirection === 'desc') {
            return aVal > bVal ? -1 : 1;
          }
          return aVal > bVal ? 1 : -1;
        });
      }
      
      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit || results.length;
      
      return results
        .slice(offset, offset + limit)
        .map(item => item.value);
    } catch (error) {
      throw new StorageError(
        `Failed to list items with prefix: ${prefix}`,
        'STORAGE_LIST_ERROR',
        error as Error
      );
    }
  }
  
  async batch(operations: BatchOperation[]): Promise<BatchResult> {
    const result: BatchResult = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    for (const operation of operations) {
      try {
        if (operation.type === 'set' && operation.value !== undefined) {
          await this.set(operation.key, operation.value, operation.options);
        } else if (operation.type === 'delete') {
          await this.delete(operation.key);
        }
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          operation,
          error: error as Error
        });
      }
    }
    
    return result;
  }
  
  async clear(prefix?: string): Promise<void> {
    if (!this.isAvailable) {
      throw new StoragePermissionError('LocalStorage is not available');
    }
    
    const keysToRemove: string[] = [];
    const searchPrefix = prefix ? this.getFullKey(prefix) : this.prefix;
    
    // Collect keys to remove
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(searchPrefix)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove collected keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // Continue even if individual removals fail
        console.error(`Failed to remove key ${key}:`, error);
      }
    });
  }
  
  /**
   * 獲取儲存使用情況
   */
  async getStorageInfo(): Promise<{
    used: number;
    available: number;
    quota: number;
  }> {
    if ('navigator' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
        quota: estimate.quota || 0
      };
    }
    
    // Fallback: estimate based on localStorage size
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalSize += key.length + (localStorage.getItem(key)?.length || 0);
      }
    }
    
    // localStorage typically has 5-10MB limit
    const estimatedQuota = 5 * 1024 * 1024; // 5MB
    return {
      used: totalSize,
      available: estimatedQuota - totalSize,
      quota: estimatedQuota
    };
  }
}