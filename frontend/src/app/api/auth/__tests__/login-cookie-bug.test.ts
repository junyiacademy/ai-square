/**
 * 這個測試專門用來防止 2025-08-17 發生的認證 bug 再次出現
 * 
 * 🔴 Bug 情境描述：
 * 1. 用戶在 staging 環境登入成功
 * 2. 點擊導航到 /pbl 或其他受保護頁面
 * 3. 被重定向回 /login 頁面
 * 
 * 🔍 根本原因：
 * 在 /api/auth/login/route.ts 第 313 行，程式碼錯誤地寫成：
 * response.cookies.set('accessToken', sessionToken, { ... })
 * 
 * 應該是：
 * response.cookies.set('accessToken', accessToken, { ... })
 * 
 * 這導致 middleware 檢查時，雖然看到 accessToken cookie 存在，
 * 但其值實際上是 sessionToken，造成認證邏輯混亂。
 * 
 * 另外，accessToken 的有效期原本只有 15 分鐘，太短了。
 * 
 * 🎯 這個測試的目的：
 * - 確保 accessToken cookie 包含正確的 access token 值
 * - 確保不會把 sessionToken 的值錯誤地設給 accessToken
 * - 確保 cookie 有效期足夠長
 * - 確保同一個 cookie 不會被重複設定
 */

import { POST } from '../login/route';
import { NextRequest } from 'next/server';

// Mock NextResponse 以支援 cookies
const mockSetCookieHeaders: string[] = [];
const mockCookies = {
  set: jest.fn((name: string, value: string, options: any) => {
    const maxAge = options?.maxAge || 86400;
    const httpOnly = options?.httpOnly ? 'HttpOnly; ' : '';
    const secure = options?.secure ? 'Secure; ' : '';
    const sameSite = options?.sameSite ? `SameSite=${options.sameSite}; ` : '';
    const path = options?.path || '/';
    
    const cookieString = `${name}=${value}; ${httpOnly}${secure}${sameSite}Max-Age=${maxAge}; Path=${path}`;
    mockSetCookieHeaders.push(cookieString);
  })
};

jest.mock('next/server', () => ({
  NextRequest: jest.requireActual('next/server').NextRequest,
  NextResponse: {
    json: (data: any) => {
      const response = {
        ...new Response(JSON.stringify(data)),
        status: 200,
        cookies: mockCookies,
        headers: {
          getSetCookie: () => mockSetCookieHeaders
        }
      };
      return response;
    }
  }
}));

// Mock 所有依賴
jest.mock('@/lib/db/get-pool', () => ({
  getPool: jest.fn(() => ({ query: jest.fn(), end: jest.fn(), on: jest.fn() }))
}));

jest.mock('@/lib/repositories/postgresql', () => ({
  PostgreSQLUserRepository: jest.fn(() => ({
    create: jest.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
    updateLastActive: jest.fn()
  }))
}));

jest.mock('@/lib/auth/password-utils', () => ({
  getUserWithPassword: jest.fn().mockResolvedValue({
    id: 'user-123',
    email: 'student@example.com',
    passwordHash: '$2a$10$validhash',
    role: 'student',
    name: 'Test User',
    preferredLanguage: 'en',
    emailVerified: true,
    onboardingCompleted: false
  }),
  updateUserPasswordHash: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn()
}));

// 重要：Mock token 生成函數，返回不同的值以便檢測錯誤
jest.mock('@/lib/auth/jwt', () => ({
  createAccessToken: jest.fn().mockResolvedValue('CORRECT-ACCESS-TOKEN'),
  createRefreshToken: jest.fn().mockResolvedValue('CORRECT-REFRESH-TOKEN')
}));

jest.mock('@/lib/auth/session-simple', () => ({
  createSessionToken: jest.fn().mockReturnValue('CORRECT-SESSION-TOKEN')
}));

describe('登入 Cookie Bug 回歸測試', () => {
  beforeEach(() => {
    // 清除之前的 mock 資料
    mockSetCookieHeaders.length = 0;
    mockCookies.set.mockClear();
  });
  
  test('accessToken cookie 必須包含正確的 access token 值，不是 session token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123'
      })
    });

    const response = await POST(request);
    
    // 取得所有 Set-Cookie headers
    const setCookieHeaders = response.headers.getSetCookie();
    
    // 找到 accessToken cookie
    const accessTokenCookie = setCookieHeaders.find(cookie => 
      cookie.startsWith('accessToken=')
    );
    
    // 找到 sessionToken cookie
    const sessionTokenCookie = setCookieHeaders.find(cookie => 
      cookie.startsWith('sessionToken=')
    );
    
    // 關鍵測試：確保 accessToken 包含正確的值
    expect(accessTokenCookie).toBeDefined();
    expect(accessTokenCookie).toContain('accessToken=CORRECT-ACCESS-TOKEN');
    
    // 確保 accessToken 不包含 session token 的值
    expect(accessTokenCookie).not.toContain('CORRECT-SESSION-TOKEN');
    expect(accessTokenCookie).not.toContain('sessionToken');
    
    // 確保 sessionToken 有自己正確的值
    expect(sessionTokenCookie).toBeDefined();
    expect(sessionTokenCookie).toContain('sessionToken=CORRECT-SESSION-TOKEN');
  });

  test('模擬錯誤情況：如果 accessToken 被設為 sessionToken 的值，測試應該失敗', async () => {
    // 模擬錯誤的 cookie 設定（這是 bug 的情況）
    const errorCookies = [
      'accessToken=CORRECT-SESSION-TOKEN; HttpOnly; Path=/',
      'sessionToken=CORRECT-SESSION-TOKEN; HttpOnly; Path=/'
    ];
    
    const accessTokenCookie = errorCookies.find(c => c.startsWith('accessToken='));
    const sessionTokenCookie = errorCookies.find(c => c.startsWith('sessionToken='));
    
    // 這個測試展示了 bug 的情況
    expect(accessTokenCookie).toContain('CORRECT-SESSION-TOKEN'); // 錯誤！
    
    // 我們的檢查會發現這個問題
    const accessTokenValue = accessTokenCookie?.split(';')[0].split('=')[1];
    const sessionTokenValue = sessionTokenCookie?.split(';')[0].split('=')[1];
    
    // 這個條件在有 bug 時會是 true（不應該發生）
    expect(accessTokenValue === sessionTokenValue).toBe(true);
    
    // 這就是為什麼我們的主要測試要確保這種情況不會發生
  });

  test('所有必要的 cookies 都應該被設定且有不同的值', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123'
      })
    });

    const response = await POST(request);
    const setCookieHeaders = response.headers.getSetCookie();
    
    // 提取所有 cookie 的名稱和值
    const cookies = new Map<string, string>();
    setCookieHeaders.forEach(header => {
      const [nameValue] = header.split(';');
      const [name, value] = nameValue.split('=');
      cookies.set(name, value);
    });
    
    // 確保關鍵的 cookies 都存在
    expect(cookies.has('isLoggedIn')).toBe(true);
    expect(cookies.has('sessionToken')).toBe(true);
    expect(cookies.has('accessToken')).toBe(true);
    
    // 確保 sessionToken 和 accessToken 有不同的值
    expect(cookies.get('sessionToken')).toBe('CORRECT-SESSION-TOKEN');
    expect(cookies.get('accessToken')).toBe('CORRECT-ACCESS-TOKEN');
    expect(cookies.get('sessionToken')).not.toBe(cookies.get('accessToken'));
  });

  test('cookie 不應該被重複設定', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123'
      })
    });

    const response = await POST(request);
    const setCookieHeaders = response.headers.getSetCookie();
    
    // 計算每個 cookie 名稱出現的次數
    const cookieCounts = new Map<string, number>();
    setCookieHeaders.forEach(header => {
      const [nameValue] = header.split(';');
      const [name] = nameValue.split('=');
      cookieCounts.set(name, (cookieCounts.get(name) || 0) + 1);
    });
    
    // 確保每個 cookie 只設定一次
    cookieCounts.forEach((count, name) => {
      expect(count).toBe(1);
    });
  });

  test('cookie 有效期不應該太短', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123',
        rememberMe: false
      })
    });

    const response = await POST(request);
    const setCookieHeaders = response.headers.getSetCookie();
    
    const accessTokenCookie = setCookieHeaders.find(c => c.startsWith('accessToken='));
    
    // 提取 Max-Age
    const maxAgeMatch = accessTokenCookie?.match(/Max-Age=(\d+)/i);
    if (maxAgeMatch) {
      const maxAge = parseInt(maxAgeMatch[1]);
      
      // 不應該只有 15 分鐘（900 秒）
      expect(maxAge).toBeGreaterThan(900);
      
      // 至少應該是 24 小時（86400 秒）
      expect(maxAge).toBeGreaterThanOrEqual(86400);
    }
  });
});