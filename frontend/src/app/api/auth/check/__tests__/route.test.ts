import { GET } from '../route';
import { cookies } from 'next/headers';
import { verifyAccessToken, isTokenExpiringSoon } from '@/lib/auth/jwt';

// Mock dependencies
jest.mock('next/headers');
jest.mock('@/lib/auth/jwt');

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockVerifyAccessToken = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>;
const mockIsTokenExpiringSoon = isTokenExpiringSoon as jest.MockedFunction<typeof isTokenExpiringSoon>;

// Helper function to create mock cookie store
const createMockCookieStore = (cookies: Record<string, string> = {}) => ({
  get: jest.fn((name: string) => {
    return cookies[name] ? { value: cookies[name] } : undefined;
  }),
  set: jest.fn(),
  delete: jest.fn(),
  has: jest.fn((name: string) => Boolean(cookies[name])),
  getAll: jest.fn(() => Object.entries(cookies).map(([name, value]) => ({ name, value }))),
});

describe('/api/auth/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('JWT access token authentication', () => {
    it('returns authenticated user when valid access token exists', async () => {
      const mockPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'user',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      const cookieStore = createMockCookieStore({
        accessToken: 'valid.jwt.token'
      });
      
      mockCookies.mockResolvedValue(cookieStore as any);
      mockVerifyAccessToken.mockResolvedValue(mockPayload);
      mockIsTokenExpiringSoon.mockReturnValue(false);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          role: 'user',
          name: 'Test User'
        },
        tokenExpiringSoon: false,
        expiresIn: expect.any(Number)
      });
      expect(data.expiresIn).toBeGreaterThan(3500); // Should be close to 3600
    });

    it('returns token expiring soon when token is close to expiry', async () => {
      const mockPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'user',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) + 300 // 5 minutes from now
      };

      const cookieStore = createMockCookieStore({
        accessToken: 'expiring.jwt.token'
      });
      
      mockCookies.mockResolvedValue(cookieStore as any);
      mockVerifyAccessToken.mockResolvedValue(mockPayload);
      mockIsTokenExpiringSoon.mockReturnValue(true);

      const response = await GET();
      const data = await response.json();

      expect(data.tokenExpiringSoon).toBe(true);
      expect(data.expiresIn).toBeLessThan(400);
    });

    it('handles expired token gracefully', async () => {
      const mockPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'user',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago (expired)
      };

      const cookieStore = createMockCookieStore({
        accessToken: 'expired.jwt.token'
      });
      
      mockCookies.mockResolvedValue(cookieStore as any);
      mockVerifyAccessToken.mockResolvedValue(mockPayload);
      mockIsTokenExpiringSoon.mockReturnValue(false);

      const response = await GET();
      const data = await response.json();

      expect(data.expiresIn).toBe(0); // Should be 0 for expired tokens
    });

    it('falls back to legacy authentication when JWT verification fails', async () => {
      const cookieStore = createMockCookieStore({
        accessToken: 'invalid.jwt.token',
        isLoggedIn: 'true',
        userRole: 'admin',
        user: JSON.stringify({
          id: 'legacy123',
          email: 'legacy@example.com',
          name: 'Legacy User'
        })
      });
      
      mockCookies.mockResolvedValue(cookieStore as any);
      mockVerifyAccessToken.mockResolvedValue(null); // JWT verification fails

      const response = await GET();
      const data = await response.json();

      expect(data).toEqual({
        authenticated: true,
        user: {
          id: 'legacy123',
          email: 'legacy@example.com',
          name: 'Legacy User',
          role: 'admin'
        },
        tokenExpiringSoon: false
      });
    });
  });

  describe('legacy cookie authentication', () => {
    it('returns authenticated user from legacy cookies when no access token', async () => {
      const cookieStore = createMockCookieStore({
        isLoggedIn: 'true',
        userRole: 'teacher',
        user: JSON.stringify({
          id: 'legacy456',
          email: 'teacher@example.com',
          name: 'Teacher User',
          role: 'student' // Should be overridden by userRole cookie
        })
      });
      
      mockCookies.mockResolvedValue(cookieStore as any);

      const response = await GET();
      const data = await response.json();

      expect(data).toEqual({
        authenticated: true,
        user: {
          id: 'legacy456',
          email: 'teacher@example.com',
          name: 'Teacher User',
          role: 'teacher' // Should use role from userRole cookie
        },
        tokenExpiringSoon: false
      });
    });

    it('uses user role from user object when userRole cookie is missing', async () => {
      const cookieStore = createMockCookieStore({
        isLoggedIn: 'true',
        user: JSON.stringify({
          id: 'legacy789',
          email: 'user@example.com',
          name: 'User',
          role: 'student'
        })
      });
      
      mockCookies.mockResolvedValue(cookieStore as any);

      const response = await GET();
      const data = await response.json();

      expect(data.user.role).toBe('student');
    });

    it('handles malformed user cookie gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const cookieStore = createMockCookieStore({
        isLoggedIn: 'true',
        user: 'invalid-json'
      });
      
      mockCookies.mockResolvedValue(cookieStore as any);

      const response = await GET();
      const data = await response.json();

      expect(data).toEqual({
        authenticated: false,
        user: null,
        tokenExpiringSoon: false
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing user cookie:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('unauthenticated states', () => {
    it('returns unauthenticated when no tokens or cookies exist', async () => {
      const cookieStore = createMockCookieStore({});
      
      mockCookies.mockResolvedValue(cookieStore as any);

      const response = await GET();
      const data = await response.json();

      expect(data).toEqual({
        authenticated: false,
        user: null,
        tokenExpiringSoon: false
      });
    });

    it('returns unauthenticated when isLoggedIn is false', async () => {
      const cookieStore = createMockCookieStore({
        isLoggedIn: 'false',
        user: JSON.stringify({ id: '123', email: 'test@example.com' })
      });
      
      mockCookies.mockResolvedValue(cookieStore as any);

      const response = await GET();
      const data = await response.json();

      expect(data.authenticated).toBe(false);
    });

    it('returns unauthenticated when user cookie is missing but isLoggedIn is true', async () => {
      const cookieStore = createMockCookieStore({
        isLoggedIn: 'true'
      });
      
      mockCookies.mockResolvedValue(cookieStore as any);

      const response = await GET();
      const data = await response.json();

      expect(data.authenticated).toBe(false);
    });

    it('returns unauthenticated when access token exists but verification fails and no legacy cookies', async () => {
      const cookieStore = createMockCookieStore({
        accessToken: 'invalid.jwt.token'
      });
      
      mockCookies.mockResolvedValue(cookieStore as any);
      mockVerifyAccessToken.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(data.authenticated).toBe(false);
    });
  });

  describe('response format validation', () => {
    it('always includes required fields in response', async () => {
      const cookieStore = createMockCookieStore({});
      
      mockCookies.mockResolvedValue(cookieStore as any);

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('authenticated');
      expect(data).toHaveProperty('user');
      expect(data).toHaveProperty('tokenExpiringSoon');
      expect(typeof data.authenticated).toBe('boolean');
      expect(typeof data.tokenExpiringSoon).toBe('boolean');
    });

    it('includes expiresIn field only for JWT authentication', async () => {
      const mockPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'user',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const cookieStore = createMockCookieStore({
        accessToken: 'valid.jwt.token'
      });
      
      mockCookies.mockResolvedValue(cookieStore as any);
      mockVerifyAccessToken.mockResolvedValue(mockPayload);
      mockIsTokenExpiringSoon.mockReturnValue(false);

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('expiresIn');
      expect(typeof data.expiresIn).toBe('number');
    });

    it('does not include expiresIn field for legacy authentication', async () => {
      const cookieStore = createMockCookieStore({
        isLoggedIn: 'true',
        user: JSON.stringify({ id: '123', email: 'test@example.com', name: 'Test' })
      });
      
      mockCookies.mockResolvedValue(cookieStore as any);

      const response = await GET();
      const data = await response.json();

      expect(data).not.toHaveProperty('expiresIn');
    });
  });
});