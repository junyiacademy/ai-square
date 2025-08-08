import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasRole, hasAnyRole, mockUser } from './auth-utils';
import { verifyAccessToken } from './jwt';
import { verifySessionToken } from './session-simple';

jest.mock('./jwt');
jest.mock('./session-simple');

describe('auth-utils', () => {
  const mockVerifyAccessToken = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>;
  const mockVerifySessionToken = verifySessionToken as jest.MockedFunction<typeof verifySessionToken>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAuthFromRequest', () => {
    it('should extract token from Authorization header', async () => {
      const request = new NextRequest('http://localhost/api/test');
      request.headers.set('authorization', 'Bearer valid-token');
      
      mockVerifyAccessToken.mockResolvedValue({
        userId: 1,
        email: 'test@example.com',
        role: 'admin',
        name: 'Test User'
      });

      const result = await getAuthFromRequest(request);
      
      expect(mockVerifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual({
        userId: 1,
        email: 'test@example.com',
        role: 'admin',
        name: 'Test User'
      });
    });

    it('should extract token from cookies', async () => {
      const request = new NextRequest('http://localhost/api/test');
      request.cookies.set('accessToken', 'cookie-token');
      
      mockVerifyAccessToken.mockResolvedValue({
        userId: 2,
        email: 'cookie@example.com',
        role: 'student',
        name: 'Cookie User'
      });

      const result = await getAuthFromRequest(request);
      
      expect(mockVerifyAccessToken).toHaveBeenCalledWith('cookie-token');
      expect(result?.email).toBe('cookie@example.com');
    });

    it('should verify session token from header', async () => {
      const request = new NextRequest('http://localhost/api/test');
      request.headers.set('x-session-token', 'session-token');
      
      mockVerifyAccessToken.mockResolvedValue(null);
      mockVerifySessionToken.mockReturnValue({
        userId: '3',
        email: 'session@example.com'
      } as any);

      const result = await getAuthFromRequest(request);
      
      expect(mockVerifySessionToken).toHaveBeenCalledWith('session-token');
      expect(result).toEqual({
        userId: 3,
        email: 'session@example.com',
        role: 'student',
        name: 'session'
      });
    });

    it('should fall back to legacy cookie auth', async () => {
      const request = new NextRequest('http://localhost/api/test');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('user', JSON.stringify({
        id: 4,
        email: 'legacy@example.com',
        role: 'teacher',
        name: 'Legacy User'
      }));
      
      mockVerifyAccessToken.mockResolvedValue(null);
      mockVerifySessionToken.mockReturnValue(null);

      const result = await getAuthFromRequest(request);
      
      expect(result).toEqual({
        userId: 4,
        email: 'legacy@example.com',
        role: 'teacher',
        name: 'Legacy User'
      });
    });

    it('should return null when no authentication found', async () => {
      const request = new NextRequest('http://localhost/api/test');
      
      mockVerifyAccessToken.mockResolvedValue(null);
      mockVerifySessionToken.mockReturnValue(null);

      const result = await getAuthFromRequest(request);
      
      expect(result).toBeNull();
    });

    it('should handle malformed user cookie', async () => {
      const request = new NextRequest('http://localhost/api/test');
      request.cookies.set('isLoggedIn', 'true');
      request.cookies.set('user', 'invalid-json');
      
      mockVerifyAccessToken.mockResolvedValue(null);

      const result = await getAuthFromRequest(request);
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        '[Auth] Failed to parse user cookie:',
        expect.any(Error)
      );
    });
  });

  describe('hasRole', () => {
    it('should return true for matching role', () => {
      const user = { userId: 1, email: 'test@example.com', role: 'admin', name: 'Test' };
      expect(hasRole(user, 'admin')).toBe(true);
    });

    it('should return false for non-matching role', () => {
      const user = { userId: 1, email: 'test@example.com', role: 'student', name: 'Test' };
      expect(hasRole(user, 'admin')).toBe(false);
    });

    it('should return false for null user', () => {
      expect(hasRole(null, 'admin')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true if user has any required role', () => {
      const user = { userId: 1, email: 'test@example.com', role: 'teacher', name: 'Test' };
      expect(hasAnyRole(user, ['admin', 'teacher', 'student'])).toBe(true);
    });

    it('should return false if user has none of required roles', () => {
      const user = { userId: 1, email: 'test@example.com', role: 'guest', name: 'Test' };
      expect(hasAnyRole(user, ['admin', 'teacher'])).toBe(false);
    });

    it('should return false for null user', () => {
      expect(hasAnyRole(null, ['admin'])).toBe(false);
    });

    it('should handle empty roles array', () => {
      const user = { userId: 1, email: 'test@example.com', role: 'admin', name: 'Test' };
      expect(hasAnyRole(user, [])).toBe(false);
    });
  });

  describe('mockUser', () => {
    it('should provide valid mock user object', () => {
      expect(mockUser).toEqual({
        userId: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      });
    });
  });
});