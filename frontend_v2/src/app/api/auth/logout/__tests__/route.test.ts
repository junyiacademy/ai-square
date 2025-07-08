import { POST } from '../route';
import { cookies } from 'next/headers';

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

describe('/api/auth/logout', () => {
  const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
  
  beforeEach(() => {
    // Mock the cookies function
    const mockCookieStore = {
      delete: jest.fn()
    };
    mockCookies.mockResolvedValue(mockCookieStore as any);
  });
  describe('POST', () => {
    it('should logout successfully and clear cookies', async () => {
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');

      // Check that cookies are cleared (Max-Age=0)
      const cookies = response.headers.getSetCookie();
      expect(cookies).toContainEqual(expect.stringMatching(/accessToken=;.*Max-Age=0/));
      expect(cookies).toContainEqual(expect.stringMatching(/refreshToken=;.*Max-Age=0/));
      expect(cookies).toContainEqual(expect.stringMatching(/isLoggedIn=;.*Max-Age=0/));
      expect(cookies).toContainEqual(expect.stringMatching(/user=;.*Max-Age=0/));
      expect(cookies).toContainEqual(expect.stringMatching(/rememberMe=;.*Max-Age=0/));
    });

    it('should have proper cookie settings', async () => {
      const response = await POST();
      const cookies = response.headers.getSetCookie();

      // Check that all cookies have proper security settings
      cookies.forEach(cookie => {
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=Lax');
        expect(cookie).toContain('Path=/');
      });
    });
  });

});