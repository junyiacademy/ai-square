/**
 * KSA API Handler Implementation
 * 基於 BaseApiHandler 的 KSA API 實作範例
 */

import { NextRequest } from 'next/server';
import { BaseApiHandler, RequestContext } from '@/lib/abstractions/base-api-handler';
import { contentLoader, CombinedContent } from './yaml-content-loader-impl';

export class KSAApiHandler extends BaseApiHandler<never, CombinedContent> {
  
  protected async executeGet(
    request: NextRequest,
    context: RequestContext
  ): Promise<CombinedContent> {
    // 使用 contentLoader 載入資料
    const result = await contentLoader.loadAll(context.language);
    
    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to load KSA data');
    }
    
    return result.data;
  }

  protected async executePost(): Promise<CombinedContent> {
    throw new Error('POST method not supported for KSA API');
  }

  protected async executePut(): Promise<CombinedContent> {
    throw new Error('PUT method not supported for KSA API');
  }

  protected async executeDelete(): Promise<CombinedContent> {
    throw new Error('DELETE method not supported for KSA API');
  }

  protected getCacheKey(request: NextRequest, context: RequestContext): string {
    return `ksa:${context.language || 'en'}`;
  }

  protected shouldCacheResponse(response: CombinedContent): boolean {
    // 只快取成功載入的資料
    return !!(response.domains && response.ksa);
  }

  protected getCacheTTL(): number {
    // KSA 資料相對穩定，可以快取較長時間
    return 60 * 60 * 1000; // 1 hour
  }
}

// 建立處理器實例
export const ksaApiHandler = new KSAApiHandler();