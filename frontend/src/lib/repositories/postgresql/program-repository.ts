/**
 * PostgreSQL Program Repository
 * 處理所有學習計畫相關的資料庫操作
 * Updated for unified schema v2
 */

import { Pool } from 'pg';
import type { DBProgram, ProgramStatus } from '@/types/database';
import type { IProgram } from '@/types/unified-learning';
import { BaseProgramRepository } from '@/types/unified-learning';

export class PostgreSQLProgramRepository extends BaseProgramRepository<IProgram> {
  constructor(private pool: Pool) {
    super();
  }

  /**
   * Convert database row to IProgram interface
   */
  private toProgram(row: DBProgram): IProgram {
    return {
      id: row.id,
      userId: row.user_id,
      scenarioId: row.scenario_id,
      mode: row.mode,  // Include mode from database
      status: row.status,
      
      // Progress tracking
      currentTaskIndex: row.current_task_index,
      completedTaskCount: row.completed_task_count,
      totalTaskCount: row.total_task_count,
      
      // Scoring
      totalScore: row.total_score,
      dimensionScores: row.dimension_scores,
      
      // XP and rewards
      xpEarned: row.xp_earned,
      badgesEarned: row.badges_earned,
      
      // Timestamps (unified naming)
      createdAt: row.created_at,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      updatedAt: row.updated_at,
      lastActivityAt: row.last_activity_at,
      
      // Time tracking
      timeSpentSeconds: row.time_spent_seconds,
      
      // Mode-specific data
      pblData: row.pbl_data,
      discoveryData: row.discovery_data,
      assessmentData: row.assessment_data,
      
      // Extensible metadata
      metadata: row.metadata
    };
  }

  async findById(id: string): Promise<IProgram | null> {
    const query = `
      SELECT * FROM programs WHERE id = $1
    `;

    const { rows } = await this.pool.query<DBProgram>(query, [id]);
    return rows[0] ? this.toProgram(rows[0]) : null;
  }

  async findByUser(userId: string): Promise<IProgram[]> {
    const query = `
      SELECT * FROM programs 
      WHERE user_id = $1
      ORDER BY last_activity_at DESC
    `;

    const { rows } = await this.pool.query<DBProgram>(query, [userId]);
    return rows.map(row => this.toProgram(row));
  }

  async findByScenario(scenarioId: string): Promise<IProgram[]> {
    const query = `
      SELECT * FROM programs 
      WHERE scenario_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await this.pool.query<DBProgram>(query, [scenarioId]);
    return rows.map(row => this.toProgram(row));
  }

  async create(program: Omit<IProgram, 'id'>): Promise<IProgram> {
    const query = `
      INSERT INTO programs (
        user_id, scenario_id, status,
        current_task_index, completed_task_count, total_task_count,
        total_score, dimension_scores,
        xp_earned, badges_earned,
        time_spent_seconds,
        pbl_data, discovery_data, assessment_data,
        metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
      RETURNING *
    `;

    const { rows } = await this.pool.query<DBProgram>(query, [
      program.userId,
      program.scenarioId,
      program.status || 'pending',
      program.currentTaskIndex || 0,
      program.completedTaskCount || 0,
      program.totalTaskCount,
      program.totalScore || 0,
      JSON.stringify(program.dimensionScores || {}),
      program.xpEarned || 0,
      JSON.stringify(program.badgesEarned || []),
      program.timeSpentSeconds || 0,
      JSON.stringify(program.pblData || {}),
      JSON.stringify(program.discoveryData || {}),
      JSON.stringify(program.assessmentData || {}),
      JSON.stringify(program.metadata || {})
    ]);

    return this.toProgram(rows[0]);
  }

  async updateProgress(id: string, taskIndex: number): Promise<IProgram> {
    const query = `
      UPDATE programs
      SET current_task_index = $1,
          last_activity_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const { rows } = await this.pool.query<DBProgram>(query, [taskIndex, id]);
    
    if (!rows[0]) {
      throw new Error('Program not found');
    }

    return this.toProgram(rows[0]);
  }

  async complete(id: string): Promise<IProgram> {
    const query = `
      UPDATE programs
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          last_activity_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await this.pool.query<DBProgram>(query, [id]);
    
    if (!rows[0]) {
      throw new Error('Program not found');
    }

    return this.toProgram(rows[0]);
  }

  // Additional methods specific to PostgreSQL implementation

  async update(id: string, updates: Partial<IProgram>): Promise<IProgram> {
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    // Status update
    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(updates.status);
      
      // Update timestamps based on status
      if (updates.status === 'active' && !updates.startedAt) {
        updateFields.push(`started_at = COALESCE(started_at, CURRENT_TIMESTAMP)`);
      }
      if (updates.status === 'completed' && !updates.completedAt) {
        updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
      }
    }

    // Progress tracking
    if (updates.currentTaskIndex !== undefined) {
      updateFields.push(`current_task_index = $${paramCount++}`);
      values.push(updates.currentTaskIndex);
    }
    if (updates.completedTaskCount !== undefined) {
      updateFields.push(`completed_task_count = $${paramCount++}`);
      values.push(updates.completedTaskCount);
    }

    // Scoring
    if (updates.totalScore !== undefined) {
      updateFields.push(`total_score = $${paramCount++}`);
      values.push(updates.totalScore);
    }
    if (updates.dimensionScores !== undefined) {
      updateFields.push(`dimension_scores = $${paramCount++}`);
      values.push(JSON.stringify(updates.dimensionScores));
    }

    // XP and rewards
    if (updates.xpEarned !== undefined) {
      updateFields.push(`xp_earned = $${paramCount++}`);
      values.push(updates.xpEarned);
    }
    if (updates.badgesEarned !== undefined) {
      updateFields.push(`badges_earned = $${paramCount++}`);
      values.push(JSON.stringify(updates.badgesEarned));
    }

    // Time tracking
    if (updates.timeSpentSeconds !== undefined) {
      updateFields.push(`time_spent_seconds = $${paramCount++}`);
      values.push(updates.timeSpentSeconds);
    }

    // Mode-specific data
    if (updates.pblData !== undefined) {
      updateFields.push(`pbl_data = $${paramCount++}`);
      values.push(JSON.stringify(updates.pblData));
    }
    if (updates.discoveryData !== undefined) {
      updateFields.push(`discovery_data = $${paramCount++}`);
      values.push(JSON.stringify(updates.discoveryData));
    }
    if (updates.assessmentData !== undefined) {
      updateFields.push(`assessment_data = $${paramCount++}`);
      values.push(JSON.stringify(updates.assessmentData));
    }

    // Metadata
    if (updates.metadata !== undefined) {
      updateFields.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Always update these timestamps
    updateFields.push(`last_activity_at = CURRENT_TIMESTAMP`);
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);

    const query = `
      UPDATE programs
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const { rows } = await this.pool.query<DBProgram>(query, values);
    
    if (!rows[0]) {
      throw new Error('Program not found');
    }

    return this.toProgram(rows[0]);
  }

  async updateStatus(id: string, status: ProgramStatus): Promise<void> {
    let additionalUpdates = '';
    
    if (status === 'active') {
      additionalUpdates = ', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)';
    } else if (status === 'completed') {
      additionalUpdates = ', completed_at = CURRENT_TIMESTAMP';
    }

    const query = `
      UPDATE programs
      SET status = $1${additionalUpdates},
          last_activity_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.pool.query(query, [status, id]);
  }

  async getActivePrograms(userId: string): Promise<IProgram[]> {
    const query = `
      SELECT * FROM programs 
      WHERE user_id = $1 AND status = 'active'
      ORDER BY last_activity_at DESC
    `;

    const { rows } = await this.pool.query<DBProgram>(query, [userId]);
    return rows.map(row => this.toProgram(row));
  }

  async getCompletedPrograms(userId: string): Promise<IProgram[]> {
    const query = `
      SELECT * FROM programs 
      WHERE user_id = $1 AND status = 'completed'
      ORDER BY completed_at DESC
    `;

    const { rows } = await this.pool.query<DBProgram>(query, [userId]);
    return rows.map(row => this.toProgram(row));
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

  // Increment completed task count
  async incrementCompletedTasks(id: string): Promise<void> {
    const query = `
      UPDATE programs
      SET completed_task_count = completed_task_count + 1,
          last_activity_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.pool.query(query, [id]);
  }

  // Get program with scenario info (join query)
  async getProgramWithScenario(id: string): Promise<IProgram & { 
    scenarioMode?: string;
    scenarioTitle?: Record<string, string>;
    scenarioDifficulty?: string;
  }> {
    const query = `
      SELECT 
        p.*,
        s.mode as scenario_mode,
        s.title as scenario_title,
        s.difficulty as scenario_difficulty,
        s.estimated_minutes as scenario_estimated_minutes
      FROM programs p
      JOIN scenarios s ON p.scenario_id = s.id
      WHERE p.id = $1
    `;

    const { rows } = await this.pool.query(query, [id]);
    
    if (!rows[0]) {
      return null as unknown as IProgram;
    }

    return {
      ...this.toProgram(rows[0]),
      scenarioMode: rows[0].scenario_mode,
      scenarioTitle: rows[0].scenario_title,
      scenarioDifficulty: rows[0].scenario_difficulty
    };
  }

  // Get programs by status
  async findByStatus(status: ProgramStatus, userId?: string): Promise<IProgram[]> {
    let query = `
      SELECT * FROM programs 
      WHERE status = $1
    `;
    const params: unknown[] = [status];

    if (userId) {
      query += ` AND user_id = $2`;
      params.push(userId);
    }

    query += ` ORDER BY last_activity_at DESC`;

    const { rows } = await this.pool.query<DBProgram>(query, params);
    return rows.map(row => this.toProgram(row));
  }
}