/**
 * Authentication Integration Tests
 * 
 * These tests ensure the entire authentication flow works correctly
 * and prevents regression to old cookie-based authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthManager } from '../auth-manager';
import { createSessionToken, verifySessionToken } from '../session-simple';
import { getServerSession } from '../session';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn(),
  })),
  headers: jest.fn(() => Promise.resolve({
    get: jest.fn(),
  })),
}));

jest.mock('../session-simple', () => ({
  createSessionToken: jest.fn(),
  verifySessionToken: jest.fn(),
}));

describe('Authentication Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthManager', () => {
    it('should only use sessionToken cookie, not old user/isLoggedIn cookies', () => {
      const request = new NextRequest('http://localhost/protected');
      const mockCookies = new Map([
        ['sessionToken', { name: 'sessionToken', value: 'valid-token' }],
        // These old cookies should be ignored
        ['user', { name: 'user', value: JSON.stringify({ email: 'test@example.com' }) }],
        ['isLoggedIn', { name: 'isLoggedIn', value: 'true' }],
      ]);
      
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => mockCookies.get(name),
        },
      });

      // Mock valid session token
      const spy = jest.spyOn(AuthManager, 'isValidSessionToken').mockReturnValue(true);

      const isAuthenticated = AuthManager.isAuthenticated(request);
      
      expect(isAuthenticated).toBe(true);
      expect(spy).toHaveBeenCalledWith('valid-token');
      
      // Ensure old cookies are not checked
      expect(request.cookies.get('user')).toBeDefined(); // Old cookie exists but should be ignored
      expect(request.cookies.get('isLoggedIn')).toBeDefined(); // Old cookie exists but should be ignored
    });

    it('should return false when only old cookies exist', () => {
      const request = new NextRequest('http://localhost/protected');
      const mockCookies = new Map([
        // Only old cookies, no sessionToken
        ['user', { name: 'user', value: JSON.stringify({ email: 'test@example.com' }) }],
        ['isLoggedIn', { name: 'isLoggedIn', value: 'true' }],
      ]);
      
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => mockCookies.get(name),
        },
      });

      const isAuthenticated = AuthManager.isAuthenticated(request);
      
      expect(isAuthenticated).toBe(false);
    });

    it('should set only sessionToken cookie, not multiple cookies', () => {
      const mockSet = jest.fn();
      const response = {
        cookies: {
          set: mockSet
        }
      } as unknown as NextResponse;
      
      AuthManager.setAuthCookie(response, 'test-session-token', false);
      
      expect(mockSet).toHaveBeenCalledTimes(1);
      expect(mockSet).toHaveBeenCalledWith('sessionToken', 'test-session-token', {
        httpOnly: true,
        secure: false, // NODE_ENV is test
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/'
      });
    });

    it('should clear only sessionToken cookie', () => {
      const mockSet = jest.fn();
      const response = {
        cookies: {
          set: mockSet
        }
      } as unknown as NextResponse;
      
      AuthManager.clearAuthCookies(response);
      
      expect(mockSet).toHaveBeenCalledTimes(1);
      expect(mockSet).toHaveBeenCalledWith('sessionToken', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });
    });
  });

  describe('getServerSession', () => {
    it('should NOT use old cookie fallback when sessionToken is missing', async () => {
      const { cookies, headers } = await import('next/headers');
      const mockCookies = {
        get: jest.fn((name: string) => {
          if (name === 'isLoggedIn') return { value: 'true' };
          if (name === 'user') return { value: JSON.stringify({ email: 'test@example.com', id: '123' }) };
          return undefined;
        }),
      };
      const mockHeaders = {
        get: jest.fn().mockReturnValue(null),
      };

      (cookies as jest.Mock).mockResolvedValue(mockCookies);
      (headers as jest.Mock).mockResolvedValue(mockHeaders);
      (verifySessionToken as jest.Mock).mockReturnValue(null);

      const session = await getServerSession();
      
      // Should return null, NOT use the fallback
      expect(session).toBeNull();
    });

    it('should use sessionToken when available', async () => {
      const { cookies, headers } = await import('next/headers');
      const mockCookies = {
        get: jest.fn((name: string) => {
          if (name === 'sessionToken') return { value: 'valid-token' };
          return undefined;
        }),
      };
      const mockHeaders = {
        get: jest.fn().mockReturnValue(null),
      };

      (cookies as jest.Mock).mockResolvedValue(mockCookies);
      (headers as jest.Mock).mockResolvedValue(mockHeaders);
      (verifySessionToken as jest.Mock).mockReturnValue({
        userId: '123',
        email: 'test@example.com',
      });

      const session = await getServerSession();
      
      expect(session).toEqual({
        user: {
          id: '123',
          email: 'test@example.com',
        },
      });
      expect(verifySessionToken).toHaveBeenCalledWith('valid-token');
    });

    it('should check x-session-token header for API calls', async () => {
      const { cookies, headers } = await import('next/headers');
      const mockCookies = {
        get: jest.fn().mockReturnValue(undefined),
      };
      const mockHeaders = {
        get: jest.fn((name: string) => {
          if (name === 'x-session-token') return 'header-token';
          return null;
        }),
      };

      (cookies as jest.Mock).mockResolvedValue(mockCookies);
      (headers as jest.Mock).mockResolvedValue(mockHeaders);
      (verifySessionToken as jest.Mock).mockReturnValue({
        userId: '456',
        email: 'api@example.com',
      });

      const session = await getServerSession();
      
      expect(session).toEqual({
        user: {
          id: '456',
          email: 'api@example.com',
        },
      });
      expect(verifySessionToken).toHaveBeenCalledWith('header-token');
    });
  });

  describe('Authentication Flow', () => {
    it('should not accept requests with only old cookies', () => {
      const request = new NextRequest('http://localhost/api/protected');
      // Simulate old cookie-based auth
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => {
            if (name === 'user') return { value: JSON.stringify({ email: 'test@example.com' }) };
            if (name === 'isLoggedIn') return { value: 'true' };
            return undefined;
          },
        },
      });

      const sessionToken = AuthManager.getSessionToken(request);
      const isAuthenticated = AuthManager.isAuthenticated(request);
      
      expect(sessionToken).toBeUndefined();
      expect(isAuthenticated).toBe(false);
    });

    it('should accept requests with valid sessionToken', () => {
      const request = new NextRequest('http://localhost/api/protected');
      const validToken = btoa(JSON.stringify({ userId: '123', email: 'test@example.com' }));
      
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => {
            if (name === 'sessionToken') return { value: validToken };
            return undefined;
          },
        },
      });

      const sessionToken = AuthManager.getSessionToken(request);
      const isAuthenticated = AuthManager.isAuthenticated(request);
      
      expect(sessionToken).toBe(validToken);
      expect(isAuthenticated).toBe(true);
    });
  });

  describe('Protected Route Access', () => {
    const protectedRoutes = ['/pbl', '/assessment', '/discovery', '/admin', '/profile', '/dashboard'];
    
    protectedRoutes.forEach(route => {
      it(`should block access to ${route} without sessionToken`, () => {
        const request = new NextRequest(`http://localhost${route}/test`);
        
        // No cookies at all
        Object.defineProperty(request, 'cookies', {
          value: {
            get: jest.fn().mockReturnValue(undefined),
          },
        });

        const isProtected = AuthManager.isProtectedRoute(route);
        const isAuthenticated = AuthManager.isAuthenticated(request);
        
        expect(isProtected).toBe(true);
        expect(isAuthenticated).toBe(false);
      });

      it(`should allow access to ${route} with valid sessionToken`, () => {
        const request = new NextRequest(`http://localhost${route}/test`);
        const validToken = btoa(JSON.stringify({ userId: '123', email: 'test@example.com' }));
        
        Object.defineProperty(request, 'cookies', {
          value: {
            get: (name: string) => {
              if (name === 'sessionToken') return { value: validToken };
              return undefined;
            },
          },
        });

        const isProtected = AuthManager.isProtectedRoute(route);
        const isAuthenticated = AuthManager.isAuthenticated(request);
        
        expect(isProtected).toBe(true);
        expect(isAuthenticated).toBe(true);
      });
    });
  });

  describe('Cookie Migration', () => {
    it('should not auto-migrate old cookies to new system', async () => {
      const { cookies, headers } = await import('next/headers');
      const mockCookies = {
        get: jest.fn((name: string) => {
          // Old cookies exist
          if (name === 'isLoggedIn') return { value: 'true' };
          if (name === 'user') return { value: JSON.stringify({ email: 'old@example.com', id: 'old123' }) };
          // But no sessionToken
          if (name === 'sessionToken') return undefined;
          return undefined;
        }),
      };
      const mockHeaders = {
        get: jest.fn().mockReturnValue(null),
      };

      (cookies as jest.Mock).mockResolvedValue(mockCookies);
      (headers as jest.Mock).mockResolvedValue(mockHeaders);

      const session = await getServerSession();
      
      // Should NOT auto-migrate - user must login again
      expect(session).toBeNull();
    });
  });
});