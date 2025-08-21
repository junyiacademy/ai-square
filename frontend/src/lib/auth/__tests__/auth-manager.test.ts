import { AuthManager } from '../auth-manager';
import { NextRequest, NextResponse } from 'next/server';
import { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';

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
      const request = new NextRequest('http://localhost:3000');
      // Mock cookies
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'sessionToken' ? { value: 'valid-token' } : undefined
        }
      });
      
      const isAuthenticated = AuthManager.isAuthenticated(request);
      expect(isAuthenticated).toBe(true);
    });

    it('should clear all auth cookies on logout', () => {
      const response = NextResponse.next();
      
      AuthManager.clearAuthCookies(response);
      
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('sessionToken=;');
      expect(setCookieHeader).toContain('Max-Age=0');
    });
  });

  describe('Session Token Validation', () => {
    it('should validate session token format', () => {
      const validToken = 'eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ==';
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