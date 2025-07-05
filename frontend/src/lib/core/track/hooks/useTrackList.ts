/**
 * useTrackList Hook
 * 管理 Track 列表的查詢和操作
 */

import { useState, useEffect, useCallback } from 'react';
import { trackService } from '../services';
import {
  ISoftDeletableTrack,
  TrackQueryOptions,
  CreateTrackParams
} from '../types';

interface UseTrackListOptions extends TrackQueryOptions {
  autoLoad?: boolean;
  pollInterval?: number;
}

interface UseTrackListReturn {
  tracks: ISoftDeletableTrack[];
  loading: boolean;
  error: Error | null;
  
  // 操作方法
  loadTracks: () => Promise<void>;
  createTrack: (params: CreateTrackParams) => Promise<ISoftDeletableTrack>;
  deleteTrack: (id: string) => Promise<void>;
  refreshTracks: () => Promise<void>;
  
  // 統計資料
  stats: TrackListStats | null;
}

interface TrackListStats {
  total: number;
  active: number;
  completed: number;
  abandoned: number;
  paused: number;
}

export function useTrackList(
  options: UseTrackListOptions = {}
): UseTrackListReturn {
  const { autoLoad = true, pollInterval, ...queryOptions } = options;
  
  const [tracks, setTracks] = useState<ISoftDeletableTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<TrackListStats | null>(null);

  /**
   * 載入 Tracks
   */
  const loadTracks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const loadedTracks = await trackService.queryTracks(queryOptions);
      setTracks(loadedTracks);
      
      // 計算統計資料
      const newStats: TrackListStats = {
        total: loadedTracks.length,
        active: loadedTracks.filter(s => s.status === 'active').length,
        completed: loadedTracks.filter(s => s.status === 'completed').length,
        abandoned: loadedTracks.filter(s => s.status === 'abandoned').length,
        paused: loadedTracks.filter(s => s.status === 'paused').length
      };
      setStats(newStats);
    } catch (err) {
      setError(err as Error);
      setTracks([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [queryOptions]);

  /**
   * 創建新 Track
   */
  const createTrack = useCallback(async (params: CreateTrackParams) => {
    setError(null);
    
    try {
      const newTrack = await trackService.createTrack(params);
      
      // 重新載入列表
      await loadTracks();
      
      return newTrack;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [loadTracks]);

  /**
   * 刪除 Track
   */
  const deleteTrack = useCallback(async (id: string) => {
    setError(null);
    
    try {
      const track = await trackService.getTrack(id);
      if (track) {
        // 使用軟刪除
        await trackService.updateTrack(id, {
          status: 'abandoned' as any
        });
      }
      
      // 重新載入列表
      await loadTracks();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [loadTracks]);

  /**
   * 刷新 Tracks
   */
  const refreshTracks = useCallback(async () => {
    await loadTracks();
  }, [loadTracks]);

  // 自動載入
  useEffect(() => {
    if (autoLoad) {
      loadTracks();
    }
  }, [autoLoad, loadTracks]);

  // 自動更新
  useEffect(() => {
    if (!pollInterval) return;

    const interval = setInterval(() => {
      loadTracks();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval, loadTracks]);

  return {
    tracks,
    loading,
    error,
    loadTracks,
    createTrack,
    deleteTrack,
    refreshTracks,
    stats
  };
}