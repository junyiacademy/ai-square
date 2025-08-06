import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcrypt';

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
        update: jest.fn(),
      }),
      getActivityLogRepository: jest.fn().mockReturnValue({
        create: jest.fn(),
      }),
    }),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.Mock;

describe('Archive Account API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/archive-account', () => {
    it('should archive account successfully with correct password', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        accountStatus: 'active',
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      const mockActivityRepo = RepositoryFactory.getInstance().getActivityLogRepository();
      
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockUserRepo.update.mockResolvedValue({
        ...mockUser,
        accountStatus: 'archived',
        archivedAt: new Date().toISOString(),
      });
      mockActivityRepo.create.mockResolvedValue({ id: 'log123' });

      const request = new NextRequest('http://localhost:3000/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          password: 'userPassword',
          reason: 'No longer using the service',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Account has been archived successfully');
      expect(mockUserRepo.update).toHaveBeenCalledWith('user123', expect.objectContaining({
        accountStatus: 'archived',
        archiveReason: 'No longer using the service',
      }));
      expect(mockActivityRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user123',
        action: 'account_archived',
      }));
    });

    it('should reject with incorrect password', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          password: 'wrongPassword',
          reason: 'No longer using the service',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Incorrect password');
    });

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password',
          reason: 'reason',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should validate required fields', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'No password provided',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Password and reason are required');
    });

    it('should prevent archiving already archived account', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        accountStatus: 'archived',
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password',
          reason: 'reason',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Account is already archived');
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      mockUserRepo.findByEmail.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password',
          reason: 'reason',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to archive account');
    });
  });
});