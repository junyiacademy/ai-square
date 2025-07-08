import { POST } from '../route';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyRefreshToken, createAccessToken } from '@/lib/auth/jwt';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('@/lib/auth/jwt', () => ({
  verifyRefreshToken: jest.fn(),
  createAccessToken: jest.fn()
}));

describe('/api/auth/refresh', () => {
  const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
  const mockVerifyRefreshToken = verifyRefreshToken as jest.MockedFunction<typeof verifyRefreshToken>;
  const mockCreateAccessToken = createAccessToken as jest.MockedFunction<typeof createAccessToken>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should refresh token successfully with valid refresh token', async () => {
      // Mock cookie store
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'valid-refresh-token' })
      };
      mockCookies.mockResolvedValue(mockCookieStore as any);

      // Mock token verification
      mockVerifyRefreshToken.mockResolvedValue({ userId: 1 });

      // Mock new access token creation
      mockCreateAccessToken.mockResolvedValue('new-access-token');

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Token refreshed successfully');

      // Verify token operations
      expect(mockVerifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockCreateAccessToken).toHaveBeenCalledWith({
        userId: 1,
        email: 'student@example.com',
        role: 'student',
        name: 'Student User'
      });

      // Check cookies
      const cookies = response.headers.getSetCookie();
      expect(cookies).toContainEqual(expect.stringContaining('accessToken=new-access-token'));
      expect(cookies).toContainEqual(expect.stringContaining('user='));
    });

    it('should handle teacher user refresh', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'valid-refresh-token' })
      };
      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockVerifyRefreshToken.mockResolvedValue({ userId: 2 });
      mockCreateAccessToken.mockResolvedValue('new-access-token');

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockCreateAccessToken).toHaveBeenCalledWith({
        userId: 2,
        email: 'teacher@example.com',
        role: 'teacher',
        name: 'Teacher User'
      });
    });

    it('should handle admin user refresh', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'valid-refresh-token' })
      };
      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockVerifyRefreshToken.mockResolvedValue({ userId: 3 });
      mockCreateAccessToken.mockResolvedValue('new-access-token');

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockCreateAccessToken).toHaveBeenCalledWith({
        userId: 3,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      });
    });

    it('should fail when no refresh token is provided', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(undefined)
      };
      mockCookies.mockResolvedValue(mockCookieStore as any);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No refresh token provided');
    });

    it('should fail with invalid refresh token', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'invalid-token' })
      };
      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockVerifyRefreshToken.mockResolvedValue(null);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid refresh token');
    });

    it('should fail when user is not found', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'valid-refresh-token' })
      };
      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockVerifyRefreshToken.mockResolvedValue({ userId: 999 }); // Non-existent user

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should handle token verification errors', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'valid-refresh-token' })
      };
      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockVerifyRefreshToken.mockRejectedValue(new Error('Token verification failed'));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle access token creation errors', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'valid-refresh-token' })
      };
      mockCookies.mockResolvedValue(mockCookieStore as any);
      mockVerifyRefreshToken.mockResolvedValue({ userId: 1 });
      mockCreateAccessToken.mockRejectedValue(new Error('Token creation failed'));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });
});