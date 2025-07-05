/**
 * GCS Track Repository
 * 使用用戶優先的 GCS 結構儲存 Track
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  ITrack, 
  ISoftDeletableTrack, 
  TrackType, 
  TrackStatus,
  TrackQueryOptions,
  TrackStatistics,
  CreateTrackParams,
  UpdateTrackParams
} from '../types';
import { BaseRepository } from '../../repository/base/base.repository';
import { IStorageProvider } from '../../storage/interfaces/storage.interface';

export class GCSTrackRepository extends BaseRepository<ISoftDeletableTrack> {
  protected entityName = 'track';

  constructor(storageProvider: IStorageProvider) {
    super(storageProvider, 'tracks');
  }

  /**
   * 創建新的 Track
   */
  async createTrack(params: CreateTrackParams): Promise<ISoftDeletableTrack> {
    const now = new Date();
    const track: ISoftDeletableTrack = {
      id: params.id || uuidv4(),
      userId: params.userId,
      projectId: params.projectId,
      type: params.type,
      status: TrackStatus.ACTIVE,
      startedAt: now,
      updatedAt: now,
      metadata: params.metadata || {},
      context: params.context || {},
      deletedAt: null
    };

    // 儲存到 GCS
    const key = this.getKey(track.userId, track.id);
    await this.storage.set(key, track);

    // 更新用戶的 Track 列表快取
    await this.updateUserTrackCache(track.userId);

    return track;
  }

  /**
   * 更新 Track
   */
  async updateTrack(id: string, params: UpdateTrackParams): Promise<ISoftDeletableTrack | null> {
    // 需要先找到 Track 以獲取 userId
    const track = await this.findTrackById(id);
    if (!track) {
      return null;
    }

    const updatedTrack: ISoftDeletableTrack = {
      ...track,
      ...params,
      id: track.id, // 確保 ID 不變
      userId: track.userId, // 確保 userId 不變
      updatedAt: new Date()
    };

    const key = this.getKey(track.userId, track.id);
    await this.storage.set(key, updatedTrack);

    // 更新快取
    await this.updateUserTrackCache(track.userId);

    return updatedTrack;
  }

  /**
   * 查詢 Tracks
   */
  async queryTracks(options: TrackQueryOptions): Promise<ISoftDeletableTrack[]> {
    if (!options.userId) {
      // 如果沒有指定用戶，需要使用索引
      return this.queryTracksFromIndex(options);
    }

    // 查詢特定用戶的 Tracks
    const prefix = `track:${options.userId}:`;
    const allTracks = await this.storage.list<ISoftDeletableTrack>(prefix);

    // 手動過濾結果
    const filter = this.buildFilter(options);
    let tracks = allTracks.filter(track => {
      // 檢查每個篩選條件
      for (const [key, value] of Object.entries(filter)) {
        if (key === 'deletedAt') {
          if (value === null && track.deletedAt !== null) return false;
          if (value !== null && track.deletedAt === null) return false;
        } else if ((track as any)[key] !== value) {
          return false;
        }
      }
      return true;
    });

    // 排序 - 按更新時間降序
    tracks.sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

    return tracks;
  }

  /**
   * 取得單一 Track
   */
  async getTrack(id: string): Promise<ISoftDeletableTrack | null> {
    // 先嘗試從快取找
    const cachedTrack = await this.findTrackById(id);
    return cachedTrack;
  }

  /**
   * 刪除 Track（軟刪除）
   */
  async deleteTrack(id: string): Promise<boolean> {
    const track = await this.findTrackById(id);
    if (!track) {
      return false;
    }

    track.deletedAt = new Date();
    track.status = TrackStatus.ABANDONED;

    const key = this.getKey(track.userId, track.id);
    await this.storage.set(key, track);

    // 更新快取
    await this.updateUserTrackCache(track.userId);

    return true;
  }

  /**
   * 永久刪除 Track
   */
  async permanentlyDeleteTrack(id: string): Promise<boolean> {
    const track = await this.findTrackById(id);
    if (!track) {
      return false;
    }

    const key = this.getKey(track.userId, track.id);
    await this.storage.delete(key);

    // 更新快取
    await this.updateUserTrackCache(track.userId);

    return true;
  }

  /**
   * 生命週期管理：暫停
   */
  async pauseTrack(id: string): Promise<ISoftDeletableTrack | null> {
    return this.updateTrack(id, {
      status: TrackStatus.PAUSED,
      pausedAt: new Date()
    });
  }

  /**
   * 生命週期管理：恢復
   */
  async resumeTrack(id: string): Promise<ISoftDeletableTrack | null> {
    const track = await this.getTrack(id);
    if (!track) return null;

    const updates: UpdateTrackParams = {
      status: TrackStatus.ACTIVE,
      resumedAt: new Date()
    };

    // 計算暫停時間
    if (track.pausedAt) {
      const pauseDuration = Date.now() - track.pausedAt.getTime();
      updates.totalPausedTime = (track.totalPausedTime || 0) + pauseDuration;
    }

    return this.updateTrack(id, updates);
  }

  /**
   * 生命週期管理：完成
   */
  async completeTrack(id: string): Promise<ISoftDeletableTrack | null> {
    const track = await this.getTrack(id);
    if (!track) return null;

    if (track.status === TrackStatus.COMPLETED) {
      throw new Error('Track is already completed');
    }

    return this.updateTrack(id, {
      status: TrackStatus.COMPLETED,
      completedAt: new Date()
    });
  }

  /**
   * 生命週期管理：放棄
   */
  async abandonTrack(id: string): Promise<ISoftDeletableTrack | null> {
    return this.updateTrack(id, {
      status: TrackStatus.ABANDONED,
      abandonedAt: new Date()
    });
  }

  /**
   * 統計資料
   */
  async getStatistics(userId?: string): Promise<TrackStatistics> {
    const tracks = userId 
      ? await this.queryTracks({ userId })
      : await this.queryTracksFromIndex({});

    const stats: TrackStatistics = {
      total: tracks.length,
      active: 0,
      paused: 0,
      completed: 0,
      abandoned: 0,
      byType: {
        [TrackType.PBL]: 0,
        [TrackType.ASSESSMENT]: 0,
        [TrackType.DISCOVERY]: 0,
        [TrackType.CHAT]: 0
      }
    };

    for (const track of tracks) {
      // 狀態統計
      switch (track.status) {
        case TrackStatus.ACTIVE:
          stats.active++;
          break;
        case TrackStatus.PAUSED:
          stats.paused++;
          break;
        case TrackStatus.COMPLETED:
          stats.completed++;
          break;
        case TrackStatus.ABANDONED:
          stats.abandoned++;
          break;
      }

      // 類型統計
      if (track.type in stats.byType) {
        stats.byType[track.type]++;
      }
    }

    return stats;
  }

  /**
   * 清理過期的 Tracks
   */
  async cleanupExpiredTracks(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const tracks = await this.queryTracksFromIndex({
      includeDeleted: true
    });

    let deletedCount = 0;
    for (const track of tracks) {
      if (track.deletedAt && track.deletedAt < cutoffDate) {
        await this.permanentlyDeleteTrack(track.id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Helper: 生成儲存 key
   * 格式: "track:userId:trackId"
   */
  protected getKey(userId: string, trackId: string): string {
    return `track:${userId}:${trackId}`;
  }

  /**
   * Helper: 從任意 key 找到 Track
   */
  private async findTrackById(id: string): Promise<ISoftDeletableTrack | null> {
    // 從索引查找
    const indexPath = `indexes/tracks/by_id/${id}.json`;
    try {
      const indexData = await this.storage.get<{ userId: string; path: string }>(
        `index:track:${id}`
      );
      
      if (indexData) {
        const track = await this.storage.get<ISoftDeletableTrack>(
          `track:${indexData.userId}:${id}`
        );
        return track;
      }
    } catch (error) {
      console.error('Error finding track by ID:', error);
    }

    // 降級方案：掃描所有用戶（效能差，僅作為備用）
    console.warn(`Track ${id} not found in index, falling back to scan`);
    return null;
  }

  /**
   * Helper: 從索引查詢 Tracks
   */
  private async queryTracksFromIndex(options: TrackQueryOptions): Promise<ISoftDeletableTrack[]> {
    // 這裡需要實作索引查詢邏輯
    // 暫時返回空陣列
    console.warn('Index-based query not yet implemented');
    return [];
  }

  /**
   * Helper: 建立篩選條件
   */
  private buildFilter(options: TrackQueryOptions): Record<string, any> {
    const filter: Record<string, any> = {};

    if (options.type) {
      filter.type = options.type;
    }

    if (options.status) {
      filter.status = options.status;
    }

    if (options.projectId) {
      filter.projectId = options.projectId;
    }

    if (!options.includeDeleted) {
      filter.deletedAt = null;
    }

    return filter;
  }

  /**
   * Helper: 更新用戶的 Track 快取
   */
  private async updateUserTrackCache(userId: string): Promise<void> {
    // 這裡可以實作快取邏輯
    // 例如更新用戶的 Track 列表摘要
    try {
      const tracks = await this.queryTracks({ userId });
      const summary = {
        count: tracks.length,
        active: tracks.filter(t => t.status === TrackStatus.ACTIVE).length,
        lastUpdated: new Date().toISOString()
      };
      
      await this.storage.set(
        `cache:user:${userId}:tracks`, 
        summary,
        { ttl: 300 } // 5 分鐘快取
      );
    } catch (error) {
      console.error('Error updating user track cache:', error);
    }
  }
}