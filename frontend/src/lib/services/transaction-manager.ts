/**
 * Transaction Manager for ensuring data consistency across multiple operations
 */

export interface Operation<T = any> {
  id: string;
  execute: () => Promise<T>;
  rollback?: () => Promise<void>;
  result?: T;
}

export class TransactionManager {
  private operations: Operation[] = [];
  private executedOperations: Operation[] = [];
  private isExecuting = false;

  /**
   * Add an operation to the transaction
   */
  addOperation<T>(operation: Operation<T>): void {
    if (this.isExecuting) {
      throw new Error('Cannot add operations while transaction is executing');
    }
    this.operations.push(operation);
  }

  /**
   * Execute all operations in sequence
   * If any operation fails, rollback all previous operations
   */
  async execute(): Promise<Record<string, any>> {
    if (this.isExecuting) {
      throw new Error('Transaction is already executing');
    }

    this.isExecuting = true;
    const results: Record<string, any> = {};

    try {
      // Execute operations in sequence
      for (const operation of this.operations) {
        try {
          console.log(`Executing operation: ${operation.id}`);
          const result = await operation.execute();
          operation.result = result;
          results[operation.id] = result;
          this.executedOperations.push(operation);
        } catch (error) {
          console.error(`Operation ${operation.id} failed:`, error);
          throw new TransactionError(
            `Operation ${operation.id} failed: ${error}`,
            operation.id,
            error
          );
        }
      }

      // All operations succeeded
      return results;
    } catch (error) {
      // Rollback executed operations in reverse order
      console.error('Transaction failed, rolling back...', error);
      await this.rollback();
      throw error;
    } finally {
      this.isExecuting = false;
      this.reset();
    }
  }

  /**
   * Rollback all executed operations
   */
  private async rollback(): Promise<void> {
    const rollbackErrors: Error[] = [];

    // Rollback in reverse order
    for (let i = this.executedOperations.length - 1; i >= 0; i--) {
      const operation = this.executedOperations[i];
      if (operation.rollback) {
        try {
          console.log(`Rolling back operation: ${operation.id}`);
          await operation.rollback();
        } catch (error) {
          console.error(`Rollback failed for operation ${operation.id}:`, error);
          rollbackErrors.push(error as Error);
        }
      }
    }

    if (rollbackErrors.length > 0) {
      throw new RollbackError('Some rollback operations failed', rollbackErrors);
    }
  }

  /**
   * Reset the transaction manager
   */
  private reset(): void {
    this.operations = [];
    this.executedOperations = [];
  }
}

export class TransactionError extends Error {
  constructor(
    message: string,
    public operationId: string,
    public originalError: any
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class RollbackError extends Error {
  constructor(
    message: string,
    public errors: Error[]
  ) {
    super(message);
    this.name = 'RollbackError';
  }
}

/**
 * Helper function to create a transaction with automatic rollback
 */
export async function withTransaction<T>(
  operations: Operation[],
  processor?: (results: Record<string, any>) => T
): Promise<T> {
  const transaction = new TransactionManager();
  
  operations.forEach(op => transaction.addOperation(op));
  
  const results = await transaction.execute();
  
  return processor ? processor(results) : results as T;
}

/**
 * Distributed lock implementation for preventing concurrent updates
 */
export class DistributedLock {
  private static locks = new Map<string, Promise<void>>();
  
  static async acquire(key: string, timeout = 30000): Promise<() => void> {
    // Wait for existing lock to be released
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    
    // Create new lock
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    
    this.locks.set(key, lockPromise);
    
    // Auto-release after timeout
    const timeoutId = setTimeout(() => {
      releaseLock!();
      this.locks.delete(key);
    }, timeout);
    
    // Return release function
    return () => {
      clearTimeout(timeoutId);
      releaseLock!();
      this.locks.delete(key);
    };
  }
  
  static async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    timeout = 30000
  ): Promise<T> {
    const release = await this.acquire(key, timeout);
    try {
      return await fn();
    } finally {
      release();
    }
  }
}