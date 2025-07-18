/**
 * GCS Repository 基礎類別
 * 提供通用的 GCS 操作方法
 */

import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { GCS_CONFIG, getStorageConfig } from '@/lib/config/gcs.config';

export abstract class GCSRepositoryBase<T extends { id: string }> {
  protected storage: Storage;
  protected bucket: ReturnType<Storage['bucket']>;
  protected basePath: string;
  private listCache: { data: T[]; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  constructor(basePath: string) {
    this.storage = new Storage(getStorageConfig());
    this.bucket = this.storage.bucket(GCS_CONFIG.bucketName);
    this.basePath = basePath;
  }

  /**
   * 產生新的 UUID
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * 取得檔案路徑
   */
  protected getFilePath(id: string): string {
    return `${this.basePath}/${id}.json`;
  }

  /**
   * 儲存實體到 GCS
   */
  protected async saveEntity(entity: T): Promise<T> {
    const filePath = this.getFilePath(entity.id);
    const file = this.bucket.file(filePath);
    
    try {
      await file.save(JSON.stringify(entity, null, 2), {
        metadata: {
          contentType: 'application/json',
        },
      });
      
      // Invalidate cache after saving
      this.listCache = null;
      
      return entity;
    } catch (error) {
      console.error(`Failed to save entity to GCS: ${filePath}`, error);
      throw new Error(`Failed to save entity: ${error}`);
    }
  }

  /**
   * 從 GCS 讀取實體
   */
  protected async loadEntity(id: string): Promise<T | null> {
    const filePath = this.getFilePath(id);
    const file = this.bucket.file(filePath);
    
    try {
      const [exists] = await file.exists();
      if (!exists) {
        return null;
      }
      
      const [content] = await file.download();
      return JSON.parse(content.toString()) as T;
    } catch (error) {
      console.error(`Failed to load entity from GCS: ${filePath}`, error);
      return null;
    }
  }

  /**
   * 刪除 GCS 中的實體
   */
  protected async deleteEntity(id: string): Promise<boolean> {
    const filePath = this.getFilePath(id);
    const file = this.bucket.file(filePath);
    
    try {
      await file.delete();
      // Invalidate cache after deleting
      this.listCache = null;
      return true;
    } catch (error) {
      console.error(`Failed to delete entity from GCS: ${filePath}`, error);
      return false;
    }
  }

  /**
   * 列出指定前綴的所有檔案
   */
  protected async listFiles(prefix: string): Promise<string[]> {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: `${this.basePath}/${prefix}`,
      });
      
      return files.map(file => file.name);
    } catch (error) {
      console.error(`Failed to list files with prefix: ${prefix}`, error);
      return [];
    }
  }

  /**
   * 批次載入多個實體
   */
  protected async loadEntities(ids: string[]): Promise<T[]> {
    const promises = ids.map(id => this.loadEntity(id));
    const results = await Promise.all(promises);
    return results.filter((entity): entity is T => entity !== null);
  }

  /**
   * 列出所有實體
   */
  protected async listAllEntities(): Promise<T[]> {
    // Check cache first
    if (this.listCache && (Date.now() - this.listCache.timestamp) < this.CACHE_TTL) {
      console.log(`[Cache HIT] Returning cached list for ${this.basePath}`);
      return this.listCache.data;
    }
    
    console.log(`[Cache MISS] Loading from GCS for ${this.basePath}`);
    
    try {
      const [files] = await this.bucket.getFiles({
        prefix: this.basePath,
      });
      
      const entities: T[] = [];
      
      for (const file of files) {
        if (file.name.endsWith('.json')) {
          try {
            const [content] = await file.download();
            const entity = JSON.parse(content.toString()) as T;
            entities.push(entity);
          } catch (error) {
            console.error(`Failed to parse file: ${file.name}`, error);
          }
        }
      }
      
      // Update cache
      this.listCache = {
        data: entities,
        timestamp: Date.now()
      };
      
      return entities;
    } catch (error) {
      console.error(`Failed to list all entities in: ${this.basePath}`, error);
      return [];
    }
  }

  /**
   * 更新實體
   */
  protected async updateEntity(id: string, updates: Partial<T>): Promise<T | null> {
    const existing = await this.loadEntity(id);
    if (!existing) {
      return null;
    }
    
    const updated = {
      ...existing,
      ...updates,
      id, // 確保 ID 不被覆蓋
    };
    
    // saveEntity will invalidate the cache
    return this.saveEntity(updated);
  }
}