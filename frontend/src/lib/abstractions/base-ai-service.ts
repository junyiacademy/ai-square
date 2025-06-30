/**
 * Base AI Service Abstract Class
 * 提供統一的 AI 服務抽象層
 */

import { cacheService } from '@/lib/cache/cache-service';
import { captureError } from '@/lib/error-tracking/error-tracker';

export interface AIServiceOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  timeout?: number;
  useCache?: boolean;
  cacheTTL?: number;
}

export interface AIResponse<T = string> {
  success: boolean;
  data?: T;
  error?: Error;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost?: number;
  };
  metadata?: {
    model: string;
    processingTime: number;
    cached?: boolean;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export abstract class BaseAIService {
  protected abstract readonly serviceName: string;
  protected abstract readonly defaultModel: string;
  
  protected readonly defaultOptions: AIServiceOptions = {
    temperature: 0.7,
    maxTokens: 1000,
    topP: 1,
    timeout: 30000, // 30 seconds
    useCache: true,
    cacheTTL: 60 * 60 * 1000 // 1 hour
  };

  /**
   * 生成文字回應
   */
  async generateText(
    prompt: string,
    options: AIServiceOptions = {}
  ): Promise<AIResponse<string>> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    
    try {
      // 檢查快取
      if (finalOptions.useCache) {
        const cacheKey = this.getCacheKey('text', prompt, finalOptions);
        const cached = await cacheService.get<string>(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            metadata: {
              model: finalOptions.model || this.defaultModel,
              processingTime: Date.now() - startTime,
              cached: true
            }
          };
        }
      }

      // 呼叫 AI 服務
      const response = await this.callTextGeneration(prompt, finalOptions);
      
      if (response.success && response.data) {
        // 儲存到快取
        if (finalOptions.useCache) {
          const cacheKey = this.getCacheKey('text', prompt, finalOptions);
          await cacheService.set(cacheKey, response.data, {
            ttl: finalOptions.cacheTTL,
            storage: 'both'
          });
        }
      }
      
      return {
        ...response,
        metadata: {
          ...response.metadata,
          processingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      return this.handleError(error, 'generateText');
    }
  }

  /**
   * 聊天對話
   */
  async chat(
    messages: ChatMessage[],
    options: AIServiceOptions = {}
  ): Promise<AIResponse<string>> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    
    try {
      // 檢查快取
      if (finalOptions.useCache) {
        const cacheKey = this.getCacheKey('chat', JSON.stringify(messages), finalOptions);
        const cached = await cacheService.get<string>(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            metadata: {
              model: finalOptions.model || this.defaultModel,
              processingTime: Date.now() - startTime,
              cached: true
            }
          };
        }
      }

      // 呼叫 AI 服務
      const response = await this.callChatCompletion(messages, finalOptions);
      
      if (response.success && response.data) {
        // 儲存到快取
        if (finalOptions.useCache) {
          const cacheKey = this.getCacheKey('chat', JSON.stringify(messages), finalOptions);
          await cacheService.set(cacheKey, response.data, {
            ttl: finalOptions.cacheTTL,
            storage: 'both'
          });
        }
      }
      
      return {
        ...response,
        metadata: {
          ...response.metadata,
          processingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      return this.handleError(error, 'chat');
    }
  }

  /**
   * 生成結構化資料
   */
  async generateStructured<T>(
    prompt: string,
    schema: unknown,
    options: AIServiceOptions = {}
  ): Promise<AIResponse<T>> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    
    try {
      // 檢查快取
      if (finalOptions.useCache) {
        const cacheKey = this.getCacheKey('structured', `${prompt}:${JSON.stringify(schema)}`, finalOptions);
        const cached = await cacheService.get<T>(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            metadata: {
              model: finalOptions.model || this.defaultModel,
              processingTime: Date.now() - startTime,
              cached: true
            }
          };
        }
      }

      // 呼叫 AI 服務
      const response = await this.callStructuredGeneration<T>(prompt, schema, finalOptions);
      
      if (response.success && response.data) {
        // 儲存到快取
        if (finalOptions.useCache) {
          const cacheKey = this.getCacheKey('structured', `${prompt}:${JSON.stringify(schema)}`, finalOptions);
          await cacheService.set(cacheKey, response.data, {
            ttl: finalOptions.cacheTTL,
            storage: 'both'
          });
        }
      }
      
      return {
        ...response,
        metadata: {
          ...response.metadata,
          processingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      return this.handleError(error, 'generateStructured');
    }
  }

  /**
   * 串流生成
   */
  async *generateStream(
    prompt: string,
    options: AIServiceOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const finalOptions = { ...this.defaultOptions, ...options };
    
    try {
      yield* this.callStreamGeneration(prompt, finalOptions);
    } catch (error) {
      captureError(error instanceof Error ? error : new Error('Stream generation failed'), {
        component: this.serviceName,
        action: 'generateStream'
      });
      throw error;
    }
  }

  /**
   * 抽象方法 - 子類必須實作
   */
  protected abstract callTextGeneration(
    prompt: string,
    options: AIServiceOptions
  ): Promise<AIResponse<string>>;

  protected abstract callChatCompletion(
    messages: ChatMessage[],
    options: AIServiceOptions
  ): Promise<AIResponse<string>>;

  protected abstract callStructuredGeneration<T>(
    prompt: string,
    schema: unknown,
    options: AIServiceOptions
  ): Promise<AIResponse<T>>;

  protected abstract callStreamGeneration(
    prompt: string,
    options: AIServiceOptions
  ): AsyncGenerator<string, void, unknown>;

  /**
   * 輔助方法
   */
  protected getCacheKey(type: string, input: string, options: AIServiceOptions): string {
    const optionsKey = JSON.stringify({
      model: options.model || this.defaultModel,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      topK: options.topK
    });
    
    return `${this.serviceName}:${type}:${this.hashString(input)}:${this.hashString(optionsKey)}`;
  }

  protected hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  protected handleError(error: unknown, action: string): AIResponse {
    const errorObj = error instanceof Error ? error : new Error('Unknown error');
    
    captureError(errorObj, {
      component: this.serviceName,
      action
    });
    
    return {
      success: false,
      error: errorObj,
      metadata: {
        model: this.defaultModel,
        processingTime: 0
      }
    };
  }

  /**
   * Token 計算
   */
  protected estimateTokens(text: string): number {
    // 簡單估算：平均每 4 個字元為 1 個 token
    return Math.ceil(text.length / 4);
  }

  protected estimateCost(tokens: number, model: string): number {
    // 子類可覆寫以提供準確的成本計算
    const costPerThousandTokens = 0.002; // 預設值
    return (tokens / 1000) * costPerThousandTokens;
  }

  /**
   * 重試機制
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * 超時控制
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });
    
    return Promise.race([promise, timeout]);
  }
}