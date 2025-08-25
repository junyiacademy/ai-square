import { AuthManager } from '../auth-manager';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Mock NextResponse
jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn((url: string) => ({
      url,
      cookies: {
        get: jest.fn()
      }
    })),
    NextResponse: {
      next: jest.fn(() => {
        const headers = new Map();
        const cookieStore: any[] = [];
        return {
          headers: {
            get: (key: string) => headers.get(key),
            set: (key: string, value: string) => headers.set(key, value)
          },
          cookies: {
            set: jest.fn((name: string, value: string, options: any) => {
              cookieStore.push({ name, value, options });
              const cookieString = cookieStore.map(c => 
                `${c.name}=${c.value}${c.options?.maxAge === 0 ? '; Max-Age=0' : ''}`
              ).join(', ');
              headers.set('set-cookie', cookieString);
            }),
            delete: jest.fn((name: string) => {
              cookieStore.push({ name, value: '', options: { maxAge: 0 } });
              const cookieString = cookieStore.map(c => 
                `${c.name}=${c.value}${c.options?.maxAge === 0 ? '; Max-Age=0' : ''}`
              ).join(', ');
              headers.set('set-cookie', cookieString);
            })
          }
        };
      }),
      json: jest.fn((data: any) => ({
        json: async () => data
      }))
    }
  };
});

describe('AuthManager - Centralized Authentication', () => {
  describe('Cookie Management', () => {
    it('should use only one cookie for authentication', () => {
      const response = NextResponse.next();
      const token = 'test-session-token';
      
      AuthManager.setAuthCookie(response, token);
      
      // Should only set one cookie
      const setCookieHeader = response.headers.get('set-cookie');
      const cookieCount = setCookieHeader?.split(',').length || 0;
      expect(cookieCount).toBe(1);
      expect(setCookieHeader).toContain('sessionToken=');
    });

    it('should check authentication with single cookie', () => {
      // Create a valid hex token (32 bytes = 64 hex chars)
      const validToken = crypto.randomBytes(32).toString('hex');
      const mockCookies = {
        get: jest.fn((name: string) => name === 'sessionToken' ? { value: validToken } : undefined)
      };
      const request = {
        cookies: mockCookies
      } as unknown as NextRequest;
      
      const isAuthenticated = AuthManager.isAuthenticated(request);
      expect(isAuthenticated).toBe(true);
    });

    it('should clear all auth cookies on logout', () => {
      const response = NextResponse.next();
      
      AuthManager.clearAuthCookies(response);
      
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('sessionToken=');
      expect(setCookieHeader).toContain('Max-Age=0');
    });
  });

  describe('Session Token Validation', () => {
    it('should validate session token format', () => {
      // Valid hex token (32 bytes = 64 hex chars)
      const validToken = crypto.randomBytes(32).toString('hex');
      const invalidToken = 'invalid-token';
      
      expect(AuthManager.isValidSessionToken(validToken)).toBe(true);
      expect(AuthManager.isValidSessionToken(invalidToken)).toBe(false);
    });
  });

  describe('Protected Route Checking', () => {
    it('should identify protected routes correctly', () => {
      expect(AuthManager.isProtectedRoute('/pbl')).toBe(true);
      expect(AuthManager.isProtectedRoute('/pbl/scenarios')).toBe(true);
      expect(AuthManager.isProtectedRoute('/discovery')).toBe(true);
      expect(AuthManager.isProtectedRoute('/assessment')).toBe(true);
      expect(AuthManager.isProtectedRoute('/admin')).toBe(true);
      expect(AuthManager.isProtectedRoute('/login')).toBe(false);
      expect(AuthManager.isProtectedRoute('/')).toBe(false);
    });
  });
});