/**
 * Storage Provider Interface
 * 統一的儲存介面，支援 localStorage、GCS 和未來的資料庫
 */

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
  
  /**
   * 獲取儲存空間資訊
   */
  getStorageInfo(): Promise<StorageInfo>;
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

/**
 * Storage 相關的元資料
 */
export interface StorageMetadata {
  version: number;
  timestamp: number;
  ttl?: number;
  tags?: string[];
}

/**
 * Storage 空間資訊
 */
export interface StorageInfo {
  used: number;      // 已使用空間（bytes）
  quota: number;     // 配額（bytes）
  available: number; // 可用空間（bytes）
}