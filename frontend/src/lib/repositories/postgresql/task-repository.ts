/**
 * PostgreSQL Task Repository
 * 處理所有任務相關的資料庫操作
 * Updated for unified schema v2
 */

import { Pool } from 'pg';
import type { DBTask, TaskStatus, TaskType } from '@/types/database';
import type { ITask, IInteraction } from '@/types/unified-learning';
import { BaseTaskRepository } from '@/types/unified-learning';
import type { AttemptData } from '@/lib/repositories/interfaces';

export class PostgreSQLTaskRepository extends BaseTaskRepository<ITask> {
  constructor(private pool: Pool) {
    super();
  }

  /**
   * Convert database row to ITask interface
   */
  private toTask(row: DBTask): ITask {
    return {
      id: row.id,
      programId: row.program_id,
      scenarioId: row.scenario_id,  // Map database scenario_id to interface scenarioId
      mode: row.mode,  // Include mode from database
      taskIndex: row.task_index,
      scenarioTaskIndex: row.scenario_task_index !== null && row.scenario_task_index !== undefined ? row.scenario_task_index : undefined,

      // Basic info
      title: typeof row.title === 'string' ? { en: row.title } : row.title || undefined,
      description: typeof row.description === 'string' ? { en: row.description } : row.description || undefined,
      type: row.type,
      status: row.status,

      // Content
      content: row.content,

      // Interaction tracking
      interactions: Array.isArray(row.interactions)
        ? (row.interactions as unknown as IInteraction[])
        : [],
      interactionCount: Array.isArray(row.interactions) ? row.interactions.length : 0,

      // Response/solution (stored in metadata)
      userResponse: row.user_response as Record<string, unknown> || (row.metadata as Record<string, unknown>)?.userResponse as Record<string, unknown> || {},

      // Scoring
      score: row.score || 0,
      maxScore: row.max_score || 100,

      // Attempts and timing
      allowedAttempts: row.allowed_attempts || 1,
      attemptCount: row.attempt_count || 0,
      timeLimitSeconds: row.time_limit_seconds || undefined,
      timeSpentSeconds: row.time_spent_seconds || 0,

      // AI configuration
      aiConfig: row.ai_config || {},

      // Timestamps
      createdAt: row.created_at,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      updatedAt: row.updated_at,

      // Mode-specific data
      pblData: row.pbl_data || {},
      discoveryData: row.discovery_data || {},
      assessmentData: row.assessment_data || {},

      // Extensible metadata
      metadata: row.metadata || {}
    };
  }

  async findById(id: string): Promise<ITask | null> {
    const query = `
      SELECT * FROM tasks WHERE id = $1
    `;

    const { rows } = await this.pool.query<DBTask>(query, [id]);
    return rows[0] ? this.toTask(rows[0]) : null;
  }

  async findByProgram(programId: string): Promise<ITask[]> {
    const query = `
      SELECT * FROM tasks
      WHERE program_id = $1
      ORDER BY task_index ASC
    `;

    const { rows } = await this.pool.query<DBTask>(query, [programId]);
    return rows.map(row => this.toTask(row));
  }


  async create(task: Omit<ITask, 'id'>): Promise<ITask> {
    // Ensure scenarioId is provided - database requires it
    if (!task.scenarioId) {
      throw new Error('scenarioId is required for task creation');
    }

    const query = `
      INSERT INTO tasks (
        id, program_id, scenario_id, mode, task_index, scenario_task_index,
        title, description, type, status,
        content, metadata, interactions,
        ai_config, attempt_count, allowed_attempts, score,
        time_spent_seconds, started_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const { rows } = await this.pool.query<DBTask>(query, [
      task.programId,
      task.scenarioId,
      task.mode,
      task.taskIndex,
      task.scenarioTaskIndex !== undefined ? task.scenarioTaskIndex : null,
      task.title || null,
      task.description || null,
      task.type,
      task.status || 'pending',
      JSON.stringify(task.content || {}),
      JSON.stringify(task.metadata || {}),
      JSON.stringify(task.interactions || []),
      JSON.stringify(task.aiConfig || {}),
      task.attemptCount || 0,
      task.allowedAttempts || 1,
      task.score || null,
      task.timeSpentSeconds || 0,
      task.startedAt || null
    ]);

    return this.toTask(rows[0]);
  }

  async createBatch(tasks: Omit<ITask, 'id'>[]): Promise<ITask[]> {
    const client = await this.pool.connect();
    const createdTasks: ITask[] = [];

    try {
      await client.query('BEGIN');

      for (const task of tasks) {
        // Ensure scenarioId is provided - database requires it
        if (!task.scenarioId) {
          throw new Error('scenarioId is required for task creation');
        }
        const query = `
          INSERT INTO tasks (
            id, program_id, scenario_id, mode, task_index, scenario_task_index,
            title, description, type, status,
            content, metadata, interactions,
            ai_config, attempt_count, allowed_attempts, score,
            time_spent_seconds, started_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP
          )
          RETURNING *
        `;

        const { rows } = await client.query<DBTask>(query, [
          task.programId,
          task.scenarioId,
          task.mode,
          task.taskIndex,
          task.scenarioTaskIndex !== undefined ? task.scenarioTaskIndex : null,
          task.title || null,
          task.description || null,
          task.type,
          task.status || 'pending',
          JSON.stringify(task.content || {}),
          JSON.stringify(task.metadata || {}),
          JSON.stringify(task.interactions || []),
          JSON.stringify(task.aiConfig || {}),
          task.attemptCount || 0,
          task.allowedAttempts || 1,
          task.score || null,
          task.timeSpentSeconds || 0,
          task.startedAt || null
        ]);

        createdTasks.push(this.toTask(rows[0]));
      }

      await client.query('COMMIT');
      return createdTasks;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateInteractions(id: string, interactions: IInteraction[]): Promise<ITask> {
    const query = `
      UPDATE tasks
      SET interactions = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const { rows } = await this.pool.query<DBTask>(query, [
      JSON.stringify(interactions),
      id
    ]);

    if (!rows[0]) {
      throw new Error('Task not found');
    }

    return this.toTask(rows[0]);
  }

  async complete(id: string): Promise<ITask> {
    const query = `
      UPDATE tasks
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await this.pool.query<DBTask>(query, [id]);

    if (!rows[0]) {
      throw new Error('Task not found');
    }

    return this.toTask(rows[0]);
  }

  // Additional methods specific to PostgreSQL implementation

  async update(id: string, updates: Partial<ITask>): Promise<ITask> {
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

    // Basic info
    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }

    // Content
    if (updates.content !== undefined) {
      updateFields.push(`content = $${paramCount++}`);
      values.push(JSON.stringify(updates.content));
    }

    // Interactions
    if (updates.interactions !== undefined) {
      updateFields.push(`interactions = $${paramCount++}`);
      values.push(JSON.stringify(updates.interactions));
    }

    // Response/solution - store in metadata
    if (updates.userResponse !== undefined) {
      updateFields.push(`metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{userResponse}', $${paramCount++}::jsonb)`);
      values.push(JSON.stringify(updates.userResponse));
    }

    // Scoring
    if (updates.score !== undefined) {
      updateFields.push(`score = $${paramCount++}`);
      values.push(updates.score);
    }

    // Attempts
    if (updates.attemptCount !== undefined) {
      updateFields.push(`attempt_count = $${paramCount++}`);
      values.push(updates.attemptCount);
    }

    // Time
    if (updates.timeSpentSeconds !== undefined) {
      updateFields.push(`time_spent_seconds = $${paramCount++}`);
      values.push(updates.timeSpentSeconds);
    }

    // AI config
    if (updates.aiConfig !== undefined) {
      updateFields.push(`ai_config = $${paramCount++}`);
      values.push(JSON.stringify(updates.aiConfig));
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

    values.push(id);

    const query = `
      UPDATE tasks
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const { rows } = await this.pool.query<DBTask>(query, values);

    if (!rows[0]) {
      throw new Error('Task not found');
    }

    return this.toTask(rows[0]);
  }

  async updateStatus(id: string, status: TaskStatus): Promise<void> {
    let additionalUpdates = '';

    if (status === 'active') {
      additionalUpdates = ', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)';
    } else if (status === 'completed') {
      additionalUpdates = ', completed_at = CURRENT_TIMESTAMP';
    }

    const query = `
      UPDATE tasks
      SET status = $1${additionalUpdates},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.pool.query(query, [status, id]);
  }

  // Add interaction to task
  async addInteraction(taskId: string, interaction: IInteraction): Promise<void> {
    const getTaskQuery = `
      SELECT interactions FROM tasks WHERE id = $1
    `;

    const { rows } = await this.pool.query(getTaskQuery, [taskId]);

    if (!rows[0]) {
      throw new Error('Task not found');
    }

    const currentInteractions = rows[0].interactions as IInteraction[];
    currentInteractions.push(interaction);

    const updateQuery = `
      UPDATE tasks
      SET interactions = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.pool.query(updateQuery, [
      JSON.stringify(currentInteractions),
      taskId
    ]);
  }

  // Record attempt (updates score and increments attempt count)
  async recordAttempt(id: string, attempt: AttemptData): Promise<void> {
    const query = `
      UPDATE tasks
      SET attempt_count = attempt_count + 1,
          score = GREATEST(score, $1),
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{userResponse}',
            $2::jsonb
          ),
          time_spent_seconds = time_spent_seconds + $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `;

    await this.pool.query(query, [
      attempt.score || 0,
      JSON.stringify(attempt.response),
      attempt.timeSpent,
      id
    ]);
  }

  // Update time spent
  async updateTimeSpent(id: string, additionalSeconds: number): Promise<void> {
    const query = `
      UPDATE tasks
      SET time_spent_seconds = time_spent_seconds + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.pool.query(query, [additionalSeconds, id]);
  }

  // Get current active task for a program
  async getCurrentTask(programId: string): Promise<ITask | null> {
    const query = `
      SELECT t.*
      FROM tasks t
      JOIN programs p ON t.program_id = p.id
      WHERE t.program_id = $1
        AND t.task_index = p.current_task_index
      LIMIT 1
    `;

    const { rows } = await this.pool.query<DBTask>(query, [programId]);
    return rows[0] ? this.toTask(rows[0]) : null;
  }

  // Get tasks by type
  async findByType(type: TaskType, programId?: string): Promise<ITask[]> {
    let query = `
      SELECT * FROM tasks
      WHERE type = $1
    `;
    const params: unknown[] = [type];

    if (programId) {
      query += ` AND program_id = $2`;
      params.push(programId);
    }

    query += ` ORDER BY task_index ASC`;

    const { rows } = await this.pool.query<DBTask>(query, params);
    return rows.map(row => this.toTask(row));
  }

  // Get tasks by status
  async findByStatus(status: TaskStatus, programId?: string): Promise<ITask[]> {
    let query = `
      SELECT * FROM tasks
      WHERE status = $1
    `;
    const params: unknown[] = [status];

    if (programId) {
      query += ` AND program_id = $2`;
      params.push(programId);
    }

    query += ` ORDER BY task_index ASC`;

    const { rows } = await this.pool.query<DBTask>(query, params);
    return rows.map(row => this.toTask(row));
  }

  /**
   * Get task with interactions populated
   */
  async getTaskWithInteractions(id: string): Promise<ITask | null> {
    // Since interactions are already stored in the task table as JSONB,
    // we can just use findById which already includes interactions
    return this.findById(id);
  }
}
