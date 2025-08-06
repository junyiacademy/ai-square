import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

// Mock NextResponse
const mockNext = jest.fn(() => ({ status: 200 }));
const mockRedirect = jest.fn((url: any) => ({ status: 307, url }));

jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    next: () => mockNext(),
    redirect: (url: any) => mockRedirect(url),
  },
}));

// Mock NextRequest to ensure nextUrl.pathname works
const createMockRequest = (url: string) => {
  // Cookie storage
  const cookieStore = new Map<string, string>();
  
  // Create a basic request object
  const request = {
    url,
    nextUrl: new URL(url),
    cookies: {
      get: (name: string) => {
        const value = cookieStore.get(name);
        return value ? { value } : undefined;
      },
      set: (name: string, value: string) => {
        cookieStore.set(name, value);
      }
    }
  } as any;
  
  return request;
};

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API routes and static files', () => {
    it('should pass through API routes', () => {
      const request = createMockRequest('http://localhost:3000/api/test');
      middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should pass through static files', () => {
      const request = createMockRequest('http://localhost:3000/favicon.ico');
      middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should pass through Next.js internal routes', () => {
      const request = createMockRequest('http://localhost:3000/_next/static/css/app.css');
      middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe('protected routes authentication', () => {
    const protectedPaths = ['/pbl', '/assessment', '/discovery', '/admin', '/profile'];

    protectedPaths.forEach(path => {
      it(`should redirect to login when accessing ${path} without authentication`, () => {
        const request = createMockRequest(`http://localhost:3000${path}`);
        middleware(request);

        expect(mockRedirect).toHaveBeenCalledWith(
          expect.objectContaining({
            href: `http://localhost:3000/login?redirect=${encodeURIComponent(path)}`
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it(`should redirect to login when accessing ${path} with incomplete authentication`, () => {
        const request = createMockRequest(`http://localhost:3000${path}`);
        // Set partial cookies
        request.cookies.set('isLoggedIn', 'true');
        // Missing sessionToken and accessToken

        middleware(request);

        expect(mockRedirect).toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      });

      it(`should allow access to ${path} when fully authenticated`, () => {
        const request = createMockRequest(`http://localhost:3000${path}`);
        // Set all required cookies
        request.cookies.set('isLoggedIn', 'true');
        request.cookies.set('sessionToken', 'valid-session-token');
        request.cookies.set('accessToken', 'valid-access-token');

        middleware(request);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
      });
    });

    it('should include redirect parameter in login URL', () => {
      const protectedPath = '/pbl/scenarios/123';
      const request = createMockRequest(`http://localhost:3000${protectedPath}`);
      
      middleware(request);

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: `http://localhost:3000/login?redirect=${encodeURIComponent(protectedPath)}`
        })
      );
    });
  });

  describe('public routes', () => {
    const publicPaths = ['/', '/login', '/register', '/about', '/contact'];

    publicPaths.forEach(path => {
      it(`should allow access to public route ${path}`, () => {
        const request = createMockRequest(`http://localhost:3000${path}`);
        middleware(request);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
      });
    });
  });

  describe('authentication edge cases', () => {
    it('should handle missing isLoggedIn cookie', () => {
      const request = createMockRequest('http://localhost:3000/pbl');
      request.cookies.set('sessionToken', 'token');
      request.cookies.set('accessToken', 'token');
      // Missing isLoggedIn

      middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle isLoggedIn with wrong value', () => {
      const request = createMockRequest('http://localhost:3000/pbl');
      request.cookies.set('isLoggedIn', 'false');
      request.cookies.set('sessionToken', 'token');
      request.cookies.set('accessToken', 'token');

      middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty token values', () => {
      const request = createMockRequest('http://localhost:3000/pbl');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('sessionToken', '');
      request.cookies.set('accessToken', 'token');

      middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});