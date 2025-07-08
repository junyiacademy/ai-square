/**
 * Project Repository
 * Handles data persistence for projects (scenarios)
 */

import { BaseRepository } from '../core/base-repository';
import { Project, QueryFilters, PaginatedResponse, BaseEntity } from '../types';
import { DatabaseConnection, QueryBuilder } from '../utils/database';

export class ProjectRepositoryV2 extends BaseRepository<Project> {
  protected tableName = 'projects_v2';
  protected entityName = 'project';
  
  constructor(private db: DatabaseConnection) {
    super();
  }

  async create(data: Omit<Project, keyof BaseEntity>): Promise<Project> {
    const id = this.generateId();
    const now = this.getCurrentTimestamp();
    
    const { sql, params } = QueryBuilder.insert(this.tableName, {
      id,
      ...data,
      created_at: now,
      updated_at: now
    });
    
    const result = await this.db.query<Project>(sql, params);
    return result.rows[0];
  }

  async createMany(data: Omit<Project, keyof BaseEntity>[]): Promise<Project[]> {
    const projects = await Promise.all(data.map(item => this.create(item)));
    return projects;
  }

  async findById(id: string): Promise<Project | null> {
    const query = new QueryBuilder(this.tableName)
      .where('id', '=', id)
      .build();
    
    const result = await this.db.query<Project>(query.sql, query.params);
    return result.rows[0] || null;
  }

  async findByIds(ids: string[]): Promise<Project[]> {
    if (ids.length === 0) return [];
    
    const query = new QueryBuilder(this.tableName)
      .whereIn('id', ids)
      .build();
    
    const result = await this.db.query<Project>(query.sql, query.params);
    return result.rows;
  }

  async findOne(filters: Partial<Project>): Promise<Project | null> {
    const query = new QueryBuilder(this.tableName);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        query.where(key, '=', value);
      }
    });
    
    query.limit(1);
    const { sql, params } = query.build();
    
    const result = await this.db.query<Project>(sql, params);
    return result.rows[0] || null;
  }

  async findMany(filters: QueryFilters): Promise<PaginatedResponse<Project>> {
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
    const result = await this.db.query<Project>(sql, params);
    
    return this.buildPaginationMetadata(result.rows, totalItems, page, pageSize);
  }

  async findAll(): Promise<Project[]> {
    const query = new QueryBuilder(this.tableName)
      .where('is_active', '=', true)
      .orderBy('title', 'ASC')
      .build();
    
    const result = await this.db.query<Project>(query.sql, query.params);
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

  async count(filters?: Partial<Project>): Promise<number> {
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

  async update(id: string, data: Partial<Omit<Project, keyof BaseEntity>>): Promise<Project> {
    const updateData = {
      ...data,
      updated_at: this.getCurrentTimestamp()
    };
    
    const { sql, params } = QueryBuilder.update(this.tableName, id, updateData);
    const result = await this.db.query<Project>(sql, params);
    
    if (result.rowCount === 0) {
      throw new Error(`Project not found with id: ${id}`);
    }
    
    return result.rows[0];
  }

  async updateMany(ids: string[], data: Partial<Omit<Project, keyof BaseEntity>>): Promise<Project[]> {
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
    // For soft delete, we would typically set a deleted_at timestamp
    // For now, we'll use regular delete
    return this.delete(id);
  }

  async softDeleteMany(ids: string[]): Promise<number> {
    // For soft delete, we would typically set deleted_at timestamps
    // For now, we'll use regular delete
    return this.deleteMany(ids);
  }

  async transaction<R>(callback: () => Promise<R>): Promise<R> {
    return this.db.transaction(async () => callback());
  }

  /**
   * Custom methods for Project entity
   */
  async findByCode(code: string): Promise<Project | null> {
    return this.findOne({ code });
  }

  async findByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): Promise<Project[]> {
    const query = new QueryBuilder(this.tableName)
      .where('difficulty', '=', difficulty)
      .where('is_active', '=', true)
      .orderBy('title', 'ASC')
      .build();
    
    const result = await this.db.query<Project>(query.sql, query.params);
    return result.rows;
  }

  async findByDomain(domain: string): Promise<Project[]> {
    // This would require a JSON contains query for the target_domains array
    // For now, returning empty array as a placeholder
    // In a real implementation, this would use PostgreSQL's @> operator
    return [];
  }
}