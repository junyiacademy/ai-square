import { getServerSession, type Session } from '../session';
import { verifySessionToken } from '../session-simple';
import { cookies, headers } from 'next/headers';

// Mock dependencies
jest.mock('../session-simple');
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

const mockVerifySessionToken = verifySessionToken as jest.MockedFunction<typeof verifySessionToken>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockHeaders = headers as jest.MockedFunction<typeof headers>;

describe('session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getServerSession', () => {
    it('returns session from sessionToken cookie', async () => {
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          if (name === 'sessionToken') {
            return { value: 'valid-session-token' };
          }
          return undefined;
        }),
      };
      const mockHeadersList = {
        get: jest.fn(() => null),
      };

      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockHeaders.mockResolvedValue(mockHeadersList as any);
      mockVerifySessionToken.mockReturnValue({
        userId: '123',
        email: 'test@example.com',
        timestamp: Date.now(),
      });

      const session = await getServerSession();

      expect(mockVerifySessionToken).toHaveBeenCalledWith('valid-session-token');
      expect(session).toEqual({
        user: {
          id: '123',
          email: 'test@example.com',
        },
      });
    });

    it('returns session from x-session-token header when cookie is missing', async () => {
      const mockCookieStore = {
        get: jest.fn(() => undefined),
      };
      const mockHeadersList = {
        get: jest.fn((name: string) => {
          if (name === 'x-session-token') {
            return 'header-session-token';
          }
          return null;
        }),
      };

      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockHeaders.mockResolvedValue(mockHeadersList as any);
      mockVerifySessionToken.mockReturnValue({
        userId: '456',
        email: 'header@example.com',
        timestamp: Date.now(),
      });

      const session = await getServerSession();

      expect(mockVerifySessionToken).toHaveBeenCalledWith('header-session-token');
      expect(session).toEqual({
        user: {
          id: '456',
          email: 'header@example.com',
        },
      });
    });

    it('returns null when session token is invalid', async () => {
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          if (name === 'sessionToken') {
            return { value: 'invalid-token' };
          }
          return undefined;
        }),
      };
      const mockHeadersList = {
        get: jest.fn(() => null),
      };

      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockHeaders.mockResolvedValue(mockHeadersList as any);
      mockVerifySessionToken.mockReturnValue(null);

      const session = await getServerSession();

      expect(mockVerifySessionToken).toHaveBeenCalledWith('invalid-token');
      expect(session).toBeNull();
    });

    it('falls back to legacy cookie authentication', async () => {
      const mockUserData = {
        id: 789,
        email: 'legacy@example.com',
      };
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          if (name === 'isLoggedIn') return { value: 'true' };
          if (name === 'user') return { value: JSON.stringify(mockUserData) };
          return undefined;
        }),
      };
      const mockHeadersList = {
        get: jest.fn(() => null),
      };

      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockHeaders.mockResolvedValue(mockHeadersList as any);
      mockVerifySessionToken.mockReturnValue(null);

      const session = await getServerSession();

      expect(session).toEqual({
        user: {
          id: '789',
          email: 'legacy@example.com',
        },
      });
    });

    it('uses email as fallback ID when user ID is missing', async () => {
      const mockUserData = {
        email: 'noid@example.com',
      };
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          if (name === 'isLoggedIn') return { value: 'true' };
          if (name === 'user') return { value: JSON.stringify(mockUserData) };
          return undefined;
        }),
      };
      const mockHeadersList = {
        get: jest.fn(() => null),
      };

      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const session = await getServerSession();

      expect(session).toEqual({
        user: {
          id: 'noid@example.com',
          email: 'noid@example.com',
        },
      });
    });

    it('handles malformed user cookie gracefully', async () => {
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          if (name === 'isLoggedIn') return { value: 'true' };
          if (name === 'user') return { value: 'invalid-json' };
          return undefined;
        }),
      };
      const mockHeadersList = {
        get: jest.fn(() => null),
      };

      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const session = await getServerSession();

      expect(session).toBeNull();
    });

    it('returns null when isLoggedIn is false', async () => {
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          if (name === 'isLoggedIn') return { value: 'false' };
          if (name === 'user') return { value: JSON.stringify({ email: 'test@example.com' }) };
          return undefined;
        }),
      };
      const mockHeadersList = {
        get: jest.fn(() => null),
      };

      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const session = await getServerSession();

      expect(session).toBeNull();
    });

    it('returns null when user cookie is missing email', async () => {
      const mockUserData = {
        id: 123,
        // Missing email
      };
      const mockCookieStore = {
        get: jest.fn((name: string) => {
          if (name === 'isLoggedIn') return { value: 'true' };
          if (name === 'user') return { value: JSON.stringify(mockUserData) };
          return undefined;
        }),
      };
      const mockHeadersList = {
        get: jest.fn(() => null),
      };

      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const session = await getServerSession();

      expect(session).toBeNull();
    });

    it('returns null when no authentication is present', async () => {
      const mockCookieStore = {
        get: jest.fn(() => undefined),
      };
      const mockHeadersList = {
        get: jest.fn(() => null),
      };

      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockHeaders.mockResolvedValue(mockHeadersList as any);

      const session = await getServerSession();

      expect(session).toBeNull();
    });
  });
});
