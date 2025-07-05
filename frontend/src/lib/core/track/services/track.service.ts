/**
 * Track Service
 * 統一的 Track 管理服務
 */

import { TrackRepository, EvaluationRepository } from '../repositories';
import { StorageFactory } from '../../storage/factory';
import {
  ITrack,
  ISoftDeletableTrack,
  TrackType,
  TrackStatus,
  CreateTrackParams,
  UpdateTrackParams,
  TrackQueryOptions,
  PBLTrackContext,
  AssessmentTrackContext,
  DiscoveryTrackContext,
  ChatTrackContext,
  CreateEvaluationParams,
  IEvaluation,
  ISoftDeletableEvaluation,
  EvaluationType,
  EvaluationFeedback
} from '../types';

export class TrackService {
  private static instance: TrackService;
  private trackRepo: TrackRepository;
  private evaluationRepo: EvaluationRepository;

  constructor(trackRepo?: TrackRepository, evaluationRepo?: EvaluationRepository) {
    if (trackRepo && evaluationRepo) {
      // 使用提供的 repositories
      this.trackRepo = trackRepo;
      this.evaluationRepo = evaluationRepo;
    } else {
      // 向後相容：使用預設的 storage factory
      const storage = StorageFactory.createFromEnv();
      this.trackRepo = new TrackRepository(storage);
      this.evaluationRepo = new EvaluationRepository(storage);
    }
  }

  /**
   * 取得 TrackService 單例
   */
  static getInstance(): TrackService {
    if (!TrackService.instance) {
      TrackService.instance = new TrackService();
    }
    return TrackService.instance;
  }

  // ========== Track 管理 ==========

  /**
   * 創建新的 Track
   */
  async createTrack(params: CreateTrackParams): Promise<ISoftDeletableTrack> {
    // 檢查是否有未完成的相同類型 Track
    // 使用 queryTracks 而不是 findActiveTracksByUser
    const activeTracks = await this.queryTracks({
      userId: params.userId,
      status: TrackStatus.ACTIVE
    });
    
    const existingTrack = activeTracks.find(s => 
      s.type === params.type && 
      s.projectId === params.projectId
    );

    if (existingTrack) {
      // 可以選擇自動暫停舊的 Track
      await this.pauseTrack(existingTrack.trackId);
    }

    return await this.trackRepo.createTrack(params);
  }

  /**
   * 取得 Track
   */
  async getTrack(id: string): Promise<ISoftDeletableTrack | null> {
    return await this.trackRepo.findById(id);
  }

  /**
   * 更新 Track
   */
  async updateTrack(id: string, params: UpdateTrackParams): Promise<ISoftDeletableTrack> {
    return await this.trackRepo.updateTrack(id, params);
  }

  /**
   * 暫停 Track
   */
  async pauseTrack(id: string): Promise<ISoftDeletableTrack> {
    return await this.trackRepo.pauseTrack(id);
  }

  /**
   * 恢復 Track
   */
  async resumeTrack(id: string): Promise<ISoftDeletableTrack> {
    return await this.trackRepo.resumeTrack(id);
  }

  /**
   * 完成 Track
   */
  async completeTrack(id: string): Promise<ISoftDeletableTrack> {
    return await this.trackRepo.completeTrack(id);
  }

  /**
   * 放棄 Track
   */
  async abandonTrack(id: string): Promise<ISoftDeletableTrack> {
    return await this.trackRepo.abandonTrack(id);
  }

  /**
   * 查詢 Tracks
   */
  async queryTracks(options: TrackQueryOptions): Promise<ISoftDeletableTrack[]> {
    // 直接委託給 repository 的 queryTracks 方法
    return await this.trackRepo.queryTracks(options);
  }

  /**
   * 取得用戶的活躍 Tracks
   */
  async getActiveTracks(userId: string): Promise<ISoftDeletableTrack[]> {
    // 使用 queryTracks 並篩選活躍狀態
    const tracks = await this.trackRepo.queryTracks({ 
      userId, 
      status: TrackStatus.ACTIVE 
    });
    return tracks;
  }

  /**
   * 取得 Track 統計
   */
  async getTrackStats(userId: string) {
    // 使用 getStatistics 方法
    return await this.trackRepo.getStatistics(userId);
  }

  // ========== PBL Track 特定方法 ==========

  /**
   * 更新 PBL 任務進度
   */
  async updatePBLTaskProgress(
    trackId: string, 
    taskId: string, 
    progress: Partial<import('../types').TaskProgress>
  ): Promise<ISoftDeletableTrack> {
    const track = await this.getTrack(trackId);
    if (!track || track.type !== TrackType.PBL) {
      throw new Error('Invalid PBL track');
    }

    const context = track.context as PBLTrackContext;
    
    // 更新任務進度
    if (!context.taskProgress[taskId]) {
      context.taskProgress[taskId] = {
        taskId,
        status: 'in_progress',
        startedAt: new Date(),
        attempts: 0
      };
    }

    context.taskProgress[taskId] = {
      ...context.taskProgress[taskId],
      ...progress
    };

    // 更新當前任務
    if (progress.status === 'in_progress') {
      context.currentTaskId = taskId;
    }

    // 更新完成的任務列表
    if (progress.status === 'completed' && !context.completedTaskIds.includes(taskId)) {
      context.completedTaskIds.push(taskId);
    }

    return await this.updateTrack(trackId, { context });
  }

  /**
   * 完成 PBL 任務
   */
  async completePBLTask(
    trackId: string, 
    taskId: string, 
    score: number
  ): Promise<ISoftDeletableTrack> {
    return await this.updatePBLTaskProgress(trackId, taskId, {
      status: 'completed',
      completedAt: new Date(),
      score
    });
  }

  // ========== Assessment Track 特定方法 ==========

  /**
   * 提交答案
   */
  async submitAssessmentAnswer(
    trackId: string,
    questionId: string,
    answer: string | string[],
    confidence?: number
  ): Promise<ISoftDeletableTrack> {
    const track = await this.getTrack(trackId);
    if (!track || track.type !== TrackType.ASSESSMENT) {
      throw new Error('Invalid assessment track');
    }

    const context = track.context as AssessmentTrackContext;
    const startTime = context.answers.length > 0 
      ? context.answers[context.answers.length - 1].timestamp 
      : track.startedAt;
    
    const timeSpent = Math.round((new Date().getTime() - startTime.getTime()) / 1000);

    // 添加答案
    context.answers.push({
      questionId,
      answer,
      confidence,
      timeSpent,
      timestamp: new Date()
    });

    // 更新總時間
    context.timeSpent += timeSpent;
    
    // 更新當前問題索引
    context.currentQuestionIndex++;

    return await this.updateTrack(trackId, { context });
  }

  // ========== Discovery Track 特定方法 ==========

  /**
   * 添加生成的任務
   */
  async addDiscoveryTask(
    trackId: string,
    task: Omit<import('../types').DiscoveryTask, 'id' | 'generatedAt'>
  ): Promise<ISoftDeletableTrack> {
    const track = await this.getTrack(trackId);
    if (!track || track.type !== TrackType.DISCOVERY) {
      throw new Error('Invalid discovery track');
    }

    const context = track.context as DiscoveryTrackContext;
    
    const newTask: import('../types').DiscoveryTask = {
      ...task,
      id: this.generateId(),
      generatedAt: new Date()
    };

    context.generatedTasks.push(newTask);

    return await this.updateTrack(trackId, { context });
  }

  /**
   * 記錄探索步驟
   */
  async recordExplorationStep(
    trackId: string,
    action: string,
    data: any,
    result?: any
  ): Promise<ISoftDeletableTrack> {
    const track = await this.getTrack(trackId);
    if (!track || track.type !== TrackType.DISCOVERY) {
      throw new Error('Invalid discovery track');
    }

    const context = track.context as DiscoveryTrackContext;
    
    context.explorationHistory.push({
      timestamp: new Date(),
      action,
      data,
      result
    });

    return await this.updateTrack(trackId, { context });
  }

  // ========== Chat Track 特定方法 ==========

  /**
   * 添加聊天訊息
   */
  async addChatMessage(
    trackId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): Promise<ISoftDeletableTrack> {
    const track = await this.getTrack(trackId);
    if (!track || track.type !== TrackType.CHAT) {
      throw new Error('Invalid chat track');
    }

    const context = track.context as ChatTrackContext;
    
    context.messages.push({
      id: this.generateId(),
      role,
      content,
      timestamp: new Date(),
      metadata
    });

    return await this.updateTrack(trackId, { context });
  }

  // ========== Evaluation 管理 ==========

  /**
   * 創建評估
   */
  async createEvaluation(params: CreateEvaluationParams): Promise<ISoftDeletableEvaluation> {
    // 確保 Track 存在
    const track = await this.getTrack(params.trackId);
    if (!track) {
      throw new Error(`Track ${params.trackId} not found`);
    }

    return await this.evaluationRepo.createEvaluation(params);
  }

  /**
   * 開始評估
   */
  async startEvaluation(evaluationId: string): Promise<ISoftDeletableEvaluation> {
    return await this.evaluationRepo.startEvaluation(evaluationId);
  }

  /**
   * 完成評估
   */
  async completeEvaluation(
    evaluationId: string,
    score: number,
    feedback: EvaluationFeedback
  ): Promise<ISoftDeletableEvaluation> {
    return await this.evaluationRepo.completeEvaluation(evaluationId, score, feedback);
  }

  /**
   * 取得 Track 的所有評估
   */
  async getTrackEvaluations(trackId: string): Promise<ISoftDeletableEvaluation[]> {
    return await this.evaluationRepo.findByTrack(trackId);
  }

  /**
   * 取得最新的評估
   */
  async getLatestEvaluation(trackId: string): Promise<ISoftDeletableEvaluation | null> {
    return await this.evaluationRepo.getLatestEvaluation(trackId);
  }

  /**
   * 取得用戶的評估統計
   */
  async getEvaluationStats(userId: string, type?: EvaluationType) {
    return await this.evaluationRepo.getEvaluationStats(userId, type);
  }

  /**
   * 取得學習進度
   */
  async getLearningProgress(userId: string) {
    return await this.evaluationRepo.getLearningProgress(userId);
  }

  // ========== 工具方法 ==========

  /**
   * 清理過期資料
   */
  async cleanup(daysToKeep: number = 30): Promise<{ tracks: number; evaluations: number }> {
    const tracksDeleted = await this.trackRepo.cleanupExpiredTracks(daysToKeep);
    const evaluationsDeleted = await this.evaluationRepo.cleanupDeleted(daysToKeep);

    return {
      tracks: tracksDeleted,
      evaluations: evaluationsDeleted
    };
  }

  /**
   * 過濾 Tracks
   */
  private filterTracks(
    tracks: ISoftDeletableTrack[], 
    options: TrackQueryOptions
  ): ISoftDeletableTrack[] {
    let filtered = tracks;

    if (options.userId) {
      filtered = filtered.filter(s => s.userId === options.userId);
    }

    if (options.projectId) {
      filtered = filtered.filter(s => s.projectId === options.projectId);
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

  /**
   * 生成 ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 匯出單例
export const trackService = TrackService.getInstance();