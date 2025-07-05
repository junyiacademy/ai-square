/**
 * useTrack Hook
 * 管理單一 Track 的狀態和操作
 */

import { useState, useEffect, useCallback } from 'react';
import { trackService } from '../services';
import {
  ISoftDeletableTrack,
  TrackStatus,
  UpdateTrackParams
} from '../types';

interface UseTrackOptions {
  autoLoad?: boolean;
  pollInterval?: number; // 自動更新間隔（毫秒）
}

interface UseTrackReturn {
  track: ISoftDeletableTrack | null;
  loading: boolean;
  error: Error | null;
  
  // 操作方法
  loadTrack: (id: string) => Promise<void>;
  updateTrack: (params: UpdateTrackParams) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  completeTrack: () => Promise<void>;
  abandonTrack: () => Promise<void>;
  
  // 狀態檢查
  isActive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isAbandoned: boolean;
}

export function useTrack(
  trackId?: string,
  options: UseTrackOptions = {}
): UseTrackReturn {
  const { autoLoad = true, pollInterval } = options;
  
  const [track, setTrack] = useState<ISoftDeletableTrack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 載入 Track
   */
  const loadTrack = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const loadedTrack = await trackService.getTrack(id);
      setTrack(loadedTrack);
    } catch (err) {
      setError(err as Error);
      setTrack(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 更新 Track
   */
  const updateTrack = useCallback(async (params: UpdateTrackParams) => {
    if (!track) return;
    
    setError(null);
    
    try {
      const updated = await trackService.updateTrack(track.id, params);
      setTrack(updated);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [track]);

  /**
   * 暫停 Track
   */
  const pauseTrack = useCallback(async () => {
    if (!track) return;
    
    setError(null);
    
    try {
      const updated = await trackService.pauseTrack(track.id);
      setTrack(updated);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [track]);

  /**
   * 恢復 Track
   */
  const resumeTrack = useCallback(async () => {
    if (!track) return;
    
    setError(null);
    
    try {
      const updated = await trackService.resumeTrack(track.id);
      setTrack(updated);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [track]);

  /**
   * 完成 Track
   */
  const completeTrack = useCallback(async () => {
    if (!track) return;
    
    setError(null);
    
    try {
      const updated = await trackService.completeTrack(track.id);
      setTrack(updated);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [track]);

  /**
   * 放棄 Track
   */
  const abandonTrack = useCallback(async () => {
    if (!track) return;
    
    setError(null);
    
    try {
      const updated = await trackService.abandonTrack(track.id);
      setTrack(updated);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [track]);

  // 自動載入
  useEffect(() => {
    if (trackId && autoLoad) {
      loadTrack(trackId);
    }
  }, [trackId, autoLoad, loadTrack]);

  // 自動更新
  useEffect(() => {
    if (!pollInterval || !trackId) return;

    const interval = setInterval(() => {
      loadTrack(trackId);
    }, pollInterval);

    return () => clearInterval(interval);
  }, [trackId, pollInterval, loadTrack]);

  // 狀態檢查
  const isActive = track?.status === TrackStatus.ACTIVE;
  const isPaused = track?.status === TrackStatus.PAUSED;
  const isCompleted = track?.status === TrackStatus.COMPLETED;
  const isAbandoned = track?.status === TrackStatus.ABANDONED;

  return {
    track,
    loading,
    error,
    loadTrack,
    updateTrack,
    pauseTrack,
    resumeTrack,
    completeTrack,
    abandonTrack,
    isActive,
    isPaused,
    isCompleted,
    isAbandoned
  };
}