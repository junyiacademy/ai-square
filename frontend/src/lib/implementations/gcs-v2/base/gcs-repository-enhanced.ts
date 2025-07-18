/**
 * Enhanced GCS Repository with optimistic locking and improved caching
 */

import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { GCS_CONFIG, getStorageConfig } from '@/lib/config/gcs.config';
import { DistributedLock } from '@/lib/services/transaction-manager';

export interface VersionedEntity {
  id: string;
  version: number;
  updatedAt: string;
}

export abstract class GCSRepositoryEnhanced<T extends VersionedEntity> {
  protected storage: Storage;
  protected bucket: ReturnType<Storage['bucket']>;
  protected basePath: string;
  
  // Improved caching with entity-level cache
  private entityCache = new Map<string, { data: T; timestamp: number }>();
  private listCache: { data: T[]; timestamp: number } | null = null;
  private readonly CACHE_TTL = 2 * 60 * 1000; // Reduced to 2 minutes
  private readonly ENTITY_CACHE_TTL = 1 * 60 * 1000; // 1 minute for individual entities

  constructor(basePath: string) {
    this.storage = new Storage(getStorageConfig());
    this.bucket = this.storage.bucket(GCS_CONFIG.bucketName);
    this.basePath = basePath;
  }

  /**
   * Generate new UUID
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Get file path
   */
  protected getFilePath(id: string): string {
    return `${this.basePath}/${id}.json`;
  }

  /**
   * Save entity with optimistic locking
   */
  protected async saveEntity(entity: T, expectedVersion?: number): Promise<T> {
    const lockKey = `save:${this.basePath}:${entity.id}`;
    
    return DistributedLock.withLock(lockKey, async () => {
      // If expectedVersion is provided, check for conflicts
      if (expectedVersion !== undefined) {
        const current = await this.loadEntityDirect(entity.id);
        if (current && current.version !== expectedVersion) {
          throw new OptimisticLockError(
            `Version conflict: expected ${expectedVersion}, found ${current.version}`,
            expectedVersion,
            current.version
          );
        }
      }
      
      // Update version and timestamp
      const updatedEntity = {
        ...entity,
        version: (entity.version || 0) + 1,
        updatedAt: new Date().toISOString()
      };
      
      const filePath = this.getFilePath(entity.id);
      const file = this.bucket.file(filePath);
      
      try {
        await file.save(JSON.stringify(updatedEntity, null, 2), {
          metadata: {
            contentType: 'application/json',
            customMetadata: {
              version: updatedEntity.version.toString(),
              updatedAt: updatedEntity.updatedAt
            }
          },
        });
        
        // Invalidate caches
        this.invalidateCache(entity.id);
        
        return updatedEntity;
      } catch (error) {
        console.error(`Failed to save entity to GCS: ${filePath}`, error);
        throw new Error(`Failed to save entity: ${error}`);
      }
    });
  }

  /**
   * Load entity with caching
   */
  protected async loadEntity(id: string): Promise<T | null> {
    // Check entity cache first
    const cached = this.entityCache.get(id);
    if (cached && (Date.now() - cached.timestamp) < this.ENTITY_CACHE_TTL) {
      console.log(`[Entity Cache HIT] ${this.basePath}/${id}`);
      return cached.data;
    }
    
    console.log(`[Entity Cache MISS] ${this.basePath}/${id}`);
    const entity = await this.loadEntityDirect(id);
    
    if (entity) {
      this.entityCache.set(id, {
        data: entity,
        timestamp: Date.now()
      });
    }
    
    return entity;
  }

  /**
   * Load entity directly from GCS (bypasses cache)
   */
  private async loadEntityDirect(id: string): Promise<T | null> {
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
   * Delete entity
   */
  protected async deleteEntity(id: string): Promise<boolean> {
    const lockKey = `delete:${this.basePath}:${id}`;
    
    return DistributedLock.withLock(lockKey, async () => {
      const filePath = this.getFilePath(id);
      const file = this.bucket.file(filePath);
      
      try {
        await file.delete();
        this.invalidateCache(id);
        return true;
      } catch (error) {
        console.error(`Failed to delete entity from GCS: ${filePath}`, error);
        return false;
      }
    });
  }

  /**
   * Update entity with optimistic locking
   */
  protected async updateEntity(
    id: string, 
    updates: Partial<T>,
    expectedVersion?: number
  ): Promise<T | null> {
    const lockKey = `update:${this.basePath}:${id}`;
    
    return DistributedLock.withLock(lockKey, async () => {
      const existing = await this.loadEntityDirect(id);
      if (!existing) {
        return null;
      }
      
      // Check version if provided
      if (expectedVersion !== undefined && existing.version !== expectedVersion) {
        throw new OptimisticLockError(
          `Version conflict: expected ${expectedVersion}, found ${existing.version}`,
          expectedVersion,
          existing.version
        );
      }
      
      const updated = {
        ...existing,
        ...updates,
        id, // Ensure ID is not overwritten
        version: existing.version + 1,
        updatedAt: new Date().toISOString()
      };
      
      return this.saveEntity(updated, existing.version);
    });
  }

  /**
   * List all entities with improved caching
   */
  protected async listAllEntities(): Promise<T[]> {
    // Check cache first
    if (this.listCache && (Date.now() - this.listCache.timestamp) < this.CACHE_TTL) {
      console.log(`[List Cache HIT] ${this.basePath}`);
      return this.listCache.data;
    }
    
    console.log(`[List Cache MISS] ${this.basePath}`);
    
    try {
      const [files] = await this.bucket.getFiles({
        prefix: this.basePath,
      });
      
      const entities: T[] = [];
      
      // Process files in parallel for better performance
      const promises = files
        .filter(file => file.name.endsWith('.json'))
        .map(async (file) => {
          try {
            const [content] = await file.download();
            const entity = JSON.parse(content.toString()) as T;
            
            // Update entity cache
            this.entityCache.set(entity.id, {
              data: entity,
              timestamp: Date.now()
            });
            
            return entity;
          } catch (error) {
            console.error(`Failed to parse file: ${file.name}`, error);
            return null;
          }
        });
      
      const results = await Promise.all(promises);
      results.forEach(entity => {
        if (entity) entities.push(entity);
      });
      
      // Update list cache
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
   * Invalidate cache for an entity
   */
  protected invalidateCache(id?: string): void {
    if (id) {
      this.entityCache.delete(id);
    }
    this.listCache = null;
  }

  /**
   * Clear all caches
   */
  protected clearAllCaches(): void {
    this.entityCache.clear();
    this.listCache = null;
  }

  /**
   * Batch update with transaction support
   */
  protected async batchUpdate(
    updates: Array<{ id: string; updates: Partial<T>; expectedVersion?: number }>
  ): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    const rollbacks: Array<() => Promise<void>> = [];
    
    try {
      for (const update of updates) {
        const original = await this.loadEntityDirect(update.id);
        if (!original) {
          results.push(null);
          continue;
        }
        
        const updated = await this.updateEntity(
          update.id,
          update.updates,
          update.expectedVersion
        );
        
        results.push(updated);
        
        // Prepare rollback
        rollbacks.push(async () => {
          await this.saveEntity(original, original.version - 1);
        });
      }
      
      return results;
    } catch (error) {
      // Rollback on error
      console.error('Batch update failed, rolling back...', error);
      for (const rollback of rollbacks.reverse()) {
        try {
          await rollback();
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }
      throw error;
    }
  }
}

export class OptimisticLockError extends Error {
  constructor(
    message: string,
    public expectedVersion: number,
    public actualVersion: number
  ) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}