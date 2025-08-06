import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { emailService } from '@/lib/email/email-service';

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
      getEmailVerificationRepository: jest.fn().mockReturnValue({
        create: jest.fn(),
        findByUserId: jest.fn(),
      }),
    }),
  },
}));

// Mock email service
jest.mock('@/lib/email/email-service', () => ({
  emailService: {
    sendVerificationEmail: jest.fn(),
  },
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('verifytoken123'),
  }),
}));

const mockGetServerSession = getServerSession as jest.Mock;

describe('Resend Verification API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should send verification email successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      const mockVerificationRepo = RepositoryFactory.getInstance().getEmailVerificationRepository();
      
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockVerificationRepo.create.mockResolvedValue({
        id: 'verify123',
        userId: 'user123',
        token: 'hashedToken',
      });

      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Verification email sent successfully');
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        expect.stringContaining('verifytoken123')
      );
    });

    it('should handle already verified email', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email is already verified');
    });

    it('should handle rate limiting', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        emailVerified: false,
      };

      const recentVerification = {
        id: 'recent123',
        createdAt: new Date(Date.now() - 30000), // 30 seconds ago
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      const mockVerificationRepo = RepositoryFactory.getInstance().getEmailVerificationRepository();
      
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockVerificationRepo.findByUserId.mockResolvedValue([recentVerification]);

      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Please wait');
    });

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle user not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      mockUserRepo.findByEmail.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to resend verification email');
    });
  });
});