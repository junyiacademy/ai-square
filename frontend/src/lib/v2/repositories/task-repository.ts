/**
 * Task Repository
 * Handles data persistence for tasks within programs
 */

import { BaseRepository } from '../core/base-repository';
import { Task, QueryFilters, PaginatedResponse, BaseEntity } from '../types';
import { DatabaseConnection, QueryBuilder } from '../utils/database';

export class TaskRepositoryV2 extends BaseRepository<Task> {
  protected tableName = 'tasks_v2';
  protected entityName = 'task';
  
  constructor(private db: DatabaseConnection) {
    super();
  }

  async create(data: Omit<Task, keyof BaseEntity>): Promise<Task> {
    const id = this.generateId();
    const now = this.getCurrentTimestamp();
    
    const { sql, params } = QueryBuilder.insert(this.tableName, {
      id,
      ...data,
      created_at: now,
      updated_at: now
    });
    
    const result = await this.db.query<Task>(sql, params);
    return result.rows[0];
  }

  async createMany(data: Omit<Task, keyof BaseEntity>[]): Promise<Task[]> {
    const tasks = await Promise.all(data.map(item => this.create(item)));
    return tasks;
  }

  async findById(id: string): Promise<Task | null> {
    const query = new QueryBuilder(this.tableName)
      .where('id', '=', id)
      .build();
    
    const result = await this.db.query<Task>(query.sql, query.params);
    return result.rows[0] || null;
  }

  async findByIds(ids: string[]): Promise<Task[]> {
    if (ids.length === 0) return [];
    
    const query = new QueryBuilder(this.tableName)
      .whereIn('id', ids)
      .build();
    
    const result = await this.db.query<Task>(query.sql, query.params);
    return result.rows;
  }

  async findOne(filters: Partial<Task>): Promise<Task | null> {
    const query = new QueryBuilder(this.tableName);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        query.where(key, '=', value);
      }
    });
    
    query.limit(1);
    const { sql, params } = query.build();
    
    const result = await this.db.query<Task>(sql, params);
    return result.rows[0] || null;
  }

  async findMany(filters: QueryFilters): Promise<PaginatedResponse<Task>> {
    const { page, pageSize, orderBy, orderDirection, search, filters: customFilters } = this.applyDefaultFilters(filters);
    
    // Build count query
    const countQuery = new QueryBuilder(this.tableName);
    
    // Apply search
    if (search) {
      countQuery.where('title', 'ILIKE', `%${search}%`);
    }
    
    // Apply custom filters
    if (customFilters) {
      Object.entries(customFilters).forEach(([key, value]) => {
        if (value !== undefined) {
          countQuery.where(key, '=', value);
        }
      });
    }
    
    const countSql = countQuery.build().sql.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await this.db.query<{ count: string }>(countSql, countQuery.build().params);
    const totalItems = parseInt(countResult.rows[0]?.count || '0');
    
    // Build data query
    const dataQuery = new QueryBuilder(this.tableName);
    
    // Apply search
    if (search) {
      dataQuery.where('title', 'ILIKE', `%${search}%`);
    }
    
    // Apply custom filters
    if (customFilters) {
      Object.entries(customFilters).forEach(([key, value]) => {
        if (value !== undefined) {
          dataQuery.where(key, '=', value);
        }
      });
    }
    
    // Apply ordering and pagination
    dataQuery
      .orderBy(orderBy, orderDirection.toUpperCase() as 'ASC' | 'DESC')
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    
    const { sql, params } = dataQuery.build();
    const result = await this.db.query<Task>(sql, params);
    
    return this.buildPaginationMetadata(result.rows, totalItems, page, pageSize);
  }

  async findAll(): Promise<Task[]> {
    const query = new QueryBuilder(this.tableName)
      .orderBy('order_index', 'ASC')
      .build();
    
    const result = await this.db.query<Task>(query.sql, query.params);
    return result.rows;
  }

  async exists(id: string): Promise<boolean> {
    const query = new QueryBuilder(this.tableName)
      .select('id')
      .where('id', '=', id)
      .limit(1)
      .build();
    
    const result = await this.db.query<{ id: string }>(query.sql, query.params);
    return result.rowCount > 0;
  }

  async count(filters?: Partial<Task>): Promise<number> {
    const query = new QueryBuilder(this.tableName);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          query.where(key, '=', value);
        }
      });
    }
    
    const { sql, params } = query.build();
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)');
    const result = await this.db.query<{ count: string }>(countSql, params);
    
    return parseInt(result.rows[0]?.count || '0');
  }

  async update(id: string, data: Partial<Omit<Task, keyof BaseEntity>>): Promise<Task> {
    const updateData = {
      ...data,
      updated_at: this.getCurrentTimestamp()
    };
    
    const { sql, params } = QueryBuilder.update(this.tableName, id, updateData);
    const result = await this.db.query<Task>(sql, params);
    
    if (result.rowCount === 0) {
      throw new Error(`Task not found with id: ${id}`);
    }
    
    return result.rows[0];
  }

  async updateMany(ids: string[], data: Partial<Omit<Task, keyof BaseEntity>>): Promise<Task[]> {
    const updates = await Promise.all(ids.map(id => this.update(id, data)));
    return updates;
  }

  async delete(id: string): Promise<boolean> {
    const { sql, params } = QueryBuilder.delete(this.tableName, id);
    const result = await this.db.query(sql, params);
    return result.rowCount > 0;
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    const deleteSql = `DELETE FROM ${this.tableName} WHERE id IN (${ids.map((_, i) => `$${i + 1}`).join(', ')})`;
    const result = await this.db.query(deleteSql, ids);
    
    return result.rowCount;
  }

  async softDelete(id: string): Promise<boolean> {
    return this.delete(id);
  }

  async softDeleteMany(ids: string[]): Promise<number> {
    return this.deleteMany(ids);
  }

  async transaction<R>(callback: () => Promise<R>): Promise<R> {
    return this.db.transaction(async () => callback());
  }

  /**
   * Custom methods for Task entity
   */
  async findByProgram(programId: string): Promise<Task[]> {
    const query = new QueryBuilder(this.tableName)
      .where('program_id', '=', programId)
      .where('is_active', '=', true)
      .orderBy('order_index', 'ASC')
      .build();
    
    const result = await this.db.query<Task>(query.sql, query.params);
    return result.rows;
  }

  async findByProgramAndCode(programId: string, code: string): Promise<Task | null> {
    return this.findOne({ program_id: programId, code });
  }

  async findByType(taskType: 'learning' | 'practice' | 'assessment'): Promise<Task[]> {
    const query = new QueryBuilder(this.tableName)
      .where('task_type', '=', taskType)
      .where('is_active', '=', true)
      .orderBy('title', 'ASC')
      .build();
    
    const result = await this.db.query<Task>(query.sql, query.params);
    return result.rows;
  }

  async reorderTasks(taskOrders: { id: string; order_index: number }[]): Promise<void> {
    await this.transaction(async () => {
      for (const { id, order_index } of taskOrders) {
        await this.update(id, { order_index });
      }
    });
  }

  /**
   * V2 Architecture specific methods
   */
  async findByVariant(variant: 'standard' | 'question' | 'exploration' | 'assessment'): Promise<Task[]> {
    const query = new QueryBuilder(this.tableName)
      .where('task_variant', '=', variant)
      .where('is_active', '=', true)
      .orderBy('created_at', 'DESC')
      .build();
    
    const result = await this.db.query<Task>(query.sql, query.params);
    return result.rows;
  }

  async createFlexibleTask(
    programId: string,
    data: Partial<Omit<Task, keyof BaseEntity | 'program_id'>>
  ): Promise<Task> {
    return this.create({
      program_id: programId,
      code: data.code || `task_${Date.now()}`,
      title: data.title || 'New Task',
      description: data.description || '',
      instructions: data.instructions || '',
      order_index: data.order_index || 0,
      is_active: true,
      task_type: data.task_type || 'learning',
      task_variant: data.task_variant || 'standard',
      ...data
    });
  }

  async createQuestionTask(
    programId: string,
    question: string,
    options?: { type?: string; choices?: string[]; context?: any }
  ): Promise<Task> {
    return this.createFlexibleTask(programId, {
      title: question,
      description: question,
      instructions: options?.type === 'multiple_choice' 
        ? `Choose the best answer from the options provided.`
        : `Please provide your answer below.`,
      task_variant: 'question',
      task_type: 'assessment',
      metadata: {
        question_type: options?.type || 'short_answer',
        choices: options?.choices,
        ...options?.context
      }
    });
  }
}