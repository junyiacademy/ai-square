/**
 * Base Repository Pattern for V2 Architecture
 */

import { BaseEntity } from '@/lib/v2/interfaces/base';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface FindOptions extends QueryOptions {
  where?: Record<string, any>;
}

export abstract class BaseRepository<T extends BaseEntity> {
  constructor(
    protected readonly tableName: string,
    protected readonly storageService: any // Will be replaced with proper storage interface
  ) {}

  async findById(id: string): Promise<T | null> {
    const key = `${this.tableName}/${id}`;
    const result = await this.storageService.get(key);
    
    // Handle StorageResult format
    if (result && typeof result === 'object' && 'success' in result) {
      if (!result.success || !result.data) {
        return null;
      }
      return this.mapToEntity(result.data);
    }
    
    // Handle direct data format (legacy)
    return result ? this.mapToEntity(result) : null;
  }

  async findOne(options: FindOptions): Promise<T | null> {
    const items = await this.findMany({ ...options, limit: 1 });
    return items[0] || null;
  }

  async findMany(options: FindOptions = {}): Promise<T[]> {
    const prefix = this.tableName;
    const result = await this.storageService.list(prefix, options);
    
    let items: T[] = [];
    
    // Handle StorageResult format
    if (result && typeof result === 'object' && 'success' in result) {
      if (!result.success) {
        console.error(`Storage list failed for ${prefix}:`, result.error);
        return [];
      }
      const data = result.data || [];
      items = data.map(item => this.mapToEntity(item));
    }
    // Handle direct array format (legacy)
    else if (Array.isArray(result)) {
      items = result.map(item => this.mapToEntity(item));
    }
    else {
      console.warn(`Storage service returned unexpected format for ${prefix}:`, result);
      return [];
    }
    
    // Apply where conditions if provided
    if (options.where && Object.keys(options.where).length > 0) {
      items = items.filter(item => {
        return Object.entries(options.where!).every(([key, value]) => {
          return (item as any)[key] === value;
        });
      });
    }
    
    // Apply ordering if not already done by storage
    if (options.orderBy && items.length > 0) {
      items.sort((a, b) => {
        const aVal = (a as any)[options.orderBy!];
        const bVal = (b as any)[options.orderBy!];
        const direction = options.orderDirection === 'desc' ? -1 : 1;
        return aVal > bVal ? direction : -direction;
      });
    }
    
    // Apply offset and limit if needed
    if (options.offset) {
      items = items.slice(options.offset);
    }
    if (options.limit) {
      items = items.slice(0, options.limit);
    }
    
    return items;
  }

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const entity = {
      ...data,
      id,
      created_at: now,
      updated_at: now
    } as T;

    const key = `${this.tableName}/${id}`;
    const saveResult = await this.storageService.save(key, entity);
    
    if (saveResult && typeof saveResult === 'object' && 'success' in saveResult && !saveResult.success) {
      throw new Error(`Failed to save entity: ${saveResult.error}`);
    }
    
    return entity;
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Entity not found: ${id}`);
    }

    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString()
    } as T;

    const key = `${this.tableName}/${id}`;
    const saveResult = await this.storageService.save(key, updated);
    
    if (saveResult && typeof saveResult === 'object' && 'success' in saveResult && !saveResult.success) {
      throw new Error(`Failed to update entity: ${saveResult.error}`);
    }
    
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const key = `${this.tableName}/${id}`;
    const result = await this.storageService.delete(key);
    
    // Handle StorageResult format
    if (result && typeof result === 'object' && 'success' in result) {
      return result.success;
    }
    
    // Handle direct boolean format (legacy)
    return !!result;
  }

  async exists(id: string): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  protected generateId(): string {
    return `${this.tableName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected abstract mapToEntity(data: any): T;
}