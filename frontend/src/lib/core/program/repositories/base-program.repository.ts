/**
 * Base Program Repository
 * Program 的基礎儲存庫實作
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from '../../repository/base/base.repository';
import { IStorageProvider } from '../../storage/interfaces/storage.interface';
import {
  IProgram,
  ISoftDeletableProgram,
  ProgramType,
  ProgramStatus,
  ProgramQueryOptions,
  ProgramStatistics,
  CreateProgramParams,
  UpdateProgramParams,
  ProgramProgress
} from '../types';

export abstract class BaseProgramRepository<T extends ISoftDeletableProgram = ISoftDeletableProgram> 
  extends BaseRepository<T> {
  
  protected entityName = 'program';

  constructor(protected storageProvider: IStorageProvider) {
    super(storageProvider, 'programs');
  }

  /**
   * 創建 Program
   */
  async create(params: CreateProgramParams): Promise<T> {
    const now = new Date();
    const program = {
      id: uuidv4(),
      ...params,
      status: ProgramStatus.NOT_STARTED,
      createdAt: now,
      updatedAt: now,
      progress: {
        totalTasks: 0,
        completedTasks: 0,
        timeSpent: 0,
        lastActivityAt: now
      },
      deletedAt: null
    } as T;

    const key = this.getProgramKey(params.userId, program.id);
    await this.storageProvider.set(key, program);

    return program;
  }

  /**
   * 更新 Program
   */
  async updateProgram(userId: string, programId: string, updates: UpdateProgramParams): Promise<T | null> {
    const program = await this.getByUserAndId(userId, programId);
    if (!program) {
      return null;
    }

    const updatedProgram: T = {
      ...program,
      ...updates,
      metadata: updates.metadata ? { ...program.metadata, ...updates.metadata } : program.metadata,
      config: updates.config ? { ...program.config, ...updates.config } : program.config,
      progress: updates.progress ? { ...program.progress, ...updates.progress } : program.progress,
      updatedAt: new Date()
    };

    const key = this.getProgramKey(userId, programId);
    await this.storageProvider.set(key, updatedProgram);

    return updatedProgram;
  }

  /**
   * 查詢 Programs
   */
  async query(options: ProgramQueryOptions): Promise<T[]> {
    if (!options.userId && !options.trackId) {
      throw new Error('Either userId or trackId is required for query');
    }

    let programs: T[] = [];

    if (options.userId) {
      const prefix = `program:${options.userId}:`;
      programs = await this.storageProvider.list<T>(prefix);
      
      // If trackId is also provided, filter by it
      if (options.trackId) {
        programs = programs.filter(p => p.trackId === options.trackId);
      }
    } else if (options.trackId) {
      // 需要從索引查詢
      programs = await this.queryByTrackId(options.trackId);
    }

    // 應用篩選
    if (options.type) {
      programs = programs.filter(p => p.type === options.type);
    }
    if (options.status) {
      programs = programs.filter(p => p.status === options.status);
    }
    if (!options.includeDeleted) {
      programs = programs.filter(p => !p.deletedAt);
    }

    // 排序
    programs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // 分頁
    if (options.offset) {
      programs = programs.slice(options.offset);
    }
    if (options.limit) {
      programs = programs.slice(0, options.limit);
    }

    return programs;
  }

  /**
   * 開始 Program
   */
  async start(userId: string, programId: string): Promise<T | null> {
    const program = await this.getByUserAndId(userId, programId);
    if (!program) {
      return null;
    }

    if (program.status !== ProgramStatus.NOT_STARTED) {
      throw new Error('Program already started');
    }

    return this.updateProgram(userId, programId, {
      status: ProgramStatus.IN_PROGRESS,
      startedAt: new Date()
    });
  }

  /**
   * 暫停 Program
   */
  async pause(userId: string, programId: string): Promise<T | null> {
    const program = await this.getByUserAndId(userId, programId);
    if (!program) {
      return null;
    }

    if (program.status !== ProgramStatus.IN_PROGRESS) {
      throw new Error('Only in-progress programs can be paused');
    }

    return this.updateProgram(userId, programId, {
      status: ProgramStatus.PAUSED
    });
  }

  /**
   * 恢復 Program
   */
  async resume(userId: string, programId: string): Promise<T | null> {
    const program = await this.getByUserAndId(userId, programId);
    if (!program) {
      return null;
    }

    if (program.status !== ProgramStatus.PAUSED) {
      throw new Error('Only paused programs can be resumed');
    }

    return this.updateProgram(userId, programId, {
      status: ProgramStatus.IN_PROGRESS
    });
  }

  /**
   * 完成 Program
   */
  async complete(userId: string, programId: string): Promise<T | null> {
    const program = await this.getByUserAndId(userId, programId);
    if (!program) {
      return null;
    }

    if (program.status === ProgramStatus.COMPLETED) {
      throw new Error('Program already completed');
    }

    return this.updateProgram(userId, programId, {
      status: ProgramStatus.COMPLETED,
      completedAt: new Date()
    });
  }

  /**
   * 放棄 Program
   */
  async abandon(userId: string, programId: string): Promise<T | null> {
    const program = await this.getByUserAndId(userId, programId);
    if (!program) {
      return null;
    }

    if (program.status === ProgramStatus.COMPLETED) {
      throw new Error('Cannot abandon completed program');
    }

    return this.updateProgram(userId, programId, {
      status: ProgramStatus.ABANDONED
    });
  }

  /**
   * 更新進度
   */
  async updateProgress(
    userId: string, 
    programId: string, 
    progress: Partial<ProgramProgress>
  ): Promise<T | null> {
    const program = await this.getByUserAndId(userId, programId);
    if (!program) {
      return null;
    }

    return this.updateProgram(userId, programId, {
      progress: {
        ...program.progress,
        ...progress,
        lastActivityAt: new Date()
      }
    });
  }

  /**
   * 獲取統計資料
   */
  async getStatistics(userId?: string): Promise<ProgramStatistics> {
    const programs = await this.query({ userId, includeDeleted: false });
    
    const stats: ProgramStatistics = {
      total: programs.length,
      byType: {
        [ProgramType.PBL]: 0,
        [ProgramType.ASSESSMENT]: 0,
        [ProgramType.DISCOVERY]: 0,
        [ProgramType.CHAT]: 0
      },
      byStatus: {
        [ProgramStatus.NOT_STARTED]: 0,
        [ProgramStatus.IN_PROGRESS]: 0,
        [ProgramStatus.PAUSED]: 0,
        [ProgramStatus.COMPLETED]: 0,
        [ProgramStatus.ABANDONED]: 0
      },
      averageCompletionRate: 0,
      averageTimeSpent: 0
    };

    let totalCompletionRate = 0;
    let totalTimeSpent = 0;
    let completedCount = 0;

    for (const program of programs) {
      // 類型統計
      stats.byType[program.type]++;
      
      // 狀態統計
      stats.byStatus[program.status]++;
      
      // 完成率
      if (program.progress.totalTasks > 0) {
        totalCompletionRate += (program.progress.completedTasks / program.progress.totalTasks) * 100;
      }
      
      // 時間統計
      if (program.status === ProgramStatus.COMPLETED && program.progress.timeSpent > 0) {
        totalTimeSpent += program.progress.timeSpent;
        completedCount++;
      }
    }

    stats.averageCompletionRate = programs.length > 0 ? totalCompletionRate / programs.length : 0;
    stats.averageTimeSpent = completedCount > 0 ? totalTimeSpent / completedCount : 0;

    return stats;
  }

  /**
   * 軟刪除
   */
  async softDelete(userId: string, programId: string): Promise<boolean> {
    const program = await this.getByUserAndId(userId, programId);
    if (!program) {
      return false;
    }

    program.deletedAt = new Date();
    const key = this.getProgramKey(userId, programId);
    await this.storageProvider.set(key, program);

    return true;
  }

  /**
   * Helper: 生成儲存 key
   */
  protected getProgramKey(userId: string, programId: string): string {
    return `program:${userId}:${programId}`;
  }

  /**
   * Helper: 根據用戶和 ID 獲取 Program
   */
  protected async getByUserAndId(userId: string, programId: string): Promise<T | null> {
    const key = this.getProgramKey(userId, programId);
    return this.storageProvider.get<T>(key);
  }

  /**
   * Helper: 根據 Track ID 查詢（需要子類實作）
   */
  protected abstract queryByTrackId(trackId: string): Promise<T[]>;
}