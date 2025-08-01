import { NextRequest } from 'next/server';
import { getAuthFromRequest, getUserIdFromAuth } from '../auth-utils';
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

  describe('getUserIdFromAuth', () => {
    it('extracts userId from valid auth response', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer validtoken',
        },
      });

      mockVerifyAccessToken.mockResolvedValueOnce({
        userId: 999,
        email: 'user@example.com',
        role: 'student',
        name: 'Test User',
      });

      const userId = await getUserIdFromAuth(request);

      expect(userId).toBe(999);
    });

    it('returns null when no auth is present', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn(() => undefined),
        },
      });

      mockVerifyAccessToken.mockResolvedValue(null);

      const userId = await getUserIdFromAuth(request);

      expect(userId).toBeNull();
    });

    it('handles zero userId gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer validtoken',
        },
      });

      mockVerifyAccessToken.mockResolvedValueOnce({
        userId: 0,
        email: 'zero@example.com',
        role: 'student',
        name: 'Zero User',
      });

      const userId = await getUserIdFromAuth(request);

      expect(userId).toBe(0);
    });
  });
});
