import { GET } from '../route';
import { NextRequest } from 'next/server';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';

// Mock unified auth
jest.mock('@/lib/auth/unified-auth', () => ({
  getUnifiedAuth: jest.fn()
}));

describe('/api/auth/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session token authentication', () => {
    it('returns authenticated user when valid session token exists', async () => {
      const mockGetUnifiedAuth = getUnifiedAuth as jest.Mock;
      
      mockGetUnifiedAuth.mockResolvedValue({
        user: {
          id: '123',  
          email: 'test@example.com',
          role: 'user'
        }
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: true,
        user: {
          id: '123',
          email: 'test@example.com',
          role: 'user',
          name: 'test@example.com' // Uses email as name
        }
      });
    });

    it('returns unauthenticated when no session token exists', async () => {
      const mockGetUnifiedAuth = getUnifiedAuth as jest.Mock;
      
      mockGetUnifiedAuth.mockResolvedValue(null);

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: false,
        user: null
      });
    });

    it('returns unauthenticated when session token is invalid', async () => {
      const mockGetUnifiedAuth = getUnifiedAuth as jest.Mock;
      
      mockGetUnifiedAuth.mockResolvedValue(null);

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: false,
        user: null
      });
    });

    it('handles malformed session token gracefully', async () => {
      const mockGetUnifiedAuth = getUnifiedAuth as jest.Mock;
      
      mockGetUnifiedAuth.mockRejectedValue(new Error('Invalid token'));

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: false,
        user: null
      });
    });

    it('handles URL-encoded session token from cookies', async () => {
      const mockGetUnifiedAuth = getUnifiedAuth as jest.Mock;
      
      mockGetUnifiedAuth.mockResolvedValue({
        user: {
          id: '456',
          email: 'encoded@example.com',
          role: 'admin'
        }
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: true,
        user: {
          id: '456',
          email: 'encoded@example.com',
          role: 'admin',
          name: 'encoded@example.com'
        }
      });
    });
  });

  describe('response format validation', () => {
    it('always includes required fields in response', async () => {
      const mockGetUnifiedAuth = getUnifiedAuth as jest.Mock;
      
      mockGetUnifiedAuth.mockResolvedValue(null);

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data).toHaveProperty('authenticated');
      expect(data).toHaveProperty('user');
      expect(typeof data.authenticated).toBe('boolean');
    });
  });

  describe('demo account roles', () => {
    it('returns student role for student@example.com', async () => {
      const mockGetUnifiedAuth = getUnifiedAuth as jest.Mock;
      
      mockGetUnifiedAuth.mockResolvedValue({
        user: {
          id: 'demo-student',
          email: 'student@example.com',
          role: 'student'
        }
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.user?.role).toBe('student');
    });

    it('returns teacher role for teacher@example.com', async () => {
      const mockGetUnifiedAuth = getUnifiedAuth as jest.Mock;
      
      mockGetUnifiedAuth.mockResolvedValue({
        user: {
          id: 'demo-teacher',
          email: 'teacher@example.com',
          role: 'teacher'
        }
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.user?.role).toBe('teacher');
    });
  });
});