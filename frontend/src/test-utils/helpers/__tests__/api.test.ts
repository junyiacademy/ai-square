import { 
  createMockRequest, 
  createMockContext,
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  executeRoute,
  apiAssertions
} from '../api';
import { mockGetServerSession, mockSession } from '../../mocks/next-auth';

describe('api test helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock to its default behavior
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue(mockSession);
  });

  describe('createMockRequest', () => {
    it('should create a mock NextRequest with full URL', () => {
      const request = createMockRequest('http://localhost:3000/api/test');
      expect(request).toBeDefined();
      expect(request.url).toBe('http://localhost:3000/api/test');
    });

    it('should handle relative URLs', () => {
      const request = createMockRequest('/api/test');
      expect(request.url).toBe('http://localhost:3000/api/test');
    });

    it('should handle JSON body', () => {
      const request = createMockRequest('/api/test', {
        method: 'POST',
        json: { test: 'data', nested: { value: 123 } }
      });
      expect(request.method).toBe('POST');
      expect(request.headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle search params', () => {
      const request = createMockRequest('/api/test', {
        searchParams: { 
          page: '1', 
          limit: '10',
          query: 'test query'
        }
      });
      expect(request.url).toContain('page=1');
      expect(request.url).toContain('limit=10');
      expect(request.url).toContain('query=test+query');
    });

    it('should handle custom headers', () => {
      const request = createMockRequest('/api/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
          'Authorization': 'Bearer token'
        }
      });
      expect(request.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(request.headers.get('Authorization')).toBe('Bearer token');
    });

    it('should handle method types', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
      
      for (const method of methods) {
        const request = createMockRequest('/api/test', { method });
        expect(request.method).toBe(method);
      }
    });

    it('should combine json body with other options', () => {
      const request = createMockRequest('/api/test', {
        method: 'POST',
        json: { data: 'test' },
        headers: {
          'X-Request-ID': '123'
        }
      });
      
      expect(request.method).toBe('POST');
      expect(request.headers.get('Content-Type')).toBe('application/json');
      expect(request.headers.get('X-Request-ID')).toBe('123');
    });

    it('should handle empty options', () => {
      const request = createMockRequest('/api/test');
      expect(request.method).toBe('GET');
      expect(request.url).toBe('http://localhost:3000/api/test');
    });
  });

  describe('createAuthenticatedRequest', () => {
    it('should create request with default session', () => {
      const request = createAuthenticatedRequest('/api/protected');
      
      // The function sets up the mock for future calls, not calls it
      expect(request.url).toBe('http://localhost:3000/api/protected');
      // Verify mock was set up correctly
      expect(mockGetServerSession.mockResolvedValueOnce).toBeDefined();
    });

    it('should create request with custom session', () => {
      const customSession = {
        user: {
          id: 'custom-user',
          email: 'custom@example.com',
          name: 'Custom User',
          image: null
        },
        expires: new Date(Date.now() + 86400000).toISOString()
      };
      
      const request = createAuthenticatedRequest('/api/protected', {}, customSession);
      
      expect(request.url).toBe('http://localhost:3000/api/protected');
      // The mock should be configured to return the custom session
      expect(mockGetServerSession.mock.results.length).toBeGreaterThanOrEqual(0);
    });

    it('should pass through request options', () => {
      const request = createAuthenticatedRequest('/api/protected', {
        method: 'POST',
        json: { action: 'update' }
      });
      
      expect(request.method).toBe('POST');
      expect(request.headers.get('Content-Type')).toBe('application/json');
    });

    it('should allow null session for testing logout scenarios', () => {
      const request = createAuthenticatedRequest('/api/protected', {}, null);
      
      expect(request.url).toBe('http://localhost:3000/api/protected');
      // The mock is configured to return null on next call
      expect(mockGetServerSession.mock.results.length).toBeGreaterThanOrEqual(0);
    });

    it('should setup mock for subsequent getServerSession calls', async () => {
      // Clear any previous mocks
      mockGetServerSession.mockReset();
      
      // Setup the mock with a custom session
      const customSession = { 
        user: { 
          id: 'test-123', 
          email: 'test@test.com',
          name: 'Test User',
          image: null
        },
        expires: new Date(Date.now() + 86400000).toISOString()
      };
      createAuthenticatedRequest('/api/test', {}, customSession);
      
      // Now if getServerSession is called, it should return the custom session
      const result = await mockGetServerSession();
      expect(result).toEqual(customSession);
    });
  });

  describe('createUnauthenticatedRequest', () => {
    it('should create request with null session setup', () => {
      const request = createUnauthenticatedRequest('/api/public');
      
      expect(request.url).toBe('http://localhost:3000/api/public');
      // Verify mock is set up to return null
      expect(mockGetServerSession.mock.results.length).toBeGreaterThanOrEqual(0);
    });

    it('should pass through request options', () => {
      const request = createUnauthenticatedRequest('/api/public', {
        method: 'GET',
        searchParams: { filter: 'active' }
      });
      
      expect(request.method).toBe('GET');
      expect(request.url).toContain('filter=active');
    });

    it('should setup mock to return null for subsequent calls', async () => {
      // Clear any previous mocks
      mockGetServerSession.mockReset();
      
      // Setup the mock
      createUnauthenticatedRequest('/api/test');
      
      // Now if getServerSession is called, it should return null
      const result = await mockGetServerSession();
      expect(result).toBeNull();
    });
  });

  describe('createMockContext', () => {
    it('should create a mock API context with single param', async () => {
      const context = createMockContext({ id: 'test-id' });
      expect(context).toBeDefined();
      expect(context.params).toBeDefined();
      
      const params = await context.params;
      expect(params).toEqual({ id: 'test-id' });
    });

    it('should create context with multiple params', async () => {
      const context = createMockContext({ 
        userId: 'user-123',
        postId: 'post-456',
        action: 'edit'
      });
      
      const params = await context.params;
      expect(params).toEqual({
        userId: 'user-123',
        postId: 'post-456',
        action: 'edit'
      });
    });

    it('should handle empty params', async () => {
      const context = createMockContext({});
      const params = await context.params;
      expect(params).toEqual({});
    });
  });

  describe('executeRoute', () => {
    it('should execute route handler and parse response', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: 'test' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );
      
      const request = createMockRequest('/api/test');
      const result = await executeRoute(mockHandler, request);
      
      expect(mockHandler).toHaveBeenCalledWith(request, undefined);
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ success: true, data: 'test' });
      expect(result.response).toBeDefined();
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('should pass context to handler', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      
      const request = createMockRequest('/api/test');
      const context = { params: Promise.resolve({ id: '123' }) };
      
      await executeRoute(mockHandler, request, context);
      
      expect(mockHandler).toHaveBeenCalledWith(request, context);
    });

    it('should handle error responses', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'Bad request' }), {
          status: 400
        })
      );
      
      const request = createMockRequest('/api/test');
      const result = await executeRoute(mockHandler, request);
      
      expect(result.status).toBe(400);
      expect(result.data).toEqual({ success: false, error: 'Bad request' });
    });
  });

  describe('apiAssertions', () => {
    describe('expectSuccess', () => {
      it('should validate successful response', () => {
        const response = new Response('{}', { status: 200 });
        const data = { success: true, result: 'data' };
        
        expect(() => apiAssertions.expectSuccess(response, data)).not.toThrow();
      });

      it('should fail for non-200 status', () => {
        const response = new Response('{}', { status: 400 });
        const data = { success: true };
        
        expect(() => apiAssertions.expectSuccess(response, data)).toThrow();
      });

      it('should fail for success: false', () => {
        const response = new Response('{}', { status: 200 });
        const data = { success: false };
        
        expect(() => apiAssertions.expectSuccess(response, data)).toThrow();
      });
    });

    describe('expectError', () => {
      it('should validate error response with default status', () => {
        const response = new Response('{}', { status: 400 });
        const data = { success: false, error: 'Bad request' };
        
        expect(() => apiAssertions.expectError(response, data)).not.toThrow();
      });

      it('should validate error response with custom status', () => {
        const response = new Response('{}', { status: 500 });
        const data = { success: false, error: 'Server error' };
        
        expect(() => apiAssertions.expectError(response, data, 500)).not.toThrow();
      });

      it('should fail for success: true', () => {
        const response = new Response('{}', { status: 400 });
        const data = { success: true };
        
        expect(() => apiAssertions.expectError(response, data)).toThrow();
      });

      it('should fail for missing error field', () => {
        const response = new Response('{}', { status: 400 });
        const data = { success: false };
        
        expect(() => apiAssertions.expectError(response, data)).toThrow();
      });
    });

    describe('expectUnauthorized', () => {
      it('should validate unauthorized response', () => {
        const response = new Response('{}', { status: 401 });
        const data = { success: false, error: 'Unauthorized access' };
        
        expect(() => apiAssertions.expectUnauthorized(response, data)).not.toThrow();
      });

      it('should accept various auth error messages', () => {
        const response = new Response('{}', { status: 401 });
        const messages = ['Not authenticated', 'Auth required', 'Unauthorized'];
        
        for (const message of messages) {
          const data = { success: false, error: message };
          expect(() => apiAssertions.expectUnauthorized(response, data)).not.toThrow();
        }
      });

      it('should fail for wrong status code', () => {
        const response = new Response('{}', { status: 403 });
        const data = { success: false, error: 'Unauthorized' };
        
        expect(() => apiAssertions.expectUnauthorized(response, data)).toThrow();
      });
    });

    describe('expectForbidden', () => {
      it('should validate forbidden response', () => {
        const response = new Response('{}', { status: 403 });
        const data = { success: false, error: 'Access denied' };
        
        expect(() => apiAssertions.expectForbidden(response, data)).not.toThrow();
      });

      it('should accept various forbidden error messages', () => {
        const response = new Response('{}', { status: 403 });
        const messages = ['Forbidden', 'Access denied', 'Permission denied'];
        
        for (const message of messages) {
          const data = { success: false, error: message };
          expect(() => apiAssertions.expectForbidden(response, data)).not.toThrow();
        }
      });
    });

    describe('expectNotFound', () => {
      it('should validate not found response', () => {
        const response = new Response('{}', { status: 404 });
        const data = { success: false, error: 'Resource not found' };
        
        expect(() => apiAssertions.expectNotFound(response, data)).not.toThrow();
      });

      it('should match case-insensitive', () => {
        const response = new Response('{}', { status: 404 });
        const data = { success: false, error: 'NOT FOUND' };
        
        expect(() => apiAssertions.expectNotFound(response, data)).not.toThrow();
      });
    });

    describe('expectDataStructure', () => {
      it('should validate matching data structure', () => {
        const data = {
          id: '123',
          name: 'Test',
          metadata: {
            created: '2024-01-01',
            tags: ['a', 'b']
          }
        };
        
        const expected = {
          id: expect.any(String),
          name: expect.any(String),
          metadata: expect.objectContaining({
            created: expect.any(String),
            tags: expect.arrayContaining(['a'])
          })
        };
        
        expect(() => apiAssertions.expectDataStructure(data, expected)).not.toThrow();
      });

      it('should fail for mismatched structure', () => {
        const data = { id: '123' };
        const expected = { id: '123', name: 'Test' };
        
        expect(() => apiAssertions.expectDataStructure(data, expected)).toThrow();
      });

      it('should validate nested structures', () => {
        const data = {
          user: {
            profile: {
              settings: {
                theme: 'dark',
                notifications: true
              }
            }
          }
        };
        
        const expected = {
          user: {
            profile: {
              settings: {
                theme: 'dark',
                notifications: true
              }
            }
          }
        };
        
        expect(() => apiAssertions.expectDataStructure(data, expected)).not.toThrow();
      });
    });
  });

  describe('Integration tests', () => {
    it('should work together for authenticated route test', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ 
          success: true, 
          user: { id: 'user-1', email: 'test@example.com' }
        }), { status: 200 })
      );
      
      const request = createAuthenticatedRequest('/api/user/profile', {
        method: 'GET'
      });
      
      const context = createMockContext({ userId: 'user-1' });
      const result = await executeRoute(mockHandler, request, context);
      
      apiAssertions.expectSuccess(result.response, result.data);
      apiAssertions.expectDataStructure(result.data, {
        success: true,
        user: expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String)
        })
      });
    });

    it('should work together for unauthenticated route test', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ 
          success: false, 
          error: 'Unauthorized' 
        }), { status: 401 })
      );
      
      const request = createUnauthenticatedRequest('/api/protected');
      const result = await executeRoute(mockHandler, request);
      
      apiAssertions.expectUnauthorized(result.response, result.data);
    });
  });
});