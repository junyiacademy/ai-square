/**
 * Evaluation Service
 * 評估管理服務
 */

import { EvaluationRepository } from '../repositories/evaluation.repository';
import {
  IEvaluation,
  CreateEvaluationParams,
  UpdateEvaluationParams,
  EvaluationQueryOptions,
  EvaluationStatistics
} from '../types/evaluation.types';

export class EvaluationService {
  constructor(private evaluationRepo: EvaluationRepository) {}

  /**
   * 創建評估
   */
  async createEvaluation(params: CreateEvaluationParams): Promise<IEvaluation> {
    return this.evaluationRepo.create(params);
  }

  /**
   * 獲取評估
   */
  async getEvaluation(userId: string, evaluationId: string): Promise<IEvaluation | null> {
    return this.evaluationRepo.findByUserAndId(userId, evaluationId);
  }

  /**
   * 查詢評估
   */
  async queryEvaluations(options: EvaluationQueryOptions): Promise<IEvaluation[]> {
    return this.evaluationRepo.query(options);
  }

  /**
   * 更新評估
   */
  async updateEvaluation(
    userId: string,
    evaluationId: string,
    updates: UpdateEvaluationParams
  ): Promise<IEvaluation | null> {
    return this.evaluationRepo.update(userId, evaluationId, updates);
  }

  /**
   * 刪除評估
   */
  async deleteEvaluation(userId: string, evaluationId: string): Promise<boolean> {
    return this.evaluationRepo.delete(userId, evaluationId);
  }

  /**
   * 獲取統計資料
   */
  async getStatistics(options: EvaluationQueryOptions): Promise<EvaluationStatistics> {
    return this.evaluationRepo.getStatistics(options);
  }

  /**
   * 根據任務獲取評估
   */
  async getByTask(userId: string, taskId: string): Promise<IEvaluation[]> {
    return this.evaluationRepo.query({
      userId,
      taskId
    });
  }

  /**
   * 根據項目獲取評估
   */
  async getByProgram(userId: string, programId: string): Promise<IEvaluation[]> {
    return this.evaluationRepo.query({
      userId,
      programId
    });
  }

  /**
   * 批量創建評估
   */
  async createBatch(evaluations: CreateEvaluationParams[]): Promise<IEvaluation[]> {
    return Promise.all(evaluations.map(e => this.createEvaluation(e)));
  }
}