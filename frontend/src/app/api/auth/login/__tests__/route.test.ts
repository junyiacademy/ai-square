import { POST, OPTIONS } from '../route';
import { NextRequest } from 'next/server';
import { createAccessToken, createRefreshToken } from '@/lib/auth/jwt';

// Mock the auth module
jest.mock('@/lib/auth/jwt', () => ({
  createAccessToken: jest.fn(),
  createRefreshToken: jest.fn()
}));

describe('/api/auth/login', () => {
  const mockCreateAccessToken = createAccessToken as jest.MockedFunction<typeof createAccessToken>;
  const mockCreateRefreshToken = createRefreshToken as jest.MockedFunction<typeof createRefreshToken>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAccessToken.mockResolvedValue('mock-access-token');
    mockCreateRefreshToken.mockResolvedValue('mock-refresh-token');
  });

  describe('POST', () => {
    it('should login successfully with valid student credentials', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'student@example.com',
          password: 'student123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toEqual({
        id: 1,
        email: 'student@example.com',
        role: 'student',
        name: 'Student User'
      });
      expect(data.message).toBe('Login successful');

      // Check JWT creation
      expect(mockCreateAccessToken).toHaveBeenCalledWith({
        userId: 1,
        email: 'student@example.com',
        role: 'student',
        name: 'Student User'
      });
      expect(mockCreateRefreshToken).toHaveBeenCalledWith(1, false);

      // Check cookies
      const cookies = response.headers.getSetCookie();
      expect(cookies).toContainEqual(expect.stringContaining('accessToken=mock-access-token'));
      expect(cookies).toContainEqual(expect.stringContaining('refreshToken=mock-refresh-token'));
      expect(cookies).toContainEqual(expect.stringContaining('isLoggedIn=true'));
    });

    it('should login successfully with teacher credentials', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'teacher@example.com',
          password: 'teacher123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('teacher');
    });

    it('should login successfully with admin credentials', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('admin');
    });

    it('should handle remember me option', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'student@example.com',
          password: 'student123',
          rememberMe: true
        })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockCreateRefreshToken).toHaveBeenCalledWith(1, true);

      // Check cookie max age
      const cookies = response.headers.getSetCookie();
      const rememberMeCookie = cookies.find(c => c.includes('rememberMe='));
      expect(rememberMeCookie).toContain('Max-Age=2592000'); // 30 days
    });

    it('should fail with missing email', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email and password are required');
    });

    it('should fail with missing password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email and password are required');
    });

    it('should fail with invalid credentials', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'wrong@example.com',
          password: 'wrongpassword'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid email or password');
    });

    it('should handle JSON parse errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle JWT creation errors', async () => {
      mockCreateAccessToken.mockRejectedValue(new Error('JWT error'));

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'student@example.com',
          password: 'student123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
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