/**
 * GCS Evaluation Repository 實作
 */

import { GCSRepositoryBase } from '../base/gcs-repository-base';
import { BaseEvaluationRepository, IEvaluation } from '@/types/unified-learning';
import { GCS_CONFIG } from '@/lib/config/gcs.config';

export class GCSEvaluationRepository<T extends IEvaluation = IEvaluation> 
  extends GCSRepositoryBase<T> 
  implements BaseEvaluationRepository<T> {
  
  constructor() {
    super(GCS_CONFIG.paths.evaluations);
  }

  async create(evaluation: Omit<T, 'id'>): Promise<T> {
    const newEvaluation = {
      ...evaluation,
      id: this.generateId(),
      createdAt: evaluation.createdAt || new Date().toISOString(),
    } as T;
    
    return this.saveEntity(newEvaluation);
  }

  async findById(id: string): Promise<T | null> {
    return this.loadEntity(id);
  }

  async findByEntity(entityType: string, entityId: string): Promise<T[]> {
    const allEvaluations = await this.listAllEntities();
    return allEvaluations.filter(
      evaluation => evaluation.entityType === entityType && evaluation.entityId === entityId
    );
  }

  async findByProgram(programId: string): Promise<T[]> {
    const allEvaluations = await this.listAllEntities();
    return allEvaluations.filter(evaluation => evaluation.programId === programId);
  }

  /**
   * 根據多個目標 ID 批次查找評估
   */
  async findByTargets(targetType: string, targetIds: string[]): Promise<T[]> {
    const allEvaluations = await this.listAllEntities();
    return allEvaluations.filter(
      evaluation => evaluation.targetType === targetType && 
                   targetIds.includes(evaluation.targetId)
    );
  }

  /**
   * 取得特定類型的評估
   */
  async findByType(evaluationType: string): Promise<T[]> {
    const allEvaluations = await this.listAllEntities();
    return allEvaluations.filter(
      evaluation => evaluation.evaluationType === evaluationType
    );
  }

  /**
   * 取得用戶的所有評估（透過 metadata）
   */
  async findByUser(userId: string): Promise<T[]> {
    const allEvaluations = await this.listAllEntities();
    return allEvaluations.filter(evaluation => evaluation.userId === userId);
  }

  /**
   * 取得最新的評估
   */
  async findLatestByEntity(entityType: string, entityId: string): Promise<T | null> {
    const evaluations = await this.findByEntity(entityType, entityId);
    
    if (evaluations.length === 0) {
      return null;
    }
    
    // 按建立時間排序，取最新的
    evaluations.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return evaluations[0];
  }

  /**
   * 更新評估（通常評估建立後不應該被更新，但提供此方法以備不時之需）
   */
  async update(id: string, updates: Partial<T>): Promise<T> {
    const updated = await this.updateEntity(id, updates);
    
    if (!updated) {
      throw new Error(`Evaluation not found: ${id}`);
    }
    
    return updated;
  }

  /**
   * 刪除評估（通常評估不應該被刪除，但提供此方法以備不時之需）
   */
  async delete(id: string): Promise<boolean> {
    return this.deleteEntity(id);
  }

  /**
   * 列出所有 Evaluations
   */
  async listAll(): Promise<T[]> {
    return this.listAllEntities();
  }
}