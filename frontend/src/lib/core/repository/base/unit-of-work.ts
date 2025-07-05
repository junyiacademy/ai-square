/**
 * Unit of Work 實現
 * 管理多個 Repository 的交易
 */

import { 
  IUnitOfWork, 
  IRepository, 
  RepositoryRegistry 
} from '../interfaces';

export class UnitOfWork implements IUnitOfWork {
  private repositories: RepositoryRegistry = {};
  private inTransaction: boolean = false;
  private transactionOperations: Array<() => Promise<void>> = [];
  
  /**
   * 取得 Repository
   */
  getRepository<T, ID = string>(name: string): IRepository<T, ID> {
    const repository = this.repositories[name];
    
    if (!repository) {
      throw new Error(`Repository '${name}' not found`);
    }
    
    return repository as IRepository<T, ID>;
  }
  
  /**
   * 註冊 Repository
   */
  registerRepository(name: string, repository: IRepository<any, any>): void {
    if (this.repositories[name]) {
      throw new Error(`Repository '${name}' already registered`);
    }
    
    this.repositories[name] = repository;
  }
  
  /**
   * 開始交易
   */
  async begin(): Promise<void> {
    if (this.inTransaction) {
      throw new Error('Transaction already in progress');
    }
    
    this.inTransaction = true;
    this.transactionOperations = [];
  }
  
  /**
   * 提交交易
   */
  async commit(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress');
    }
    
    try {
      // 執行所有操作
      for (const operation of this.transactionOperations) {
        await operation();
      }
      
      this.inTransaction = false;
      this.transactionOperations = [];
    } catch (error) {
      // 發生錯誤時自動回滾
      await this.rollback();
      throw error;
    }
  }
  
  /**
   * 回滾交易
   */
  async rollback(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress');
    }
    
    this.inTransaction = false;
    this.transactionOperations = [];
  }
  
  /**
   * 在交易中執行操作
   */
  async transaction<T>(fn: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    await this.begin();
    
    try {
      const result = await fn(this);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
  
  /**
   * 是否在交易中
   */
  isInTransaction(): boolean {
    return this.inTransaction;
  }
  
  /**
   * 清理資源
   */
  async dispose(): Promise<void> {
    if (this.inTransaction) {
      await this.rollback();
    }
    
    this.repositories = {};
  }
  
  /**
   * 添加交易操作
   */
  addTransactionOperation(operation: () => Promise<void>): void {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress');
    }
    
    this.transactionOperations.push(operation);
  }
}

/**
 * Unit of Work Factory
 */
export class UnitOfWorkFactory {
  private repositoryFactories: Map<string, () => IRepository<any, any>> = new Map();
  
  /**
   * 註冊 Repository Factory
   */
  registerRepositoryFactory(name: string, factory: () => IRepository<any, any>): void {
    this.repositoryFactories.set(name, factory);
  }
  
  /**
   * 創建新的 Unit of Work
   */
  create(): IUnitOfWork {
    const uow = new UnitOfWork();
    
    // 註冊所有 Repository
    for (const [name, factory] of this.repositoryFactories) {
      uow.registerRepository(name, factory());
    }
    
    return uow;
  }
}