/**
 * User-Centric GCS Storage Provider
 * 實作用戶優先的 GCS 儲存結構
 * 
 * 目錄結構：
 * /users/{userId}/
 *   ├── tracks/
 *   ├── pbl/
 *   ├── assessment/
 *   └── discovery/
 */

import { Storage, Bucket, File } from '@google-cloud/storage';
import { 
  IStorageProvider, 
  StorageOptions, 
  ListOptions, 
  BatchOperation, 
  BatchResult,
  StorageMetadata 
} from '../interfaces/storage.interface';

export interface UserCentricGCSConfig {
  bucketName: string;
  projectId?: string;
  keyFilename?: string;
  indexUpdateInterval?: number; // 索引更新間隔（毫秒）
}

export class UserCentricGCSProvider implements IStorageProvider {
  private storage: Storage;
  private bucket: Bucket;
  private indexUpdateQueue: Map<string, any> = new Map();
  private indexUpdateTimer?: NodeJS.Timeout;

  constructor(private config: UserCentricGCSConfig) {
    this.storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.keyFilename,
    });
    this.bucket = this.storage.bucket(config.bucketName);
    
    // 啟動索引更新定時器
    if (config.indexUpdateInterval) {
      this.startIndexUpdater(config.indexUpdateInterval);
    }
  }

  /**
   * 從 key 解析用戶和資源類型
   * 例如: "track:user@example.com:123" -> { userId: "user@example.com", type: "tracks", id: "123" }
   */
  private parseKey(key: string): { userId: string; type: string; id: string } {
    const parts = key.split(':');
    if (parts.length < 3) {
      throw new Error(`Invalid key format: ${key}`);
    }
    
    const [type, userId, ...idParts] = parts;
    
    // Special handling for tasks which have format: task:userId:programId:taskId
    if (type === 'task' && idParts.length >= 2) {
      // For tasks, we need to keep programId:taskId as the ID
      return {
        userId,
        type: 'tasks',
        id: idParts.join(':') // This will be "programId:taskId"
      };
    }
    
    return {
      userId,
      type: `${type}s`, // track -> tracks, program -> programs
      id: idParts.join(':')
    };
  }

  /**
   * 生成 GCS 檔案路徑
   */
  private getFilePath(userId: string, type: string, id: string): string {
    return `users/${userId}/${type}/${id}.json`;
  }

  /**
   * 獲取資料
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const { userId, type, id } = this.parseKey(key);
      const filePath = this.getFilePath(userId, type, id);
      const file = this.bucket.file(filePath);
      
      const [exists] = await file.exists();
      if (!exists) {
        return null;
      }

      const [content] = await file.download();
      const data = JSON.parse(content.toString());
      
      // 檢查 TTL
      if (data._metadata?.ttl && new Date(data._metadata.ttl) < new Date()) {
        await this.delete(key);
        return null;
      }

      const result = data.value || data;
      
      // Convert date strings back to Date objects
      if (result && typeof result === 'object') {
        if (result.createdAt && typeof result.createdAt === 'string') {
          result.createdAt = new Date(result.createdAt);
        }
        if (result.updatedAt && typeof result.updatedAt === 'string') {
          result.updatedAt = new Date(result.updatedAt);
        }
        if (result.deletedAt && typeof result.deletedAt === 'string') {
          result.deletedAt = new Date(result.deletedAt);
        }
        if (result.startedAt && typeof result.startedAt === 'string') {
          result.startedAt = new Date(result.startedAt);
        }
        if (result.completedAt && typeof result.completedAt === 'string') {
          result.completedAt = new Date(result.completedAt);
        }
        if (result.timestamp && typeof result.timestamp === 'string') {
          result.timestamp = new Date(result.timestamp);
        }
        
        // Also convert nested date fields like progress.lastActivityAt
        if (result.progress?.lastActivityAt && typeof result.progress.lastActivityAt === 'string') {
          result.progress.lastActivityAt = new Date(result.progress.lastActivityAt);
        }
      }

      return result;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * 設定資料
   */
  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    try {
      const { userId, type, id } = this.parseKey(key);
      const filePath = this.getFilePath(userId, type, id);
      const file = this.bucket.file(filePath);

      const data = {
        key,
        value,
        _metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          ...(options?.ttl && {
            ttl: new Date(Date.now() + options.ttl * 1000).toISOString()
          }),
          ...(options?.metadata && { custom: options.metadata })
        }
      };

      await file.save(JSON.stringify(data, null, 2), {
        metadata: {
          contentType: 'application/json',
          cacheControl: 'no-cache',
          metadata: {
            userId,
            type,
            id,
            ...(options?.metadata || {})
          }
        }
      });

      // 排程索引更新
      if (type === 'tracks') {
        this.scheduleIndexUpdate(userId, type, value);
      }
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * 刪除資料
   */
  async delete(key: string): Promise<void> {
    try {
      const { userId, type, id } = this.parseKey(key);
      const filePath = this.getFilePath(userId, type, id);
      const file = this.bucket.file(filePath);
      
      await file.delete({ ignoreNotFound: true });
      
      // 排程索引更新
      if (type === 'tracks') {
        this.scheduleIndexUpdate(userId, type, null, id);
      }
    } catch (error) {
      console.error(`Error deleting ${key}:`, error);
      throw error;
    }
  }

  /**
   * 檢查是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const { userId, type, id } = this.parseKey(key);
      const filePath = this.getFilePath(userId, type, id);
      const file = this.bucket.file(filePath);
      
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      console.error(`Error checking existence of ${key}:`, error);
      return false;
    }
  }

  /**
   * 列出資料
   */
  async list<T>(prefix: string, options?: ListOptions): Promise<T[]> {
    try {
      let gcsPrefix: string;
      
      // 解析 prefix 格式
      if ((prefix.startsWith('track:') || prefix.startsWith('program:') || prefix.startsWith('task:') || prefix.startsWith('log:')) && prefix.includes(':')) {
        // 格式: "track:user@example.com:" or "program:user@example.com:"
        const parts = prefix.split(':');
        const type = parts[0];
        const userId = parts[1];
        gcsPrefix = `users/${userId}/${type}s/`;
      } else if (prefix.startsWith('users/')) {
        // 直接 GCS 路徑
        gcsPrefix = prefix;
      } else {
        // 其他格式
        gcsPrefix = prefix;
      }

      const [files] = await this.bucket.getFiles({
        prefix: gcsPrefix,
        maxResults: options?.limit,
      });

      console.log(`[GCS] Listing prefix: ${gcsPrefix}, found ${files.length} files`);

      // 平行讀取所有檔案
      const items = await Promise.all(
        files
          .filter(file => file.name.endsWith('.json'))
          .map(async (file) => {
            try {
              const [content] = await file.download();
              const data = JSON.parse(content.toString());
              const result = data.value || data;
              
              // Convert date strings back to Date objects
              if (result && typeof result === 'object') {
                if (result.createdAt && typeof result.createdAt === 'string') {
                  result.createdAt = new Date(result.createdAt);
                }
                if (result.updatedAt && typeof result.updatedAt === 'string') {
                  result.updatedAt = new Date(result.updatedAt);
                }
                if (result.deletedAt && typeof result.deletedAt === 'string') {
                  result.deletedAt = new Date(result.deletedAt);
                }
                if (result.startedAt && typeof result.startedAt === 'string') {
                  result.startedAt = new Date(result.startedAt);
                }
                if (result.completedAt && typeof result.completedAt === 'string') {
                  result.completedAt = new Date(result.completedAt);
                }
                if (result.timestamp && typeof result.timestamp === 'string') {
                  result.timestamp = new Date(result.timestamp);
                }
                
                // Also convert nested date fields like progress.lastActivityAt
                if (result.progress?.lastActivityAt && typeof result.progress.lastActivityAt === 'string') {
                  result.progress.lastActivityAt = new Date(result.progress.lastActivityAt);
                }
              }
              
              // Debug log for programs
              if (prefix.startsWith('program:')) {
                console.log(`[GCS] Program file ${file.name}:`, {
                  id: result.id,
                  status: result.status,
                  trackId: result.trackId,
                  type: result.type
                });
              }
              
              return result;
            } catch (err) {
              console.error(`Error reading file ${file.name}:`, err);
              return null;
            }
          })
      );

      // 過濾掉讀取失敗的項目
      let validItems = items.filter(item => item !== null) as T[];

      // 應用篩選條件
      if (options?.filter) {
        validItems = validItems.filter(item => {
          return Object.entries(options.filter!).every(([key, value]) => {
            return (item as any)[key] === value;
          });
        });
      }

      // 排序
      if (options?.orderBy) {
        const [field, direction = 'asc'] = options.orderBy.split(':');
        validItems.sort((a, b) => {
          const aVal = (a as any)[field];
          const bVal = (b as any)[field];
          const compare = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          return direction === 'desc' ? -compare : compare;
        });
      }

      // 分頁
      if (options?.offset) {
        validItems = validItems.slice(options.offset);
      }
      if (options?.limit) {
        validItems = validItems.slice(0, options.limit);
      }

      return validItems;
    } catch (error) {
      console.error(`Error listing ${prefix}:`, error);
      return [];
    }
  }

  /**
   * 批次操作
   */
  async batch(operations: BatchOperation[]): Promise<BatchResult> {
    const results: BatchResult = {
      successful: [],
      failed: []
    };

    // 使用 Promise.allSettled 執行所有操作
    const promises = operations.map(async (op) => {
      try {
        switch (op.type) {
          case 'set':
            await this.set(op.key, op.value, op.options);
            break;
          case 'delete':
            await this.delete(op.key);
            break;
          default:
            throw new Error(`Unknown operation type: ${(op as any).type}`);
        }
        results.successful.push(op.key);
      } catch (error) {
        results.failed.push({
          key: op.key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * 清除資料
   */
  async clear(prefix?: string): Promise<void> {
    try {
      let gcsPrefix: string;
      
      if (!prefix) {
        // 危險操作，需要特別小心
        console.warn('Clearing all data is a dangerous operation!');
        return;
      }

      if (prefix.includes(':')) {
        const [type, userId] = prefix.split(':').filter(Boolean);
        gcsPrefix = `users/${userId}/${type}s/`;
      } else {
        gcsPrefix = prefix;
      }

      await this.bucket.deleteFiles({
        prefix: gcsPrefix
      });
    } catch (error) {
      console.error(`Error clearing ${prefix}:`, error);
      throw error;
    }
  }

  /**
   * 獲取 metadata
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    try {
      const { userId, type, id } = this.parseKey(key);
      const filePath = this.getFilePath(userId, type, id);
      const file = this.bucket.file(filePath);
      
      const [metadata] = await file.getMetadata();
      
      return {
        size: parseInt(metadata.size || '0'),
        lastModified: new Date(metadata.updated || metadata.timeCreated),
        contentType: metadata.contentType,
        metadata: metadata.metadata
      };
    } catch (error) {
      console.error(`Error getting metadata for ${key}:`, error);
      return null;
    }
  }

  /**
   * 排程索引更新
   */
  private scheduleIndexUpdate(userId: string, type: string, data: any, deletedId?: string) {
    const key = `${type}:${userId}`;
    this.indexUpdateQueue.set(key, { userId, type, data, deletedId });
  }

  /**
   * 啟動索引更新定時器
   */
  private startIndexUpdater(interval: number) {
    this.indexUpdateTimer = setInterval(() => {
      this.processIndexUpdates().catch(console.error);
    }, interval);
  }

  /**
   * 處理索引更新
   */
  private async processIndexUpdates() {
    if (this.indexUpdateQueue.size === 0) return;

    const updates = Array.from(this.indexUpdateQueue.entries());
    this.indexUpdateQueue.clear();

    for (const [key, update] of updates) {
      try {
        await this.updateIndex(update);
      } catch (error) {
        console.error(`Error updating index for ${key}:`, error);
      }
    }
  }

  /**
   * 更新索引
   */
  private async updateIndex(update: { userId: string; type: string; data: any; deletedId?: string }) {
    // 更新用戶索引
    const userIndexPath = `indexes/users/${update.userId}/summary.json`;
    const userIndexFile = this.bucket.file(userIndexPath);
    
    try {
      // 讀取現有索引
      let index: any = {};
      const [exists] = await userIndexFile.exists();
      if (exists) {
        const [content] = await userIndexFile.download();
        index = JSON.parse(content.toString());
      }

      // 更新索引
      if (!index[update.type]) {
        index[update.type] = { count: 0, items: [] };
      }

      if (update.deletedId) {
        // 刪除項目
        index[update.type].items = index[update.type].items.filter(
          (item: any) => item.id !== update.deletedId
        );
      } else if (update.data) {
        // 新增或更新項目
        const existingIndex = index[update.type].items.findIndex(
          (item: any) => item.id === update.data.id
        );
        
        const summary = {
          id: update.data.id,
          type: update.data.type,
          status: update.data.status,
          created: update.data.created || update.data.startedAt,
          updated: update.data.updated || update.data.updatedAt,
          title: update.data.metadata?.title || update.data.title
        };

        if (existingIndex >= 0) {
          index[update.type].items[existingIndex] = summary;
        } else {
          index[update.type].items.push(summary);
        }
      }

      index[update.type].count = index[update.type].items.length;
      index.lastUpdated = new Date().toISOString();

      // 儲存更新的索引
      await userIndexFile.save(JSON.stringify(index, null, 2));
    } catch (error) {
      console.error('Error updating user index:', error);
    }

    // 更新全域索引（如按類型、狀態等）
    if (update.type === 'tracks' && update.data) {
      await this.updateGlobalTrackIndex(update.data);
    }
  }

  /**
   * 更新全域 Track 索引
   */
  private async updateGlobalTrackIndex(track: any) {
    // 按類型索引
    const typeIndexPath = `indexes/tracks/by_type/${track.type}.json`;
    const typeIndexFile = this.bucket.file(typeIndexPath);
    
    try {
      let typeIndex: any = { trackIds: [], paths: {} };
      const [exists] = await typeIndexFile.exists();
      if (exists) {
        const [content] = await typeIndexFile.download();
        typeIndex = JSON.parse(content.toString());
      }

      // 更新索引
      if (!typeIndex.trackIds.includes(track.id)) {
        typeIndex.trackIds.push(track.id);
      }
      typeIndex.paths[track.id] = `users/${track.userId}/tracks/${track.id}.json`;
      typeIndex.lastUpdated = new Date().toISOString();

      await typeIndexFile.save(JSON.stringify(typeIndex, null, 2));
    } catch (error) {
      console.error('Error updating type index:', error);
    }
  }

  /**
   * 清理資源
   */
  async dispose(): Promise<void> {
    if (this.indexUpdateTimer) {
      clearInterval(this.indexUpdateTimer);
    }
    this.indexUpdateQueue.clear();
  }
}