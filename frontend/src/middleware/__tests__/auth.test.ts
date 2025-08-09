import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth, withAdminAuth } from '../auth';

// Mock the JWT verification module
jest.mock('@/lib/auth/jwt', () => ({
  verifyAccessToken: jest.fn()
}));

import * as jwtModule from '@/lib/auth/jwt';

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtModule.verifyAccessToken as jest.Mock).mockResolvedValue(null);
  });

  describe('checkAdminAuth', () => {
    it('should return valid for admin user with JWT token', async () => {
      const request = new NextRequest('http://localhost:3000/admin');
      request.cookies.set('accessToken', 'valid-token');
      
      (jwtModule.verifyAccessToken as jest.Mock).mockResolvedValue({
        email: 'admin@example.com',
        role: 'admin',
        userId: 1,
        name: 'Admin User'
      });

      const result = await checkAdminAuth(request);

      expect(result.isValid).toBe(true);
      expect(result.user).toEqual({
        email: 'admin@example.com',
        role: 'admin',
        userId: 1,
        name: 'Admin User'
      });
    });

    it('should return invalid for non-admin JWT user', async () => {
      const request = new NextRequest('http://localhost:3000/admin');
      request.cookies.set('accessToken', 'valid-token');
      
      (jwtModule.verifyAccessToken as jest.Mock).mockResolvedValue({
        email: 'user@example.com',
        role: 'user',
        userId: 2,
        name: 'Regular User'
      });

      const result = await checkAdminAuth(request);

      expect(result.isValid).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should fall back to cookie auth when JWT fails', async () => {
      const request = new NextRequest('http://localhost:3000/admin');
      request.cookies.set('accessToken', 'invalid-token');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('user', JSON.stringify({ email: 'admin@example.com', role: 'admin' }));
      
      (jwtModule.verifyAccessToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const result = await checkAdminAuth(request);

      expect(result.isValid).toBe(true);
      expect(result.user).toEqual({ email: 'admin@example.com', role: 'admin' });
    });

    it('should return valid for admin user with cookie auth', async () => {
      const request = new NextRequest('http://localhost:3000/admin');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('user', JSON.stringify({ email: 'admin@example.com', role: 'admin' }));

      const result = await checkAdminAuth(request);

      expect(result.isValid).toBe(true);
      expect(result.user).toEqual({ email: 'admin@example.com', role: 'admin' });
    });

    it('should return invalid when not logged in', async () => {
      const request = new NextRequest('http://localhost:3000/admin');
      request.cookies.set('isLoggedIn', 'false');

      const result = await checkAdminAuth(request);

      expect(result.isValid).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should return invalid when no cookies exist', async () => {
      const request = new NextRequest('http://localhost:3000/admin');

      const result = await checkAdminAuth(request);

      expect(result.isValid).toBe(false);
    });

    it('should return invalid for non-admin user', async () => {
      const request = new NextRequest('http://localhost:3000/admin');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('user', JSON.stringify({ email: 'student@example.com', role: 'student' }));

      const result = await checkAdminAuth(request);

      expect(result.isValid).toBe(false);
    });

    it('should handle invalid JSON in user cookie', async () => {
      const request = new NextRequest('http://localhost:3000/admin');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('user', 'invalid-json');

      const result = await checkAdminAuth(request);

      expect(result.isValid).toBe(false);
    });

    it('should handle missing user cookie when logged in', async () => {
      const request = new NextRequest('http://localhost:3000/admin');
      request.cookies.set('isLoggedIn', 'true');

      const result = await checkAdminAuth(request);

      expect(result.isValid).toBe(false);
    });
  });

  describe('withAdminAuth', () => {
    const mockHandler = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      mockHandler.mockResolvedValue(
        NextResponse.json({ success: true })
      );
    });

    it('should call handler for admin user', async () => {
      const request = new NextRequest('http://localhost:3000/admin/api');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('user', JSON.stringify({ email: 'admin@example.com', role: 'admin' }));

      const wrappedHandler = withAdminAuth(mockHandler);
      const response = await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
        user: { email: 'admin@example.com', role: 'admin' }
      }), undefined);
      expect(response.status).toBe(200);
    });

    it('should return 401 for non-admin user', async () => {
      const request = new NextRequest('http://localhost:3000/admin/api');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('user', JSON.stringify({ email: 'student@example.com', role: 'student' }));

      const wrappedHandler = withAdminAuth(mockHandler);
      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when not logged in', async () => {
      const request = new NextRequest('http://localhost:3000/admin/api');

      const wrappedHandler = withAdminAuth(mockHandler);
      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should pass context to handler', async () => {
      const request = new NextRequest('http://localhost:3000/admin/api');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('user', JSON.stringify({ email: 'admin@example.com', role: 'admin' }));

      const context = { params: { id: '123' } };
      const wrappedHandler = withAdminAuth(mockHandler);
      await wrappedHandler(request, context);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.any(Object),
        context
      );
    });

    it('should handle handler errors', async () => {
      const request = new NextRequest('http://localhost:3000/admin/api');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('user', JSON.stringify({ email: 'admin@example.com', role: 'admin' }));

      const errorHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const wrappedHandler = withAdminAuth(errorHandler);

      await expect(wrappedHandler(request)).rejects.toThrow('Handler error');
    });
  });
});