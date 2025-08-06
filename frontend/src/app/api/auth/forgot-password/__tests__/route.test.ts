import { POST, GET } from '../route';
import { NextRequest } from 'next/server';
import { emailService } from '@/lib/email/email-service';

// Mock repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  RepositoryFactory: {
    getInstance: jest.fn().mockReturnValue({
      getUserRepository: jest.fn().mockReturnValue({
        findByEmail: jest.fn(),
      }),
      getPasswordResetRepository: jest.fn().mockReturnValue({
        create: jest.fn(),
        findValidToken: jest.fn(),
      }),
    }),
  },
}));

// Mock email service
jest.mock('@/lib/email/email-service', () => ({
  emailService: {
    sendPasswordResetEmail: jest.fn(),
  },
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mocktoken123'),
  }),
}));

describe('Forgot Password API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for valid user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      const mockResetRepo = RepositoryFactory.getInstance().getPasswordResetRepository();
      
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockResetRepo.create.mockResolvedValue({
        id: 'reset123',
        userId: 'user123',
        token: 'hashedToken',
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('password reset email has been sent');
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        expect.stringContaining('mocktoken123')
      );
    });

    it('should return success even for non-existent email (security)', async () => {
      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid email address');
    });

    it('should require email field', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email is required');
    });
  });

  describe('GET /api/auth/forgot-password', () => {
    it('should validate token successfully', async () => {
      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockResetRepo = RepositoryFactory.getInstance().getPasswordResetRepository();
      
      mockResetRepo.findValidToken.mockResolvedValue({
        id: 'reset123',
        userId: 'user123',
        token: 'validToken',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password?token=validToken');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Token is valid');
    });

    it('should reject invalid token', async () => {
      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockResetRepo = RepositoryFactory.getInstance().getPasswordResetRepository();
      
      mockResetRepo.findValidToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password?token=invalidToken');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid or expired reset token');
    });

    it('should require token parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Token is required');
    });

    it('should handle database errors gracefully', async () => {
      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockResetRepo = RepositoryFactory.getInstance().getPasswordResetRepository();
      
      mockResetRepo.findValidToken.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password?token=someToken');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to validate token');
    });
  });
});