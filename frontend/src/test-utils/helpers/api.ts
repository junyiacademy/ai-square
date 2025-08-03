/**
 * API Test Utilities
 * 統一的 API 測試輔助函數
 */

import { NextRequest } from 'next/server';
import { mockSession, mockGetServerSession } from '../mocks/next-auth';

/**
 * 創建 mock NextRequest
 * @param url - 請求 URL
 * @param options - 請求選項
 */
export const createMockRequest = (
  url: string,
  options: RequestInit & { 
    json?: Record<string, unknown>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest => {
  const { json, searchParams, ...init } = options;
  
  // 構建完整 URL
  let fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
  
  // 添加查詢參數
  if (searchParams) {
    const params = new URLSearchParams(searchParams);
    fullUrl += `?${params.toString()}`;
  }
  
  // 處理 JSON body
  if (json) {
    init.body = JSON.stringify(json);
    init.headers = {
      'Content-Type': 'application/json',
      ...init.headers,
    };
  }
  
  // Create RequestInit without signal issues
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { signal, ...cleanInit } = init;
  
  return new NextRequest(fullUrl, cleanInit);
};

/**
 * 創建帶有認證的請求
 * @param url - 請求 URL
 * @param options - 請求選項
 * @param session - 自定義 session
 */
export const createAuthenticatedRequest = (
  url: string,
  options: Parameters<typeof createMockRequest>[1] = {},
  session: unknown = mockSession
): NextRequest => {
  // 設定 mock session
  mockGetServerSession.mockResolvedValueOnce(session);
  
  return createMockRequest(url, options);
};

/**
 * 創建未認證的請求
 * @param url - 請求 URL
 * @param options - 請求選項
 */
export const createUnauthenticatedRequest = (
  url: string,
  options: Parameters<typeof createMockRequest>[1] = {}
): NextRequest => {
  // 設定 null session
  mockGetServerSession.mockResolvedValueOnce(null);
  
  return createMockRequest(url, options);
};

/**
 * 創建 mock context for dynamic routes
 * @param params - 路由參數
 */
export const createMockContext = <T extends Record<string, string>>(
  params: T
): { params: Promise<T> } => ({
  params: Promise.resolve(params),
});

/**
 * 執行 API 路由並驗證回應
 * @param handler - API route handler
 * @param request - NextRequest
 * @param context - Route context
 */
export const executeRoute = async (
  handler: (req: NextRequest, ctx?: Record<string, unknown>) => Promise<Response>,
  request: NextRequest,
  context?: Record<string, unknown>
) => {
  const response = await handler(request, context);
  const data = await response.json();
  
  return {
    response,
    data,
    status: response.status,
    headers: response.headers,
  };
};

/**
 * 常用的 API 測試斷言
 */
export const apiAssertions = {
  /**
   * 驗證成功回應
   */
  expectSuccess: (response: Response, data: Record<string, unknown>) => {
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
  },
  
  /**
   * 驗證錯誤回應
   */
  expectError: (response: Response, data: Record<string, unknown>, status: number = 400) => {
    expect(response.status).toBe(status);
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error');
  },
  
  /**
   * 驗證需要認證
   */
  expectUnauthorized: (response: Response, data: Record<string, unknown>) => {
    expect(response.status).toBe(401);
    expect(data).toHaveProperty('success', false);
    expect(data.error).toMatch(/auth|unauthorized/i);
  },
  
  /**
   * 驗證禁止訪問
   */
  expectForbidden: (response: Response, data: Record<string, unknown>) => {
    expect(response.status).toBe(403);
    expect(data).toHaveProperty('success', false);
    expect(data.error).toMatch(/forbidden|denied|access/i);
  },
  
  /**
   * 驗證找不到資源
   */
  expectNotFound: (response: Response, data: Record<string, unknown>) => {
    expect(response.status).toBe(404);
    expect(data).toHaveProperty('success', false);
    expect(data.error).toMatch(/not found/i);
  },
  
  /**
   * 驗證資料結構
   */
  expectDataStructure: (data: Record<string, unknown>, structure: Record<string, unknown>) => {
    expect(data).toMatchObject(structure);
  },
};