/**
 * 範例：使用新的測試基礎設施進行 API 路由測試
 * 這個檔案展示如何使用 API 測試工具
 */

import { 
  createMockRequest, 
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createMockContext,
  apiAssertions 
} from '@/test-utils';
import { 
  createMockUser, 
  createMockProgram,
  mockRepositoryFactory 
} from '@/test-utils/mocks/repositories';
import { NextResponse } from 'next/server';

// 範例 API 路由處理器
const GET = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  // 這是一個範例，實際的路由會有真實的邏輯
  const { id } = await context.params;
  
  // 模擬從資料庫獲取資料
  const userRepo = mockRepositoryFactory.getUserRepository();
  const user = await userRepo.findById(id);
  
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: user
  });
};

describe('API Route Example', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('GET /api/users/[id]', () => {
    it('should return user data for valid ID', async () => {
      // 準備 mock 資料
      const mockUser = createMockUser({ id: 'user-123' });
      const mockUserRepo = mockRepositoryFactory.getUserRepository();
      mockUserRepo.findById = jest.fn().mockResolvedValue(mockUser);
      
      // 創建請求和 context
      const request = createMockRequest('/api/users/user-123');
      const context = createMockContext({ id: 'user-123' });
      
      // 執行路由
      const response = await GET(request, context);
      const data = await response.json();
      
      // 驗證回應
      apiAssertions.expectSuccess(response, data);
      apiAssertions.expectDataStructure(data, {
        success: true,
        data: expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com'
        })
      });
    });
    
    it('should return 404 for invalid ID', async () => {
      // Mock 找不到用戶
      const mockUserRepo = mockRepositoryFactory.getUserRepository();
      mockUserRepo.findById = jest.fn().mockResolvedValue(null);
      
      const request = createMockRequest('/api/users/invalid-id');
      const context = createMockContext({ id: 'invalid-id' });
      
      const response = await GET(request, context);
      const data = await response.json();
      
      // 使用 apiAssertions 驗證
      apiAssertions.expectNotFound(response, data);
    });
    
    it('should handle authenticated requests', async () => {
      // 使用認證請求
      const request = createAuthenticatedRequest('/api/users/me', {
        method: 'GET'
      });
      
      // 這裡會自動設定 mockGetServerSession
      // 可以在路由中使用 getServerSession() 來獲取 session
    });
    
    it('should reject unauthenticated requests', async () => {
      // 使用未認證請求
      const request = createUnauthenticatedRequest('/api/protected');
      
      // 假設有一個需要認證的路由
      const protectedRoute = async (req: Request) => {
        // 實際路由會檢查 session
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      };
      
      const response = await protectedRoute(request);
      const data = await response.json();
      
      apiAssertions.expectUnauthorized(response, data);
    });
    
    it('should handle query parameters', async () => {
      // 創建帶查詢參數的請求
      const request = createMockRequest('/api/users', {
        searchParams: {
          page: '1',
          limit: '10',
          filter: 'active'
        }
      });
      
      // 可以在路由中使用 URL 來獲取參數
      const url = new URL(request.url);
      expect(url.searchParams.get('page')).toBe('1');
      expect(url.searchParams.get('limit')).toBe('10');
      expect(url.searchParams.get('filter')).toBe('active');
    });
    
    it('should handle JSON body', async () => {
      // 創建帶 JSON body 的 POST 請求
      const request = createMockRequest('/api/users', {
        method: 'POST',
        json: {
          name: 'New User',
          email: 'new@example.com'
        }
      });
      
      // 在路由中可以使用 request.json() 來獲取 body
      const body = await request.json();
      expect(body).toEqual({
        name: 'New User',
        email: 'new@example.com'
      });
    });
  });
});