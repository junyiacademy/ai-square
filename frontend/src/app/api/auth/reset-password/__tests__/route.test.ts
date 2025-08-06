/**
 * Unit tests for reset password API route
 * Tests password reset functionality with token validation
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock dependencies
jest.mock('@/lib/db/get-pool');
jest.mock('bcryptjs');
jest.mock('@/lib/auth/password-utils');

const mockGetPool = require('@/lib/db/get-pool').getPool as jest.Mock;
const mockBcrypt = require('bcryptjs');
const mockUpdateUserPasswordHash = require('@/lib/auth/password-utils').updateUserPasswordHash as jest.Mock;

describe('/api/auth/reset-password', () => {
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock pool and client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };
    
    mockGetPool.mockReturnValue(mockPool);
    mockBcrypt.hash.mockResolvedValue('hashedPassword123');
    mockUpdateUserPasswordHash.mockResolvedValue(undefined);
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      // Arrange
      const validData = {
        token: 'valid-reset-token',
        password: 'NewPassword123'
      };
      
      const request = new NextRequest('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(validData),
      });

      // Mock database responses
      mockPool.query.mockResolvedValue({
        rows: [{
          user_id: 'user-123',
          email: 'user@example.com',
          role: 'user'
        }]
      });

      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN' || query === 'COMMIT') {
          return Promise.resolve();
        }
        if (query.includes('UPDATE password_reset_tokens')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve();
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Password has been reset successfully');
      expect(data.email).toBe('user@example.com');
      
      // Verify token validation query
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM password_reset_tokens prt'),
        ['valid-reset-token']
      );
      
      // Verify password hashing
      expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPassword123', 10);
      
      // Verify password update
      expect(mockUpdateUserPasswordHash).toHaveBeenCalledWith(
        mockPool, 'user-123', 'hashedPassword123', 'user'
      );
      
      // Verify token marked as used
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1',
        ['valid-reset-token']
      );

      // Verify transaction handling
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      // Arrange
      const invalidData = {
        token: '', // Invalid: empty token
        password: 'ValidPassword123'
      };
      
      const request = new NextRequest('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Token is required');
      
      // Should not interact with database
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should reject request with weak password', async () => {
      // Arrange
      const invalidData = {
        token: 'valid-token',
        password: 'weak' // Invalid: doesn't meet complexity requirements
      };
      
      const request = new NextRequest('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Password must be at least 8 characters');
      
      // Should not interact with database
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should reject password without uppercase letter', async () => {
      // Arrange
      const invalidData = {
        token: 'valid-token',
        password: 'password123' // Missing uppercase
      };
      
      const request = new NextRequest('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', async () => {
      // Arrange
      const invalidData = {
        token: 'valid-token',
        password: 'Password' // Missing number
      };
      
      const request = new NextRequest('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Password must contain at least one number');
    });

    it('should reject expired or invalid token', async () => {
      // Arrange
      const validData = {
        token: 'expired-token',
        password: 'ValidPassword123'
      };
      
      const request = new NextRequest('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(validData),
      });

      // Mock database to return no rows (invalid token)
      mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid or expired token');
      
      // Should not proceed with password reset
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(mockUpdateUserPasswordHash).not.toHaveBeenCalled();
    });

    it('should handle database transaction rollback on error', async () => {
      // Arrange
      const validData = {
        token: 'valid-token',
        password: 'ValidPassword123'
      };
      
      const request = new NextRequest('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(validData),
      });

      // Mock database responses
      mockPool.query.mockResolvedValue({
        rows: [{
          user_id: 'user-123',
          email: 'user@example.com',
          role: 'user'
        }]
      });

      // Mock transaction failure
      mockUpdateUserPasswordHash.mockRejectedValue(new Error('Database error'));
      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to reset password');
      
      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle malformed JSON request', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: 'invalid json',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to reset password');
    });

    it('should handle missing request body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({}), // Empty body
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Required'); // Zod returns generic "Required" for missing fields
    });

    it('should handle database connection error', async () => {
      // Arrange
      const validData = {
        token: 'valid-token',
        password: 'ValidPassword123'
      };
      
      const request = new NextRequest('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(validData),
      });

      // Mock database connection error
      mockPool.query.mockRejectedValue(new Error('Connection failed'));

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to reset password');
    });
  });
});