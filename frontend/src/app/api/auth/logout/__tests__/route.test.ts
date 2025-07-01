import { POST, OPTIONS } from '../route';
import { NextRequest } from 'next/server';

describe('/api/auth/logout', () => {
  describe('POST', () => {
    it('should logout successfully and clear cookies', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST'
      });

      const response = await POST(request);
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
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST'
      });

      const response = await POST(request);
      const cookies = response.headers.getSetCookie();

      // Check that all cookies have proper security settings
      cookies.forEach(cookie => {
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=Lax');
        expect(cookie).toContain('Path=/');
      });
    });
  });

  describe('OPTIONS', () => {
    it('should return CORS headers', async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });
  });
});