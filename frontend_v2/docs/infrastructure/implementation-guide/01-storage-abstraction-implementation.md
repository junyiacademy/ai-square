# Storage 抽象層實作指南

## 實作概要

本文檔提供 Storage 抽象層的詳細實作步驟，這是整個重構的基礎。

## 1. 檔案結構建立

```bash
# 建立目錄結構
frontend/src/lib/
├── core/
│   ├── storage/
│   │   ├── interfaces/
│   │   │   ├── storage.interface.ts
│   │   │   └── index.ts
│   │   ├── providers/
│   │   │   ├── local-storage.provider.ts
│   │   │   ├── gcs-storage.provider.ts
│   │   │   ├── database-storage.provider.ts
│   │   │   └── index.ts
│   │   ├── decorators/
│   │   │   ├── cache.decorator.ts
│   │   │   ├── retry.decorator.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── errors/
│       ├── storage.errors.ts
│       └── index.ts
```

## 2. 介面定義

### 2.1 IStorageProvider 介面
```typescript
// src/lib/core/storage/interfaces/storage.interface.ts
export interface IStorageProvider {
  /**
   * 獲取單一項目
   */
  get<T>(key: string): Promise<T | null>;
  
  /**
   * 設定單一項目
   */
  set<T>(key: string, value: T, options?: StorageOptions): Promise<void>;
  
  /**
   * 刪除單一項目
   */
  delete(key: string): Promise<void>;
  
  /**
   * 檢查項目是否存在
   */
  exists(key: string): Promise<boolean>;
  
  /**
   * 列出符合前綴的所有項目
   */
  list<T>(prefix: string, options?: ListOptions): Promise<T[]>;
  
  /**
   * 批次操作
   */
  batch(operations: BatchOperation[]): Promise<BatchResult>;
  
  /**
   * 清空儲存（危險操作）
   */
  clear(prefix?: string): Promise<void>;
}

export interface StorageOptions {
  ttl?: number;           // Time to live in seconds
  tags?: string[];        // 用於分類和查詢
  encryption?: boolean;   // 是否加密
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'key' | 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

export interface BatchOperation {
  type: 'set' | 'delete';
  key: string;
  value?: any;
  options?: StorageOptions;
}

export interface BatchResult {
  successful: number;
  failed: number;
  errors: Array<{
    operation: BatchOperation;
    error: Error;
  }>;
}
```

### 2.2 錯誤定義
```typescript
// src/lib/core/errors/storage.errors.ts
export class StorageError extends Error {
  constructor(message: string, public code: string, public cause?: Error) {
    super(message);
    this.name = 'StorageError';
  }
}

export class StorageNotFoundError extends StorageError {
  constructor(key: string) {
    super(`Item not found: ${key}`, 'STORAGE_NOT_FOUND');
  }
}

export class StorageQuotaExceededError extends StorageError {
  constructor(message: string) {
    super(message, 'STORAGE_QUOTA_EXCEEDED');
  }
}

export class StorageConnectionError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, 'STORAGE_CONNECTION_ERROR', cause);
  }
}
```

## 3. LocalStorage Provider 實作

```typescript
// src/lib/core/storage/providers/local-storage.provider.ts
import { IStorageProvider, StorageOptions, ListOptions, BatchOperation, BatchResult } from '../interfaces';
import { StorageError, StorageQuotaExceededError } from '../../errors';

export class LocalStorageProvider implements IStorageProvider {
  private prefix: string;
  private isAvailable: boolean;
  
  constructor(prefix: string = 'ai_square_') {
    this.prefix = prefix;
    this.isAvailable = this.checkAvailability();
  }
  
  private checkAvailability(): boolean {
    try {
      const testKey = `${this.prefix}_test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
  
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }
  
  private serialize<T>(value: T): string {
    return JSON.stringify({
      value,
      timestamp: Date.now(),
      version: 1
    });
  }
  
  private deserialize<T>(data: string): { value: T; timestamp: number } | null {
    try {
      const parsed = JSON.parse(data);
      return parsed;
    } catch {
      return null;
    }
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable) {
      throw new StorageError('LocalStorage is not available', 'STORAGE_UNAVAILABLE');
    }
    
    try {
      const fullKey = this.getFullKey(key);
      const item = localStorage.getItem(fullKey);
      
      if (!item) {
        return null;
      }
      
      const deserialized = this.deserialize<T>(item);
      if (!deserialized) {
        return null;
      }
      
      // Check TTL if exists
      const metadata = this.getMetadata(key);
      if (metadata?.ttl) {
        const expiresAt = deserialized.timestamp + (metadata.ttl * 1000);
        if (Date.now() > expiresAt) {
          await this.delete(key);
          return null;
        }
      }
      
      return deserialized.value;
    } catch (error) {
      throw new StorageError(
        `Failed to get item: ${key}`,
        'STORAGE_GET_ERROR',
        error as Error
      );
    }
  }
  
  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    if (!this.isAvailable) {
      throw new StorageError('LocalStorage is not available', 'STORAGE_UNAVAILABLE');
    }
    
    try {
      const fullKey = this.getFullKey(key);
      const serialized = this.serialize(value);
      
      // Check storage quota
      try {
        localStorage.setItem(fullKey, serialized);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          throw new StorageQuotaExceededError('LocalStorage quota exceeded');
        }
        throw error;
      }
      
      // Save metadata if options provided
      if (options) {
        this.setMetadata(key, options);
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        `Failed to set item: ${key}`,
        'STORAGE_SET_ERROR',
        error as Error
      );
    }
  }
  
  async delete(key: string): Promise<void> {
    if (!this.isAvailable) {
      throw new StorageError('LocalStorage is not available', 'STORAGE_UNAVAILABLE');
    }
    
    try {
      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
      this.deleteMetadata(key);
    } catch (error) {
      throw new StorageError(
        `Failed to delete item: ${key}`,
        'STORAGE_DELETE_ERROR',
        error as Error
      );
    }
  }
  
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }
    
    const fullKey = this.getFullKey(key);
    return localStorage.getItem(fullKey) !== null;
  }
  
  async list<T>(prefix: string, options?: ListOptions): Promise<T[]> {
    if (!this.isAvailable) {
      throw new StorageError('LocalStorage is not available', 'STORAGE_UNAVAILABLE');
    }
    
    try {
      const results: T[] = [];
      const searchPrefix = this.getFullKey(prefix);
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(searchPrefix)) {
          const shortKey = key.substring(this.prefix.length);
          const value = await this.get<T>(shortKey);
          if (value !== null) {
            results.push(value);
          }
        }
      }
      
      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit || results.length;
      
      return results.slice(offset, offset + limit);
    } catch (error) {
      throw new StorageError(
        `Failed to list items with prefix: ${prefix}`,
        'STORAGE_LIST_ERROR',
        error as Error
      );
    }
  }
  
  async batch(operations: BatchOperation[]): Promise<BatchResult> {
    const result: BatchResult = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    for (const operation of operations) {
      try {
        if (operation.type === 'set') {
          await this.set(operation.key, operation.value, operation.options);
        } else if (operation.type === 'delete') {
          await this.delete(operation.key);
        }
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          operation,
          error: error as Error
        });
      }
    }
    
    return result;
  }
  
  async clear(prefix?: string): Promise<void> {
    if (!this.isAvailable) {
      throw new StorageError('LocalStorage is not available', 'STORAGE_UNAVAILABLE');
    }
    
    const keysToRemove: string[] = [];
    const searchPrefix = prefix ? this.getFullKey(prefix) : this.prefix;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(searchPrefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  // Metadata management
  private getMetadata(key: string): StorageOptions | null {
    const metaKey = `${this.prefix}_meta_${key}`;
    const meta = localStorage.getItem(metaKey);
    return meta ? JSON.parse(meta) : null;
  }
  
  private setMetadata(key: string, options: StorageOptions): void {
    const metaKey = `${this.prefix}_meta_${key}`;
    localStorage.setItem(metaKey, JSON.stringify(options));
  }
  
  private deleteMetadata(key: string): void {
    const metaKey = `${this.prefix}_meta_${key}`;
    localStorage.removeItem(metaKey);
  }
}
```

## 4. 快取裝飾器實作

```typescript
// src/lib/core/storage/decorators/cache.decorator.ts
type CacheKey = string | ((...args: any[]) => string);

interface CacheOptions {
  ttl?: number;  // seconds
  key?: CacheKey;
}

const cacheMap = new Map<string, { value: any; expiresAt: number }>();

export function Cacheable(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = getCacheKey(options.key, propertyKey, args);
      const cached = cacheMap.get(cacheKey);
      
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
      
      const result = await originalMethod.apply(this, args);
      
      if (result !== null && result !== undefined) {
        const ttl = options.ttl || 3600; // 1 hour default
        cacheMap.set(cacheKey, {
          value: result,
          expiresAt: Date.now() + (ttl * 1000)
        });
      }
      
      return result;
    };
    
    return descriptor;
  };
}

function getCacheKey(
  keyOption: CacheKey | undefined,
  methodName: string,
  args: any[]
): string {
  if (!keyOption) {
    return `${methodName}:${JSON.stringify(args)}`;
  }
  
  if (typeof keyOption === 'function') {
    return keyOption(...args);
  }
  
  return keyOption;
}

// 清除快取
export function clearCache(pattern?: string) {
  if (!pattern) {
    cacheMap.clear();
    return;
  }
  
  for (const key of cacheMap.keys()) {
    if (key.includes(pattern)) {
      cacheMap.delete(key);
    }
  }
}
```

## 5. 重試裝飾器實作

```typescript
// src/lib/core/storage/decorators/retry.decorator.ts
interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  retryIf?: (error: Error) => boolean;
}

export function Retryable(options: RetryOptions = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    retryIf = () => true
  } = options;
  
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;
          
          if (attempt === maxAttempts || !retryIf(lastError)) {
            throw lastError;
          }
          
          const waitTime = backoff === 'exponential'
            ? delay * Math.pow(2, attempt - 1)
            : delay * attempt;
          
          console.warn(
            `Retry ${attempt}/${maxAttempts} for ${propertyKey} after ${waitTime}ms`,
            lastError.message
          );
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      throw lastError!;
    };
    
    return descriptor;
  };
}
```

## 6. GCS Provider 實作（部分）

```typescript
// src/lib/core/storage/providers/gcs-storage.provider.ts
import { Storage } from '@google-cloud/storage';
import { IStorageProvider, StorageOptions, ListOptions, BatchOperation, BatchResult } from '../interfaces';
import { StorageError, StorageNotFoundError } from '../../errors';
import { Retryable } from '../decorators/retry.decorator';

export class GCSStorageProvider implements IStorageProvider {
  private storage: Storage;
  private bucket: string;
  private prefix: string;
  
  constructor(config: GCSConfig) {
    this.storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.keyFilename
    });
    this.bucket = config.bucket;
    this.prefix = config.prefix || '';
  }
  
  private getFullPath(key: string): string {
    return this.prefix ? `${this.prefix}/${key}` : key;
  }
  
  @Retryable({ maxAttempts: 3, retryIf: (error) => error.code === '503' })
  async get<T>(key: string): Promise<T | null> {
    try {
      const file = this.storage.bucket(this.bucket).file(this.getFullPath(key));
      const [exists] = await file.exists();
      
      if (!exists) {
        return null;
      }
      
      const [contents] = await file.download();
      const data = JSON.parse(contents.toString());
      
      return data.value as T;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw new StorageError(
        `Failed to get item from GCS: ${key}`,
        'GCS_GET_ERROR',
        error
      );
    }
  }
  
  @Retryable({ maxAttempts: 3 })
  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    try {
      const file = this.storage.bucket(this.bucket).file(this.getFullPath(key));
      const data = {
        value,
        timestamp: Date.now(),
        metadata: options
      };
      
      await file.save(JSON.stringify(data), {
        contentType: 'application/json',
        metadata: {
          cacheControl: options?.ttl ? `public, max-age=${options.ttl}` : 'no-cache'
        }
      });
    } catch (error) {
      throw new StorageError(
        `Failed to set item in GCS: ${key}`,
        'GCS_SET_ERROR',
        error as Error
      );
    }
  }
  
  // ... 其他方法實作
}

interface GCSConfig {
  projectId: string;
  bucket: string;
  keyFilename?: string;
  prefix?: string;
}
```

## 7. 測試範例

```typescript
// src/lib/core/storage/__tests__/local-storage.provider.test.ts
import { LocalStorageProvider } from '../providers/local-storage.provider';
import { StorageQuotaExceededError } from '../../errors';

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider;
  
  beforeEach(() => {
    localStorage.clear();
    provider = new LocalStorageProvider('test_');
  });
  
  describe('get/set operations', () => {
    it('should store and retrieve values', async () => {
      const testData = { id: 1, name: 'Test' };
      await provider.set('test-key', testData);
      
      const retrieved = await provider.get('test-key');
      expect(retrieved).toEqual(testData);
    });
    
    it('should return null for non-existent keys', async () => {
      const result = await provider.get('non-existent');
      expect(result).toBeNull();
    });
    
    it('should handle TTL expiration', async () => {
      jest.useFakeTimers();
      
      await provider.set('ttl-key', 'value', { ttl: 1 }); // 1 second
      
      // Should exist immediately
      expect(await provider.get('ttl-key')).toBe('value');
      
      // Should expire after 1 second
      jest.advanceTimersByTime(1001);
      expect(await provider.get('ttl-key')).toBeNull();
      
      jest.useRealTimers();
    });
  });
  
  describe('batch operations', () => {
    it('should handle batch operations', async () => {
      const operations = [
        { type: 'set' as const, key: 'batch1', value: 'value1' },
        { type: 'set' as const, key: 'batch2', value: 'value2' },
        { type: 'delete' as const, key: 'batch1' }
      ];
      
      const result = await provider.batch(operations);
      
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(await provider.exists('batch1')).toBe(false);
      expect(await provider.exists('batch2')).toBe(true);
    });
  });
  
  describe('list operations', () => {
    it('should list items by prefix', async () => {
      await provider.set('users/1', { id: 1, name: 'User 1' });
      await provider.set('users/2', { id: 2, name: 'User 2' });
      await provider.set('posts/1', { id: 1, title: 'Post 1' });
      
      const users = await provider.list('users/');
      expect(users).toHaveLength(2);
      expect(users[0]).toMatchObject({ id: 1, name: 'User 1' });
    });
    
    it('should support pagination', async () => {
      // Create 10 items
      for (let i = 0; i < 10; i++) {
        await provider.set(`items/${i}`, { id: i });
      }
      
      const page1 = await provider.list('items/', { limit: 5, offset: 0 });
      const page2 = await provider.list('items/', { limit: 5, offset: 5 });
      
      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(5);
      expect(page1[0]).toMatchObject({ id: 0 });
      expect(page2[0]).toMatchObject({ id: 5 });
    });
  });
});
```

## 8. 使用範例

```typescript
// 在應用中使用
import { LocalStorageProvider } from '@/lib/core/storage/providers';
import { IStorageProvider } from '@/lib/core/storage/interfaces';

class UserService {
  private storage: IStorageProvider;
  
  constructor() {
    this.storage = new LocalStorageProvider('users_');
  }
  
  async getUser(id: string) {
    return this.storage.get<User>(`user_${id}`);
  }
  
  async saveUser(user: User) {
    await this.storage.set(`user_${user.id}`, user, {
      ttl: 3600, // 1 hour cache
      tags: ['user', 'profile']
    });
  }
  
  async deleteUser(id: string) {
    await this.storage.delete(`user_${id}`);
  }
  
  async listUsers() {
    return this.storage.list<User>('user_');
  }
}
```

## 9. 下一步

完成 Storage 抽象層後，接下來要：
1. 實作 Repository 基礎類別
2. 將現有服務遷移到新的 Storage 層
3. 建立 Database Provider 準備未來遷移

這個實作提供了一個健壯、可擴展的儲存抽象層，為整個重構奠定基礎。