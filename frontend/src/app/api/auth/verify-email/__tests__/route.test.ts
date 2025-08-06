import { NextRequest } from 'next/server';
import { GET } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { createMockUserRepository, createMockUser } from '@/test-utils/mocks/repository-helpers';
import { verificationTokens } from '@/lib/auth/verification-tokens';
import { emailService } from '@/lib/email/email-service';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/email/email-service');
jest.mock('@/lib/db/get-pool', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  }))
}));
jest.mock('@/lib/auth/password-utils', () => ({
  updateUserEmailVerified: jest.fn(),
}));

const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;
const mockEmailService = emailService as jest.Mocked<typeof emailService>;

describe('/api/auth/verify-email', () => {
  let mockUserRepo: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo = createMockUserRepository();
    mockRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);
    
    // Clear verification tokens
    verificationTokens.clear();
    
    // Mock email service
    mockEmailService.sendWelcomeEmail.mockResolvedValue(true);
  });

  describe('GET - Email Verification', () => {
    it('should verify email with valid token', async () => {
      const testEmail = 'test@example.com';
      const testToken = 'valid-test-token';
      const testUser = createMockUser({
        id: 'user-123',
        email: testEmail,
        name: 'Test User',
      });

      // Set up valid token
      verificationTokens.set(testToken, {
        email: testEmail,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      });

      mockUserRepo.findByEmail.mockResolvedValue(testUser);

      const request = new NextRequest(`http://localhost:3000/api/auth/verify-email?token=${testToken}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Email verified successfully!');
      
      // Verify user was looked up
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(testEmail);
      
      // Verify welcome email was sent
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(testEmail, 'Test User');
      
      // Verify token was deleted
      expect(verificationTokens.has(testToken)).toBe(false);
    });

    it('should reject invalid verification token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/verify-email?token=invalid-token');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid verification token');
      
      // Verify no database calls were made
      expect(mockUserRepo.findByEmail).not.toHaveBeenCalled();
      expect(mockEmailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });

    it('should reject expired verification token', async () => {
      const testEmail = 'test@example.com';
      const testToken = 'expired-test-token';

      // Set up expired token
      verificationTokens.set(testToken, {
        email: testEmail,
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      });

      const request = new NextRequest(`http://localhost:3000/api/auth/verify-email?token=${testToken}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Verification token has expired');
      
      // Verify token was deleted
      expect(verificationTokens.has(testToken)).toBe(false);
      
      // Verify no database calls were made
      expect(mockUserRepo.findByEmail).not.toHaveBeenCalled();
      expect(mockEmailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });

    it('should require verification token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/verify-email');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Verification token is required');
    });

    it('should handle user not found', async () => {
      const testEmail = 'notfound@example.com';
      const testToken = 'valid-test-token';

      // Set up valid token
      verificationTokens.set(testToken, {
        email: testEmail,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      mockUserRepo.findByEmail.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/auth/verify-email?token=${testToken}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
      
      // Verify token was NOT deleted (user not found)
      expect(verificationTokens.has(testToken)).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      const testEmail = 'test@example.com';
      const testToken = 'valid-test-token';

      // Set up valid token
      verificationTokens.set(testToken, {
        email: testEmail,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      mockUserRepo.findByEmail.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(`http://localhost:3000/api/auth/verify-email?token=${testToken}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Verification failed. Please try again.');
    });

    it('should handle email sending failure gracefully', async () => {
      const testEmail = 'test@example.com';
      const testToken = 'valid-test-token';
      const testUser = createMockUser({
        id: 'user-123',
        email: testEmail,
        name: 'Test User',
      });

      // Set up valid token
      verificationTokens.set(testToken, {
        email: testEmail,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      mockUserRepo.findByEmail.mockResolvedValue(testUser);
      mockEmailService.sendWelcomeEmail.mockResolvedValue(false); // Email sending fails

      const request = new NextRequest(`http://localhost:3000/api/auth/verify-email?token=${testToken}`);

      const response = await GET(request);
      const data = await response.json();

      // Should still succeed even if welcome email fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Email verified successfully!');
      
      // Verify token was deleted
      expect(verificationTokens.has(testToken)).toBe(false);
    });
  });

  describe('OPTIONS - CORS Support', () => {
    it('should handle OPTIONS request', async () => {
      const { OPTIONS } = await import('../route');
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });
  });
});