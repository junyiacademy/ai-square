/**
 * Google Cloud Storage Provider
 * 實現 IStorageProvider 介面的 GCS 版本
 */

import { Storage } from '@google-cloud/storage';
import { 
  IStorageProvider, 
  StorageOptions, 
  ListOptions, 
  BatchOperation, 
  BatchResult,
  StorageInfo 
} from '../interfaces/storage.interface';
import { 
  StorageError, 
  StorageNotFoundError, 
  StoragePermissionError,
  StorageQuotaExceededError 
} from '../../errors';
import { Retryable, RetryConditions } from '../decorators/retry.decorator';

interface GCSMetadata {
  ttl?: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class GCSStorageProvider implements IStorageProvider {
  private storage: Storage;
  private bucket: any;
  private readonly bucketName: string;
  private readonly prefix: string;

  constructor(bucketName: string, prefix: string = '') {
    this.bucketName = bucketName;
    this.prefix = prefix;
    
    try {
      this.storage = new Storage();
      this.bucket = this.storage.bucket(bucketName);
    } catch (error) {
      throw new StoragePermissionError(
        `Failed to initialize GCS: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 取得資料
   */
  @Retryable({ 
    maxAttempts: 3, 
    retryIf: RetryConditions.onNetworkError 
  })
  async get<T>(key: string): Promise<T | null> {
    const filePath = this.getFilePath(key);
    
    try {
      const file = this.bucket.file(filePath);
      const [exists] = await file.exists();
      
      if (!exists) {
        return null;
      }
      
      // 檢查是否過期
      const [metadata] = await file.getMetadata();
      if (this.isExpired(metadata.metadata)) {
        await file.delete().catch(() => {}); // 忽略刪除錯誤
        return null;
      }
      
      // 下載並解析資料
      const [contents] = await file.download();
      return JSON.parse(contents.toString()) as T;
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('No such object')) {
        return null;
      }
      throw new StorageError(`Failed to get ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 設定資料
   */
  @Retryable({ 
    maxAttempts: 3, 
    retryIf: RetryConditions.onNetworkError 
  })
  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    const filePath = this.getFilePath(key);
    
    try {
      const file = this.bucket.file(filePath);
      const data = JSON.stringify(value);
      
      // 準備 metadata
      const metadata: GCSMetadata = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (options?.ttl) {
        metadata.ttl = options.ttl;
        metadata.expiresAt = new Date(Date.now() + options.ttl * 1000).toISOString();
      }
      
      // 上傳檔案
      await file.save(data, {
        metadata: { metadata },
        contentType: 'application/json'
      });
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('quota')) {
        throw new StorageQuotaExceededError('GCS quota exceeded');
      }
      throw new StorageError(`Failed to set ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 刪除資料
   */
  @Retryable({ 
    maxAttempts: 3, 
    retryIf: RetryConditions.onNetworkError 
  })
  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    
    try {
      const file = this.bucket.file(filePath);
      await file.delete();
    } catch (error) {
      // 忽略檔案不存在的錯誤
      if (!(error instanceof Error && error.message.includes('No such object'))) {
        throw new StorageError(`Failed to delete ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * 檢查是否存在
   */
  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    
    try {
      const file = this.bucket.file(filePath);
      const [exists] = await file.exists();
      
      if (!exists) {
        return false;
      }
      
      // 檢查是否過期
      const [metadata] = await file.getMetadata();
      if (this.isExpired(metadata.metadata)) {
        await file.delete().catch(() => {});
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 列出資料
   */
  async list<T>(prefix: string, options?: ListOptions): Promise<T[]> {
    const fullPrefix = this.getFilePath(prefix);
    
    try {
      const [files] = await this.bucket.getFiles({
        prefix: fullPrefix,
        maxResults: options?.limit,
        autoPaginate: false
      });
      
      // 過濾過期的檔案
      const validFiles = [];
      for (const file of files) {
        const [metadata] = await file.getMetadata();
        if (!this.isExpired(metadata.metadata)) {
          validFiles.push(file);
        }
      }
      
      // 排序
      if (options?.orderBy === 'key') {
        validFiles.sort((a, b) => {
          const comparison = a.name.localeCompare(b.name);
          return options.orderDirection === 'desc' ? -comparison : comparison;
        });
      }
      
      // 分頁
      const start = options?.offset || 0;
      const end = options?.limit ? start + options.limit : undefined;
      const pagedFiles = validFiles.slice(start, end);
      
      // 下載資料
      const results: T[] = [];
      for (const file of pagedFiles) {
        try {
          const [contents] = await file.download();
          results.push(JSON.parse(contents.toString()) as T);
        } catch (error) {
          console.error(`Failed to parse ${file.name}:`, error);
        }
      }
      
      return results;
    } catch (error) {
      throw new StorageError(`Failed to list ${prefix}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    const fullPrefix = prefix ? this.getFilePath(prefix) : this.prefix;
    
    try {
      const [files] = await this.bucket.getFiles({
        prefix: fullPrefix
      });
      
      // 批次刪除
      const deletePromises = files.map(file => file.delete());
      await Promise.all(deletePromises);
      
    } catch (error) {
      throw new StorageError(`Failed to clear ${prefix || 'all'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 取得儲存空間資訊
   */
  async getStorageInfo(): Promise<StorageInfo> {
    try {
      // GCS 沒有明確的配額概念，返回估計值
      const [files] = await this.bucket.getFiles({
        prefix: this.prefix
      });
      
      let totalSize = 0;
      for (const file of files) {
        const [metadata] = await file.getMetadata();
        totalSize += metadata.size || 0;
      }
      
      // GCS 的實際配額取決於計費設定，這裡返回一個合理的預設值
      const quota = 5 * 1024 * 1024 * 1024; // 5GB
      
      return {
        used: totalSize,
        quota: quota,
        available: Math.max(0, quota - totalSize)
      };
    } catch (error) {
      throw new StorageError(`Failed to get storage info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 取得完整檔案路徑
   */
  private getFilePath(key: string): string {
    return this.prefix ? `${this.prefix}/${key}` : key;
  }

  /**
   * 檢查是否過期
   */
  private isExpired(metadata?: GCSMetadata): boolean {
    if (!metadata?.expiresAt) {
      return false;
    }
    
    return new Date(metadata.expiresAt) < new Date();
  }
}