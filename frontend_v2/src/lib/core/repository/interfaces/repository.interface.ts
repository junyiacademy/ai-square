/**
 * Repository Pattern 介面定義
 * 提供統一的資料存取層抽象
 */

export interface QueryOptions {
  where?: Record<string, any>;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  include?: string[];
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * 基礎 Repository 介面
 */
export interface IRepository<T, ID = string> {
  /**
   * 根據 ID 查詢單一實體
   */
  findById(id: ID): Promise<T | null>;
  
  /**
   * 查詢所有實體
   */
  findAll(options?: QueryOptions): Promise<T[]>;
  
  /**
   * 根據條件查詢實體
   */
  findOne(where: Partial<T>): Promise<T | null>;
  
  /**
   * 根據條件查詢多個實體
   */
  findMany(where: Partial<T>, options?: QueryOptions): Promise<T[]>;
  
  /**
   * 創建實體
   */
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  
  /**
   * 更新實體
   */
  update(id: ID, updates: Partial<T>): Promise<T>;
  
  /**
   * 刪除實體
   */
  delete(id: ID): Promise<void>;
  
  /**
   * 批次創建
   */
  createMany(entities: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T[]>;
  
  /**
   * 批次更新
   */
  updateMany(updates: Array<{ id: ID; data: Partial<T> }>): Promise<T[]>;
  
  /**
   * 批次刪除
   */
  deleteMany(ids: ID[]): Promise<void>;
  
  /**
   * 計數
   */
  count(where?: Partial<T>): Promise<number>;
  
  /**
   * 檢查是否存在
   */
  exists(where: Partial<T>): Promise<boolean>;
}

/**
 * 支援交易的 Repository 介面
 */
export interface ITransactionalRepository<T, ID = string> extends IRepository<T, ID> {
  /**
   * 開始交易
   */
  beginTransaction(): Promise<Transaction>;
  
  /**
   * 在交易中執行操作
   */
  withTransaction<R>(fn: (repo: IRepository<T, ID>) => Promise<R>): Promise<R>;
}