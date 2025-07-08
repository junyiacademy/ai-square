/**
 * Log Repository
 * Handles data persistence for task logs
 */

import { BaseRepository } from '../core/base-repository';
import { TaskLog, QueryFilters, PaginatedResponse, BaseEntity } from '../types';
import { DatabaseConnection, QueryBuilder } from '../utils/database';

export class LogRepositoryV2 extends BaseRepository<TaskLog> {
  protected tableName = 'task_logs_v2';
  protected entityName = 'log';
  
  constructor(private db: DatabaseConnection) {
    super();
  }

  async create(data: Omit<TaskLog, keyof BaseEntity>): Promise<TaskLog> {
    const id = this.generateId();
    const now = this.getCurrentTimestamp();
    
    const { sql, params } = QueryBuilder.insert(this.tableName, {
      id,
      ...data,
      created_at: now,
      updated_at: now
    });
    
    const result = await this.db.query<TaskLog>(sql, params);
    return result.rows[0];
  }

  async createMany(data: Omit<TaskLog, keyof BaseEntity>[]): Promise<TaskLog[]> {
    const logs = await Promise.all(data.map(item => this.create(item)));
    return logs;
  }

  async findById(id: string): Promise<TaskLog | null> {
    const query = new QueryBuilder(this.tableName)
      .where('id', '=', id)
      .build();
    
    const result = await this.db.query<TaskLog>(query.sql, query.params);
    return result.rows[0] || null;
  }

  async findByIds(ids: string[]): Promise<TaskLog[]> {
    if (ids.length === 0) return [];
    
    const query = new QueryBuilder(this.tableName)
      .whereIn('id', ids)
      .build();
    
    const result = await this.db.query<TaskLog>(query.sql, query.params);
    return result.rows;
  }

  async findOne(filters: Partial<TaskLog>): Promise<TaskLog | null> {
    const query = new QueryBuilder(this.tableName);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        query.where(key, '=', value);
      }
    });
    
    query.limit(1);
    const { sql, params } = query.build();
    
    const result = await this.db.query<TaskLog>(sql, params);
    return result.rows[0] || null;
  }

  async findMany(filters: QueryFilters): Promise<PaginatedResponse<TaskLog>> {
    const { page, pageSize, orderBy, orderDirection, search, filters: customFilters } = this.applyDefaultFilters(filters);
    
    // Build count query
    const countQuery = new QueryBuilder(this.tableName);
    
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
    const result = await this.db.query<TaskLog>(sql, params);
    
    return this.buildPaginationMetadata(result.rows, totalItems, page, pageSize);
  }

  async findAll(): Promise<TaskLog[]> {
    const query = new QueryBuilder(this.tableName)
      .orderBy('created_at', 'DESC')
      .build();
    
    const result = await this.db.query<TaskLog>(query.sql, query.params);
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

  async count(filters?: Partial<TaskLog>): Promise<number> {
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

  async update(id: string, data: Partial<Omit<TaskLog, keyof BaseEntity>>): Promise<TaskLog> {
    const updateData = {
      ...data,
      updated_at: this.getCurrentTimestamp()
    };
    
    const { sql, params } = QueryBuilder.update(this.tableName, id, updateData);
    const result = await this.db.query<TaskLog>(sql, params);
    
    if (result.rowCount === 0) {
      throw new Error(`Log not found with id: ${id}`);
    }
    
    return result.rows[0];
  }

  async updateMany(ids: string[], data: Partial<Omit<TaskLog, keyof BaseEntity>>): Promise<TaskLog[]> {
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
   * Custom methods for TaskLog entity
   */
  async findByTaskProgress(taskProgressId: string): Promise<TaskLog[]> {
    const query = new QueryBuilder(this.tableName)
      .where('task_progress_id', '=', taskProgressId)
      .orderBy('created_at', 'ASC')
      .build();
    
    const result = await this.db.query<TaskLog>(query.sql, query.params);
    return result.rows;
  }

  async findByUser(userId: string): Promise<TaskLog[]> {
    const query = new QueryBuilder(this.tableName)
      .where('user_id', '=', userId)
      .orderBy('created_at', 'DESC')
      .build();
    
    const result = await this.db.query<TaskLog>(query.sql, query.params);
    return result.rows;
  }

  async findByType(logType: 'chat' | 'submission' | 'evaluation' | 'system'): Promise<TaskLog[]> {
    const query = new QueryBuilder(this.tableName)
      .where('log_type', '=', logType)
      .orderBy('created_at', 'DESC')
      .build();
    
    const result = await this.db.query<TaskLog>(query.sql, query.params);
    return result.rows;
  }

  async findByUserAndType(userId: string, logType: 'chat' | 'submission' | 'evaluation' | 'system'): Promise<TaskLog[]> {
    const query = new QueryBuilder(this.tableName)
      .where('user_id', '=', userId)
      .where('log_type', '=', logType)
      .orderBy('created_at', 'DESC')
      .build();
    
    const result = await this.db.query<TaskLog>(query.sql, query.params);
    return result.rows;
  }

  async getLatestLog(taskProgressId: string, logType?: 'chat' | 'submission' | 'evaluation' | 'system'): Promise<TaskLog | null> {
    const query = new QueryBuilder(this.tableName)
      .where('task_progress_id', '=', taskProgressId);
    
    if (logType) {
      query.where('log_type', '=', logType);
    }
    
    query
      .orderBy('created_at', 'DESC')
      .limit(1);
    
    const { sql, params } = query.build();
    const result = await this.db.query<TaskLog>(sql, params);
    
    return result.rows[0] || null;
  }
}