/**
 * Base Repository Implementation for PostgreSQL
 * Provides common CRUD operations for all entities
 */

import {
  BaseEntity,
  BaseRepository,
  DatabaseConnection,
  QueryOptions,
  QueryResult,
  FilterParams,
} from '../interfaces';

export abstract class BaseRepositoryImpl<T extends BaseEntity> implements BaseRepository<T> {
  protected constructor(
    protected readonly db: DatabaseConnection,
    protected readonly tableName: string,
    protected readonly cacheEnabled: boolean = true
  ) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    return this.db.queryOne<T>(query, [id]);
  }

  /**
   * Find all entities with optional filtering, sorting, and pagination
   */
  async findAll(options?: QueryOptions): Promise<QueryResult<T>> {
    const { query, params, countQuery, countParams } = this.buildQuery(options);
    
    // Execute count query for total
    const [{ count }] = await this.db.query<{ count: string }>(countQuery, countParams);
    const total = parseInt(count, 10);
    
    // Execute main query
    const data = await this.db.query<T>(query, params);
    
    return {
      data,
      total,
      hasMore: options?.pagination ? 
        (options.pagination.offset || 0) + data.length < total : false,
      nextCursor: this.generateNextCursor(data, options),
    };
  }

  /**
   * Create new entity
   */
  async create(data: Omit<T, keyof BaseEntity>): Promise<T> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    
    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    const result = await this.db.queryOne<T>(query, values);
    if (!result) {
      throw new Error('Failed to create entity');
    }
    
    return result;
  }

  /**
   * Update entity
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.db.queryOne<T>(query, [id, ...values]);
    if (!result) {
      throw new Error(`Entity with id ${id} not found`);
    }
    
    return result;
  }

  /**
   * Delete entity
   */
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await this.db.execute(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const query = `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE id = $1)`;
    const result = await this.db.queryOne<{ exists: boolean }>(query, [id]);
    return result?.exists || false;
  }

  /**
   * Build SQL query from options
   */
  protected buildQuery(options?: QueryOptions): {
    query: string;
    params: unknown[];
    countQuery: string;
    countParams: unknown[];
  } {
    let query = `SELECT * FROM ${this.tableName}`;
    let countQuery = `SELECT COUNT(*) FROM ${this.tableName}`;
    const whereClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build WHERE clause from filters
    if (options?.filters) {
      const filterClauses = this.buildFilterClauses(options.filters, paramIndex);
      whereClauses.push(...filterClauses.clauses);
      params.push(...filterClauses.values);
      paramIndex += filterClauses.values.length;
    }

    // Apply WHERE clauses
    if (whereClauses.length > 0) {
      const whereClause = ` WHERE ${whereClauses.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    // Apply sorting
    if (options?.sort) {
      query += ` ORDER BY ${options.sort.field} ${options.sort.direction.toUpperCase()}`;
    } else {
      query += ` ORDER BY created_at DESC`; // Default sort
    }

    // Apply pagination
    if (options?.pagination) {
      if (options.pagination.limit) {
        query += ` LIMIT ${options.pagination.limit}`;
      }
      if (options.pagination.offset) {
        query += ` OFFSET ${options.pagination.offset}`;
      }
    }

    return {
      query,
      params,
      countQuery,
      countParams: params, // Same params for count query
    };
  }

  /**
   * Build filter clauses from filter params
   */
  protected buildFilterClauses(
    filters: FilterParams,
    startIndex: number
  ): { clauses: string[]; values: unknown[] } {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = startIndex;

    for (const [field, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        // IN clause for arrays
        const placeholders = value.map((_, i) => `$${paramIndex + i}`);
        clauses.push(`${field} IN (${placeholders.join(', ')})`);
        values.push(...value);
        paramIndex += value.length;
      } else if (typeof value === 'object' && value !== null && '$gte' in value) {
        // Range queries
        const rangeValue = value as { $gte?: unknown; $lte?: unknown };
        if (rangeValue.$gte !== undefined) {
          clauses.push(`${field} >= $${paramIndex}`);
          values.push(rangeValue.$gte);
          paramIndex++;
        }
        if (rangeValue.$lte !== undefined) {
          clauses.push(`${field} <= $${paramIndex}`);
          values.push(rangeValue.$lte);
          paramIndex++;
        }
      } else if (typeof value === 'object' && value !== null && '$like' in value) {
        // LIKE queries
        clauses.push(`${field} LIKE $${paramIndex}`);
        const likeValue = value as { $like: string };
        values.push(likeValue.$like);
        paramIndex++;
      } else if (typeof value === 'object' && value !== null && '$jsonb' in value) {
        // JSONB containment queries
        clauses.push(`${field} @> $${paramIndex}::jsonb`);
        const jsonbValue = value as { $jsonb: unknown };
        values.push(JSON.stringify(jsonbValue.$jsonb));
        paramIndex++;
      } else {
        // Exact match
        clauses.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    return { clauses, values };
  }

  /**
   * Generate next cursor for pagination
   */
  protected generateNextCursor(data: T[], options?: QueryOptions): string | undefined {
    if (!options?.pagination || data.length === 0) {
      return undefined;
    }

    const currentOffset = options.pagination.offset || 0;
    const limit = options.pagination.limit || 10;
    
    if (data.length < limit) {
      return undefined; // No more data
    }

    // Simple cursor: encode next offset
    const nextOffset = currentOffset + limit;
    return Buffer.from(JSON.stringify({ offset: nextOffset })).toString('base64');
  }

  /**
   * Parse cursor for pagination
   */
  protected parseCursor(cursor: string): { offset: number } {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return { offset: 0 };
    }
  }
}