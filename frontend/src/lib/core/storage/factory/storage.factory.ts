/**
 * Storage Factory
 * 用於創建不同類型的 Storage Provider
 */

import { IStorageProvider } from '../interfaces/storage.interface';
import { LocalStorageProvider } from '../providers/local-storage.provider';
import { GCSStorageProvider } from '../providers/gcs-storage.provider';
import { MockStorageProvider } from '../providers/mock-storage.provider';
import { StorageError } from '../../errors';

export type StorageType = 'local' | 'gcs' | 'mock';

export interface StorageConfig {
  type: StorageType;
  prefix?: string;
  // GCS specific
  bucketName?: string;
  // Mock specific
  quota?: number;
}

/**
 * Storage Factory
 */
export class StorageFactory {
  private static instances: Map<string, IStorageProvider> = new Map();

  /**
   * 創建 Storage Provider
   */
  static create(config: StorageConfig): IStorageProvider {
    const key = this.getInstanceKey(config);
    
    // 檢查是否已有實例
    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }
    
    // 創建新實例
    let provider: IStorageProvider;
    
    switch (config.type) {
      case 'local':
        provider = new LocalStorageProvider(config.prefix || '');
        break;
        
      case 'gcs':
        if (!config.bucketName) {
          throw new StorageError('Bucket name is required for GCS storage');
        }
        provider = new GCSStorageProvider(config.bucketName, config.prefix || '');
        break;
        
      case 'mock':
        provider = new MockStorageProvider(config.quota);
        break;
        
      default:
        throw new StorageError(`Unknown storage type: ${config.type}`);
    }
    
    // 快取實例
    this.instances.set(key, provider);
    
    return provider;
  }

  /**
   * 從環境變數創建 Storage Provider
   */
  static createFromEnv(): IStorageProvider {
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'local';
    const prefix = process.env.NEXT_PUBLIC_STORAGE_PREFIX || 'ai-square';
    
    const config: StorageConfig = {
      type: storageType as StorageType,
      prefix
    };
    
    if (storageType === 'gcs') {
      config.bucketName = process.env.NEXT_PUBLIC_GCS_BUCKET || 'ai-square-storage';
    }
    
    return this.create(config);
  }

  /**
   * 清除所有快取的實例
   */
  static clearInstances(): void {
    this.instances.clear();
  }

  /**
   * 取得實例 key
   */
  private static getInstanceKey(config: StorageConfig): string {
    return `${config.type}:${config.prefix || ''}:${config.bucketName || ''}`;
  }
}

/**
 * 預設 Storage Provider
 */
export const defaultStorage = StorageFactory.createFromEnv();