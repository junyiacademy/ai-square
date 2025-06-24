/**
 * API 路由測試模板
 * 
 * 使用方式：
 * 1. 複製此模板到 src/app/api/[route]/__tests__/route.test.ts
 * 2. 替換 [ROUTE_NAME] 為實際路由名稱
 * 3. 替換 [REQUEST_DATA] 和 [RESPONSE_DATA] 為實際數據
 * 4. 根據需要添加或修改測試案例
 */

/**
 * @jest-environment node
 */
import { GET, POST, PUT, DELETE } from '../route';
// import any dependencies your route needs

// Mock external dependencies
jest.mock('fs');
jest.mock('your-external-library');

// Helper function to create mock requests for Node.js environment
const createMockRequest = (url: string, options: RequestInit = {}) => {
  const mockUrl = new URL(url);
  return {
    url,
    method: options.method || 'GET',
    headers: new Map(Object.entries(options.headers || {})),
    nextUrl: mockUrl,
    searchParams: mockUrl.searchParams,
    json: async () => options.body ? JSON.parse(options.body as string) : null,
  } as any;
};

describe('/api/[ROUTE_NAME] route', () => {
  const mockSuccessData = {
    // Define your mock successful response data
  };

  const mockErrorData = {
    // Define your mock error response data
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup any necessary mocks here
  });

  describe('GET method', () => {
    it('should return success response with valid data', async () => {
      // Arrange
      const request = createMockRequest('http://localhost:3000/api/[ROUTE_NAME]');
      
      // Act
      const response = await GET(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('expectedProperty');
      expect(data.expectedProperty).toBe('expectedValue');
    });

    it('should handle query parameters correctly', async () => {
      // Arrange
      const request = createMockRequest('http://localhost:3000/api/[ROUTE_NAME]?param=value');
      
      // Act
      const response = await GET(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      // Add specific assertions for query parameter handling
    });

    it('should return 404 when resource not found', async () => {
      // Arrange
      const request = createMockRequest('http://localhost:3000/api/[ROUTE_NAME]/nonexistent');
      
      // Act
      const response = await GET(request);
      
      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 500 when internal error occurs', async () => {
      // Arrange
      // Mock an error scenario
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const request = createMockRequest('http://localhost:3000/api/[ROUTE_NAME]');
      
      // Act
      const response = await GET(request);
      
      // Assert
      expect(response.status).toBe(500);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('POST method', () => {
    it('should create resource with valid data', async () => {
      // Arrange
      const requestData = {
        // Define your request payload
      };
      
      const request = createMockRequest('http://localhost:3000/api/[ROUTE_NAME]', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.name).toBe(requestData.name);
    });

    it('should return 400 when request data is invalid', async () => {
      // Arrange
      const invalidData = {
        // Define invalid request data
      };
      
      const request = createMockRequest('http://localhost:3000/api/[ROUTE_NAME]', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 401 when unauthorized', async () => {
      // Arrange
      const request = createMockRequest('http://localhost:3000/api/[ROUTE_NAME]', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      // Act
      const response = await POST(request);
      
      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('PUT method', () => {
    it('should update resource with valid data', async () => {
      // Arrange
      const updateData = {
        // Define your update payload
      };
      
      const request = createMockRequest('http://localhost:3000/api/[ROUTE_NAME]/123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      // Act
      const response = await PUT(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.id).toBe('123');
    });
  });

  describe('DELETE method', () => {
    it('should delete resource successfully', async () => {
      // Arrange
      const request = createMockRequest('http://localhost:3000/api/[ROUTE_NAME]/123', {
        method: 'DELETE',
      });
      
      // Act
      const response = await DELETE(request);
      
      // Assert
      expect(response.status).toBe(204);
    });

    it('should return 404 when resource to delete not found', async () => {
      // Arrange
      const request = createMockRequest('http://localhost:3000/api/[ROUTE_NAME]/nonexistent', {
        method: 'DELETE',
      });
      
      // Act
      const response = await DELETE(request);
      
      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('Content Type Handling', () => {
    it('should handle JSON content type', async () => {
      // Test JSON request/response handling
    });

    it('should handle form data', async () => {
      // Test form data handling if applicable
    });

    it('should reject unsupported content types', async () => {
      // Test unsupported content type rejection
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // Test rate limiting if implemented
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require valid authentication', async () => {
      // Test authentication requirements
    });

    it('should enforce proper authorization', async () => {
      // Test authorization checks
    });
  });
});

/*
TDD 檢查清單：

✅ 測試先於實現
✅ 每個測試只測試一個行為
✅ 使用描述性的測試名稱
✅ 遵循 Arrange-Act-Assert 模式
✅ Mock 外部依賴
✅ 測試邊界條件和錯誤情況
✅ 覆蓋所有 HTTP 方法
✅ 測試各種狀態碼
✅ 驗證請求和響應格式

記住：
- 先寫測試，讓它失敗
- 實現最小代碼讓測試通過
- 重構優化代碼
- 重複此循環
*/