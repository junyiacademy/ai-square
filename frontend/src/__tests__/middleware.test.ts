/**
 * Middleware Tests
 * 提升 middleware.ts 從 0% 到 100% 覆蓋率
 */

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ type: 'next' })),
    redirect: jest.fn((url: URL) => ({ type: 'redirect', url: url.toString() }))
  }
}));

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create mock request
  const createMockRequest = (url: string, cookies?: Record<string, string>) => {
    const request = {
      url: url,
      nextUrl: new URL(url),
      cookies: {
        get: (name: string) => {
          if (cookies && cookies[name]) {
            return { value: cookies[name] };
          }
          return undefined;
        }
      }
    } as unknown as NextRequest;
    
    return request;
  };

  describe('bypass conditions', () => {
    it('should bypass API routes', () => {
      const request = createMockRequest('http://localhost/api/auth/login');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });

    it('should bypass static files', () => {
      const request = createMockRequest('http://localhost/favicon.ico');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });

    it('should bypass Next.js internal routes', () => {
      const request = createMockRequest('http://localhost/_next/static/chunk.js');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });
  });

  describe('unprotected routes', () => {
    it('should allow access to home page without authentication', () => {
      const request = createMockRequest('http://localhost/');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });

    it('should allow access to login page without authentication', () => {
      const request = createMockRequest('http://localhost/login');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });

    it('should allow access to about pages without authentication', () => {
      const request = createMockRequest('http://localhost/about');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });
  });

  describe('protected routes', () => {
    const protectedRoutes = [
      '/pbl',
      '/pbl/scenarios',
      '/assessment',
      '/assessment/scenarios',
      '/discovery',
      '/discovery/scenarios',
      '/admin',
      '/admin/content',
      '/profile',
      '/profile/settings'
    ];

    protectedRoutes.forEach(route => {
      it(`should redirect to login for ${route} without authentication`, () => {
        jest.clearAllMocks();  // Clear mocks for each test
        const request = createMockRequest(`http://localhost${route}`);
        const response = middleware(request);
        
        expect(NextResponse.redirect).toHaveBeenCalled();
        const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
        expect(redirectCall).toBeInstanceOf(URL);
        expect(redirectCall.pathname).toBe('/login');
        expect(redirectCall.search).toBe(`?redirect=${encodeURIComponent(route)}`);
        expect(response.type).toBe('redirect');
        expect(response.url).toContain('/login');
        expect(response.url).toContain(`redirect=${encodeURIComponent(route)}`);
      });
    });

    it('should allow access to protected route with valid authentication', () => {
      const request = createMockRequest('http://localhost/pbl', {
        isLoggedIn: 'true',
        sessionToken: 'mock-session-token',
        accessToken: 'mock-access-token'
      });
      
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });

    it('should redirect if isLoggedIn is not true', () => {
      const request = createMockRequest('http://localhost/pbl', {
        isLoggedIn: 'false',
        sessionToken: 'mock-session-token',
        accessToken: 'mock-access-token'
      });
      
      const response = middleware(request);
      
      expect(NextResponse.redirect).toHaveBeenCalled();
      expect(response.type).toBe('redirect');
    });

    it('should redirect if sessionToken is missing', () => {
      const request = createMockRequest('http://localhost/pbl', {
        isLoggedIn: 'true',
        accessToken: 'mock-access-token'
      });
      
      const response = middleware(request);
      
      expect(NextResponse.redirect).toHaveBeenCalled();
      expect(response.type).toBe('redirect');
    });

    it('should redirect if accessToken is missing', () => {
      const request = createMockRequest('http://localhost/pbl', {
        isLoggedIn: 'true',
        sessionToken: 'mock-session-token'
      });
      
      const response = middleware(request);
      
      expect(NextResponse.redirect).toHaveBeenCalled();
      expect(response.type).toBe('redirect');
    });

    it('should preserve query parameters in redirect URL', () => {
      const request = createMockRequest('http://localhost/pbl?category=tech');
      const response = middleware(request);
      
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectCall).toBeInstanceOf(URL);
      expect(redirectCall.pathname).toBe('/login');
      expect(redirectCall.search).toBe('?redirect=%2Fpbl%3Fcategory%3Dtech');
    });
  });

  describe('edge cases', () => {
    it('should handle routes with dots that are not static files', () => {
      const request = createMockRequest('http://localhost/user.profile');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });

    it('should handle deeply nested protected routes', () => {
      const request = createMockRequest('http://localhost/admin/content/edit/123/preview');
      const response = middleware(request);
      
      expect(NextResponse.redirect).toHaveBeenCalled();
      expect(response.type).toBe('redirect');
    });

    it('should handle routes that start with protected route names but are not protected', () => {
      const request = createMockRequest('http://localhost/pbl-info');
      const response = middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toEqual({ type: 'next' });
    });
  });
});