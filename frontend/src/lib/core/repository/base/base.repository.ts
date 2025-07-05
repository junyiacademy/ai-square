/**
 * 基礎 Repository 實現
 * 使用 Storage Provider 作為底層儲存
 */

import { 
  IRepository, 
  QueryOptions, 
  IEntity 
} from '../interfaces';
import { IStorageProvider } from '../../storage/interfaces';
import { v4 as uuidv4 } from 'uuid';
// Removed decorator imports - decorators not supported in current setup

export abstract class BaseRepository<T extends IEntity<ID>, ID = string> 
  implements IRepository<T, ID> {
  
  protected readonly storage: IStorageProvider;
  protected readonly collectionName: string;
  
  constructor(storage: IStorageProvider, collectionName: string) {
    this.storage = storage;
    this.collectionName = collectionName;
  }
  
  /**
   * 根據 ID 查詢單一實體
   */
  async findById(id: ID): Promise<T | null> {
    const key = this.getKey(id);
    return await this.storage.get<T>(key);
  }
  
  /**
   * 查詢所有實體
   */
  async findAll(options?: QueryOptions): Promise<T[]> {
    const items = await this.storage.list<T>(this.collectionName + '/', {
      limit: options?.limit,
      offset: options?.offset,
      orderBy: options?.orderBy as any,
      orderDirection: options?.orderDirection
    });
    
    // 應用 where 條件過濾
    if (options?.where) {
      return this.filterByWhere(items, options.where);
    }
    
    return items;
  }
  
  /**
   * 根據條件查詢實體
   */
  async findOne(where: Partial<T>): Promise<T | null> {
    const items = await this.findMany(where, { limit: 1 });
    return items[0] || null;
  }
  
  /**
   * 根據條件查詢多個實體
   */
  async findMany(where: Partial<T>, options?: QueryOptions): Promise<T[]> {
    const allItems = await this.findAll(options);
    return this.filterByWhere(allItems, where);
  }
  
  /**
   * 創建實體
   */
  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const id = this.generateId();
    const now = new Date();
    
    const fullEntity = {
      ...entity,
      id,
      createdAt: now,
      updatedAt: now
    } as T;
    
    const key = this.getKey(id);
    await this.storage.set(key, fullEntity);
    
    return fullEntity;
  }
  
  /**
   * 更新實體
   */
  async update(id: ID, updates: Partial<T>): Promise<T> {
    const existing = await this.findById(id);
    
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      id, // 防止 ID 被覆蓋
      createdAt: existing.createdAt, // 保留創建時間
      updatedAt: new Date()
    } as T;
    
    const key = this.getKey(id);
    await this.storage.set(key, updated);
    
    return updated;
  }
  
  /**
   * 刪除實體
   */
  async delete(id: ID): Promise<void> {
    const key = this.getKey(id);
    await this.storage.delete(key);
  }
  
  /**
   * 批次創建
   */
  async createMany(entities: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T[]> {
    const operations = entities.map(entity => {
      const id = this.generateId();
      const now = new Date();
      
      const fullEntity = {
        ...entity,
        id,
        createdAt: now,
        updatedAt: now
      } as T;
      
      return {
        type: 'set' as const,
        key: this.getKey(id),
        value: fullEntity
      };
    });
    
    const result = await this.storage.batch(operations);
    
    if (result.failed > 0) {
      throw new Error(`Failed to create ${result.failed} entities`);
    }
    
    return operations.map(op => op.value);
  }
  
  /**
   * 批次更新
   */
  async updateMany(updates: Array<{ id: ID; data: Partial<T> }>): Promise<T[]> {
    const results: T[] = [];
    
    for (const { id, data } of updates) {
      const updated = await this.update(id, data);
      results.push(updated);
    }
    
    return results;
  }
  
  /**
   * 批次刪除
   */
  async deleteMany(ids: ID[]): Promise<void> {
    const operations = ids.map(id => ({
      type: 'delete' as const,
      key: this.getKey(id)
    }));
    
    const result = await this.storage.batch(operations);
    
    if (result.failed > 0) {
      throw new Error(`Failed to delete ${result.failed} entities`);
    }
  }
  
  /**
   * 計數
   */
  async count(where?: Partial<T>): Promise<number> {
    const items = where ? await this.findMany(where) : await this.findAll();
    return items.length;
  }
  
  /**
   * 檢查是否存在
   */
  async exists(where: Partial<T>): Promise<boolean> {
    const item = await this.findOne(where);
    return item !== null;
  }
  
  /**
   * 生成 ID
   */
  protected generateId(): ID {
    return uuidv4() as ID;
  }
  
  /**
   * 取得儲存 key
   */
  protected getKey(id: ID): string {
    return `${this.collectionName}/${id}`;
  }
  
  /**
   * 根據條件過濾
   */
  protected filterByWhere(items: T[], where: Record<string, any>): T[] {
    return items.filter(item => {
      for (const [key, value] of Object.entries(where)) {
        if ((item as any)[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }
}