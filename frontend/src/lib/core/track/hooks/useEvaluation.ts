/**
 * useEvaluation Hook
 * 管理評估的狀態和操作
 */

import { useState, useEffect, useCallback } from 'react';
import { trackService } from '../services';
import {
  ISoftDeletableEvaluation,
  CreateEvaluationParams,
  EvaluationFeedback,
  EvaluationStatus,
  EvaluationType
} from '../types';

interface UseEvaluationOptions {
  trackId?: string;
  autoLoad?: boolean;
}

interface UseEvaluationReturn {
  evaluations: ISoftDeletableEvaluation[];
  latestEvaluation: ISoftDeletableEvaluation | null;
  loading: boolean;
  error: Error | null;
  
  // 操作方法
  createEvaluation: (params: Omit<CreateEvaluationParams, 'trackId'>) => Promise<ISoftDeletableEvaluation>;
  startEvaluation: (evaluationId: string) => Promise<void>;
  completeEvaluation: (evaluationId: string, score: number, feedback: EvaluationFeedback) => Promise<void>;
  loadEvaluations: () => Promise<void>;
  
  // 統計資料
  stats: EvaluationStats | null;
}

interface EvaluationStats {
  total: number;
  averageScore: number;
  completed: number;
  pending: number;
  failed: number;
}

export function useEvaluation(
  options: UseEvaluationOptions = {}
): UseEvaluationReturn {
  const { trackId, autoLoad = true } = options;
  
  const [evaluations, setEvaluations] = useState<ISoftDeletableEvaluation[]>([]);
  const [latestEvaluation, setLatestEvaluation] = useState<ISoftDeletableEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<EvaluationStats | null>(null);

  /**
   * 載入評估
   */
  const loadEvaluations = useCallback(async () => {
    if (!trackId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const loadedEvaluations = await trackService.getTrackEvaluations(trackId);
      const latest = await trackService.getLatestEvaluation(trackId);
      
      setEvaluations(loadedEvaluations);
      setLatestEvaluation(latest);
      
      // 計算統計資料
      if (loadedEvaluations.length > 0) {
        const completedEvals = loadedEvaluations.filter(e => e.status === EvaluationStatus.COMPLETED);
        const totalScore = completedEvals.reduce((sum, e) => sum + e.percentage, 0);
        
        setStats({
          total: loadedEvaluations.length,
          averageScore: completedEvals.length > 0 ? Math.round(totalScore / completedEvals.length) : 0,
          completed: completedEvals.length,
          pending: loadedEvaluations.filter(e => e.status === EvaluationStatus.PENDING).length,
          failed: loadedEvaluations.filter(e => e.status === EvaluationStatus.FAILED).length
        });
      } else {
        setStats(null);
      }
    } catch (err) {
      setError(err as Error);
      setEvaluations([]);
      setLatestEvaluation(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  /**
   * 創建評估
   */
  const createEvaluation = useCallback(async (
    params: Omit<CreateEvaluationParams, 'trackId'>
  ) => {
    if (!trackId) {
      throw new Error('Track ID is required');
    }
    
    setError(null);
    
    try {
      const newEvaluation = await trackService.createEvaluation({
        ...params,
        trackId
      });
      
      // 重新載入列表
      await loadEvaluations();
      
      return newEvaluation;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [trackId, loadEvaluations]);

  /**
   * 開始評估
   */
  const startEvaluation = useCallback(async (evaluationId: string) => {
    setError(null);
    
    try {
      await trackService.startEvaluation(evaluationId);
      
      // 重新載入列表
      await loadEvaluations();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [loadEvaluations]);

  /**
   * 完成評估
   */
  const completeEvaluation = useCallback(async (
    evaluationId: string,
    score: number,
    feedback: EvaluationFeedback
  ) => {
    setError(null);
    
    try {
      await trackService.completeEvaluation(evaluationId, score, feedback);
      
      // 重新載入列表
      await loadEvaluations();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [loadEvaluations]);

  // 自動載入
  useEffect(() => {
    if (trackId && autoLoad) {
      loadEvaluations();
    }
  }, [trackId, autoLoad, loadEvaluations]);

  return {
    evaluations,
    latestEvaluation,
    loading,
    error,
    createEvaluation,
    startEvaluation,
    completeEvaluation,
    loadEvaluations,
    stats
  };
}