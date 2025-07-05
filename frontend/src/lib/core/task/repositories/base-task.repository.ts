/**
 * Base Task Repository
 * Task 的基礎儲存庫實作
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from '../../repository/base/base.repository';
import { IStorageProvider } from '../../storage/interfaces/storage.interface';
import {
  ITask,
  ISoftDeletableTask,
  TaskType,
  TaskStatus,
  TaskQueryOptions,
  TaskStatistics,
  CreateTaskParams,
  UpdateTaskParams,
  TaskProgress
} from '../types';

export abstract class BaseTaskRepository<T extends ISoftDeletableTask = ISoftDeletableTask> 
  extends BaseRepository<T> {
  
  protected entityName = 'task';

  constructor(protected storageProvider: IStorageProvider) {
    super(storageProvider, 'tasks');
  }

  /**
   * 創建 Task
   */
  async create(params: CreateTaskParams): Promise<T> {
    const now = new Date();
    const task = {
      id: uuidv4(),
      ...params,
      status: TaskStatus.NOT_STARTED,
      createdAt: now,
      updatedAt: now,
      progress: {
        attempts: 0,
        timeSpent: 0,
        hintsUsed: 0,
        completed: false,
        lastActivityAt: now
      },
      deletedAt: null
    } as T;

    const key = this.getTaskKey(params.userId, params.programId, task.id);
    await this.storageProvider.set(key, task);

    // 更新 Program 的任務列表索引
    await this.updateProgramTaskIndex(params.userId, params.programId, task.id);

    return task;
  }

  /**
   * 批量創建 Tasks
   */
  async createBatch(paramsList: CreateTaskParams[]): Promise<T[]> {
    const tasks = await Promise.all(
      paramsList.map(params => this.create(params))
    );
    return tasks;
  }

  /**
   * 更新 Task
   */
  async updateTask(
    userId: string, 
    programId: string, 
    taskId: string, 
    updates: UpdateTaskParams
  ): Promise<T | null> {
    const task = await this.getByIds(userId, programId, taskId);
    if (!task) {
      return null;
    }

    const updatedTask: T = {
      ...task,
      ...updates,
      metadata: updates.metadata ? { ...task.metadata, ...updates.metadata } : task.metadata,
      config: updates.config ? { ...task.config, ...updates.config } : task.config,
      progress: updates.progress ? { ...task.progress, ...updates.progress } : task.progress,
      updatedAt: new Date()
    };

    const key = this.getTaskKey(userId, programId, taskId);
    await this.storageProvider.set(key, updatedTask);

    return updatedTask;
  }

  /**
   * 查詢 Tasks
   */
  async query(options: TaskQueryOptions): Promise<T[]> {
    let tasks: T[] = [];

    if (options.programId && options.userId) {
      // 查詢特定 Program 的 Tasks
      const prefix = `task:${options.userId}:${options.programId}:`;
      tasks = await this.storageProvider.list<T>(prefix);
    } else if (options.userId) {
      // 查詢用戶的所有 Tasks（需要索引）
      tasks = await this.queryUserTasks(options.userId);
    } else {
      throw new Error('Either userId or (userId + programId) is required');
    }

    // 應用篩選
    if (options.type) {
      tasks = tasks.filter(t => t.type === options.type);
    }
    if (options.status) {
      tasks = tasks.filter(t => t.status === options.status);
    }
    if (!options.includeDeleted) {
      tasks = tasks.filter(t => !t.deletedAt);
    }

    // 排序（預設按 order）
    const [sortField, sortOrder] = (options.orderBy || 'order:asc').split(':');
    tasks.sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      const compare = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'desc' ? -compare : compare;
    });

    // 分頁
    if (options.offset) {
      tasks = tasks.slice(options.offset);
    }
    if (options.limit) {
      tasks = tasks.slice(0, options.limit);
    }

    return tasks;
  }

  /**
   * 開始 Task
   */
  async start(userId: string, programId: string, taskId: string): Promise<T | null> {
    const task = await this.getByIds(userId, programId, taskId);
    if (!task) {
      return null;
    }

    if (task.status !== TaskStatus.NOT_STARTED) {
      throw new Error('Task already started');
    }

    return this.updateTask(userId, programId, taskId, {
      status: TaskStatus.IN_PROGRESS,
      startedAt: new Date(),
      progress: {
        ...task.progress,
        lastActivityAt: new Date()
      }
    });
  }

  /**
   * 完成 Task
   */
  async complete(
    userId: string, 
    programId: string, 
    taskId: string,
    score?: number
  ): Promise<T | null> {
    const task = await this.getByIds(userId, programId, taskId);
    if (!task) {
      return null;
    }

    if (task.status === TaskStatus.COMPLETED) {
      throw new Error('Task already completed');
    }

    return this.updateTask(userId, programId, taskId, {
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
      progress: {
        ...task.progress,
        completed: true,
        score,
        lastActivityAt: new Date()
      }
    });
  }

  /**
   * 跳過 Task
   */
  async skip(userId: string, programId: string, taskId: string): Promise<T | null> {
    const task = await this.getByIds(userId, programId, taskId);
    if (!task) {
      return null;
    }

    if (!task.config.allowSkip) {
      throw new Error('Task cannot be skipped');
    }

    return this.updateTask(userId, programId, taskId, {
      status: TaskStatus.SKIPPED,
      progress: {
        ...task.progress,
        lastActivityAt: new Date()
      }
    });
  }

  /**
   * 更新進度
   */
  async updateProgress(
    userId: string,
    programId: string,
    taskId: string,
    progress: Partial<TaskProgress>
  ): Promise<T | null> {
    const task = await this.getByIds(userId, programId, taskId);
    if (!task) {
      return null;
    }

    // 增加嘗試次數
    if (progress.attempts !== undefined) {
      progress.attempts = task.progress.attempts + 1;
    }

    // 累加時間
    if (progress.timeSpent !== undefined) {
      progress.timeSpent = task.progress.timeSpent + progress.timeSpent;
    }

    return this.updateTask(userId, programId, taskId, {
      progress: {
        ...task.progress,
        ...progress,
        lastActivityAt: new Date()
      }
    });
  }

  /**
   * 使用提示
   */
  async useHint(userId: string, programId: string, taskId: string): Promise<T | null> {
    const task = await this.getByIds(userId, programId, taskId);
    if (!task) {
      return null;
    }

    if (!task.config.showHints) {
      throw new Error('Hints not available for this task');
    }

    return this.updateTask(userId, programId, taskId, {
      progress: {
        ...task.progress,
        hintsUsed: task.progress.hintsUsed + 1,
        lastActivityAt: new Date()
      }
    });
  }

  /**
   * 獲取統計資料
   */
  async getStatistics(userId?: string, programId?: string): Promise<TaskStatistics> {
    const tasks = await this.query({ userId, programId, includeDeleted: false });
    
    const stats: TaskStatistics = {
      total: tasks.length,
      byType: {} as Record<TaskType, number>,
      byStatus: {} as Record<TaskStatus, number>,
      averageScore: 0,
      averageTimeSpent: 0,
      averageAttempts: 0
    };

    // 初始化計數器
    Object.values(TaskType).forEach(type => {
      stats.byType[type as TaskType] = 0;
    });
    Object.values(TaskStatus).forEach(status => {
      stats.byStatus[status as TaskStatus] = 0;
    });

    let totalScore = 0;
    let totalTimeSpent = 0;
    let totalAttempts = 0;
    let scoredTasks = 0;

    for (const task of tasks) {
      // 類型統計
      stats.byType[task.type]++;
      
      // 狀態統計
      stats.byStatus[task.status]++;
      
      // 分數統計
      if (task.progress.score !== undefined) {
        totalScore += task.progress.score;
        scoredTasks++;
      }
      
      // 時間統計
      totalTimeSpent += task.progress.timeSpent;
      
      // 嘗試次數統計
      totalAttempts += task.progress.attempts;
    }

    stats.averageScore = scoredTasks > 0 ? totalScore / scoredTasks : 0;
    stats.averageTimeSpent = tasks.length > 0 ? totalTimeSpent / tasks.length : 0;
    stats.averageAttempts = tasks.length > 0 ? totalAttempts / tasks.length : 0;

    return stats;
  }

  /**
   * 軟刪除
   */
  async softDelete(userId: string, programId: string, taskId: string): Promise<boolean> {
    const task = await this.getByIds(userId, programId, taskId);
    if (!task) {
      return false;
    }

    task.deletedAt = new Date();
    const key = this.getTaskKey(userId, programId, taskId);
    await this.storageProvider.set(key, task);

    return true;
  }

  /**
   * Helper: 生成儲存 key
   */
  protected getTaskKey(userId: string, programId: string, taskId: string): string {
    return `task:${userId}:${programId}:${taskId}`;
  }

  /**
   * Helper: 根據 IDs 獲取 Task
   */
  protected async getByIds(userId: string, programId: string, taskId: string): Promise<T | null> {
    const key = this.getTaskKey(userId, programId, taskId);
    return this.storageProvider.get<T>(key);
  }

  /**
   * Helper: 查詢用戶的所有 Tasks（需要子類實作）
   */
  protected abstract queryUserTasks(userId: string): Promise<T[]>;

  /**
   * Helper: 更新 Program 的任務索引（需要子類實作）
   */
  protected abstract updateProgramTaskIndex(
    userId: string, 
    programId: string, 
    taskId: string
  ): Promise<void>;
}