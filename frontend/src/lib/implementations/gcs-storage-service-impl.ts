/**
 * GCS Storage Service Implementation
 * 基於 BaseStorageService 的 Google Cloud Storage 實作
 */

import { Storage } from '@google-cloud/storage';
import { BaseStorageService, StorageOptions } from '@/lib/abstractions/base-storage-service';

// 初始化 GCS client
const storageConfig: {
  projectId?: string;
  keyFilename?: string;
} = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
};

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  storageConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const storage = new Storage(storageConfig);

export class GCSStorageServiceImpl<T = unknown> extends BaseStorageService<T> {
  protected readonly serviceName: string;
  private bucket;

  constructor(bucketName: string, serviceName: string) {
    super();
    this.serviceName = serviceName;
    this.bucket = storage.bucket(bucketName);
  }

  protected async saveToStorage(
    key: string,
    data: T,
    options: StorageOptions
  ): Promise<{ success: boolean; id: string }> {
    const filePath = this.getFilePath(key, options);
    const file = this.bucket.file(filePath);
    const contents = JSON.stringify(data, null, 2);
    
    try {
      await file.save(contents, {
        metadata: {
          contentType: 'application/json',
          cacheControl: `public, max-age=${options.ttl || this.defaultOptions.ttl}`,
        },
      });
      
      console.log(`✅ [${this.serviceName}] Saved to GCS: ${filePath}`);
      return { success: true, id: key };
    } catch (error) {
      console.error(`❌ [${this.serviceName}] GCS save error:`, error);
      throw error;
    }
  }

  protected async loadFromStorage(
    key: string,
    options: StorageOptions
  ): Promise<{ success: boolean; data?: T }> {
    const filePath = this.getFilePath(key, options);
    const file = this.bucket.file(filePath);
    
    try {
      const [exists] = await file.exists();
      if (!exists) {
        return { success: false };
      }
      
      const [contents] = await file.download();
      const data = JSON.parse(contents.toString()) as T;
      
      return { success: true, data };
    } catch (error) {
      console.error(`❌ [${this.serviceName}] GCS load error:`, error);
      return { success: false };
    }
  }

  protected async deleteFromStorage(
    key: string,
    options: StorageOptions
  ): Promise<{ success: boolean }> {
    const filePath = this.getFilePath(key, options);
    const file = this.bucket.file(filePath);
    
    try {
      await file.delete();
      return { success: true };
    } catch (error) {
      console.error(`❌ [${this.serviceName}] GCS delete error:`, error);
      return { success: false };
    }
  }

  protected async listFromStorage(
    prefix: string,
    options: StorageOptions
  ): Promise<{ success: boolean; data?: T[] }> {
    const fullPrefix = options.path ? `${options.path}/${prefix}` : prefix;
    
    try {
      const [files] = await this.bucket.getFiles({ prefix: fullPrefix });
      const items: T[] = [];
      
      for (const file of files) {
        try {
          const [contents] = await file.download();
          const item = JSON.parse(contents.toString()) as T;
          items.push(item);
        } catch (error) {
          console.warn(`Failed to parse file ${file.name}:`, error);
        }
      }
      
      return { success: true, data: items };
    } catch (error) {
      console.error(`❌ [${this.serviceName}] GCS list error:`, error);
      return { success: false };
    }
  }

  private getFilePath(key: string, options: StorageOptions): string {
    const parts = [];
    if (options.path) {
      parts.push(options.path);
    }
    parts.push(key);
    
    // 確保有 .json 副檔名
    const filePath = parts.join('/');
    return filePath.endsWith('.json') ? filePath : `${filePath}.json`;
  }
}

// 建立特定用途的實例
export const assessmentStorage = new GCSStorageServiceImpl(
  process.env.GCS_BUCKET_NAME || 'ai-square-assessments',
  'AssessmentStorage'
);

export const pblStorage = new GCSStorageServiceImpl(
  process.env.GCS_BUCKET_NAME || 'ai-square-pbl',
  'PBLStorage'
);