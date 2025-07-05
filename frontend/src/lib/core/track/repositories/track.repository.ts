/**
 * Track Repository 實現
 * 管理學習會話的持久化和查詢
 */

import { SoftDeletableRepository } from '../../repository/base';
import { IStorageProvider } from '../../storage/interfaces';
import {
  ITrack,
  ISoftDeletableTrack,
  TrackStatus,
  TrackType,
  TrackQueryOptions,
  CreateTrackParams,
  UpdateTrackParams
} from '../types';
import { Cacheable } from '../../storage/decorators';

export class TrackRepository extends SoftDeletableRepository<ISoftDeletableTrack> {
  constructor(storage: IStorageProvider) {
    super(storage, 'tracks');
  }

  /**
   * 創建新的 Track
   */
  async createTrack(params: CreateTrackParams): Promise<ISoftDeletableTrack> {
    const now = new Date();
    
    const track: Omit<ISoftDeletableTrack, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: params.userId,
      projectId: params.projectId,
      type: params.type,
      status: TrackStatus.ACTIVE,
      startedAt: now,
      metadata: {
        language: params.metadata?.language || 'en',
        version: params.metadata?.version || '1.0.0',
        ...params.metadata
      },
      context: this.initializeContext(params.type, params.context),
      isDeleted: false,
      deletedAt: null
    };

    return await this.create(track);
  }

  /**
   * 更新 Track
   */
  async updateTrack(id: string, params: UpdateTrackParams): Promise<ISoftDeletableTrack> {
    const track = await this.findById(id);
    if (!track) {
      throw new Error(`Track ${id} not found`);
    }

    const updates: Partial<ISoftDeletableTrack> = {};

    if (params.status) {
      updates.status = params.status;
      if (params.status === TrackStatus.COMPLETED) {
        updates.completedAt = new Date();
      }
    }

    if (params.metadata) {
      updates.metadata = { ...track.metadata, ...params.metadata };
    }

    if (params.context) {
      updates.context = this.mergeContext(track.context, params.context);
    }

    return await this.update(id, updates);
  }

  /**
   * 查找用戶的活躍 Track
   */
  async findActiveTracksByUser(userId: string): Promise<ISoftDeletableTrack[]> {
    return await this.findMany({
      userId,
      status: TrackStatus.ACTIVE
    });
  }

  /**
   * 查找專案的所有 Track
   */
  async findByProject(projectId: string, options?: TrackQueryOptions): Promise<ISoftDeletableTrack[]> {
    let tracks = await this.findMany({ projectId }, {
      orderBy: 'createdAt',
      orderDirection: 'desc'
    });

    // 應用額外的過濾條件
    if (options) {
      tracks = this.applyQueryOptions(tracks, options);
    }

    return tracks;
  }

  /**
   * 查找特定類型的 Track
   */
  async findByType(type: TrackType, options?: TrackQueryOptions): Promise<ISoftDeletableTrack[]> {
    let tracks = await this.findMany({ type });

    if (options) {
      tracks = this.applyQueryOptions(tracks, options);
    }

    return tracks;
  }

  /**
   * 完成 Track
   */
  async completeTrack(id: string): Promise<ISoftDeletableTrack> {
    return await this.updateTrack(id, {
      status: TrackStatus.COMPLETED
    });
  }

  /**
   * 暫停 Track
   */
  async pauseTrack(id: string): Promise<ISoftDeletableTrack> {
    return await this.updateTrack(id, {
      status: TrackStatus.PAUSED
    });
  }

  /**
   * 恢復 Track
   */
  async resumeTrack(id: string): Promise<ISoftDeletableTrack> {
    const track = await this.findById(id);
    if (!track) {
      throw new Error(`Track ${id} not found`);
    }

    if (track.status !== TrackStatus.PAUSED) {
      throw new Error(`Track ${id} is not paused`);
    }

    return await this.updateTrack(id, {
      status: TrackStatus.ACTIVE
    });
  }

  /**
   * 放棄 Track
   */
  async abandonTrack(id: string): Promise<ISoftDeletableTrack> {
    return await this.updateTrack(id, {
      status: TrackStatus.ABANDONED
    });
  }

  /**
   * 取得 Track 統計資料
   */
  async getTrackStats(userId: string): Promise<TrackStatistics> {
    const tracks = await this.findMany({ userId });
    
    const stats: TrackStatistics = {
      total: tracks.length,
      active: 0,
      completed: 0,
      abandoned: 0,
      paused: 0,
      byType: {},
      averageDuration: 0,
      completionRate: 0
    };

    let totalDuration = 0;
    let completedCount = 0;

    for (const track of tracks) {
      // 統計狀態
      switch (track.status) {
        case TrackStatus.ACTIVE:
          stats.active++;
          break;
        case TrackStatus.COMPLETED:
          stats.completed++;
          completedCount++;
          break;
        case TrackStatus.ABANDONED:
          stats.abandoned++;
          break;
        case TrackStatus.PAUSED:
          stats.paused++;
          break;
      }

      // 統計類型
      if (!stats.byType[track.type]) {
        stats.byType[track.type] = 0;
      }
      stats.byType[track.type]++;

      // 計算持續時間
      if (track.completedAt) {
        totalDuration += track.completedAt.getTime() - track.startedAt.getTime();
      }
    }

    // 計算平均持續時間（毫秒轉分鐘）
    if (completedCount > 0) {
      stats.averageDuration = Math.round(totalDuration / completedCount / 1000 / 60);
    }

    // 計算完成率
    if (stats.total > 0) {
      stats.completionRate = Math.round((stats.completed / stats.total) * 100);
    }

    return stats;
  }

  /**
   * 清理過期的 Track
   */
  async cleanupExpiredTracks(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const tracks = await this.findAll({ includeDeleted: true });
    const toDelete = tracks.filter(track => {
      // 刪除已經軟刪除超過指定天數的
      if (track.isDeleted && track.deletedAt && track.deletedAt < cutoffDate) {
        return true;
      }
      
      // 刪除放棄超過指定天數的
      if (track.status === TrackStatus.ABANDONED && track.updatedAt < cutoffDate) {
        return true;
      }

      return false;
    });

    if (toDelete.length > 0) {
      await this.hardDeleteMany(toDelete.map(s => s.id));
    }

    return toDelete.length;
  }

  /**
   * 初始化 Context
   */
  private initializeContext(type: TrackType, partialContext: any): any {
    switch (type) {
      case TrackType.PBL:
        return {
          type: 'pbl',
          completedTaskIds: [],
          taskProgress: {},
          ...partialContext
        };
      
      case TrackType.ASSESSMENT:
        return {
          type: 'assessment',
          currentQuestionIndex: 0,
          answers: [],
          timeSpent: 0,
          settings: {
            randomizeQuestions: false,
            showFeedback: true,
            allowSkip: true
          },
          ...partialContext
        };
      
      case TrackType.DISCOVERY:
        return {
          type: 'discovery',
          completedPaths: [],
          generatedTasks: [],
          explorationHistory: [],
          ...partialContext
        };
      
      case TrackType.CHAT:
        return {
          type: 'chat',
          messages: [],
          model: 'gemini-2.5-flash',
          ...partialContext
        };
      
      default:
        throw new Error(`Unknown track type: ${type}`);
    }
  }

  /**
   * 合併 Context
   */
  private mergeContext(existing: any, updates: any): any {
    // 深度合併，但保留 type 字段
    const type = existing.type;
    const merged = { ...existing, ...updates, type };

    // 特殊處理陣列字段
    if (updates.completedTaskIds && existing.completedTaskIds) {
      merged.completedTaskIds = [...new Set([...existing.completedTaskIds, ...updates.completedTaskIds])];
    }

    if (updates.messages && existing.messages) {
      merged.messages = [...existing.messages, ...updates.messages];
    }

    return merged;
  }

  /**
   * 應用查詢選項
   */
  private applyQueryOptions(
    tracks: ISoftDeletableTrack[], 
    options: TrackQueryOptions
  ): ISoftDeletableTrack[] {
    let filtered = tracks;

    if (options.userId) {
      filtered = filtered.filter(s => s.userId === options.userId);
    }

    if (options.type) {
      filtered = filtered.filter(s => s.type === options.type);
    }

    if (options.status) {
      filtered = filtered.filter(s => s.status === options.status);
    }

    if (options.startDate) {
      filtered = filtered.filter(s => s.startedAt >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter(s => s.startedAt <= options.endDate!);
    }

    return filtered;
  }
}

/**
 * Track 統計資料
 */
interface TrackStatistics {
  total: number;
  active: number;
  completed: number;
  abandoned: number;
  paused: number;
  byType: Record<string, number>;
  averageDuration: number; // minutes
  completionRate: number; // percentage
}