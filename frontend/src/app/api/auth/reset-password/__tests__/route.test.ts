import { POST } from '../route';
import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';

// Mock repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  RepositoryFactory: {
    getInstance: jest.fn().mockReturnValue({
      getUserRepository: jest.fn().mockReturnValue({
        findById: jest.fn(),
        update: jest.fn(),
      }),
      getPasswordResetRepository: jest.fn().mockReturnValue({
        findValidToken: jest.fn(),
        markAsUsed: jest.fn(),
      }),
    }),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('Reset Password API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password successfully with valid token', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockResetToken = {
        id: 'reset123',
        userId: 'user123',
        token: 'validToken',
        expiresAt: new Date(Date.now() + 3600000),
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      const mockResetRepo = RepositoryFactory.getInstance().getPasswordResetRepository();
      
      mockResetRepo.findValidToken.mockResolvedValue(mockResetToken);
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.update.mockResolvedValue({ ...mockUser, password: 'hashedNewPassword' });
      mockResetRepo.markAsUsed.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'validToken',
          password: 'NewPassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Password has been reset successfully');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
      expect(mockUserRepo.update).toHaveBeenCalledWith('user123', {
        password: 'hashedNewPassword',
      });
      expect(mockResetRepo.markAsUsed).toHaveBeenCalledWith('reset123');
    });

    it('should reject invalid token', async () => {
      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockResetRepo = RepositoryFactory.getInstance().getPasswordResetRepository();
      
      mockResetRepo.findValidToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalidToken',
          password: 'NewPassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid or expired reset token');
    });

    it('should validate password requirements', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'someToken',
          password: 'weak',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Password must be at least 8 characters');
    });

    it('should require both token and password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'someToken',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Token and new password are required');
    });

    it('should handle user not found error', async () => {
      const mockResetToken = {
        id: 'reset123',
        userId: 'user123',
        token: 'validToken',
        expiresAt: new Date(Date.now() + 3600000),
      };

      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockUserRepo = RepositoryFactory.getInstance().getUserRepository();
      const mockResetRepo = RepositoryFactory.getInstance().getPasswordResetRepository();
      
      mockResetRepo.findValidToken.mockResolvedValue(mockResetToken);
      mockUserRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'validToken',
          password: 'NewPassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should handle database errors gracefully', async () => {
      const { RepositoryFactory } = require('@/lib/repositories/base/repository-factory');
      const mockResetRepo = RepositoryFactory.getInstance().getPasswordResetRepository();
      
      mockResetRepo.findValidToken.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'validToken',
          password: 'NewPassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to reset password');
    });
  });
});