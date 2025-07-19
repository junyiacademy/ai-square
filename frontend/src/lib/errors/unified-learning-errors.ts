/**
 * 統一學習架構錯誤處理
 * 提供一致的錯誤類型和處理機制
 */

/**
 * 基礎錯誤類別
 */
export abstract class UnifiedLearningError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // 確保原型鏈正確
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

/**
 * 資源未找到錯誤
 */
export class ResourceNotFoundError extends UnifiedLearningError {
  constructor(resourceType: string, resourceId: string) {
    super(
      `${resourceType} not found: ${resourceId}`,
      'RESOURCE_NOT_FOUND',
      404,
      { resourceType, resourceId }
    );
  }
}

/**
 * 驗證錯誤
 */
export class ValidationError extends UnifiedLearningError {
  constructor(message: string, field?: string, value?: unknown) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      { field, value }
    );
  }
}

/**
 * 權限錯誤
 */
export class UnauthorizedError extends UnifiedLearningError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

/**
 * 禁止訪問錯誤
 */
export class ForbiddenError extends UnifiedLearningError {
  constructor(resource: string, action: string) {
    super(
      `You don't have permission to ${action} ${resource}`,
      'FORBIDDEN',
      403,
      { resource, action }
    );
  }
}

/**
 * 狀態錯誤
 */
export class InvalidStateError extends UnifiedLearningError {
  constructor(message: string, currentState: string, expectedState: string) {
    super(
      message,
      'INVALID_STATE',
      409,
      { currentState, expectedState }
    );
  }
}

/**
 * 評估錯誤
 */
export class EvaluationError extends UnifiedLearningError {
  constructor(message: string, taskId?: string, reason?: string) {
    super(
      message,
      'EVALUATION_ERROR',
      500,
      { taskId, reason }
    );
  }
}

/**
 * 儲存錯誤
 */
export class StorageError extends UnifiedLearningError {
  constructor(message: string, operation: string, path?: string) {
    super(
      message,
      'STORAGE_ERROR',
      500,
      { operation, path }
    );
  }
}

/**
 * AI 服務錯誤
 */
export class AIServiceError extends UnifiedLearningError {
  constructor(message: string, service: string, originalError?: unknown) {
    super(
      message,
      'AI_SERVICE_ERROR',
      503,
      { service, originalError: originalError?.toString() }
    );
  }
}

/**
 * 配額超限錯誤
 */
export class QuotaExceededError extends UnifiedLearningError {
  constructor(resource: string, limit: number, current: number) {
    super(
      `Quota exceeded for ${resource}. Limit: ${limit}, Current: ${current}`,
      'QUOTA_EXCEEDED',
      429,
      { resource, limit, current }
    );
  }
}

/**
 * 錯誤處理工具
 */
export class ErrorHandler {
  /**
   * 處理錯誤並返回標準化響應
   */
  static handle(error: unknown): {
    error: {
      message: string;
      code: string;
      statusCode: number;
      details?: Record<string, unknown>;
    }
  } {
    // 如果是我們的錯誤類型
    if (error instanceof UnifiedLearningError) {
      return {
        error: error.toJSON()
      };
    }

    // 原生錯誤
    if (error instanceof Error) {
      return {
        error: {
          message: error.message,
          code: 'INTERNAL_ERROR',
          statusCode: 500,
          details: {
            name: error.name,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }
        }
      };
    }

    // 未知錯誤
    return {
      error: {
        message: 'An unknown error occurred',
        code: 'UNKNOWN_ERROR',
        statusCode: 500,
        details: {
          error: String(error)
        }
      }
    };
  }

  /**
   * 包裝異步函數以處理錯誤
   */
  static wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(fn: T): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        const handled = ErrorHandler.handle(error);
        throw new Error(JSON.stringify(handled));
      }
    }) as T;
  }

  /**
   * 用於 API 路由的錯誤處理中間件
   */
  static async apiErrorHandler(
    error: unknown,
    request: Request
  ): Promise<Response> {
    const handled = ErrorHandler.handle(error);
    
    // 記錄錯誤
    console.error('API Error:', {
      url: request.url,
      method: request.method,
      error: handled.error
    });

    return new Response(JSON.stringify(handled), {
      status: handled.error.statusCode,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 檢查是否為特定錯誤類型
   */
  static isErrorType<T extends UnifiedLearningError>(
    error: unknown,
    ErrorClass: new (...args: unknown[]) => T
  ): error is T {
    return error instanceof ErrorClass;
  }

  /**
   * 重試機制
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      delay?: number;
      shouldRetry?: (error: unknown, attempt: number) => boolean;
    } = {}
  ): Promise<T> {
    const { 
      maxRetries = 3, 
      delay = 1000,
      shouldRetry = (error) => !(error instanceof ValidationError || error instanceof UnauthorizedError)
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (!shouldRetry(error, attempt) || attempt === maxRetries - 1) {
          throw error;
        }

        // 指數退避
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }

    throw lastError;
  }
}

/**
 * 錯誤邊界組件 Props
 */
export interface ErrorBoundaryProps {
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: React.ReactNode;
}