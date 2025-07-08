/**
 * Unit of Work Pattern 介面定義
 * 管理多個 Repository 的交易
 */

import { IRepository } from './repository.interface';

/**
 * Repository 註冊表
 */
export interface RepositoryRegistry {
  [key: string]: IRepository<any, any>;
}

/**
 * Unit of Work 介面
 */
export interface IUnitOfWork {
  /**
   * 取得 Repository
   */
  getRepository<T, ID = string>(name: string): IRepository<T, ID>;
  
  /**
   * 註冊 Repository
   */
  registerRepository(name: string, repository: IRepository<any, any>): void;
  
  /**
   * 開始交易
   */
  begin(): Promise<void>;
  
  /**
   * 提交交易
   */
  commit(): Promise<void>;
  
  /**
   * 回滾交易
   */
  rollback(): Promise<void>;
  
  /**
   * 在交易中執行操作
   */
  transaction<T>(fn: (uow: IUnitOfWork) => Promise<T>): Promise<T>;
  
  /**
   * 是否在交易中
   */
  isInTransaction(): boolean;
  
  /**
   * 清理資源
   */
  dispose(): Promise<void>;
}

/**
 * Unit of Work Factory 介面
 */
export interface IUnitOfWorkFactory {
  /**
   * 創建新的 Unit of Work
   */
  create(): IUnitOfWork;
}