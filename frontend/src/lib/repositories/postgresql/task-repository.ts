/**
 * PostgreSQL Task Repository
 * 處理所有任務相關的資料庫操作
 */

import { Pool } from 'pg';
import {
  ITaskRepository,
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  TaskStatus,
  AttemptData,
  TaskWithInteractions,
  Interaction
} from '../interfaces';

export class PostgreSQLTaskRepository implements ITaskRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<Task | null> {
    const query = `
      SELECT 
        id, program_id as "programId", task_index as "taskIndex",
        scenario_task_index as "scenarioTaskIndex", status, type,
        expected_duration as "expectedDuration", 
        allowed_attempts as "allowedAttempts",
        context, user_solution as "userSolution", score,
        time_spent_seconds as "timeSpentSeconds",
        attempt_count as "attemptCount",
        started_at as "startedAt", completed_at as "completedAt",
        created_at as "createdAt", updated_at as "updatedAt", metadata
      FROM tasks
      WHERE id = $1
    `;

    const { rows } = await this.pool.query(query, [id]);
    return rows[0] || null;
  }

  async findByProgram(programId: string): Promise<Task[]> {
    const query = `
      SELECT 
        id, program_id as "programId", task_index as "taskIndex",
        scenario_task_index as "scenarioTaskIndex", status, type,
        expected_duration as "expectedDuration", 
        allowed_attempts as "allowedAttempts",
        context, user_solution as "userSolution", score,
        time_spent_seconds as "timeSpentSeconds",
        attempt_count as "attemptCount",
        started_at as "startedAt", completed_at as "completedAt",
        created_at as "createdAt", updated_at as "updatedAt", metadata
      FROM tasks
      WHERE program_id = $1
      ORDER BY task_index ASC
    `;

    const { rows } = await this.pool.query(query, [programId]);
    return rows;
  }

  async create(data: CreateTaskDto): Promise<Task> {
    const query = `
      INSERT INTO tasks (
        program_id, task_index, type, context, allowed_attempts
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id, program_id as "programId", task_index as "taskIndex",
        scenario_task_index as "scenarioTaskIndex", status, type,
        expected_duration as "expectedDuration", 
        allowed_attempts as "allowedAttempts",
        context, user_solution as "userSolution", score,
        time_spent_seconds as "timeSpentSeconds",
        attempt_count as "attemptCount",
        started_at as "startedAt", completed_at as "completedAt",
        created_at as "createdAt", updated_at as "updatedAt", metadata
    `;

    const { rows } = await this.pool.query(query, [
      data.programId,
      data.taskIndex,
      data.type,
      JSON.stringify(data.context),
      data.allowedAttempts || 3
    ]);

    return rows[0];
  }

  async update(id: string, data: UpdateTaskDto): Promise<Task> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
      
      // Set started_at when task becomes active
      if (data.status === 'active') {
        updates.push(`started_at = COALESCE(started_at, CURRENT_TIMESTAMP)`);
      }
      
      // Set completed_at when task is completed
      if (data.status === 'completed') {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (data.score !== undefined) {
      updates.push(`score = $${paramCount++}`);
      values.push(data.score);
    }

    if (data.userSolution !== undefined) {
      updates.push(`user_solution = $${paramCount++}`);
      values.push(data.userSolution);
    }

    if (data.timeSpentSeconds !== undefined) {
      updates.push(`time_spent_seconds = $${paramCount++}`);
      values.push(data.timeSpentSeconds);
    }

    if (data.attemptCount !== undefined) {
      updates.push(`attempt_count = $${paramCount++}`);
      values.push(data.attemptCount);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id, program_id as "programId", task_index as "taskIndex",
        scenario_task_index as "scenarioTaskIndex", status, type,
        expected_duration as "expectedDuration", 
        allowed_attempts as "allowedAttempts",
        context, user_solution as "userSolution", score,
        time_spent_seconds as "timeSpentSeconds",
        attempt_count as "attemptCount",
        started_at as "startedAt", completed_at as "completedAt",
        created_at as "createdAt", updated_at as "updatedAt", metadata
    `;

    const { rows } = await this.pool.query(query, values);
    
    if (!rows[0]) {
      throw new Error('Task not found');
    }

    return rows[0];
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

  async recordAttempt(id: string, attempt: AttemptData): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update task with attempt data
      await client.query(`
        UPDATE tasks
        SET attempt_count = attempt_count + 1,
            time_spent_seconds = time_spent_seconds + $1,
            score = GREATEST(score, $2),
            user_solution = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [
        attempt.timeSpent,
        attempt.score || 0,
        JSON.stringify(attempt.response),
        id
      ]);

      // Record interaction if needed
      if (attempt.response) {
        await client.query(`
          INSERT INTO interactions (
            task_id, sequence_number, type, role, content
          ) 
          SELECT $1, COALESCE(MAX(sequence_number), 0) + 1, 'attempt', 'user', $2
          FROM interactions
          WHERE task_id = $1
        `, [id, JSON.stringify(attempt.response)]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTaskWithInteractions(id: string): Promise<TaskWithInteractions | null> {
    const task = await this.findById(id);
    if (!task) return null;

    const interactionsQuery = `
      SELECT 
        id, task_id as "taskId", sequence_number as "sequenceNumber",
        type, role, content, metadata, created_at as "createdAt"
      FROM interactions
      WHERE task_id = $1
      ORDER BY sequence_number ASC
    `;

    const { rows: interactions } = await this.pool.query(interactionsQuery, [id]);

    return {
      ...task,
      interactions
    };
  }

  // Batch create tasks for a program
  async createBatch(programId: string, tasksData: Omit<CreateTaskDto, 'programId'>[]): Promise<Task[]> {
    const client = await this.pool.connect();
    const createdTasks: Task[] = [];

    try {
      await client.query('BEGIN');

      for (const [index, taskData] of tasksData.entries()) {
        const query = `
          INSERT INTO tasks (
            program_id, task_index, type, context, allowed_attempts
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING 
            id, program_id as "programId", task_index as "taskIndex",
            scenario_task_index as "scenarioTaskIndex", status, type,
            expected_duration as "expectedDuration", 
            allowed_attempts as "allowedAttempts",
            context, user_solution as "userSolution", score,
            time_spent_seconds as "timeSpentSeconds",
            attempt_count as "attemptCount",
            started_at as "startedAt", completed_at as "completedAt",
            created_at as "createdAt", updated_at as "updatedAt", metadata
        `;

        const { rows } = await client.query(query, [
          programId,
          taskData.taskIndex || index,
          taskData.type,
          JSON.stringify(taskData.context),
          taskData.allowedAttempts || 3
        ]);

        createdTasks.push(rows[0]);
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

  // Get current active task for a program
  async getCurrentTask(programId: string): Promise<Task | null> {
    const query = `
      SELECT 
        t.id, t.program_id as "programId", t.task_index as "taskIndex",
        t.scenario_task_index as "scenarioTaskIndex", t.status, t.type,
        t.expected_duration as "expectedDuration", 
        t.allowed_attempts as "allowedAttempts",
        t.context, t.user_solution as "userSolution", t.score,
        t.time_spent_seconds as "timeSpentSeconds",
        t.attempt_count as "attemptCount",
        t.started_at as "startedAt", t.completed_at as "completedAt",
        t.created_at as "createdAt", t.updated_at as "updatedAt", t.metadata
      FROM tasks t
      JOIN programs p ON t.program_id = p.id
      WHERE t.program_id = $1 
        AND t.task_index = p.current_task_index
      LIMIT 1
    `;

    const { rows } = await this.pool.query(query, [programId]);
    return rows[0] || null;
  }

  // Add interaction to task
  async addInteraction(taskId: string, interaction: Omit<Interaction, 'id' | 'taskId' | 'createdAt'>): Promise<void> {
    const query = `
      INSERT INTO interactions (
        task_id, sequence_number, type, role, content, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.pool.query(query, [
      taskId,
      interaction.sequenceNumber,
      interaction.type,
      interaction.role,
      interaction.content,
      JSON.stringify(interaction.metadata || {})
    ]);
  }
}