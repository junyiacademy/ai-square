/**
 * GCS Task Repository
 * 使用 GCS 儲存的 Task Repository 實作
 */

import { UserCentricGCSProvider } from '../../storage/providers/user-centric-gcs.provider';
import { BaseTaskRepository } from './base-task.repository';
import { ISoftDeletableTask } from '../types';

export class GCSTaskRepository extends BaseTaskRepository {
  constructor(storageProvider: UserCentricGCSProvider) {
    super(storageProvider);
  }

  /**
   * 查詢用戶的所有 Tasks
   */
  protected async queryUserTasks(userId: string): Promise<ISoftDeletableTask[]> {
    try {
      const prefix = `task:${userId}:`;
      return await this.storageProvider.list<ISoftDeletableTask>(prefix);
    } catch (error) {
      console.error('Error querying user tasks:', error);
      return [];
    }
  }

  /**
   * 更新 Program 的任務索引
   */
  protected async updateProgramTaskIndex(
    userId: string,
    programId: string,
    taskId: string
  ): Promise<void> {
    try {
      // 更新 Program 的任務列表索引
      const programTaskIndexKey = `index:program:${userId}:${programId}:tasks`;
      const programTaskIndex = await this.storageProvider.get<string[]>(programTaskIndexKey) || [];
      
      const taskKey = this.getTaskKey(userId, programId, taskId);
      if (!programTaskIndex.includes(taskKey)) {
        programTaskIndex.push(taskKey);
        await this.storageProvider.set(programTaskIndexKey, programTaskIndex);
      }

      // 更新用戶任務索引
      const userTaskIndexKey = `index:user:${userId}:tasks`;
      const userTaskIndex = await this.storageProvider.get<string[]>(userTaskIndexKey) || [];
      
      if (!userTaskIndex.includes(taskKey)) {
        userTaskIndex.push(taskKey);
        await this.storageProvider.set(userTaskIndexKey, userTaskIndex);
      }
    } catch (error) {
      console.error('Error updating task index:', error);
    }
  }

  /**
   * 獲取 Program 的所有 Tasks
   */
  async getTasksByProgram(userId: string, programId: string): Promise<ISoftDeletableTask[]> {
    try {
      const prefix = `task:${userId}:${programId}:`;
      const tasks = await this.storageProvider.list<ISoftDeletableTask>(prefix);
      return tasks.filter(task => !task.deletedAt);
    } catch (error) {
      console.error('Error getting tasks by program:', error);
      return [];
    }
  }

  /**
   * 獲取下一個可用的任務順序
   */
  async getNextTaskOrder(userId: string, programId: string): Promise<number> {
    try {
      const tasks = await this.getTasksByProgram(userId, programId);
      const maxOrder = Math.max(...tasks.map(t => t.order), 0);
      return maxOrder + 1;
    } catch (error) {
      console.error('Error getting next task order:', error);
      return 1;
    }
  }

  /**
   * 清理索引（移除已刪除的任務）
   */
  async cleanupIndex(userId: string, programId?: string): Promise<void> {
    try {
      if (programId) {
        // 清理 Program 任務索引
        const programTaskIndexKey = `index:program:${userId}:${programId}:tasks`;
        const programTaskIndex = await this.storageProvider.get<string[]>(programTaskIndexKey) || [];
        
        const validTasks = [];
        for (const taskKey of programTaskIndex) {
          const task = await this.storageProvider.get<ISoftDeletableTask>(taskKey);
          if (task && !task.deletedAt) {
            validTasks.push(taskKey);
          }
        }
        
        await this.storageProvider.set(programTaskIndexKey, validTasks);
      } else {
        // 清理用戶任務索引
        const userTaskIndexKey = `index:user:${userId}:tasks`;
        const userTaskIndex = await this.storageProvider.get<string[]>(userTaskIndexKey) || [];
        
        const validTasks = [];
        for (const taskKey of userTaskIndex) {
          const task = await this.storageProvider.get<ISoftDeletableTask>(taskKey);
          if (task && !task.deletedAt) {
            validTasks.push(taskKey);
          }
        }
        
        await this.storageProvider.set(userTaskIndexKey, validTasks);
      }
    } catch (error) {
      console.error('Error cleaning up task index:', error);
    }
  }
}