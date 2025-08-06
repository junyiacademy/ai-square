import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

// Mock NextResponse
const mockNext = jest.fn();
const mockRedirect = jest.fn();

jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    next: mockNext,
    redirect: mockRedirect,
  },
}));

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNext.mockReturnValue('next');
    mockRedirect.mockReturnValue('redirect');
  });

  describe('API routes and static files', () => {
    it('should pass through API routes', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const result = middleware(request);

      expect(result).toBe('next');
      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should pass through static files', () => {
      const request = new NextRequest('http://localhost:3000/favicon.ico');
      const result = middleware(request);

      expect(result).toBe('next');
      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should pass through Next.js internal routes', () => {
      const request = new NextRequest('http://localhost:3000/_next/static/css/app.css');
      const result = middleware(request);

      expect(result).toBe('next');
      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe('protected routes authentication', () => {
    const protectedPaths = ['/pbl', '/assessment', '/discovery', '/admin', '/profile'];

    protectedPaths.forEach(path => {
      it(`should redirect to login when accessing ${path} without authentication`, () => {
        const request = new NextRequest(`http://localhost:3000${path}`);
        const result = middleware(request);

        expect(result).toBe('redirect');
        expect(mockRedirect).toHaveBeenCalledWith(
          expect.objectContaining({
            href: `http://localhost:3000/login?redirect=${encodeURIComponent(path)}`
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it(`should redirect to login when accessing ${path} with incomplete authentication`, () => {
        const request = new NextRequest(`http://localhost:3000${path}`);
        // Set partial cookies
        request.cookies.set('isLoggedIn', 'true');
        // Missing sessionToken and accessToken

        const result = middleware(request);

        expect(result).toBe('redirect');
        expect(mockRedirect).toHaveBeenCalled();
      });

      it(`should allow access to ${path} when fully authenticated`, () => {
        const request = new NextRequest(`http://localhost:3000${path}`);
        // Set all required cookies
        request.cookies.set('isLoggedIn', 'true');
        request.cookies.set('sessionToken', 'valid-session-token');
        request.cookies.set('accessToken', 'valid-access-token');

        const result = middleware(request);

        expect(result).toBe('next');
        expect(mockNext).toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
      });
    });

    it('should include redirect parameter in login URL', () => {
      const protectedPath = '/pbl/scenarios/123';
      const request = new NextRequest(`http://localhost:3000${protectedPath}`);
      
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
        const request = new NextRequest(`http://localhost:3000${path}`);
        const result = middleware(request);

        expect(result).toBe('next');
        expect(mockNext).toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
      });
    });
  });

  describe('authentication edge cases', () => {
    it('should handle missing isLoggedIn cookie', () => {
      const request = new NextRequest('http://localhost:3000/pbl');
      request.cookies.set('sessionToken', 'token');
      request.cookies.set('accessToken', 'token');
      // Missing isLoggedIn

      const result = middleware(request);

      expect(result).toBe('redirect');
      expect(mockRedirect).toHaveBeenCalled();
    });

    it('should handle isLoggedIn with wrong value', () => {
      const request = new NextRequest('http://localhost:3000/pbl');
      request.cookies.set('isLoggedIn', 'false');
      request.cookies.set('sessionToken', 'token');
      request.cookies.set('accessToken', 'token');

      const result = middleware(request);

      expect(result).toBe('redirect');
      expect(mockRedirect).toHaveBeenCalled();
    });

    it('should handle empty token values', () => {
      const request = new NextRequest('http://localhost:3000/pbl');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('sessionToken', '');
      request.cookies.set('accessToken', 'token');

      const result = middleware(request);

      expect(result).toBe('redirect');
      expect(mockRedirect).toHaveBeenCalled();
    });
  });
});