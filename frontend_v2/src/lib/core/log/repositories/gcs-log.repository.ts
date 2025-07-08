/**
 * GCS Log Repository
 * 使用 GCS 儲存的 Log Repository 實作
 */

import { UserCentricGCSProvider } from '../../storage/providers/user-centric-gcs.provider';
import { BaseLogRepository } from './base-log.repository';
import { ISoftDeletableLog } from '../types';

export class GCSLogRepository extends BaseLogRepository {
  constructor(storageProvider: UserCentricGCSProvider) {
    super(storageProvider);
  }

  /**
   * 查詢用戶的所有 Logs
   */
  protected async queryUserLogs(userId: string): Promise<ISoftDeletableLog[]> {
    try {
      const prefix = `log:${userId}:`;
      return await this.storageProvider.list<ISoftDeletableLog>(prefix);
    } catch (error) {
      console.error('Error querying user logs:', error);
      return [];
    }
  }

  /**
   * 查詢 Program 的所有 Logs
   */
  protected async queryProgramLogs(userId: string, programId: string): Promise<ISoftDeletableLog[]> {
    try {
      const prefix = `log:${userId}:${programId}:`;
      return await this.storageProvider.list<ISoftDeletableLog>(prefix);
    } catch (error) {
      console.error('Error querying program logs:', error);
      return [];
    }
  }

  /**
   * 更新 Log 索引
   */
  protected async updateLogIndex(
    userId: string,
    programId: string,
    taskId: string,
    logId: string
  ): Promise<void> {
    try {
      // 更新用戶日誌索引
      const userLogIndexKey = `index:user:${userId}:logs`;
      const userLogIndex = await this.storageProvider.get<string[]>(userLogIndexKey) || [];
      
      const logKey = `log:${userId}:${programId}:${taskId}:${logId}`;
      if (!userLogIndex.includes(logKey)) {
        userLogIndex.push(logKey);
        await this.storageProvider.set(userLogIndexKey, userLogIndex);
      }

      // 更新 Program 日誌索引
      const programLogIndexKey = `index:program:${userId}:${programId}:logs`;
      const programLogIndex = await this.storageProvider.get<string[]>(programLogIndexKey) || [];
      
      if (!programLogIndex.includes(logKey)) {
        programLogIndex.push(logKey);
        await this.storageProvider.set(programLogIndexKey, programLogIndex);
      }

      // 更新 Task 日誌索引
      const taskLogIndexKey = `index:task:${userId}:${programId}:${taskId}:logs`;
      const taskLogIndex = await this.storageProvider.get<string[]>(taskLogIndexKey) || [];
      
      if (!taskLogIndex.includes(logKey)) {
        taskLogIndex.push(logKey);
        await this.storageProvider.set(taskLogIndexKey, taskLogIndex);
      }
    } catch (error) {
      console.error('Error updating log index:', error);
    }
  }

  /**
   * 清理索引（移除已刪除的日誌）
   */
  async cleanupIndex(userId: string, programId?: string, taskId?: string): Promise<void> {
    try {
      if (taskId && programId) {
        // 清理 Task 日誌索引
        const taskLogIndexKey = `index:task:${userId}:${programId}:${taskId}:logs`;
        const taskLogIndex = await this.storageProvider.get<string[]>(taskLogIndexKey) || [];
        
        const validLogs = [];
        for (const logKey of taskLogIndex) {
          const log = await this.storageProvider.get<ISoftDeletableLog>(logKey);
          if (log && !log.deletedAt) {
            validLogs.push(logKey);
          }
        }
        
        await this.storageProvider.set(taskLogIndexKey, validLogs);
      } else if (programId) {
        // 清理 Program 日誌索引
        const programLogIndexKey = `index:program:${userId}:${programId}:logs`;
        const programLogIndex = await this.storageProvider.get<string[]>(programLogIndexKey) || [];
        
        const validLogs = [];
        for (const logKey of programLogIndex) {
          const log = await this.storageProvider.get<ISoftDeletableLog>(logKey);
          if (log && !log.deletedAt) {
            validLogs.push(logKey);
          }
        }
        
        await this.storageProvider.set(programLogIndexKey, validLogs);
      } else {
        // 清理用戶日誌索引
        const userLogIndexKey = `index:user:${userId}:logs`;
        const userLogIndex = await this.storageProvider.get<string[]>(userLogIndexKey) || [];
        
        const validLogs = [];
        for (const logKey of userLogIndex) {
          const log = await this.storageProvider.get<ISoftDeletableLog>(logKey);
          if (log && !log.deletedAt) {
            validLogs.push(logKey);
          }
        }
        
        await this.storageProvider.set(userLogIndexKey, validLogs);
      }
    } catch (error) {
      console.error('Error cleaning up log index:', error);
    }
  }
}