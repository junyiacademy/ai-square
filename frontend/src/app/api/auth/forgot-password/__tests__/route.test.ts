import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Unit tests for forgot-password API route
 * Tests password reset request functionality
 */

import { POST, GET } from '../route';
import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { emailService } from '@/lib/email/email-service';
import { getPool } from '@/lib/db/get-pool';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/email/email-service');
jest.mock('@/lib/db/get-pool');
jest.mock('crypto');

describe('Forgot Password API Route', () => {
  let mockUserRepo: any;
  let mockPool: any;
  
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User'
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
      toString: jest.fn().mockReturnValue('mock-reset-token')
    });
    
    // Setup mock email service
    (emailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(true);
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('If an account exists');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO password_reset_tokens'),
        expect.arrayContaining(['user-123', 'mock-reset-token'])
      );
      
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('mock-reset-token')
      );
    });

    it('should return success even for non-existent user (security)', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('If an account exists');
      
      // Should not send email for non-existent user
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid email');
    });

    it('should lowercase email before processing', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'Test@Example.COM'
        })
      });

      await POST(request);

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle database errors gracefully', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to process password reset request');
    });

    it('should handle email service failures', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (emailService.sendPasswordResetEmail as jest.Mock).mockRejectedValue(
        new Error('Email service error')
      );

      const request = new NextRequest('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should use environment variable for reset URL', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
        })
      });

      await POST(request);

      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('https://app.example.com/reset-password')
      );
      
      delete process.env.NEXT_PUBLIC_APP_URL;
    });

    it('should handle missing email field', async () => {
      const request = new NextRequest('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/auth/forgot-password', () => {
    it('should validate reset token', async () => {
      const request = new NextRequest('http://localhost/api/auth/forgot-password?token=valid-token');

      mockPool.query.mockResolvedValue({
        rows: [{
          user_id: 'user-123',
          email: 'test@example.com',
          expires_at: new Date(Date.now() + 3600000) // 1 hour from now
        }]
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.email).toBe('test@example.com');
    });

    it('should reject missing token', async () => {
      const request = new NextRequest('http://localhost/api/auth/forgot-password');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Token is required');
    });

    it('should reject expired token', async () => {
      const request = new NextRequest('http://localhost/api/auth/forgot-password?token=expired-token');

      // The query only returns rows where expires_at > CURRENT_TIMESTAMP, 
      // so an expired token will return no rows
      mockPool.query.mockResolvedValue({
        rows: []
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid or expired token');
    });

    it('should reject invalid token', async () => {
      const request = new NextRequest('http://localhost/api/auth/forgot-password?token=invalid-token');

      mockPool.query.mockResolvedValue({
        rows: []
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });

    it('should handle database errors in token validation', async () => {
      const request = new NextRequest('http://localhost/api/auth/forgot-password?token=some-token');

      mockPool.query.mockRejectedValue(new Error('Database error'));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to validate token');
    });
  });
});