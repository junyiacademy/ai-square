import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth, withAdminAuth } from '../auth';

// Mock the session verification module
jest.mock('@/lib/auth/session-simple', () => ({
  verifySessionToken: jest.fn()
}));

import { verifySessionToken } from '@/lib/auth/session-simple';

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifySessionToken as jest.Mock).mockReturnValue(null);
  });

  describe('checkAdminAuth', () => {
    it('should return valid for admin user with JWT token', async () => {
      const request = new NextRequest('http://localhost:3000/admin');
      request.cookies.set('sessionToken', 'valid-token');
      
      (verifySessionToken as jest.Mock).mockReturnValue({
        email: 'admin@example.com',
        userId: '1',
        exp: Date.now() + 3600000
      });

      const result = await checkAdminAuth(request);

      expect(result.isValid).toBe(true);
      expect(result.user).toEqual({
        email: 'admin@example.com',
        role: 'admin',
        userId: '1',
        name: 'Demo Admin'
      });
    });

    it('should return invalid for non-admin JWT user', async () => {
      const request = new NextRequest('http://localhost:3000/admin');
      request.cookies.set('sessionToken', 'valid-token');
      
      (verifySessionToken as jest.Mock).mockReturnValue({
        email: 'user@example.com',
        userId: '2',
        exp: Date.now() + 3600000
      });

      const result = await checkAdminAuth(request);

      expect(result.isValid).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should return invalid when sessionToken is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/admin');
      request.cookies.set('sessionToken', 'invalid-token');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('user', JSON.stringify({ email: 'admin@example.com', role: 'admin' }));
      
      (verifySessionToken as jest.Mock).mockReturnValue(null);

      const result = await checkAdminAuth(request);

      // No fallback to legacy cookies
      expect(result.isValid).toBe(false);
    });

    it('should return invalid without sessionToken (no legacy auth)', async () => {
      const request = new NextRequest('http://localhost:3000/admin');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('user', JSON.stringify({ email: 'admin@example.com', role: 'admin' }));

      const result = await checkAdminAuth(request);

      // No sessionToken means invalid
      expect(result.isValid).toBe(false);
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
      request.cookies.set('sessionToken', 'valid-token');
      
      (verifySessionToken as jest.Mock).mockReturnValue({
        email: 'admin@example.com',
        userId: '1',
        exp: Date.now() + 3600000
      });

      const wrappedHandler = withAdminAuth(mockHandler);
      const response = await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
        user: { 
          email: 'admin@example.com', 
          role: 'admin',
          userId: '1',
          name: 'Demo Admin'
        }
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
      request.cookies.set('sessionToken', 'valid-token');
      
      (verifySessionToken as jest.Mock).mockReturnValue({
        email: 'admin@example.com',
        userId: '1',
        exp: Date.now() + 3600000
      });

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
      request.cookies.set('sessionToken', 'valid-token');
      
      (verifySessionToken as jest.Mock).mockReturnValue({
        email: 'admin@example.com',
        userId: '1',
        exp: Date.now() + 3600000
      });

      const errorHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const wrappedHandler = withAdminAuth(errorHandler);

      await expect(wrappedHandler(request)).rejects.toThrow('Handler error');
    });
  });
});