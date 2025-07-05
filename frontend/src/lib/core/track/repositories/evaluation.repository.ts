/**
 * Evaluation Repository 實現
 * 管理評估結果的持久化和查詢
 */

import { SoftDeletableRepository } from '../../repository/base';
import { IStorageProvider } from '../../storage/interfaces';
import {
  IEvaluation,
  ISoftDeletableEvaluation,
  EvaluationType,
  EvaluationStatus,
  EvaluationQueryOptions,
  CreateEvaluationParams,
  UpdateEvaluationParams,
  EvaluationStatistics,
  ScoreRange,
  EvaluationFeedback
} from '../types';
// Removed decorator imports - decorators not supported in current setup

export class EvaluationRepository extends SoftDeletableRepository<ISoftDeletableEvaluation> {
  constructor(storage: IStorageProvider) {
    super(storage, 'evaluations');
  }

  /**
   * 創建新的 Evaluation
   */
  async createEvaluation(params: CreateEvaluationParams): Promise<ISoftDeletableEvaluation> {
    const now = new Date();
    
    const evaluation: Omit<ISoftDeletableEvaluation, 'id' | 'createdAt' | 'updatedAt'> = {
      trackId: params.trackId,
      userId: params.userId,
      type: params.type,
      status: EvaluationStatus.PENDING,
      score: 0,
      maxScore: 100,
      percentage: 0,
      startedAt: now,
      evaluationData: this.initializeEvaluationData(params.type, params.evaluationData),
      feedback: this.initializeFeedback(),
      metadata: {
        evaluationEngine: 'ai-square-eval',
        engineVersion: '1.0.0',
        language: params.metadata?.language || 'en',
        ...params.metadata
      },
      isDeleted: false,
      deletedAt: null
    };

    return await this.create(evaluation);
  }

  /**
   * 更新 Evaluation
   */
  async updateEvaluation(id: string, params: UpdateEvaluationParams): Promise<ISoftDeletableEvaluation> {
    const evaluation = await this.findById(id);
    if (!evaluation) {
      throw new Error(`Evaluation ${id} not found`);
    }

    const updates: Partial<ISoftDeletableEvaluation> = {};

    if (params.status) {
      updates.status = params.status;
    }

    if (params.score !== undefined) {
      updates.score = params.score;
      updates.percentage = Math.round((params.score / evaluation.maxScore) * 100);
    }

    if (params.feedback) {
      updates.feedback = { ...evaluation.feedback, ...params.feedback };
    }

    if (params.evaluationData) {
      updates.evaluationData = { ...evaluation.evaluationData, ...params.evaluationData };
    }

    if (params.completedAt) {
      updates.completedAt = params.completedAt;
    }

    return await this.update(id, updates);
  }

  /**
   * 開始評估
   */
  async startEvaluation(id: string): Promise<ISoftDeletableEvaluation> {
    return await this.updateEvaluation(id, {
      status: EvaluationStatus.IN_PROGRESS
    });
  }

  /**
   * 完成評估
   */
  async completeEvaluation(
    id: string, 
    score: number, 
    feedback: EvaluationFeedback
  ): Promise<ISoftDeletableEvaluation> {
    return await this.updateEvaluation(id, {
      status: EvaluationStatus.COMPLETED,
      score,
      feedback,
      completedAt: new Date()
    });
  }

  /**
   * 評估失敗
   */
  async failEvaluation(id: string, reason: string): Promise<ISoftDeletableEvaluation> {
    return await this.updateEvaluation(id, {
      status: EvaluationStatus.FAILED,
      feedback: {
        summary: `Evaluation failed: ${reason}`,
        strengths: [],
        improvements: [],
        suggestions: []
      },
      completedAt: new Date()
    });
  }

  /**
   * 取消評估
   */
  async cancelEvaluation(id: string): Promise<ISoftDeletableEvaluation> {
    return await this.updateEvaluation(id, {
      status: EvaluationStatus.CANCELLED,
      completedAt: new Date()
    });
  }

  /**
   * 根據 Track ID 查找評估
   */
  async findByTrack(trackId: string): Promise<ISoftDeletableEvaluation[]> {
    return await this.findMany({ trackId }, {
      orderBy: 'createdAt',
      orderDirection: 'desc'
    });
  }

  /**
   * 根據用戶查找評估
   */
  async findByUser(userId: string, options?: EvaluationQueryOptions): Promise<ISoftDeletableEvaluation[]> {
    let evaluations = await this.findMany({ userId }, {
      orderBy: 'createdAt',
      orderDirection: 'desc'
    });

    if (options) {
      evaluations = this.applyQueryOptions(evaluations, options);
    }

    return evaluations;
  }

  /**
   * 取得最新的評估
   */
  async getLatestEvaluation(trackId: string): Promise<ISoftDeletableEvaluation | null> {
    const evaluations = await this.findByTrack(trackId);
    return evaluations[0] || null;
  }

  /**
   * 取得評估統計
   */
  async getEvaluationStats(userId: string, type?: EvaluationType): Promise<EvaluationStatistics> {
    let evaluations = await this.findByUser(userId);
    
    if (type) {
      evaluations = evaluations.filter(e => e.type === type);
    }

    // 只統計已完成的評估
    const completed = evaluations.filter(e => e.status === EvaluationStatus.COMPLETED);
    
    if (completed.length === 0) {
      return this.getEmptyStatistics();
    }

    // 計算統計數據
    const scores = completed.map(e => e.percentage);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const averageScore = totalScore / scores.length;
    
    // 計算中位數
    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore = sortedScores[Math.floor(sortedScores.length / 2)];
    
    // 計算標準差
    const variance = scores.reduce((sum, score) => {
      return sum + Math.pow(score - averageScore, 2);
    }, 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // 計算分數分布
    const scoreDistribution = this.calculateScoreDistribution(scores);
    
    // 計算平均時間
    const times = completed
      .filter(e => e.completedAt)
      .map(e => e.completedAt!.getTime() - e.startedAt.getTime());
    const averageTimeSpent = times.length > 0 
      ? Math.round(times.reduce((sum, time) => sum + time, 0) / times.length / 1000 / 60) // 轉換為分鐘
      : 0;

    return {
      totalEvaluations: evaluations.length,
      averageScore: Math.round(averageScore * 10) / 10,
      medianScore,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      standardDeviation: Math.round(standardDeviation * 10) / 10,
      completionRate: Math.round((completed.length / evaluations.length) * 100),
      averageTimeSpent,
      scoreDistribution
    };
  }

  /**
   * 取得學習進度報告
   */
  async getLearningProgress(userId: string): Promise<LearningProgress> {
    const evaluations = await this.findByUser(userId);
    const completed = evaluations.filter(e => e.status === EvaluationStatus.COMPLETED);
    
    // 按類型分組
    const byType: Record<string, ISoftDeletableEvaluation[]> = {};
    for (const evaluation of completed) {
      if (!byType[evaluation.type]) {
        byType[evaluation.type] = [];
      }
      byType[evaluation.type].push(evaluation);
    }

    // 計算每種類型的進度
    const progress: LearningProgress = {
      overall: {
        totalEvaluations: evaluations.length,
        completedEvaluations: completed.length,
        averageScore: 0,
        trend: 'stable'
      },
      byType: {},
      recentAchievements: [],
      suggestedNextSteps: []
    };

    // 計算整體平均分
    if (completed.length > 0) {
      const totalScore = completed.reduce((sum, e) => sum + e.percentage, 0);
      progress.overall.averageScore = Math.round(totalScore / completed.length);
      
      // 計算趨勢（比較最近 5 次和之前的平均）
      if (completed.length >= 10) {
        const recent = completed.slice(0, 5);
        const previous = completed.slice(5, 10);
        const recentAvg = recent.reduce((sum, e) => sum + e.percentage, 0) / recent.length;
        const previousAvg = previous.reduce((sum, e) => sum + e.percentage, 0) / previous.length;
        
        if (recentAvg > previousAvg + 5) {
          progress.overall.trend = 'improving';
        } else if (recentAvg < previousAvg - 5) {
          progress.overall.trend = 'declining';
        }
      }
    }

    // 計算每種類型的進度
    for (const [type, typeEvaluations] of Object.entries(byType)) {
      const scores = typeEvaluations.map(e => e.percentage);
      progress.byType[type] = {
        count: typeEvaluations.length,
        averageScore: Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length),
        lastEvaluation: typeEvaluations[0].completedAt!
      };
    }

    // 找出最近的成就
    const highScoreEvaluations = completed
      .filter(e => e.percentage >= 80)
      .slice(0, 5);
    
    progress.recentAchievements = highScoreEvaluations.map(e => ({
      type: e.type,
      score: e.percentage,
      date: e.completedAt!,
      feedback: e.feedback.summary
    }));

    // 生成建議的下一步
    progress.suggestedNextSteps = this.generateSuggestions(progress);

    return progress;
  }

  /**
   * 初始化評估資料
   */
  private initializeEvaluationData(type: EvaluationType, partialData: any): any {
    switch (type) {
      case EvaluationType.TASK:
        return {
          type: 'task',
          rubrics: [],
          timeSpent: 0,
          attempts: 1,
          ...partialData
        };
      
      case EvaluationType.ASSESSMENT:
        return {
          type: 'assessment',
          questions: [],
          totalQuestions: 0,
          correctAnswers: 0,
          timeSpent: 0,
          completionRate: 0,
          ...partialData
        };
      
      case EvaluationType.DISCOVERY:
        return {
          type: 'discovery',
          tasksCompleted: 0,
          totalTasks: 0,
          explorationDepth: 0,
          creativityScore: 0,
          learningObjectivesMet: [],
          insights: [],
          ...partialData
        };
      
      case EvaluationType.CHAT:
        return {
          type: 'chat',
          messageCount: 0,
          qualityMetrics: {
            relevance: 0,
            coherence: 0,
            depth: 0,
            engagement: 0,
            understanding: 0
          },
          topicsCovered: [],
          learningOutcomes: [],
          ...partialData
        };
      
      case EvaluationType.MANUAL:
        return {
          type: 'manual',
          criteria: [],
          comments: '',
          ...partialData
        };
      
      default:
        throw new Error(`Unknown evaluation type: ${type}`);
    }
  }

  /**
   * 初始化回饋
   */
  private initializeFeedback(): EvaluationFeedback {
    return {
      summary: '',
      strengths: [],
      improvements: [],
      suggestions: []
    };
  }

  /**
   * 應用查詢選項
   */
  private applyQueryOptions(
    evaluations: ISoftDeletableEvaluation[], 
    options: EvaluationQueryOptions
  ): ISoftDeletableEvaluation[] {
    let filtered = evaluations;

    if (options.type) {
      filtered = filtered.filter(e => e.type === options.type);
    }

    if (options.status) {
      filtered = filtered.filter(e => e.status === options.status);
    }

    if (options.minScore !== undefined) {
      filtered = filtered.filter(e => e.percentage >= options.minScore!);
    }

    if (options.maxScore !== undefined) {
      filtered = filtered.filter(e => e.percentage <= options.maxScore!);
    }

    if (options.startDate) {
      filtered = filtered.filter(e => e.startedAt >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter(e => e.startedAt <= options.endDate!);
    }

    return filtered;
  }

  /**
   * 計算分數分布
   */
  private calculateScoreDistribution(scores: number[]): ScoreRange[] {
    const ranges: ScoreRange[] = [
      { min: 0, max: 59, count: 0, percentage: 0 },
      { min: 60, max: 69, count: 0, percentage: 0 },
      { min: 70, max: 79, count: 0, percentage: 0 },
      { min: 80, max: 89, count: 0, percentage: 0 },
      { min: 90, max: 100, count: 0, percentage: 0 }
    ];

    for (const score of scores) {
      for (const range of ranges) {
        if (score >= range.min && score <= range.max) {
          range.count++;
          break;
        }
      }
    }

    // 計算百分比
    for (const range of ranges) {
      range.percentage = Math.round((range.count / scores.length) * 100);
    }

    return ranges;
  }

  /**
   * 取得空的統計資料
   */
  private getEmptyStatistics(): EvaluationStatistics {
    return {
      totalEvaluations: 0,
      averageScore: 0,
      medianScore: 0,
      minScore: 0,
      maxScore: 0,
      standardDeviation: 0,
      completionRate: 0,
      averageTimeSpent: 0,
      scoreDistribution: []
    };
  }

  /**
   * 生成學習建議
   */
  private generateSuggestions(progress: LearningProgress): string[] {
    const suggestions: string[] = [];

    // 基於整體趨勢的建議
    if (progress.overall.trend === 'declining') {
      suggestions.push('Consider reviewing recent materials and practicing more frequently');
    }

    // 基於平均分的建議
    if (progress.overall.averageScore < 70) {
      suggestions.push('Focus on fundamental concepts before moving to advanced topics');
    } else if (progress.overall.averageScore >= 90) {
      suggestions.push('Excellent progress! Try more challenging scenarios');
    }

    // 基於類型分布的建議
    const types = Object.keys(progress.byType);
    if (types.length === 1) {
      suggestions.push('Try different learning modes to diversify your skills');
    }

    // 基於完成率的建議
    const completionRate = (progress.overall.completedEvaluations / progress.overall.totalEvaluations) * 100;
    if (completionRate < 50) {
      suggestions.push('Try to complete more evaluations to get better feedback');
    }

    return suggestions;
  }
}

/**
 * 學習進度介面
 */
interface LearningProgress {
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
}