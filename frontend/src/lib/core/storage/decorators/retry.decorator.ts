/**
 * 重試裝飾器
 * 用於自動重試失敗的操作
 */

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  retryIf?: (error: Error) => boolean;
}

/**
 * 重試裝飾器
 * @param options 重試選項
 */
export function Retryable(options: RetryOptions = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    retryIf = () => true
  } = options;
  
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // 嘗試執行原方法
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;
          
          // 檢查是否應該重試
          if (attempt === maxAttempts || !retryIf(lastError)) {
            throw lastError;
          }
          
          // 計算等待時間
          const waitTime = calculateWaitTime(delay, backoff, attempt);
          
          console.warn(
            `Retry ${attempt}/${maxAttempts} for ${propertyKey} after ${waitTime}ms`,
            lastError.message
          );
          
          // 等待後重試
          await sleep(waitTime);
        }
      }
      
      throw lastError!;
    };
    
    return descriptor;
  };
}

/**
 * 計算等待時間
 */
function calculateWaitTime(
  baseDelay: number,
  backoff: 'linear' | 'exponential',
  attempt: number
): number {
  if (backoff === 'exponential') {
    return baseDelay * Math.pow(2, attempt - 1);
  }
  return baseDelay * attempt;
}

/**
 * 延遲執行
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 常用的重試條件
 */
export const RetryConditions = {
  /**
   * 網路錯誤時重試
   */
  onNetworkError: (error: Error) => {
    return error.message.includes('network') || 
           error.message.includes('fetch') ||
           error.name === 'NetworkError';
  },
  
  /**
   * 暫時性錯誤時重試
   */
  onTemporaryError: (error: Error) => {
    const temporaryErrorCodes = ['EAGAIN', 'ETIMEDOUT', 'ECONNRESET', '503', '429'];
    return temporaryErrorCodes.some(code => 
      error.message.includes(code) || error.name.includes(code)
    );
  },
  
  /**
   * 非關鍵錯誤時重試
   */
  onNonCriticalError: (error: Error) => {
    const criticalErrors = ['ValidationError', 'AuthenticationError', 'PermissionError'];
    return !criticalErrors.includes(error.name);
  }
};