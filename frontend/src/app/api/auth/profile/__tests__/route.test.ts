import { GET, PATCH } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  RepositoryFactory: {
    getInstance: jest.fn().mockReturnValue({
      getUserRepository: jest.fn().mockReturnValue({
        findByEmail: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
      }),
    }),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.Mock;
const bcrypt = require('bcrypt');

describe('Profile API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile when authenticated', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        preferredLanguage: 'en',
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/profile');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toEqual(mockUser);
    });

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/profile');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when user not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/profile');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });

  describe('PATCH /api/auth/profile', () => {
    it('should update user profile successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        preferredLanguage: 'en',
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockUserRepo.update.mockResolvedValue({ ...mockUser, name: 'Updated Name' });

      const request = new NextRequest('http://localhost:3000/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.name).toBe('Updated Name');
    });

    it('should update password when valid current password provided', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('newHashedPassword');

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockUserRepo.update.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: 'oldPassword',
          newPassword: 'newPassword123',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword', 'hashedPassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
    });

    it('should reject password update with incorrect current password', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      bcrypt.compare.mockResolvedValue(false);

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Current password is incorrect');
    });

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});