/**
 * Enhanced Base Repository
 * Provides common functionality for all repositories with advanced features
 */

import { Pool, PoolClient } from 'pg';
import { cacheInvalidationService } from '@/lib/cache/cache-invalidation-service';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { TTL } from '@/lib/cache/cache-keys';
import type {
  IBulkOperations,
  IQueryOperations,
  ICacheAwareOperations,
  ITransactionalOperations
} from '../interfaces/extended';

export abstract class EnhancedBaseRepository<T extends { id: string }>
  implements IBulkOperations<T>, IQueryOperations<T>, ICacheAwareOperations, ITransactionalOperations {

  protected currentTransaction: PoolClient | null = null;
  protected cachePrefix: string;
  protected entityName: string;

  constructor(
    protected pool: Pool,
    protected tableName: string,
    entityName: string
  ) {
    this.entityName = entityName;
    this.cachePrefix = `${entityName}:`;
  }

  // ========================================
  // Abstract methods to be implemented
  // ========================================

  protected abstract toEntity(row: Record<string, unknown>): T;
  protected abstract toDatabase(entity: Partial<T>): Record<string, unknown>;

  // ========================================
  // Transaction Management
  // ========================================

  async withTransaction<R>(callback: () => Promise<R>): Promise<R> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      this.currentTransaction = client;

      const result = await callback();

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      this.currentTransaction = null;
      client.release();
    }
  }

  async beginTransaction(): Promise<void> {
    if (this.currentTransaction) {
      throw new Error('Transaction already in progress');
    }

    const client = await this.pool.connect();
    await client.query('BEGIN');
    this.currentTransaction = client;
  }

  async commitTransaction(): Promise<void> {
    if (!this.currentTransaction) {
      throw new Error('No transaction in progress');
    }

    await this.currentTransaction.query('COMMIT');
    this.currentTransaction.release();
    this.currentTransaction = null;
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.currentTransaction) {
      throw new Error('No transaction in progress');
    }

    await this.currentTransaction.query('ROLLBACK');
    this.currentTransaction.release();
    this.currentTransaction = null;
  }

  // ========================================
  // Bulk Operations
  // ========================================

  async createBulk(items: Omit<T, 'id'>[]): Promise<T[]> {
    if (items.length === 0) return [];

    return this.withTransaction(async () => {
      const created: T[] = [];

      for (const item of items) {
        const dbData = this.toDatabase(item as Partial<T>);
        const columns = Object.keys(dbData);
        const values = Object.values(dbData);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        const query = `
          INSERT INTO ${this.tableName} (${columns.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;

        const { rows } = await this.getClient().query(query, values);
        created.push(this.toEntity(rows[0]));
      }

      // Invalidate cache after bulk creation
      await this.invalidateCache('bulk-create');

      return created;
    });
  }

  async updateBulk(updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    if (updates.length === 0) return [];

    return this.withTransaction(async () => {
      const updated: T[] = [];

      for (const { id, data } of updates) {
        const dbData = this.toDatabase(data);
        const columns = Object.keys(dbData);
        const values = Object.values(dbData);
        const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');

        const query = `
          UPDATE ${this.tableName}
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `;

        const { rows } = await this.getClient().query(query, [id, ...values]);
        if (rows[0]) {
          updated.push(this.toEntity(rows[0]));
          await this.invalidateCache(id);
        }
      }

      return updated;
    });
  }

  async deleteBulk(ids: string[]): Promise<{ deleted: number; failed: string[] }> {
    if (ids.length === 0) return { deleted: 0, failed: [] };

    return this.withTransaction(async () => {
      let deleted = 0;
      const failed: string[] = [];

      for (const id of ids) {
        try {
          const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
          const result = await this.getClient().query(query, [id]);

          if ((result.rowCount ?? 0) > 0) {
            deleted++;
            await this.invalidateCache(id);
          } else {
            failed.push(id);
          }
        } catch (error) {
          console.error(`Failed to delete ${id}:`, error);
          failed.push(id);
        }
      }

      return { deleted, failed };
    });
  }

  // ========================================
  // Query Operations
  // ========================================

  async findPaginated(options: {
    page?: number;
    limit?: number;
    orderBy?: string;
    order?: 'ASC' | 'DESC';
    filters?: Record<string, unknown>;
  }): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    const orderBy = options.orderBy || 'created_at';
    const order = options.order || 'DESC';

    // Build WHERE clause from filters
    const whereConditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null) {
          whereConditions.push(`${key} = $${paramCount++}`);
          values.push(value);
        }
      }
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM ${this.tableName} ${whereClause}`;
    const { rows: countRows } = await this.getClient().query(countQuery, values);
    const total = parseInt(countRows[0].count, 10);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY ${orderBy} ${order}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const { rows } = await this.getClient().query(dataQuery, [...values, limit, offset]);
    const data = rows.map(row => this.toEntity(row));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async count(filters?: Record<string, unknown>): Promise<number> {
    const whereConditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          whereConditions.push(`${key} = $${paramCount++}`);
          values.push(value);
        }
      }
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const query = `SELECT COUNT(*) FROM ${this.tableName} ${whereClause}`;
    const { rows } = await this.getClient().query(query, values);

    return parseInt(rows[0].count, 10);
  }

  async exists(id: string): Promise<boolean> {
    const query = `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE id = $1)`;
    const { rows } = await this.getClient().query(query, [id]);

    return rows[0].exists;
  }

  async findByIds(ids: string[]): Promise<T[]> {
    if (ids.length === 0) return [];

    // Try to get from cache first
    const cached: T[] = [];
    const uncached: string[] = [];

    for (const id of ids) {
      const cacheKey = `${this.cachePrefix}${id}`;
      const cachedItem = await distributedCacheService.get<T>(cacheKey);

      if (cachedItem) {
        cached.push(cachedItem);
      } else {
        uncached.push(id);
      }
    }

    // Fetch uncached items from database
    if (uncached.length > 0) {
      const placeholders = uncached.map((_, i) => `$${i + 1}`).join(', ');
      const query = `SELECT * FROM ${this.tableName} WHERE id IN (${placeholders})`;
      const { rows } = await this.getClient().query(query, uncached);

      const fetched = rows.map(row => this.toEntity(row));

      // Cache the fetched items
      for (const item of fetched) {
        const cacheKey = `${this.cachePrefix}${item.id}`;
        await distributedCacheService.set(cacheKey, item, { ttl: TTL.STANDARD });
      }

      return [...cached, ...fetched];
    }

    return cached;
  }

  // ========================================
  // Cache Management
  // ========================================

  async invalidateCache(id: string): Promise<void> {
    await cacheInvalidationService.invalidate(this.entityName, id);
  }

  async warmupCache(): Promise<void> {
    // Get most recently accessed items
    const query = `
      SELECT * FROM ${this.tableName}
      ORDER BY updated_at DESC
      LIMIT 20
    `;

    const { rows } = await this.getClient().query(query);

    // Cache them
    for (const row of rows) {
      const entity = this.toEntity(row);
      const cacheKey = `${this.cachePrefix}${entity.id}`;
      await distributedCacheService.set(cacheKey, entity, { ttl: TTL.STANDARD });
    }
  }

  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    size: number;
    keys: string[];
  }> {
    const stats = await distributedCacheService.getStats();
    const allKeys = await distributedCacheService.getAllKeys();
    const entityKeys = allKeys.filter(key => key.startsWith(this.cachePrefix));

    return {
      hits: stats.counters?.hits || 0,
      misses: stats.counters?.misses || 0,
      size: entityKeys.length,
      keys: entityKeys
    };
  }

  async clearCache(): Promise<void> {
    const allKeys = await distributedCacheService.getAllKeys();
    const entityKeys = allKeys.filter(key => key.startsWith(this.cachePrefix));

    for (const key of entityKeys) {
      await distributedCacheService.delete(key);
    }
  }

  // ========================================
  // Helper Methods
  // ========================================

  protected getClient(): Pool | PoolClient {
    return this.currentTransaction || this.pool;
  }
}
