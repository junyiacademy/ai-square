import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock AuthManager
jest.mock('@/lib/auth/auth-manager', () => ({
  AuthManager: {
    getSessionToken: jest.fn()
  }
}));

describe('/api/auth/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session token authentication', () => {
    it('returns authenticated user when valid session token exists', async () => {
      const { AuthManager } = require('@/lib/auth/auth-manager');
      
      const sessionTokenData = {
        userId: '123',  
        email: 'test@example.com',
        timestamp: Date.now(),
        rememberMe: false
      };
      const sessionToken = Buffer.from(JSON.stringify(sessionTokenData)).toString('base64');

      AuthManager.getSessionToken.mockReturnValue(sessionToken);

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
          name: 'User'
        }
      });
    });

    it('returns unauthenticated when no session token exists', async () => {
      const { AuthManager } = require('@/lib/auth/auth-manager');
      
      AuthManager.getSessionToken.mockReturnValue(undefined);

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
      const { AuthManager } = require('@/lib/auth/auth-manager');
      
      AuthManager.getSessionToken.mockReturnValue('invalid-token');

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
      const { AuthManager } = require('@/lib/auth/auth-manager');
      
      AuthManager.getSessionToken.mockReturnValue('not-base64-encoded');

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: false,
        user: null
      });
    });
  });

  describe('response format validation', () => {
    it('always includes required fields in response', async () => {
      const { AuthManager } = require('@/lib/auth/auth-manager');
      
      AuthManager.getSessionToken.mockReturnValue(undefined);

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
      const { AuthManager } = require('@/lib/auth/auth-manager');
      
      const sessionTokenData = {
        userId: '123',
        email: 'student@example.com',
        timestamp: Date.now(),
        rememberMe: false
      };
      const sessionToken = Buffer.from(JSON.stringify(sessionTokenData)).toString('base64');

      AuthManager.getSessionToken.mockReturnValue(sessionToken);

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.user.role).toBe('student');
      expect(data.user.name).toBe('Demo Student');
    });

    it('returns teacher role for teacher@example.com', async () => {
      const { AuthManager } = require('@/lib/auth/auth-manager');
      
      const sessionTokenData = {
        userId: '456',
        email: 'teacher@example.com',
        timestamp: Date.now(),
        rememberMe: false
      };
      const sessionToken = Buffer.from(JSON.stringify(sessionTokenData)).toString('base64');

      AuthManager.getSessionToken.mockReturnValue(sessionToken);

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.user.role).toBe('teacher');
      expect(data.user.name).toBe('Demo Teacher');
    });
  });
});