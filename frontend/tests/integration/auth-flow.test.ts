/**
 * End-to-End Authentication Flow Test
 * 
 * This test verifies the complete authentication flow:
 * 1. Login creates sessionToken only (no old cookies)
 * 2. Protected routes check sessionToken only
 * 3. API calls use sessionToken for authentication
 * 4. Logout clears sessionToken only
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthManager } from '@/lib/auth/auth-manager';
import { getServerSession } from '@/lib/auth/session';
import { createSessionToken, verifySessionToken } from '@/lib/auth/session-simple';

// Mock Next.js headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

// Mock session utilities
jest.mock('@/lib/auth/session-simple', () => ({
  createSessionToken: jest.fn((userId: string, email: string) => {
    return btoa(JSON.stringify({ userId, email, exp: Date.now() + 86400000 }));
  }),
  verifySessionToken: jest.fn((token: string) => {
    try {
      const decoded = JSON.parse(atob(token));
      if (decoded.exp > Date.now()) {
        return { userId: decoded.userId, email: decoded.email };
      }
    } catch {}
    return null;
  }),
}));

describe('Complete Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('should create and verify sessionToken correctly', () => {
      // Step 1: Create session token (simulating login)
      const userId = 'user-123';
      const email = 'test@example.com';
      const sessionToken = createSessionToken(userId, email, false);

      expect(sessionToken).toBeDefined();
      expect(typeof sessionToken).toBe('string');

      // Step 2: Verify the token
      const sessionData = verifySessionToken(sessionToken);
      
      expect(sessionData).toBeDefined();
      expect(sessionData?.userId).toBe(userId);
      expect(sessionData?.email).toBe(email);
    });

    it('should set httpOnly cookie with correct options', () => {
      const mockSet = jest.fn();
      const response = {
        cookies: {
          set: mockSet
        }
      } as unknown as NextResponse;
      
      const sessionToken = 'test-session-token';
      AuthManager.setAuthCookie(response, sessionToken, false);
      
      expect(mockSet).toHaveBeenCalledWith('sessionToken', sessionToken, {
        httpOnly: true,
        secure: false, // NODE_ENV is test
        sameSite: 'lax',
        maxAge: 86400, // 24 hours
        path: '/',
      });
    });

    it('should set longer expiry with rememberMe', () => {
      const mockSet = jest.fn();
      const response = {
        cookies: {
          set: mockSet
        }
      } as unknown as NextResponse;
      
      const sessionToken = 'test-session-token';
      AuthManager.setAuthCookie(response, sessionToken, true);
      
      expect(mockSet).toHaveBeenCalledWith('sessionToken', sessionToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 2592000, // 30 days
        path: '/',
      });
    });
  });

  describe('Session Retrieval', () => {
    it('should retrieve session from sessionToken cookie', async () => {
      const { cookies, headers } = await import('next/headers');
      
      const sessionToken = btoa(JSON.stringify({ 
        userId: 'user-456', 
        email: 'session@example.com',
        exp: Date.now() + 86400000 
      }));
      
      const mockCookies = {
        get: jest.fn((name: string) => {
          if (name === 'sessionToken') return { value: sessionToken };
          return undefined;
        }),
      };
      
      const mockHeaders = {
        get: jest.fn().mockReturnValue(null),
      };
      
      (cookies as jest.Mock).mockResolvedValue(mockCookies);
      (headers as jest.Mock).mockResolvedValue(mockHeaders);
      
      const session = await getServerSession();
      
      expect(session).toBeDefined();
      expect(session?.user.id).toBe('user-456');
      expect(session?.user.email).toBe('session@example.com');
    });

    it('should return null for expired sessionToken', async () => {
      const { cookies, headers } = await import('next/headers');
      
      const expiredToken = btoa(JSON.stringify({ 
        userId: 'user-expired', 
        email: 'expired@example.com',
        exp: Date.now() - 86400000 // Expired yesterday
      }));
      
      const mockCookies = {
        get: jest.fn((name: string) => {
          if (name === 'sessionToken') return { value: expiredToken };
          return undefined;
        }),
      };
      
      const mockHeaders = {
        get: jest.fn().mockReturnValue(null),
      };
      
      (cookies as jest.Mock).mockResolvedValue(mockCookies);
      (headers as jest.Mock).mockResolvedValue(mockHeaders);
      
      const session = await getServerSession();
      
      expect(session).toBeNull();
    });

    it('should check x-session-token header for API calls', async () => {
      const { cookies, headers } = await import('next/headers');
      
      const headerToken = btoa(JSON.stringify({ 
        userId: 'api-user', 
        email: 'api@example.com',
        exp: Date.now() + 86400000 
      }));
      
      const mockCookies = {
        get: jest.fn().mockReturnValue(undefined), // No cookie
      };
      
      const mockHeaders = {
        get: jest.fn((name: string) => {
          if (name === 'x-session-token') return headerToken;
          return null;
        }),
      };
      
      (cookies as jest.Mock).mockResolvedValue(mockCookies);
      (headers as jest.Mock).mockResolvedValue(mockHeaders);
      
      const session = await getServerSession();
      
      expect(session).toBeDefined();
      expect(session?.user.id).toBe('api-user');
      expect(session?.user.email).toBe('api@example.com');
    });
  });

  describe('Protected Route Access', () => {
    it('should authenticate requests with valid sessionToken', () => {
      const validToken = btoa(JSON.stringify({ 
        userId: 'protected-user', 
        email: 'protected@example.com',
        exp: Date.now() + 86400000 
      }));
      
      const request = new NextRequest('http://localhost/pbl/scenarios');
      
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => {
            if (name === 'sessionToken') return { value: validToken };
            return undefined;
          },
        },
      });
      
      const isAuthenticated = AuthManager.isAuthenticated(request);
      const isProtectedRoute = AuthManager.isProtectedRoute('/pbl/scenarios');
      
      expect(isProtectedRoute).toBe(true);
      expect(isAuthenticated).toBe(true);
    });

    it('should reject requests without sessionToken', () => {
      const request = new NextRequest('http://localhost/assessment/start');
      
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue(undefined),
        },
      });
      
      const isAuthenticated = AuthManager.isAuthenticated(request);
      const isProtectedRoute = AuthManager.isProtectedRoute('/assessment/start');
      
      expect(isProtectedRoute).toBe(true);
      expect(isAuthenticated).toBe(false);
    });

    it('should create login redirect for unauthenticated requests', () => {
      const request = new NextRequest('http://localhost/discovery/careers');
      
      const redirect = AuthManager.createLoginRedirect(request);
      
      expect(redirect.status).toBe(307);
      expect(redirect.headers.get('location')).toBe('http://localhost/login?redirect=%2Fdiscovery%2Fcareers');
    });
  });

  describe('Logout Flow', () => {
    it('should clear sessionToken on logout', () => {
      const mockSet = jest.fn();
      const response = {
        cookies: {
          set: mockSet
        }
      } as unknown as NextResponse;
      
      AuthManager.clearAuthCookies(response);
      
      expect(mockSet).toHaveBeenCalledWith('sessionToken', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      
      // Should only clear sessionToken, not any other cookies
      expect(mockSet).toHaveBeenCalledTimes(1);
    });
  });

  describe('Token Validation', () => {
    it('should validate token format correctly', () => {
      const validToken = btoa(JSON.stringify({ userId: '123', email: 'test@example.com' }));
      const invalidToken = 'not-base64-encoded';
      const emptyToken = '';
      
      expect(AuthManager.isValidSessionToken(validToken)).toBe(true);
      expect(AuthManager.isValidSessionToken(invalidToken)).toBe(false);
      expect(AuthManager.isValidSessionToken(emptyToken)).toBe(false);
    });

    it('should handle malformed tokens gracefully', () => {
      const malformedToken = btoa('not-json');
      
      expect(AuthManager.isValidSessionToken(malformedToken)).toBe(false);
    });
  });

  describe('Security Checks', () => {
    it('should not accept tokens without required fields', () => {
      const incompleteToken = btoa(JSON.stringify({ someField: 'value' }));
      
      expect(AuthManager.isValidSessionToken(incompleteToken)).toBe(false);
    });

    it('should use secure cookies in production', () => {
      const originalEnv = process.env.NODE_ENV;
      // Use Object.defineProperty to override NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true
      });
      
      const mockSet = jest.fn();
      const response = {
        cookies: {
          set: mockSet
        }
      } as unknown as NextResponse;
      
      AuthManager.setAuthCookie(response, 'prod-token', false);
      
      expect(mockSet).toHaveBeenCalledWith('sessionToken', 'prod-token', {
        httpOnly: true,
        secure: true, // Should be true in production
        sameSite: 'lax',
        maxAge: 86400,
        path: '/',
      });
      
      // Restore original env
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      });
    });
  });
});