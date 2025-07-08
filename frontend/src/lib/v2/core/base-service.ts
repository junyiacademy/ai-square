/**
 * Base Service Abstract Class
 * Provides common business logic patterns
 */

import { BaseEntity, ApiResponse, QueryFilters, PaginatedResponse } from '../types';
import { IBaseRepository } from './base-repository';

export interface IBaseService<T extends BaseEntity> {
  // Core CRUD operations
  create(data: Omit<T, keyof BaseEntity>): Promise<ApiResponse<T>>;
  findById(id: string): Promise<ApiResponse<T>>;
  findMany(filters: QueryFilters): Promise<PaginatedResponse<T>>;
  update(id: string, data: Partial<Omit<T, keyof BaseEntity>>): Promise<ApiResponse<T>>;
  delete(id: string): Promise<ApiResponse<{ deleted: boolean }>>;
}

/**
 * Abstract base service with common implementations
 */
export abstract class BaseService<T extends BaseEntity> implements IBaseService<T> {
  constructor(protected repository: IBaseRepository<T>) {}

  /**
   * Create a new entity
   */
  async create(data: Omit<T, keyof BaseEntity>): Promise<ApiResponse<T>> {
    try {
      // Validate data before creation
      await this.validateCreate(data);
      
      // Create the entity
      const entity = await this.repository.create(data);
      
      // Post-creation hook
      await this.afterCreate(entity);
      
      return {
        success: true,
        data: entity
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<ApiResponse<T>> {
    try {
      const entity = await this.repository.findById(id);
      
      if (!entity) {
        return {
          success: false,
          error: `Entity not found with id: ${id}`
        };
      }
      
      return {
        success: true,
        data: entity
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Find multiple entities with filters
   */
  async findMany(filters: QueryFilters): Promise<PaginatedResponse<T>> {
    try {
      return await this.repository.findMany(filters);
    } catch (error) {
      const errorResponse = this.handleError(error);
      return {
        ...errorResponse,
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0
        }
      } as PaginatedResponse<T>;
    }
  }

  /**
   * Update an entity
   */
  async update(id: string, data: Partial<Omit<T, keyof BaseEntity>>): Promise<ApiResponse<T>> {
    try {
      // Check if entity exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        return {
          success: false,
          error: `Entity not found with id: ${id}`
        };
      }
      
      // Validate update data
      await this.validateUpdate(id, data);
      
      // Update the entity
      const entity = await this.repository.update(id, data);
      
      // Post-update hook
      await this.afterUpdate(entity);
      
      return {
        success: true,
        data: entity
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      // Check if entity exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        return {
          success: false,
          error: `Entity not found with id: ${id}`
        };
      }
      
      // Validate deletion
      await this.validateDelete(id);
      
      // Delete the entity
      const deleted = await this.repository.delete(id);
      
      // Post-deletion hook
      await this.afterDelete(id);
      
      return {
        success: true,
        data: { deleted }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validation hooks (can be overridden by subclasses)
   */
  protected async validateCreate(data: Omit<T, keyof BaseEntity>): Promise<void> {
    // Override in subclasses for custom validation
  }

  protected async validateUpdate(id: string, data: Partial<Omit<T, keyof BaseEntity>>): Promise<void> {
    // Override in subclasses for custom validation
  }

  protected async validateDelete(id: string): Promise<void> {
    // Override in subclasses for custom validation
  }

  /**
   * Lifecycle hooks (can be overridden by subclasses)
   */
  protected async afterCreate(entity: T): Promise<void> {
    // Override in subclasses for post-creation logic
  }

  protected async afterUpdate(entity: T): Promise<void> {
    // Override in subclasses for post-update logic
  }

  protected async afterDelete(id: string): Promise<void> {
    // Override in subclasses for post-deletion logic
  }

  /**
   * Error handling
   */
  protected handleError(error: unknown): ApiResponse<any> {
    console.error('Service error:', error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }

  /**
   * Transaction helper
   */
  protected async withTransaction<R>(callback: () => Promise<R>): Promise<R> {
    return this.repository.transaction(callback);
  }
}