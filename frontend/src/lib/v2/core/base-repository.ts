/**
 * Base Repository Interface and Abstract Class
 * Provides common CRUD operations for all entities
 */

import { BaseEntity, QueryFilters, PaginatedResponse } from '../types';

export interface IBaseRepository<T extends BaseEntity> {
  // Create
  create(data: Omit<T, keyof BaseEntity>): Promise<T>;
  createMany(data: Omit<T, keyof BaseEntity>[]): Promise<T[]>;

  // Read
  findById(id: string): Promise<T | null>;
  findByIds(ids: string[]): Promise<T[]>;
  findOne(filters: Partial<T>): Promise<T | null>;
  findMany(filters: QueryFilters): Promise<PaginatedResponse<T>>;
  findAll(): Promise<T[]>;
  exists(id: string): Promise<boolean>;
  count(filters?: Partial<T>): Promise<number>;

  // Update
  update(id: string, data: Partial<Omit<T, keyof BaseEntity>>): Promise<T>;
  updateMany(ids: string[], data: Partial<Omit<T, keyof BaseEntity>>): Promise<T[]>;

  // Delete
  delete(id: string): Promise<boolean>;
  deleteMany(ids: string[]): Promise<number>;
  softDelete(id: string): Promise<boolean>;
  softDeleteMany(ids: string[]): Promise<number>;

  // Transactions
  transaction<R>(callback: () => Promise<R>): Promise<R>;
}

/**
 * Abstract base repository with common implementations
 */
export abstract class BaseRepository<T extends BaseEntity> implements IBaseRepository<T> {
  protected abstract tableName: string;
  protected abstract entityName: string;

  // These methods must be implemented by database-specific repositories
  abstract create(data: Omit<T, keyof BaseEntity>): Promise<T>;
  abstract createMany(data: Omit<T, keyof BaseEntity>[]): Promise<T[]>;
  abstract findById(id: string): Promise<T | null>;
  abstract findByIds(ids: string[]): Promise<T[]>;
  abstract findOne(filters: Partial<T>): Promise<T | null>;
  abstract findMany(filters: QueryFilters): Promise<PaginatedResponse<T>>;
  abstract findAll(): Promise<T[]>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(filters?: Partial<T>): Promise<number>;
  abstract update(id: string, data: Partial<Omit<T, keyof BaseEntity>>): Promise<T>;
  abstract updateMany(ids: string[], data: Partial<Omit<T, keyof BaseEntity>>): Promise<T[]>;
  abstract delete(id: string): Promise<boolean>;
  abstract deleteMany(ids: string[]): Promise<number>;
  abstract softDelete(id: string): Promise<boolean>;
  abstract softDeleteMany(ids: string[]): Promise<number>;
  abstract transaction<R>(callback: () => Promise<R>): Promise<R>;

  /**
   * Helper method to generate consistent IDs
   */
  protected generateId(): string {
    return `${this.entityName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper method to get current timestamp
   */
  protected getCurrentTimestamp(): Date {
    return new Date();
  }

  /**
   * Helper method to build pagination metadata
   */
  protected buildPaginationMetadata(
    items: T[],
    totalItems: number,
    page: number,
    pageSize: number
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(totalItems / pageSize);
    
    return {
      success: true,
      data: items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  /**
   * Helper method to apply default query filters
   */
  protected applyDefaultFilters(filters?: QueryFilters): Required<QueryFilters> {
    return {
      page: filters?.page || 1,
      pageSize: filters?.pageSize || 20,
      orderBy: filters?.orderBy || 'created_at',
      orderDirection: filters?.orderDirection || 'desc',
      search: filters?.search || '',
      filters: filters?.filters || {}
    };
  }
}