/**
 * Base API Handler Abstract Class
 * 提供統一的 API 路由處理模式
 */

import { NextRequest, NextResponse } from 'next/server';
import { captureApiError } from '@/lib/error-tracking/error-tracker';
import { cacheService, CacheOptions } from '@/lib/cache/cache-service';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    version?: string;
    cached?: boolean;
  };
}

export interface RequestContext {
  userId?: string;
  userEmail?: string;
  language?: string;
  sessionId?: string;
  requestId?: string;
}

export abstract class BaseApiHandler<TRequest = unknown, TResponse = unknown> {
  protected readonly defaultCacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * 處理 GET 請求
   */
  async handleGet(request: NextRequest): Promise<NextResponse> {
    const context = this.extractContext(request);
    
    try {
      // 檢查快取
      const cacheKey = this.getCacheKey(request, context);
      if (cacheKey && this.shouldUseCache(request)) {
        const cached = await cacheService.get<TResponse>(cacheKey);
        if (cached) {
          return this.successResponse(cached, { cached: true });
        }
      }

      // 驗證請求
      const validation = await this.validateGetRequest(request, context);
      if (!validation.valid) {
        return this.errorResponse(validation.error || 'Invalid request', 400);
      }

      // 執行業務邏輯
      const result = await this.executeGet(request, context);

      // 儲存到快取
      if (cacheKey && this.shouldCacheResponse(result)) {
        await cacheService.set(cacheKey, result, {
          ttl: this.getCacheTTL(request),
          storage: 'both'
        });
      }

      return this.successResponse(result);
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * 處理 POST 請求
   */
  async handlePost(request: NextRequest): Promise<NextResponse> {
    const context = this.extractContext(request);
    
    try {
      // 解析請求 body
      const body = await this.parseRequestBody(request);
      
      // 驗證請求
      const validation = await this.validatePostRequest(body, context);
      if (!validation.valid) {
        return this.errorResponse(validation.error || 'Invalid request', 400);
      }

      // 執行業務邏輯
      const result = await this.executePost(body, context);

      // 清除相關快取
      await this.invalidateCache(request, context);

      return this.successResponse(result);
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * 處理 PUT 請求
   */
  async handlePut(request: NextRequest): Promise<NextResponse> {
    const context = this.extractContext(request);
    
    try {
      const body = await this.parseRequestBody(request);
      
      const validation = await this.validatePutRequest(body, context);
      if (!validation.valid) {
        return this.errorResponse(validation.error || 'Invalid request', 400);
      }

      const result = await this.executePut(body, context);
      await this.invalidateCache(request, context);

      return this.successResponse(result);
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * 處理 DELETE 請求
   */
  async handleDelete(request: NextRequest): Promise<NextResponse> {
    const context = this.extractContext(request);
    
    try {
      const validation = await this.validateDeleteRequest(request, context);
      if (!validation.valid) {
        return this.errorResponse(validation.error || 'Invalid request', 400);
      }

      const result = await this.executeDelete(request, context);
      await this.invalidateCache(request, context);

      return this.successResponse(result);
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * 抽象方法 - 子類必須實作
   */
  protected abstract executeGet(request: NextRequest, context: RequestContext): Promise<TResponse>;
  protected abstract executePost(body: TRequest, context: RequestContext): Promise<TResponse>;
  protected abstract executePut(body: TRequest, context: RequestContext): Promise<TResponse>;
  protected abstract executeDelete(request: NextRequest, context: RequestContext): Promise<TResponse>;

  /**
   * 驗證方法 - 子類可覆寫
   */
  protected async validateGetRequest(request: NextRequest, context: RequestContext): Promise<{ valid: boolean; error?: string }> {
    return { valid: true };
  }

  protected async validatePostRequest(body: TRequest, context: RequestContext): Promise<{ valid: boolean; error?: string }> {
    return { valid: true };
  }

  protected async validatePutRequest(body: TRequest, context: RequestContext): Promise<{ valid: boolean; error?: string }> {
    return { valid: true };
  }

  protected async validateDeleteRequest(request: NextRequest, context: RequestContext): Promise<{ valid: boolean; error?: string }> {
    return { valid: true };
  }

  /**
   * 輔助方法
   */
  protected extractContext(request: NextRequest): RequestContext {
    const { searchParams } = new URL(request.url);
    const headers = request.headers;

    return {
      userId: headers.get('x-user-id') || undefined,
      userEmail: headers.get('x-user-email') || undefined,
      language: searchParams.get('lang') || headers.get('accept-language')?.split(',')[0] || 'en',
      sessionId: headers.get('x-session-id') || undefined,
      requestId: headers.get('x-request-id') || this.generateRequestId(),
    };
  }

  protected async parseRequestBody(request: NextRequest): Promise<TRequest> {
    try {
      return await request.json();
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  }

  protected successResponse<T>(data: T, metadata?: Partial<ApiResponse['metadata']>): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };

    return NextResponse.json(response);
  }

  protected errorResponse(message: string, status: number, code?: string, details?: unknown): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: {
        code: code || this.getErrorCode(status),
        message,
        details
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response, { status });
  }

  protected handleError(error: unknown, context: RequestContext): NextResponse {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const status = this.getErrorStatus(error);

    // 記錄錯誤
    captureApiError(
      context.requestId || 'unknown',
      status,
      errorMessage,
      context
    );

    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error);
    }

    return this.errorResponse(
      errorMessage,
      status,
      undefined,
      process.env.NODE_ENV === 'development' ? error : undefined
    );
  }

  protected getErrorStatus(error: unknown): number {
    if (error instanceof Error) {
      if (error.message.includes('not found')) return 404;
      if (error.message.includes('unauthorized')) return 401;
      if (error.message.includes('forbidden')) return 403;
      if (error.message.includes('bad request')) return 400;
    }
    return 500;
  }

  protected getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      500: 'INTERNAL_ERROR'
    };
    return codes[status] || 'UNKNOWN_ERROR';
  }

  /**
   * 快取相關方法
   */
  protected getCacheKey(request: NextRequest, context: RequestContext): string | null {
    return null; // 子類可覆寫
  }

  protected shouldUseCache(request: NextRequest): boolean {
    const { searchParams } = new URL(request.url);
    return searchParams.get('nocache') !== 'true';
  }

  protected shouldCacheResponse(response: TResponse): boolean {
    return true; // 子類可覆寫
  }

  protected getCacheTTL(request: NextRequest): number {
    return this.defaultCacheTTL;
  }

  protected async invalidateCache(request: NextRequest, context: RequestContext): Promise<void> {
    // 子類可覆寫以實作快取失效邏輯
  }

  /**
   * 工具方法
   */
  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 多語言支援
   */
  protected getTranslatedField<T extends Record<string, unknown>>(
    obj: T,
    fieldName: string,
    language: string
  ): string | string[] | undefined {
    if (language === 'en') {
      return obj[fieldName] as string | string[];
    }
    
    // Handle zh-TW -> zh mapping
    let langCode = language;
    if (language === 'zh-TW') {
      langCode = 'zh';
    }
    
    const translatedField = `${fieldName}_${langCode}`;
    return (obj[translatedField] as string | string[]) || (obj[fieldName] as string | string[]);
  }
}