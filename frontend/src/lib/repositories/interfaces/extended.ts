/**
 * Extended Repository Interfaces
 * Provides additional operations for repositories
 */

import type { IScenario, IProgram, ITask, IEvaluation } from '@/types/unified-learning';
import type { LearningMode as DBLearningMode } from '@/types/database';

// ========================================
// Extended Repository Operations
// ========================================

export interface IBulkOperations<T> {
  /**
   * Create multiple entities in a single transaction
   */
  createBulk(items: Omit<T, 'id'>[]): Promise<T[]>;

  /**
   * Update multiple entities in a single transaction
   */
  updateBulk(updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]>;

  /**
   * Delete multiple entities in a single transaction
   */
  deleteBulk(ids: string[]): Promise<{ deleted: number; failed: string[] }>;
}

export interface ITransactionalOperations {
  /**
   * Execute operations within a database transaction
   */
  withTransaction<T>(callback: () => Promise<T>): Promise<T>;

  /**
   * Begin a new transaction
   */
  beginTransaction(): Promise<void>;

  /**
   * Commit the current transaction
   */
  commitTransaction(): Promise<void>;

  /**
   * Rollback the current transaction
   */
  rollbackTransaction(): Promise<void>;
}

export interface IQueryOperations<T> {
  /**
   * Find entities with pagination
   */
  findPaginated(options: {
    page?: number;
    limit?: number;
    orderBy?: string;
    order?: 'ASC' | 'DESC';
    filters?: Record<string, unknown>;
  }): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Count entities matching criteria
   */
  count(filters?: Record<string, unknown>): Promise<number>;

  /**
   * Check if entity exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Find entities by multiple IDs
   */
  findByIds(ids: string[]): Promise<T[]>;
}

export interface ICascadeOperations {
  /**
   * Delete with cascade option
   */
  deleteWithCascade(id: string, options?: {
    deletePrograms?: boolean;
    deleteTasks?: boolean;
    deleteEvaluations?: boolean;
  }): Promise<{
    deleted: {
      scenario?: boolean;
      programs?: number;
      tasks?: number;
      evaluations?: number;
    };
  }>;

  /**
   * Archive instead of delete
   */
  archive(id: string): Promise<boolean>;

  /**
   * Restore archived entity
   */
  restore(id: string): Promise<boolean>;
}

export interface IStatusOperations {
  /**
   * Bulk update status
   */
  updateStatusBulk(ids: string[], status: string): Promise<number>;

  /**
   * Find by status
   */
  findByStatus(status: string): Promise<unknown[]>;

  /**
   * Transition status with validation
   */
  transitionStatus(id: string, fromStatus: string, toStatus: string): Promise<boolean>;
}

// ========================================
// Extended Repository Interfaces
// ========================================

export interface IExtendedScenarioRepository extends
  IBulkOperations<IScenario>,
  IQueryOperations<IScenario>,
  ICascadeOperations,
  IStatusOperations {

  /**
   * Find scenarios with related counts
   */
  findWithStats(mode?: DBLearningMode): Promise<Array<IScenario & {
    programCount: number;
    activePrograms: number;
    completedPrograms: number;
  }>>;

  /**
   * Clone a scenario
   */
  clone(id: string, options?: {
    title?: Record<string, string>;
    status?: string;
  }): Promise<IScenario>;

  /**
   * Find orphaned scenarios (no programs)
   */
  findOrphaned(): Promise<IScenario[]>;

  /**
   * Clean up duplicate scenarios
   */
  deduplicateBySourceId(): Promise<{
    removed: number;
    kept: string[];
  }>;
}

export interface IExtendedProgramRepository extends
  IBulkOperations<IProgram>,
  IQueryOperations<IProgram>,
  IStatusOperations {

  /**
   * Find expired programs
   */
  findExpired(daysOld?: number): Promise<IProgram[]>;

  /**
   * Clean up expired programs
   */
  cleanupExpired(daysOld?: number): Promise<number>;

  /**
   * Get user statistics
   */
  getUserStats(userId: string): Promise<{
    totalPrograms: number;
    activePrograms: number;
    completedPrograms: number;
    totalXp: number;
    averageScore: number;
  }>;

  /**
   * Reset program progress
   */
  resetProgress(id: string): Promise<IProgram>;
}

export interface IExtendedTaskRepository extends
  IBulkOperations<ITask>,
  IQueryOperations<ITask> {

  /**
   * Find incomplete tasks
   */
  findIncomplete(programId?: string): Promise<ITask[]>;

  /**
   * Batch update scores
   */
  updateScoresBulk(scores: Array<{
    taskId: string;
    score: number;
  }>): Promise<number>;

  /**
   * Get task statistics
   */
  getTaskStats(programId: string): Promise<{
    total: number;
    completed: number;
    averageScore: number;
    averageTime: number;
  }>;
}

export interface IExtendedEvaluationRepository extends
  IBulkOperations<IEvaluation>,
  IQueryOperations<IEvaluation> {

  /**
   * Get evaluation trends
   */
  getTrends(userId: string, days?: number): Promise<{
    dates: string[];
    scores: number[];
    completions: number[];
  }>;

  /**
   * Calculate percentile rank
   */
  getPercentileRank(score: number, scenarioId: string): Promise<number>;

  /**
   * Get domain analysis
   */
  getDomainAnalysis(userId: string): Promise<Record<string, {
    averageScore: number;
    totalAttempts: number;
    improvement: number;
  }>>;
}

// ========================================
// Cache-aware Repository Operations
// ========================================

export interface ICacheAwareOperations {
  /**
   * Invalidate all caches for an entity
   */
  invalidateCache(id: string): Promise<void>;

  /**
   * Warm up cache with frequently accessed data
   */
  warmupCache(): Promise<void>;

  /**
   * Get cache statistics
   */
  getCacheStats(): Promise<{
    hits: number;
    misses: number;
    size: number;
    keys: string[];
  }>;

  /**
   * Clear all caches
   */
  clearCache(): Promise<void>;
}
