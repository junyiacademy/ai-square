/**
 * useLearningProgress Hook
 * 追蹤和顯示學習進度
 */

import { useState, useEffect, useCallback } from 'react';
import { trackService } from '../services';
import { EvaluationType } from '../types';

interface UseLearningProgressOptions {
  userId: string;
  autoLoad?: boolean;
  pollInterval?: number;
}

interface LearningProgressData {
  overall: {
    totalEvaluations: number;
    completedEvaluations: number;
    averageScore: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  byType: Record<string, {
    count: number;
    averageScore: number;
    lastEvaluation: Date;
  }>;
  recentAchievements: Array<{
    type: EvaluationType;
    score: number;
    date: Date;
    feedback: string;
  }>;
  suggestedNextSteps: string[];
  stats: {
    tracks: {
      total: number;
      active: number;
      completed: number;
      abandonmentRate: number;
    };
    evaluations: {
      total: number;
      averageScore: number;
      completionRate: number;
      scoreDistribution: Array<{
        range: string;
        count: number;
        percentage: number;
      }>;
    };
  };
}

export function useLearningProgress(
  options: UseLearningProgressOptions
): {
  progress: LearningProgressData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const { userId, autoLoad = true, pollInterval } = options;
  
  const [progress, setProgress] = useState<LearningProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 載入學習進度
   */
  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 並行載入所有資料
      const [
        learningProgress,
        trackStats,
        evaluationStats
      ] = await Promise.all([
        trackService.getLearningProgress(userId),
        trackService.getTrackStats(userId),
        trackService.getEvaluationStats(userId)
      ]);

      // 組合資料
      const progressData: LearningProgressData = {
        ...learningProgress,
        stats: {
          tracks: {
            total: trackStats.total,
            active: trackStats.active,
            completed: trackStats.completed,
            abandonmentRate: trackStats.total > 0 
              ? Math.round((trackStats.abandoned / trackStats.total) * 100)
              : 0
          },
          evaluations: {
            total: evaluationStats.totalEvaluations,
            averageScore: evaluationStats.averageScore,
            completionRate: evaluationStats.completionRate,
            scoreDistribution: evaluationStats.scoreDistribution.map(range => ({
              range: `${range.min}-${range.max}`,
              count: range.count,
              percentage: range.percentage
            }))
          }
        }
      };

      setProgress(progressData);
    } catch (err) {
      setError(err as Error);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * 刷新進度
   */
  const refresh = useCallback(async () => {
    await loadProgress();
  }, [loadProgress]);

  // 自動載入
  useEffect(() => {
    if (autoLoad) {
      loadProgress();
    }
  }, [autoLoad, loadProgress]);

  // 自動更新
  useEffect(() => {
    if (!pollInterval) return;

    const interval = setInterval(() => {
      loadProgress();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval, loadProgress]);

  return {
    progress,
    loading,
    error,
    refresh
  };
}