/**
 * Track Repository
 * Handles data persistence for learning tracks
 */

import { BaseRepository } from '../core/base-repository';
import { Track, QueryFilters, PaginatedResponse } from '../types';
import { DatabaseConnection, QueryBuilder } from '../utils/database';

export class TrackRepositoryV2 extends BaseRepository<Track> {
  protected tableName = 'tracks_v2';
  protected entityName = 'track';
  
  constructor(private db: DatabaseConnection) {
    super();
  }

  async create(data: Omit<Track, 'id' | 'created_at' | 'updated_at'>): Promise<Track> {
    const id = this.generateId();
    const now = this.getCurrentTimestamp();
    
    const { sql, params } = QueryBuilder.insert(this.tableName, {
      id,
      ...data,
      created_at: now,
      updated_at: now
    });
    
    const result = await this.db.query<Track>(sql, params);
    return result.rows[0];
  }

  async createMany(data: Omit<Track, 'id' | 'created_at' | 'updated_at'>[]): Promise<Track[]> {
    const tracks = await Promise.all(data.map(item => this.create(item)));
    return tracks;
  }

  async findById(id: string): Promise<Track | null> {
    const query = new QueryBuilder(this.tableName)
      .where('id', '=', id)
      .build();
    
    const result = await this.db.query<Track>(query.sql, query.params);
    return result.rows[0] || null;
  }

  async findByIds(ids: string[]): Promise<Track[]> {
    if (ids.length === 0) return [];
    
    const query = new QueryBuilder(this.tableName)
      .whereIn('id', ids)
      .build();
    
    const result = await this.db.query<Track>(query.sql, query.params);
    return result.rows;
  }

  async findOne(filters: Partial<Track>): Promise<Track | null> {
    const query = new QueryBuilder(this.tableName);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        query.where(key, '=', value);
      }
    });
    
    query.limit(1);
    const { sql, params } = query.build();
    
    const result = await this.db.query<Track>(sql, params);
    return result.rows[0] || null;
  }

  async findMany(filters: QueryFilters): Promise<PaginatedResponse<Track>> {
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
    const result = await this.db.query<Track>(sql, params);
    
    return this.buildPaginationMetadata(result.rows, totalItems, page, pageSize);
  }

  async findAll(): Promise<Track[]> {
    const query = new QueryBuilder(this.tableName)
      .orderBy('order_index', 'ASC')
      .build();
    
    const result = await this.db.query<Track>(query.sql, query.params);
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

  async count(filters?: Partial<Track>): Promise<number> {
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

  async update(id: string, data: Partial<Omit<Track, 'id' | 'created_at' | 'updated_at'>>): Promise<Track> {
    const updateData = {
      ...data,
      updated_at: this.getCurrentTimestamp()
    };
    
    const { sql, params } = QueryBuilder.update(this.tableName, id, updateData);
    const result = await this.db.query<Track>(sql, params);
    
    if (result.rowCount === 0) {
      throw new Error(`Track not found with id: ${id}`);
    }
    
    return result.rows[0];
  }

  async updateMany(ids: string[], data: Partial<Omit<Track, 'id' | 'created_at' | 'updated_at'>>): Promise<Track[]> {
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
    
    const query = new QueryBuilder(this.tableName)
      .whereIn('id', ids)
      .build();
    
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
   * Custom methods for Track entity
   */
  async findByCode(code: string): Promise<Track | null> {
    return this.findOne({ code });
  }

  async findActiveTracksInOrder(): Promise<Track[]> {
    const query = new QueryBuilder(this.tableName)
      .where('is_active', '=', true)
      .orderBy('order_index', 'ASC')
      .build();
    
    const result = await this.db.query<Track>(query.sql, query.params);
    return result.rows;
  }

  async reorderTracks(trackOrders: { id: string; order_index: number }[]): Promise<void> {
    await this.transaction(async () => {
      for (const { id, order_index } of trackOrders) {
        await this.update(id, { order_index });
      }
    });
  }

  /**
   * V2 Architecture specific methods
   */
  async findByStructureType(structureType: 'standard' | 'direct_task' | 'single_program'): Promise<Track[]> {
    const query = new QueryBuilder(this.tableName)
      .where('structure_type', '=', structureType)
      .where('is_active', '=', true)
      .orderBy('order_index', 'ASC')
      .build();
    
    const result = await this.db.query<Track>(query.sql, query.params);
    return result.rows;
  }

  async createWithStructure(
    trackData: Omit<Track, 'id' | 'created_at' | 'updated_at'>,
    structure: { programs?: any[], tasks?: any[] }
  ): Promise<Track> {
    // This would be implemented with proper transaction support
    // For now, just create the track
    return this.create(trackData);
  }
}