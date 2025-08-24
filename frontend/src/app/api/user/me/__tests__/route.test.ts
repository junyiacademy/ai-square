/**
 * Tests for /api/user/me route
 * Priority: CRITICAL - 0% coverage → 95%+ coverage
 */

import { GET, PUT } from '../route';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getPool } from '@/lib/db/get-pool';
import { PostgreSQLUserRepository } from '@/lib/repositories/postgresql';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('@/lib/auth/jwt', () => ({
  verifyAccessToken: jest.fn()
}));

jest.mock('@/lib/db/get-pool', () => ({
  getPool: jest.fn()
}));

jest.mock('@/lib/repositories/postgresql', () => ({
  PostgreSQLUserRepository: jest.fn()
}));

describe('/api/user/me', () => {
  let mockCookies: jest.Mocked<any>;
  let mockUserRepo: jest.Mocked<PostgreSQLUserRepository>;
  let mockPool: any;
  let mockVerifyToken: jest.MockedFunction<typeof verifyAccessToken>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'student',
    preferredLanguage: 'en',
    emailVerified: true,
    onboardingCompleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  };

  const mockTokenPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'student'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock cookies
    mockCookies = {
      get: jest.fn()
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookies);

    // Mock JWT verification
    mockVerifyToken = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>;

    // Mock database pool
    mockPool = {
      connect: jest.fn(),
      end: jest.fn()
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);

    // Mock user repository
    mockUserRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn()
    } as any;
    (PostgreSQLUserRepository as jest.Mock).mockImplementation(() => mockUserRepo);
  });

  describe('GET /api/user/me', () => {
    function createMockRequest(headers: Record<string, string> = {}) {
      return {
        headers: {
          get: jest.fn((name: string) => headers[name] || null)
        }
      } as unknown as NextRequest;
    }

    describe('Authentication', () => {
      it('should return 401 when no token provided', async () => {
        mockCookies.get.mockReturnValue(undefined);
        const request = createMockRequest();

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Not authenticated');
      });

      it('should use Authorization header token when provided', async () => {
        const request = createMockRequest({
          'Authorization': 'Bearer header-token'
        });
        mockVerifyToken.mockResolvedValue(mockTokenPayload);
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);

        await GET(request);

        expect(mockVerifyToken).toHaveBeenCalledWith('header-token');
      });

      it('should use cookie token when no header token', async () => {
        const request = createMockRequest();
        mockCookies.get.mockReturnValue({ value: 'cookie-token' });
        mockVerifyToken.mockResolvedValue(mockTokenPayload);
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);

        await GET(request);

        expect(mockVerifyToken).toHaveBeenCalledWith('cookie-token');
      });

      it('should prefer header token over cookie token', async () => {
        const request = createMockRequest({
          'Authorization': 'Bearer header-token'
        });
        mockCookies.get.mockReturnValue({ value: 'cookie-token' });
        mockVerifyToken.mockResolvedValue(mockTokenPayload);
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);

        await GET(request);

        expect(mockVerifyToken).toHaveBeenCalledWith('header-token');
        expect(mockVerifyToken).not.toHaveBeenCalledWith('cookie-token');
      });

      it('should return 401 for invalid token', async () => {
        const request = createMockRequest({
          'Authorization': 'Bearer invalid-token'
        });
        mockVerifyToken.mockResolvedValue(null);

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid or expired token');
      });
    });

    describe('User Lookup', () => {
      beforeEach(() => {
        const request = createMockRequest({
          'Authorization': 'Bearer valid-token'
        });
        mockVerifyToken.mockResolvedValue(mockTokenPayload);
      });

      it('should return 404 when user not found', async () => {
        const request = createMockRequest({
          'Authorization': 'Bearer valid-token'
        });
        mockUserRepo.findByEmail.mockResolvedValue(null);

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.error).toBe('User not found');
      });

      it('should return user data when found', async () => {
        const request = createMockRequest({
          'Authorization': 'Bearer valid-token'
        });
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          preferredLanguage: mockUser.preferredLanguage,
          emailVerified: mockUser.emailVerified,
          onboardingCompleted: mockUser.onboardingCompleted,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt
        });
      });

      it('should query user by email from token payload', async () => {
        const request = createMockRequest({
          'Authorization': 'Bearer valid-token'
        });
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);

        await GET(request);

        expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(mockTokenPayload.email);
      });
    });

    describe('Error Handling', () => {
      it('should handle JWT verification errors', async () => {
        const request = createMockRequest({
          'Authorization': 'Bearer valid-token'
        });
        mockVerifyToken.mockRejectedValue(new Error('JWT error'));

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Internal server error');
      });

      it('should handle database errors', async () => {
        const request = createMockRequest({
          'Authorization': 'Bearer valid-token'
        });
        mockVerifyToken.mockResolvedValue(mockTokenPayload);
        mockUserRepo.findByEmail.mockRejectedValue(new Error('DB error'));

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Internal server error');
      });

      it('should log errors to console', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const request = createMockRequest({
          'Authorization': 'Bearer valid-token'
        });
        const dbError = new Error('DB connection failed');
        mockVerifyToken.mockResolvedValue(mockTokenPayload);
        mockUserRepo.findByEmail.mockRejectedValue(dbError);

        await GET(request);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error in /api/user/me:', dbError);
        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('PUT /api/user/me', () => {
    function createMockRequest(body: any, headers: Record<string, string> = {}) {
      return {
        headers: {
          get: jest.fn((name: string) => headers[name] || null)
        },
        json: jest.fn().mockResolvedValue(body)
      } as unknown as NextRequest;
    }

    describe('Authentication', () => {
      it('should return 401 when no token provided', async () => {
        mockCookies.get.mockReturnValue(undefined);
        const request = createMockRequest({});

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Not authenticated');
      });

      it('should return 401 for invalid token', async () => {
        const request = createMockRequest({}, {
          'Authorization': 'Bearer invalid-token'
        });
        mockVerifyToken.mockResolvedValue(null);

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid or expired token');
      });
    });

    describe('Profile Update', () => {
      beforeEach(() => {
        mockVerifyToken.mockResolvedValue(mockTokenPayload);
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      });

      it('should update user name', async () => {
        const request = createMockRequest(
          { name: 'New Name' },
          { 'Authorization': 'Bearer valid-token' }
        );
        const updatedUser = { ...mockUser, name: 'New Name' };
        mockUserRepo.findById.mockResolvedValue(updatedUser);

        const response = await PUT(request);
        const data = await response.json();

        expect(mockUserRepo.update).toHaveBeenCalledWith(mockUser.id, { name: 'New Name' });
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user.name).toBe('New Name');
      });

      it('should update preferred language', async () => {
        const request = createMockRequest(
          { preferredLanguage: 'zh' },
          { 'Authorization': 'Bearer valid-token' }
        );
        const updatedUser = { ...mockUser, preferredLanguage: 'zh' };
        mockUserRepo.findById.mockResolvedValue(updatedUser);

        const response = await PUT(request);
        const data = await response.json();

        expect(mockUserRepo.update).toHaveBeenCalledWith(mockUser.id, { preferredLanguage: 'zh' });
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user.preferredLanguage).toBe('zh');
      });

      it('should update multiple fields', async () => {
        const request = createMockRequest(
          { name: 'New Name', preferredLanguage: 'es' },
          { 'Authorization': 'Bearer valid-token' }
        );
        const updatedUser = { ...mockUser, name: 'New Name', preferredLanguage: 'es' };
        mockUserRepo.findById.mockResolvedValue(updatedUser);

        const response = await PUT(request);
        const data = await response.json();

        expect(mockUserRepo.update).toHaveBeenCalledWith(mockUser.id, {
          name: 'New Name',
          preferredLanguage: 'es'
        });
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });

      it('should handle empty update body', async () => {
        const request = createMockRequest(
          {},
          { 'Authorization': 'Bearer valid-token' }
        );
        mockUserRepo.findById.mockResolvedValue(mockUser);

        const response = await PUT(request);
        const data = await response.json();

        expect(mockUserRepo.update).toHaveBeenCalledWith(mockUser.id, {});
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });

      it('should ignore undefined fields', async () => {
        const request = createMockRequest(
          { name: 'New Name', preferredLanguage: undefined },
          { 'Authorization': 'Bearer valid-token' }
        );
        const updatedUser = { ...mockUser, name: 'New Name' };
        mockUserRepo.findById.mockResolvedValue(updatedUser);

        await PUT(request);

        expect(mockUserRepo.update).toHaveBeenCalledWith(mockUser.id, { name: 'New Name' });
      });

      it('should return 404 when user not found', async () => {
        const request = createMockRequest(
          { name: 'New Name' },
          { 'Authorization': 'Bearer valid-token' }
        );
        mockUserRepo.findByEmail.mockResolvedValue(null);

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.error).toBe('User not found');
      });

      it('should return 500 when updated user retrieval fails', async () => {
        const request = createMockRequest(
          { name: 'New Name' },
          { 'Authorization': 'Bearer valid-token' }
        );
        mockUserRepo.findById.mockResolvedValue(null);

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Failed to retrieve updated user');
      });
    });

    describe('Error Handling', () => {
      it('should handle JSON parsing errors', async () => {
        const request = {
          headers: {
            get: jest.fn().mockReturnValue('Bearer valid-token')
          },
          json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
        } as unknown as NextRequest;
        
        mockVerifyToken.mockResolvedValue(mockTokenPayload);

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Internal server error');
      });

      it('should handle update errors', async () => {
        const request = createMockRequest(
          { name: 'New Name' },
          { 'Authorization': 'Bearer valid-token' }
        );
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);
        mockUserRepo.update.mockRejectedValue(new Error('Update failed'));

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Internal server error');
      });

      it('should log update errors to console', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const request = createMockRequest(
          { name: 'New Name' },
          { 'Authorization': 'Bearer valid-token' }
        );
        const updateError = new Error('Update failed');
        mockUserRepo.findByEmail.mockResolvedValue(mockUser);
        mockUserRepo.update.mockRejectedValue(updateError);

        await PUT(request);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating user profile:', updateError);
        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('Repository Initialization', () => {
    it('should reuse the same repository instance', async () => {
      const request1 = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer valid-token')
        }
      } as unknown as NextRequest;

      const request2 = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer valid-token-2')
        }
      } as unknown as NextRequest;

      mockVerifyToken.mockResolvedValue(mockTokenPayload);
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      await GET(request1);
      await GET(request2);

      // Should only create the repository once
      expect(PostgreSQLUserRepository).toHaveBeenCalledTimes(1);
      expect(getPool).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete GET workflow successfully', async () => {
      const request = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer valid-token')
        }
      } as unknown as NextRequest;

      mockVerifyToken.mockResolvedValue(mockTokenPayload);
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(mockTokenPayload.email);
    });

    it('should handle complete PUT workflow successfully', async () => {
      const updateData = { name: 'Updated Name', preferredLanguage: 'fr' };
      const request = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer valid-token')
        },
        json: jest.fn().mockResolvedValue(updateData)
      } as unknown as NextRequest;

      mockVerifyToken.mockResolvedValue(mockTokenPayload);
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      const updatedUser = { ...mockUser, ...updateData };
      mockUserRepo.findById.mockResolvedValue(updatedUser);

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.name).toBe(updateData.name);
      expect(data.user.preferredLanguage).toBe(updateData.preferredLanguage);
    });
  });
});