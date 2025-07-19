/**
 * Program Repository Implementation
 * Handles all database operations for learning programs
 */

import { BaseRepositoryImpl } from './base-repository';
import {
  Program,
  ProgramRepository,
  DatabaseConnection,
  QueryOptions,
  QueryResult,
} from '../interfaces';

export class ProgramRepositoryImpl extends BaseRepositoryImpl<Program> implements ProgramRepository {
  constructor(db: DatabaseConnection) {
    super(db, 'programs');
  }

  /**
   * Find all programs for a specific user
   */
  async findByUser(userId: string, options?: QueryOptions): Promise<QueryResult<Program>> {
    const baseOptions: QueryOptions = {
      ...options,
      filters: {
        ...options?.filters,
        user_id: userId,
      },
      sort: options?.sort || { field: 'created_at', direction: 'desc' },
    };

    return this.findAll(baseOptions);
  }

  /**
   * Find all programs for a specific scenario
   */
  async findByScenario(scenarioId: string, options?: QueryOptions): Promise<QueryResult<Program>> {
    const baseOptions: QueryOptions = {
      ...options,
      filters: {
        ...options?.filters,
        scenario_id: scenarioId,
      },
    };

    return this.findAll(baseOptions);
  }

  /**
   * Find programs for a specific user and scenario combination
   */
  async findByUserAndScenario(userId: string, scenarioId: string): Promise<Program[]> {
    const query = `
      SELECT * FROM programs 
      WHERE user_id = $1 AND scenario_id = $2 
      ORDER BY created_at DESC
    `;

    return this.db.query<Program>(query, [userId, scenarioId]);
  }

  /**
   * Update program progress when a task is completed
   */
  async updateProgress(id: string, taskIndex: number, completed: number): Promise<Program> {
    const query = `
      UPDATE programs 
      SET 
        current_task_index = $2,
        completed_tasks = $3,
        last_activity_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.queryOne<Program>(query, [id, taskIndex, completed]);
    if (!result) {
      throw new Error(`Program with id ${id} not found`);
    }

    return result;
  }

  /**
   * Complete a program with final scores
   */
  async complete(id: string, totalScore: number, ksaScores: Record<string, number>): Promise<Program> {
    const query = `
      UPDATE programs 
      SET 
        status = 'completed',
        total_score = $2,
        ksa_scores = $3,
        end_time = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.queryOne<Program>(query, [id, totalScore, ksaScores]);
    if (!result) {
      throw new Error(`Program with id ${id} not found`);
    }

    return result;
  }

  /**
   * Get or create an active program for a user and scenario
   */
  async getOrCreateActive(userId: string, scenarioId: string, totalTasks: number): Promise<Program> {
    // First, check if there's an active program
    const existingQuery = `
      SELECT * FROM programs 
      WHERE user_id = $1 AND scenario_id = $2 AND status IN ('active', 'pending')
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const existing = await this.db.queryOne<Program>(existingQuery, [userId, scenarioId]);
    if (existing) {
      return existing;
    }

    // Create a new program
    return this.create({
      user_id: userId,
      scenario_id: scenarioId,
      status: 'active',
      current_task_index: 0,
      completed_tasks: 0,
      total_tasks: totalTasks,
      total_score: 0,
      ksa_scores: {},
      start_time: new Date(),
      time_spent_seconds: 0,
      metadata: {},
    });
  }

  /**
   * Update time spent on a program
   */
  async updateTimeSpent(id: string, additionalSeconds: number): Promise<Program> {
    const query = `
      UPDATE programs 
      SET 
        time_spent_seconds = time_spent_seconds + $2,
        last_activity_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.queryOne<Program>(query, [id, additionalSeconds]);
    if (!result) {
      throw new Error(`Program with id ${id} not found`);
    }

    return result;
  }

  /**
   * Get program statistics for a user
   */
  async getUserStatistics(userId: string): Promise<{
    totalPrograms: number;
    completedPrograms: number;
    averageScore: number;
    totalTimeSpent: number;
    scenariosAttempted: number;
  }> {
    const query = `
      SELECT 
        COUNT(*)::int as total_programs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed_programs,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN total_score END), 0) as average_score,
        COALESCE(SUM(time_spent_seconds), 0)::int as total_time_spent,
        COUNT(DISTINCT scenario_id)::int as scenarios_attempted
      FROM programs
      WHERE user_id = $1
    `;

    const result = await this.db.queryOne<any>(query, [userId]);
    return {
      totalPrograms: result.total_programs,
      completedPrograms: result.completed_programs,
      averageScore: parseFloat(result.average_score),
      totalTimeSpent: result.total_time_spent,
      scenariosAttempted: result.scenarios_attempted,
    };
  }

  /**
   * Get recent programs for a user
   */
  async getRecentPrograms(userId: string, limit: number = 5): Promise<Program[]> {
    const query = `
      SELECT p.*, s.title, s.type as scenario_type
      FROM programs p
      JOIN scenarios s ON p.scenario_id = s.id
      WHERE p.user_id = $1
      ORDER BY p.last_activity_at DESC
      LIMIT $2
    `;

    return this.db.query<Program>(query, [userId, limit]);
  }

  /**
   * Archive abandoned programs
   */
  async archiveAbandonedPrograms(daysInactive: number = 30): Promise<number> {
    const query = `
      UPDATE programs 
      SET status = 'abandoned'
      WHERE status = 'active' 
        AND last_activity_at < CURRENT_TIMESTAMP - INTERVAL '${daysInactive} days'
    `;

    const result = await this.db.execute(query);
    return result.rowCount;
  }

  /**
   * Get completion rate for a scenario
   */
  async getScenarioCompletionRate(scenarioId: string): Promise<{
    attempts: number;
    completions: number;
    completionRate: number;
    averageScore: number;
  }> {
    const query = `
      SELECT 
        COUNT(*)::int as attempts,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completions,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN total_score END), 0) as average_score
      FROM programs
      WHERE scenario_id = $1
    `;

    const result = await this.db.queryOne<any>(query, [scenarioId]);
    const attempts = result.attempts;
    const completions = result.completions;

    return {
      attempts,
      completions,
      completionRate: attempts > 0 ? completions / attempts : 0,
      averageScore: parseFloat(result.average_score),
    };
  }
}