// Unmock the global AuthManager mock for this test
jest.unmock('../auth-manager');

import { AuthManager } from '../auth-manager';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Create mock response
const createMockResponse = () => {
  const headers = new Map();
  const cookies = {
    set: jest.fn((name: string, value: string, options?: any) => {
      const cookieString = `${name}=${value}${options?.maxAge === 0 ? '; Max-Age=0' : ''}`;
      headers.set('set-cookie', cookieString);
    })
  };
  
  return {
    headers: {
      get: (key: string) => headers.get(key),
      set: (key: string, value: string) => headers.set(key, value)
    },
    cookies
  } as unknown as NextResponse;
};

// Create mock request
const createMockRequest = (cookieValue?: string) => {
  return {
    cookies: {
      get: jest.fn((name: string) => 
        name === 'sessionToken' && cookieValue 
          ? { value: cookieValue } 
          : undefined
      )
    }
  } as unknown as NextRequest;
};

describe('AuthManager - Centralized Authentication', () => {
  describe('Cookie Management', () => {
    it('should use only one cookie for authentication', () => {
      const response = createMockResponse();
      const token = 'test-session-token';
      
      AuthManager.setAuthCookie(response, token);
      
      // Should only set one cookie
      expect(response.cookies.set).toHaveBeenCalledTimes(1);
      expect(response.cookies.set).toHaveBeenCalledWith('sessionToken', token, expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
      }));
    });

    it('should check authentication with single cookie', () => {
      // Create a valid hex token (32 bytes = 64 hex chars)
      const validToken = crypto.randomBytes(32).toString('hex');
      const request = createMockRequest(validToken);
      
      const isAuthenticated = AuthManager.isAuthenticated(request);
      expect(isAuthenticated).toBe(true);
    });

    it('should clear all auth cookies on logout', () => {
      const response = createMockResponse();
      
      AuthManager.clearAuthCookies(response);
      
      expect(response.cookies.set).toHaveBeenCalledWith('sessionToken', '', expect.objectContaining({
        httpOnly: true,
        maxAge: 0,
        path: '/'
      }));
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