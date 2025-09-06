import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Unit tests for resend-verification API route
 * Tests email verification resending functionality
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { emailService } from '@/lib/email/email-service';
import { getPool } from '@/lib/db/get-pool';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/email/email-service');
jest.mock('@/lib/db/get-pool');
jest.mock('crypto');

describe('Resend Verification API Route', () => {
  let mockUserRepo: any;
  let mockPool: any;
  
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock user repository
    mockUserRepo = {
      findByEmail: jest.fn()
    };
    
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    
    // Setup mock database pool
    mockPool = {
      query: jest.fn()
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);
    
    // Setup mock crypto
    (crypto.randomBytes as jest.Mock).mockReturnValue({
      toString: jest.fn().mockReturnValue('mock-verification-token')
    });
    
    // Setup mock email service
    (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(true);
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification for logged-in user', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'student' }
      });

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Verification email has been sent');
      expect(data.email).toBe('test@example.com');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO email_verification_tokens'),
        expect.arrayContaining(['user-123', 'mock-verification-token'])
      );
      
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('mock-verification-token')
      );
    });

    it('should resend verification for non-logged-in user with email', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return error if email already verified', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue({
        ...mockUser,
        emailVerified: true
      });

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email is already verified');
    });

    it('should return error if user not found', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should return error if no email and not logged in', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email is required when not logged in');
    });

    it('should validate email format', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid email format');
    });

    it('should handle database errors gracefully', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'student' }
      });
      
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to resend verification email');
    });

    it('should handle email service failures', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'student' }
      });
      
      (emailService.sendVerificationEmail as jest.Mock).mockRejectedValue(
        new Error('Email service error')
      );

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should lowercase email before processing', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'Test@Example.COM'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(data.email).toBe('test@example.com');
    });

    it('should use environment variable for verification URL', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
      
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'student' }
      });

      const request = new NextRequest('http://localhost/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({})
      });

      await POST(request);

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('https://app.example.com/verify-email')
      );
      
      delete process.env.NEXT_PUBLIC_APP_URL;
    });
  });
});