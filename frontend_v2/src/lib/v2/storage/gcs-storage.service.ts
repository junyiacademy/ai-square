/**
 * GCS Storage Service Implementation for V2
 */

import { Storage } from '@google-cloud/storage';
import { 
  IStorageService, 
  StorageOptions, 
  StorageResult, 
  ListOptions 
} from '@/lib/v2/abstractions/storage.interface';

export class GCSStorageService implements IStorageService {
  private storage: Storage;
  private bucket: any;
  private bucketName: string;
  private initialized = false;
  private initError: Error | null = null;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME_V2 || 'ai-square-db-v2';
    
    try {
      this.storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
      this.bucket = this.storage.bucket(this.bucketName);
    } catch (error) {
      this.initError = error as Error;
      console.error('Failed to initialize GCS:', error);
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Check if bucket exists
      const [exists] = await this.bucket.exists();
      if (!exists) {
        throw new Error(`Bucket ${this.bucketName} does not exist`);
      }
      
      // Ensure base paths exist
      const basePaths = ['v2/scenarios', 'v2/programs', 'v2/tasks', 'v2/logs', 'v2/evaluations', 'v2/source_content'];
      for (const path of basePaths) {
        await this.ensurePathExists(path);
      }
      
      this.initialized = true;
    } catch (error) {
      this.initError = error as Error;
      throw error;
    }
  }

  async ensurePathExists(path: string): Promise<void> {
    try {
      const file = this.bucket.file(`${path}/.keep`);
      const [exists] = await file.exists();
      if (!exists) {
        await file.save('');
      }
    } catch (error) {
      console.warn(`Failed to ensure path ${path}:`, error);
    }
  }

  async get<T>(key: string): Promise<StorageResult<T>> {
    try {
      const file = this.bucket.file(`v2/${key}.json`);
      const [exists] = await file.exists();
      
      if (!exists) {
        return { success: false, error: 'File not found' };
      }
      
      const [contents] = await file.download();
      const data = JSON.parse(contents.toString()) as T;
      
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
      const file = this.bucket.file(`v2/${key}.json`);
      const contents = JSON.stringify(data, null, 2);
      
      await file.save(contents, {
        metadata: {
          contentType: 'application/json',
          cacheControl: `public, max-age=${options?.ttl || 300}`,
          ...options?.metadata
        }
      });
      
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
      const file = this.bucket.file(`v2/${key}.json`);
      await file.delete();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const file = this.bucket.file(`v2/${key}.json`);
      const [exists] = await file.exists();
      return exists;
    } catch {
      return false;
    }
  }

  async list<T>(prefix: string, options?: ListOptions): Promise<StorageResult<T[]>> {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: `v2/${prefix}`,
        maxResults: options?.limit,
        autoPaginate: false
      });
      
      const items: T[] = [];
      for (const file of files) {
        if (file.name.endsWith('.json')) {
          try {
            const [contents] = await file.download();
            const item = JSON.parse(contents.toString()) as T;
            items.push(item);
          } catch (error) {
            console.warn(`Failed to parse ${file.name}:`, error);
          }
        }
      }
      
      // Apply sorting if specified
      if (options?.orderBy) {
        items.sort((a: any, b: any) => {
          const aVal = a[options.orderBy!];
          const bVal = b[options.orderBy!];
          const direction = options.orderDirection === 'desc' ? -1 : 1;
          return aVal > bVal ? direction : -direction;
        });
      }
      
      return { success: true, data: items };
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
      const promises = items.map(item => 
        this.save(item.key, item.data, options)
      );
      
      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        return { 
          success: false, 
          error: `Failed to save ${failed.length} items` 
        };
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
      const promises = keys.map(key => this.delete(key));
      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        return { 
          success: false, 
          error: `Failed to delete ${failed.length} items` 
        };
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
    try {
      const [exists] = await this.bucket.exists();
      return exists && this.initialized && !this.initError;
    } catch {
      return false;
    }
  }

  async getHealthStatus(): Promise<{ healthy: boolean; message?: string; error?: Error }> {
    if (this.initError) {
      return { 
        healthy: false, 
        message: 'Initialization failed', 
        error: this.initError 
      };
    }
    
    try {
      const [exists] = await this.bucket.exists();
      if (!exists) {
        return { 
          healthy: false, 
          message: `Bucket ${this.bucketName} does not exist` 
        };
      }
      
      return { 
        healthy: true, 
        message: 'GCS storage is healthy' 
      };
    } catch (error) {
      return { 
        healthy: false, 
        message: 'Failed to check bucket status',
        error: error as Error
      };
    }
  }
}