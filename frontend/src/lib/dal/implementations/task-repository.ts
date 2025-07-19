/**
 * Task Repository Implementation
 * Handles all database operations for learning tasks
 */

import { BaseRepositoryImpl } from './base-repository';
import {
  Task,
  TaskRepository,
  DatabaseConnection,
  QueryOptions,
  QueryResult,
} from '../interfaces';

export class TaskRepositoryImpl extends BaseRepositoryImpl<Task> implements TaskRepository {
  constructor(db: DatabaseConnection) {
    super(db, 'tasks');
  }

  /**
   * Find all tasks for a specific program
   */
  async findByProgram(programId: string, options?: QueryOptions): Promise<QueryResult<Task>> {
    const baseOptions: QueryOptions = {
      ...options,
      filters: {
        ...options?.filters,
        program_id: programId,
      },
      sort: options?.sort || { field: 'task_index', direction: 'asc' },
    };

    return this.findAll(baseOptions);
  }

  /**
   * Find a specific task by program and index
   */
  async findByProgramAndIndex(programId: string, taskIndex: number): Promise<Task | null> {
    const query = `
      SELECT * FROM tasks 
      WHERE program_id = $1 AND task_index = $2
    `;

    return this.db.queryOne<Task>(query, [programId, taskIndex]);
  }

  /**
   * Add an interaction to a task
   */
  async addInteraction(id: string, interaction: Record<string, unknown>): Promise<Task> {
    // First, insert into interactions table
    const interactionQuery = `
      INSERT INTO interactions (
        task_id, 
        type, 
        role, 
        content, 
        tokens_used, 
        model_used, 
        response_time_ms,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    await this.db.query(interactionQuery, [
      id,
      interaction.type || 'user_input',
      interaction.role,
      interaction.content,
      interaction.tokens_used,
      interaction.model_used,
      interaction.response_time_ms,
      JSON.stringify(interaction.metadata || {}),
    ]);

    // Update task's last activity
    const updateQuery = `
      UPDATE tasks 
      SET 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.queryOne<Task>(updateQuery, [id]);
    if (!result) {
      throw new Error(`Task with id ${id} not found`);
    }

    return result;
  }

  /**
   * Complete a task with score and solution
   */
  async complete(id: string, score: number, solution?: string): Promise<Task> {
    const query = `
      UPDATE tasks 
      SET 
        status = 'completed',
        score = $2,
        user_solution = $3,
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.queryOne<Task>(query, [id, score, solution]);
    if (!result) {
      throw new Error(`Task with id ${id} not found`);
    }

    return result;
  }

  /**
   * Start a task
   */
  async start(id: string): Promise<Task> {
    const query = `
      UPDATE tasks 
      SET 
        status = 'active',
        started_at = CASE 
          WHEN started_at IS NULL THEN CURRENT_TIMESTAMP 
          ELSE started_at 
        END,
        attempt_count = attempt_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.queryOne<Task>(query, [id]);
    if (!result) {
      throw new Error(`Task with id ${id} not found`);
    }

    return result;
  }

  /**
   * Update time spent on a task
   */
  async updateTimeSpent(id: string, additionalSeconds: number): Promise<Task> {
    const query = `
      UPDATE tasks 
      SET 
        time_spent_seconds = COALESCE(time_spent_seconds, 0) + $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.queryOne<Task>(query, [id, additionalSeconds]);
    if (!result) {
      throw new Error(`Task with id ${id} not found`);
    }

    return result;
  }

  /**
   * Skip a task
   */
  async skip(id: string): Promise<Task> {
    const query = `
      UPDATE tasks 
      SET 
        status = 'skipped',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.queryOne<Task>(query, [id]);
    if (!result) {
      throw new Error(`Task with id ${id} not found`);
    }

    return result;
  }

  /**
   * Get all interactions for a task
   */
  async getInteractions(taskId: string): Promise<Record<string, unknown>[]> {
    const query = `
      SELECT * FROM interactions 
      WHERE task_id = $1 
      ORDER BY timestamp ASC
    `;

    return this.db.query(query, [taskId]);
  }

  /**
   * Get task statistics for a program
   */
  async getProgramTaskStats(programId: string): Promise<{
    total: number;
    completed: number;
    skipped: number;
    averageScore: number;
    totalTimeSpent: number;
  }> {
    const query = `
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed,
        COUNT(CASE WHEN status = 'skipped' THEN 1 END)::int as skipped,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN score END), 0) as average_score,
        COALESCE(SUM(time_spent_seconds), 0)::int as total_time_spent
      FROM tasks
      WHERE program_id = $1
    `;

    const result = await this.db.queryOne<{
      total: number;
      completed: number;
      skipped: number;
      average_score: number;
      total_time_spent: number;
    }>(query, [programId]);
    
    return {
      total: result.total,
      completed: result.completed,
      skipped: result.skipped,
      averageScore: parseFloat(result.average_score),
      totalTimeSpent: result.total_time_spent,
    };
  }

  /**
   * Create tasks for a new program from scenario definition
   */
  async createTasksFromScenario(programId: string, scenarioTasks: Record<string, unknown>[]): Promise<Task[]> {
    const tasks: Task[] = [];

    for (let i = 0; i < scenarioTasks.length; i++) {
      const scenarioTask = scenarioTasks[i];
      
      const task = await this.create({
        program_id: programId,
        task_index: i,
        scenario_task_index: i,
        status: 'pending',
        title: scenarioTask.title || { en: `Task ${i + 1}` },
        description: scenarioTask.description || { en: '' },
        instructions: scenarioTask.instructions || {},
        type: scenarioTask.type || 'unknown',
        ksa_codes: scenarioTask.ksaCodes || [],
        expected_duration: scenarioTask.expectedDuration,
        allowed_attempts: scenarioTask.allowedAttempts || 3,
        context: scenarioTask.context || {},
        metadata: scenarioTask.metadata || {},
      });

      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Get the next pending task for a program
   */
  async getNextPendingTask(programId: string): Promise<Task | null> {
    const query = `
      SELECT * FROM tasks 
      WHERE program_id = $1 AND status = 'pending'
      ORDER BY task_index ASC
      LIMIT 1
    `;

    return this.db.queryOne<Task>(query, [programId]);
  }

  /**
   * Batch update task statuses
   */
  async batchUpdateStatus(taskIds: string[], status: Task['status']): Promise<number> {
    if (taskIds.length === 0) return 0;

    const placeholders = taskIds.map((_, i) => `$${i + 2}`).join(', ');
    const query = `
      UPDATE tasks 
      SET 
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `;

    const result = await this.db.execute(query, [status, ...taskIds]);
    return result.rowCount;
  }

  /**
   * Get task performance by KSA code
   */
  async getKsaPerformance(userId: string, ksaCode: string): Promise<{
    tasksAttempted: number;
    tasksCompleted: number;
    averageScore: number;
    totalPracticeTime: number;
  }> {
    const query = `
      SELECT 
        COUNT(DISTINCT t.id)::int as tasks_attempted,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END)::int as tasks_completed,
        COALESCE(AVG(CASE WHEN t.status = 'completed' THEN t.score END), 0) as average_score,
        COALESCE(SUM(t.time_spent_seconds), 0)::int as total_practice_time
      FROM tasks t
      JOIN programs p ON t.program_id = p.id
      WHERE 
        p.user_id = $1 
        AND $2 = ANY(t.ksa_codes)
        AND t.status IN ('completed', 'active')
    `;

    const result = await this.db.queryOne<{
      tasks_attempted: number;
      tasks_completed: number;
      average_score: number;
      total_practice_time: number;
    }>(query, [userId, ksaCode]);
    
    return {
      tasksAttempted: result.tasks_attempted,
      tasksCompleted: result.tasks_completed,
      averageScore: parseFloat(result.average_score),
      totalPracticeTime: result.total_practice_time,
    };
  }
}