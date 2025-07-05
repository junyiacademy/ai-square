/**
 * Mock Storage Provider
 * 用於測試的記憶體儲存實現
 */

import { 
  IStorageProvider, 
  StorageOptions, 
  ListOptions, 
  BatchOperation, 
  BatchResult,
  StorageInfo 
} from '../interfaces/storage.interface';
import { StorageError, StorageQuotaExceededError } from '../../errors';

interface MockStorageEntry<T> {
  value: T;
  expiresAt?: number;
  createdAt: number;
  key: string;
}

export class MockStorageProvider implements IStorageProvider {
  private storage: Map<string, MockStorageEntry<any>> = new Map();
  private quota: number;
  private errorMode: boolean = false;
  private delay: number = 0;

  constructor(quota: number = 10 * 1024 * 1024) { // 10MB default
    this.quota = quota;
  }

  /**
   * 設定錯誤模式（用於測試錯誤處理）
   */
  setErrorMode(enabled: boolean): void {
    this.errorMode = enabled;
  }

  /**
   * 設定延遲（用於測試非同步行為）
   */
  setDelay(ms: number): void {
    this.delay = ms;
  }

  /**
   * 取得資料
   */
  async get<T>(key: string): Promise<T | null> {
    await this.simulateDelay();
    
    if (this.errorMode) {
      throw new StorageError('Mock error: get failed');
    }
    
    const entry = this.storage.get(key);
    
    if (!entry) {
      return null;
    }
    
    // 檢查過期
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.storage.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  /**
   * 設定資料
   */
  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    await this.simulateDelay();
    
    if (this.errorMode) {
      throw new StorageError('Mock error: set failed');
    }
    
    // 檢查配額
    const size = this.estimateSize(value);
    const currentSize = this.getCurrentSize();
    
    if (currentSize + size > this.quota) {
      throw new StorageQuotaExceededError('Mock storage quota exceeded');
    }
    
    const entry: MockStorageEntry<T> = {
      value,
      createdAt: Date.now(),
      key
    };
    
    if (options?.ttl) {
      entry.expiresAt = Date.now() + (options.ttl * 1000);
    }
    
    this.storage.set(key, entry);
  }

  /**
   * 刪除資料
   */
  async delete(key: string): Promise<void> {
    await this.simulateDelay();
    
    if (this.errorMode) {
      throw new StorageError('Mock error: delete failed');
    }
    
    this.storage.delete(key);
  }

  /**
   * 檢查是否存在
   */
  async exists(key: string): Promise<boolean> {
    await this.simulateDelay();
    
    if (this.errorMode) {
      throw new StorageError('Mock error: exists failed');
    }
    
    const entry = this.storage.get(key);
    
    if (!entry) {
      return false;
    }
    
    // 檢查過期
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.storage.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * 列出資料
   */
  async list<T>(prefix: string, options?: ListOptions): Promise<T[]> {
    await this.simulateDelay();
    
    if (this.errorMode) {
      throw new StorageError('Mock error: list failed');
    }
    
    // 過濾符合前綴的項目
    const entries = Array.from(this.storage.entries())
      .filter(([key]) => key.startsWith(prefix))
      .filter(([key, entry]) => {
        // 過濾過期項目
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          this.storage.delete(key);
          return false;
        }
        return true;
      });
    
    // 排序
    if (options?.orderBy === 'key') {
      entries.sort(([a], [b]) => {
        const comparison = a.localeCompare(b);
        return options.orderDirection === 'desc' ? -comparison : comparison;
      });
    } else if (options?.orderBy === 'createdAt') {
      entries.sort(([, a], [, b]) => {
        const comparison = a.createdAt - b.createdAt;
        return options.orderDirection === 'desc' ? -comparison : comparison;
      });
    }
    
    // 分頁
    const start = options?.offset || 0;
    const end = options?.limit ? start + options.limit : undefined;
    const paged = entries.slice(start, end);
    
    return paged.map(([, entry]) => entry.value as T);
  }

  /**
   * 批次操作
   */
  async batch(operations: BatchOperation[]): Promise<BatchResult> {
    const result: BatchResult = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    for (const operation of operations) {
      try {
        switch (operation.type) {
          case 'set':
            await this.set(operation.key, operation.value, operation.options);
            break;
          case 'delete':
            await this.delete(operation.key);
            break;
          default:
            throw new Error(`Unknown operation type: ${(operation as any).type}`);
        }
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors?.push({
          operation,
          error: error instanceof Error ? error : new Error('Unknown error')
        });
      }
    }
    
    return result;
  }

  /**
   * 清除資料
   */
  async clear(prefix?: string): Promise<void> {
    await this.simulateDelay();
    
    if (this.errorMode) {
      throw new StorageError('Mock error: clear failed');
    }
    
    if (!prefix) {
      this.storage.clear();
      return;
    }
    
    // 清除符合前綴的項目
    const keysToDelete = Array.from(this.storage.keys())
      .filter(key => key.startsWith(prefix));
    
    keysToDelete.forEach(key => this.storage.delete(key));
  }

  /**
   * 取得儲存空間資訊
   */
  async getStorageInfo(): Promise<StorageInfo> {
    await this.simulateDelay();
    
    if (this.errorMode) {
      throw new StorageError('Mock error: getStorageInfo failed');
    }
    
    const used = this.getCurrentSize();
    
    return {
      used,
      quota: this.quota,
      available: Math.max(0, this.quota - used)
    };
  }

  /**
   * 清理過期項目
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.storage.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.storage.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * 取得所有資料（用於測試）
   */
  getAllData(): Map<string, MockStorageEntry<any>> {
    return new Map(this.storage);
  }

  /**
   * 模擬延遲
   */
  private async simulateDelay(): Promise<void> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
  }

  /**
   * 估算大小
   */
  private estimateSize(value: any): number {
    return JSON.stringify(value).length;
  }

  /**
   * 取得目前使用大小
   */
  private getCurrentSize(): number {
    let size = 0;
    for (const entry of this.storage.values()) {
      size += this.estimateSize(entry.value);
    }
    return size;
  }
}