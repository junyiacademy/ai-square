import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasRole, hasAnyRole, mockUser } from '../auth-utils';
import { verifyAccessToken } from '../jwt';
import { verifySessionToken } from '../session-simple';
import type { TokenPayload } from '../jwt';

// Mock dependencies
jest.mock('../jwt');
jest.mock('../session-simple');

const mockVerifyAccessToken = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>;
const mockVerifySessionToken = verifySessionToken as jest.MockedFunction<typeof verifySessionToken>;

describe('auth-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAuthFromRequest', () => {
    const mockTokenPayload: TokenPayload = {
      userId: 123,
      email: 'test@example.com',
      role: 'student',
      name: 'Test User',
    };

    it('extracts and verifies token from Authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer validtoken123',
        },
      });

      mockVerifyAccessToken.mockResolvedValueOnce(mockTokenPayload);

      const result = await getAuthFromRequest(request);

      expect(mockVerifyAccessToken).toHaveBeenCalledWith('validtoken123');
      expect(result).toEqual(mockTokenPayload);
    });

    it('falls back to cookie when Authorization header is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn((name: string) => {
            if (name === 'accessToken') {
              return { value: 'cookietoken456' };
            }
            return undefined;
          }),
        },
      });

      mockVerifyAccessToken.mockResolvedValueOnce(null).mockResolvedValueOnce(mockTokenPayload);

      const result = await getAuthFromRequest(request);

      expect(mockVerifyAccessToken).toHaveBeenCalledWith('cookietoken456');
      expect(result).toEqual(mockTokenPayload);
    });

    it('verifies session token from x-session-token header', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-session-token': 'sessiontoken789',
        },
      });
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn(() => undefined),
        },
      });

      mockVerifyAccessToken.mockResolvedValue(null);
      mockVerifySessionToken.mockReturnValueOnce({
        userId: '456',
        email: 'session@example.com',
        timestamp: Date.now(),
      });

      const result = await getAuthFromRequest(request);

      expect(mockVerifySessionToken).toHaveBeenCalledWith('sessiontoken789');
      expect(result).toEqual({
        userId: 456,
        email: 'session@example.com',
        role: 'student',
        name: 'session',
      });
    });

    it('handles invalid session token', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-session-token': 'invalidsession',
        },
      });
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn(() => undefined),
        },
      });

      mockVerifyAccessToken.mockResolvedValue(null);
      mockVerifySessionToken.mockReturnValue(null);

      const result = await getAuthFromRequest(request);

      expect(mockVerifySessionToken).toHaveBeenCalledWith('invalidsession');
      expect(console.log).toHaveBeenCalledWith('[Auth] Session token verification failed');
      expect(result).toBeNull();
    });

    it('returns legacy cookie auth when no tokens are valid', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn((name: string) => {
            if (name === 'isLoggedIn') return { value: 'true' };
            if (name === 'userId') return { value: '789' };
            if (name === 'email') return { value: 'legacy@example.com' };
            return undefined;
          }),
        },
      });

      mockVerifyAccessToken.mockResolvedValue(null);

      const result = await getAuthFromRequest(request);

      expect(result).toEqual({
        userId: 789,
        email: 'legacy@example.com',
        role: 'student',
        name: 'legacy@example.com',
      });
    });

    it('returns null when no authentication is present', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn(() => undefined),
        },
      });

      mockVerifyAccessToken.mockResolvedValue(null);

      const result = await getAuthFromRequest(request);

      expect(result).toBeNull();
    });

    it('handles malformed Authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'InvalidFormat',
        },
      });
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn(() => undefined),
        },
      });

      const result = await getAuthFromRequest(request);

      expect(mockVerifyAccessToken).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('returns true when user has required role', () => {
      const user: TokenPayload = {
        userId: 123,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User',
      };

      expect(hasRole(user, 'admin')).toBe(true);
    });

    it('returns false when user has different role', () => {
      const user: TokenPayload = {
        userId: 123,
        email: 'student@example.com',
        role: 'student',
        name: 'Student User',
      };

      expect(hasRole(user, 'admin')).toBe(false);
    });

    it('returns false when user is null', () => {
      expect(hasRole(null, 'admin')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('returns true when user has one of the required roles', () => {
      const user: TokenPayload = {
        userId: 123,
        email: 'teacher@example.com',
        role: 'teacher',
        name: 'Teacher User',
      };

      expect(hasAnyRole(user, ['admin', 'teacher', 'moderator'])).toBe(true);
    });

    it('returns false when user has none of the required roles', () => {
      const user: TokenPayload = {
        userId: 123,
        email: 'student@example.com',
        role: 'student',
        name: 'Student User',
      };

      expect(hasAnyRole(user, ['admin', 'teacher', 'moderator'])).toBe(false);
    });

    it('returns false when user is null', () => {
      expect(hasAnyRole(null, ['admin', 'teacher'])).toBe(false);
    });

    it('returns false when required roles array is empty', () => {
      const user: TokenPayload = {
        userId: 123,
        email: 'user@example.com',
        role: 'student',
        name: 'User',
      };

      expect(hasAnyRole(user, [])).toBe(false);
    });
  });

  describe('mockUser', () => {
    it('provides a mock user for testing', () => {
      expect(mockUser).toEqual({
        userId: 123,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User',
      });
    });
  });
});

/**
 * Auth Utils Test Considerations:
 * 
 * 1. Token Verification:
 *    - Tests both JWT and session token verification
 *    - Validates fallback mechanisms
 *    - Handles invalid tokens gracefully
 * 
 * 2. Cookie Handling:
 *    - Tests legacy cookie authentication
 *    - Handles missing cookies
 *    - Validates cookie extraction
 * 
 * 3. Role Authorization:
 *    - Tests single role checking
 *    - Tests multiple role checking
 *    - Handles null user cases
 * 
 * 4. Error Handling:
 *    - Graceful handling of malformed headers
 *    - Proper fallback chains
 *    - Console logging for debugging
 */