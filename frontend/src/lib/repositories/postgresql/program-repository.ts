/**
 * PostgreSQL Program Repository
 * 處理所有學習計畫相關的資料庫操作
 */

import { Pool } from 'pg';
import {
  IProgramRepository,
  Program,
  CreateProgramDto,
  UpdateProgramDto,
  ProgramStatus
} from '../interfaces';

export class PostgreSQLProgramRepository implements IProgramRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<Program | null> {
    const query = `
      SELECT 
        id, user_id as "userId", scenario_id as "scenarioId",
        status, current_task_index as "currentTaskIndex",
        completed_tasks as "completedTasks", total_tasks as "totalTasks",
        total_score as "totalScore", ksa_scores as "ksaScores",
        start_time as "startTime", end_time as "endTime",
        last_activity_at as "lastActivityAt", 
        time_spent_seconds as "timeSpentSeconds", metadata
      FROM programs
      WHERE id = $1
    `;

    const { rows } = await this.pool.query(query, [id]);
    return rows[0] || null;
  }

  async findByUser(userId: string): Promise<Program[]> {
    const query = `
      SELECT 
        id, user_id as "userId", scenario_id as "scenarioId",
        status, current_task_index as "currentTaskIndex",
        completed_tasks as "completedTasks", total_tasks as "totalTasks",
        total_score as "totalScore", ksa_scores as "ksaScores",
        start_time as "startTime", end_time as "endTime",
        last_activity_at as "lastActivityAt", 
        time_spent_seconds as "timeSpentSeconds", metadata
      FROM programs
      WHERE user_id = $1
      ORDER BY last_activity_at DESC
    `;

    const { rows } = await this.pool.query(query, [userId]);
    return rows;
  }

  async findByScenario(scenarioId: string): Promise<Program[]> {
    const query = `
      SELECT 
        id, user_id as "userId", scenario_id as "scenarioId",
        status, current_task_index as "currentTaskIndex",
        completed_tasks as "completedTasks", total_tasks as "totalTasks",
        total_score as "totalScore", ksa_scores as "ksaScores",
        start_time as "startTime", end_time as "endTime",
        last_activity_at as "lastActivityAt", 
        time_spent_seconds as "timeSpentSeconds", metadata
      FROM programs
      WHERE scenario_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await this.pool.query(query, [scenarioId]);
    return rows;
  }

  async create(data: CreateProgramDto): Promise<Program> {
    const query = `
      INSERT INTO programs (
        user_id, scenario_id, total_tasks, status,
        start_time, last_activity_at
      ) VALUES ($1, $2, $3, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING 
        id, user_id as "userId", scenario_id as "scenarioId",
        status, current_task_index as "currentTaskIndex",
        completed_tasks as "completedTasks", total_tasks as "totalTasks",
        total_score as "totalScore", ksa_scores as "ksaScores",
        start_time as "startTime", end_time as "endTime",
        last_activity_at as "lastActivityAt", 
        time_spent_seconds as "timeSpentSeconds", metadata
    `;

    const { rows } = await this.pool.query(query, [
      data.userId,
      data.scenarioId,
      data.totalTasks
    ]);

    return rows[0];
  }

  async update(id: string, data: UpdateProgramDto): Promise<Program> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (data.currentTaskIndex !== undefined) {
      updates.push(`current_task_index = $${paramCount++}`);
      values.push(data.currentTaskIndex);
    }

    if (data.completedTasks !== undefined) {
      updates.push(`completed_tasks = $${paramCount++}`);
      values.push(data.completedTasks);
    }

    if (data.totalScore !== undefined) {
      updates.push(`total_score = $${paramCount++}`);
      values.push(data.totalScore);
    }

    if (data.ksaScores !== undefined) {
      updates.push(`ksa_scores = $${paramCount++}`);
      values.push(JSON.stringify(data.ksaScores));
    }

    if (data.endTime !== undefined) {
      updates.push(`end_time = $${paramCount++}`);
      values.push(data.endTime);
    }

    // Always update last_activity_at and updated_at
    updates.push(`last_activity_at = CURRENT_TIMESTAMP`);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);

    const query = `
      UPDATE programs
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id, user_id as "userId", scenario_id as "scenarioId",
        status, current_task_index as "currentTaskIndex",
        completed_tasks as "completedTasks", total_tasks as "totalTasks",
        total_score as "totalScore", ksa_scores as "ksaScores",
        start_time as "startTime", end_time as "endTime",
        last_activity_at as "lastActivityAt", 
        time_spent_seconds as "timeSpentSeconds", metadata
    `;

    const { rows } = await this.pool.query(query, values);
    
    if (!rows[0]) {
      throw new Error('Program not found');
    }

    return rows[0];
  }

  async updateStatus(id: string, status: ProgramStatus): Promise<void> {
    const query = `
      UPDATE programs
      SET status = $1,
          ${status === 'completed' ? 'end_time = CURRENT_TIMESTAMP,' : ''}
          last_activity_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.pool.query(query, [status, id]);
  }

  async getActivePrograms(userId: string): Promise<Program[]> {
    const query = `
      SELECT 
        id, user_id as "userId", scenario_id as "scenarioId",
        status, current_task_index as "currentTaskIndex",
        completed_tasks as "completedTasks", total_tasks as "totalTasks",
        total_score as "totalScore", ksa_scores as "ksaScores",
        start_time as "startTime", end_time as "endTime",
        last_activity_at as "lastActivityAt", 
        time_spent_seconds as "timeSpentSeconds", metadata
      FROM programs
      WHERE user_id = $1 AND status = 'active'
      ORDER BY last_activity_at DESC
    `;

    const { rows } = await this.pool.query(query, [userId]);
    return rows;
  }

  async getCompletedPrograms(userId: string): Promise<Program[]> {
    const query = `
      SELECT 
        id, user_id as "userId", scenario_id as "scenarioId",
        status, current_task_index as "currentTaskIndex",
        completed_tasks as "completedTasks", total_tasks as "totalTasks",
        total_score as "totalScore", ksa_scores as "ksaScores",
        start_time as "startTime", end_time as "endTime",
        last_activity_at as "lastActivityAt", 
        time_spent_seconds as "timeSpentSeconds", metadata
      FROM programs
      WHERE user_id = $1 AND status = 'completed'
      ORDER BY end_time DESC
    `;

    const { rows } = await this.pool.query(query, [userId]);
    return rows;
  }

  // Utility method to update time spent
  async updateTimeSpent(id: string, additionalSeconds: number): Promise<void> {
    const query = `
      UPDATE programs
      SET time_spent_seconds = time_spent_seconds + $1,
          last_activity_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.pool.query(query, [additionalSeconds, id]);
  }

  // Get program with scenario info (join query example)
  async getProgramWithScenario(id: string): Promise<Program & { scenarioTitle?: string; scenarioType?: string }> {
    const query = `
      SELECT 
        p.id, p.user_id as "userId", p.scenario_id as "scenarioId",
        p.status, p.current_task_index as "currentTaskIndex",
        p.completed_tasks as "completedTasks", p.total_tasks as "totalTasks",
        p.total_score as "totalScore", p.ksa_scores as "ksaScores",
        p.start_time as "startTime", p.end_time as "endTime",
        p.last_activity_at as "lastActivityAt", 
        p.time_spent_seconds as "timeSpentSeconds", p.metadata,
        s.type as "scenarioType", s.difficulty_level as "difficultyLevel",
        s.estimated_minutes as "estimatedMinutes"
      FROM programs p
      JOIN scenarios s ON p.scenario_id = s.id
      WHERE p.id = $1
    `;

    const { rows } = await this.pool.query(query, [id]);
    return rows[0] || null;
  }
}