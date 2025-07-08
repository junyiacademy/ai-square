/**
 * 軟刪除 Repository 實現
 * 支援軟刪除功能的 Repository
 */

import { BaseRepository } from './base.repository';
import { ISoftDeletableEntity, QueryOptions } from '../interfaces';
import { IStorageProvider } from '../../storage/interfaces';

export abstract class SoftDeletableRepository<T extends ISoftDeletableEntity<ID>, ID = string> 
  extends BaseRepository<T, ID> {
  
  constructor(storage: IStorageProvider, collectionName: string) {
    super(storage, collectionName);
  }
  
  /**
   * 查詢所有實體（預設排除已刪除）
   */
  async findAll(options?: QueryOptions & { includeDeleted?: boolean }): Promise<T[]> {
    const items = await super.findAll(options);
    
    if (options?.includeDeleted) {
      return items;
    }
    
    return items.filter(item => !item.isDeleted);
  }
  
  /**
   * 查詢所有已刪除的實體
   */
  async findDeleted(options?: QueryOptions): Promise<T[]> {
    const items = await super.findAll(options);
    return items.filter(item => item.isDeleted);
  }
  
  /**
   * 軟刪除實體
   */
  async softDelete(id: ID): Promise<T> {
    return await this.update(id, {
      deletedAt: new Date(),
      isDeleted: true
    } as Partial<T>);
  }
  
  /**
   * 恢復已刪除的實體
   */
  async restore(id: ID): Promise<T> {
    return await this.update(id, {
      deletedAt: null,
      isDeleted: false
    } as Partial<T>);
  }
  
  /**
   * 永久刪除實體
   */
  async hardDelete(id: ID): Promise<void> {
    await super.delete(id);
  }
  
  /**
   * 批次軟刪除
   */
  async softDeleteMany(ids: ID[]): Promise<T[]> {
    const updates = ids.map(id => ({
      id,
      data: {
        deletedAt: new Date(),
        isDeleted: true
      } as Partial<T>
    }));
    
    return await this.updateMany(updates);
  }
  
  /**
   * 批次恢復
   */
  async restoreMany(ids: ID[]): Promise<T[]> {
    const updates = ids.map(id => ({
      id,
      data: {
        deletedAt: null,
        isDeleted: false
      } as Partial<T>
    }));
    
    return await this.updateMany(updates);
  }
  
  /**
   * 批次永久刪除
   */
  async hardDeleteMany(ids: ID[]): Promise<void> {
    await super.deleteMany(ids);
  }
  
  /**
   * 清理已刪除超過指定天數的實體
   */
  async cleanupDeleted(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const deletedItems = await this.findDeleted();
    const toDelete = deletedItems.filter(item => 
      item.deletedAt && item.deletedAt < cutoffDate
    );
    
    if (toDelete.length > 0) {
      await this.hardDeleteMany(toDelete.map(item => item.id));
    }
    
    return toDelete.length;
  }
  
  /**
   * 覆寫 delete 方法，預設使用軟刪除
   */
  async delete(id: ID): Promise<void> {
    await this.softDelete(id);
  }
  
  /**
   * 覆寫 deleteMany 方法，預設使用軟刪除
   */
  async deleteMany(ids: ID[]): Promise<void> {
    await this.softDeleteMany(ids);
  }
}