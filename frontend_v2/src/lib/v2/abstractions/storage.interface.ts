/**
 * Storage Interface for V2 Architecture
 */

export interface StorageOptions {
  ttl?: number;
  metadata?: Record<string, any>;
}

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ListOptions {
  prefix?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface IStorageService {
  // Basic operations
  get<T>(key: string): Promise<StorageResult<T>>;
  save<T>(key: string, data: T, options?: StorageOptions): Promise<StorageResult<void>>;
  delete(key: string): Promise<StorageResult<void>>;
  exists(key: string): Promise<boolean>;
  
  // Batch operations
  list<T>(prefix: string, options?: ListOptions): Promise<StorageResult<T[]>>;
  bulkSave<T>(items: Array<{ key: string; data: T }>, options?: StorageOptions): Promise<StorageResult<void>>;
  bulkDelete(keys: string[]): Promise<StorageResult<void>>;
  
  // Health check
  isHealthy(): Promise<boolean>;
  getHealthStatus(): Promise<{
    healthy: boolean;
    message?: string;
    error?: Error;
  }>;
  
  // Initialization
  initialize(): Promise<void>;
  ensurePathExists(path: string): Promise<void>;
}