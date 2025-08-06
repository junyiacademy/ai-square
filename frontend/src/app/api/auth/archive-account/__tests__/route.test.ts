/**
 * Unit tests for archive-account API route
 * Tests account archival/deletion functionality
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPool } from '@/lib/db/get-pool';
import { getUserWithPassword } from '@/lib/auth/password-utils';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/db/get-pool');
jest.mock('@/lib/auth/password-utils');
jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

describe('Archive Account API Route', () => {
  let mockPool: any;
  let mockClient: any;
  
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    // Setup mock database pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient)
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);
    
    // Setup mock password utils
    (getUserWithPassword as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('POST /api/auth/archive-account', () => {
    it('should archive account with valid password', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      
      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/auth/archive-account', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({
          password: 'password123',
          reason: 'No longer needed',
          confirmArchive: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('successfully deleted');
      
      // Check database operations
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['No longer needed', 'user-123'])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO activity_logs'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      
      // Check session was cleared (skip in test environment where cookies aren't available)
      if (response.cookies && typeof response.cookies.get === 'function') {
        expect(response.cookies.get('isLoggedIn')).toBeUndefined();
      }
    });

    it('should return error for unauthenticated user', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123',
          confirmArchive: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not authenticated');
    });

    it('should reject if confirmArchive is false', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });

      const request = new NextRequest('http://localhost/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123',
          confirmArchive: false
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Please confirm account archival');
    });

    it('should reject with invalid password', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      
      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          password: 'wrongpassword',
          confirmArchive: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid password');
    });

    it('should validate required password field', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });

      const request = new NextRequest('http://localhost/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          confirmArchive: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Required');
    });

    it('should handle user not found', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      
      (getUserWithPassword as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123',
          confirmArchive: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should rollback transaction on error', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      
      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(true);
      
      // Simulate database error
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // UPDATE users

      const request = new NextRequest('http://localhost/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123',
          confirmArchive: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should use default reason if not provided', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      
      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123',
          confirmArchive: true
          // No reason provided
        })
      });

      await POST(request);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['User requested account deletion', 'user-123'])
      );
    });

    it('should log activity with IP and user agent', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      
      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/auth/archive-account', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '10.0.0.1',
          'user-agent': 'Test Browser'
        },
        body: JSON.stringify({
          password: 'password123',
          reason: 'Test reason',
          confirmArchive: true
        })
      });

      await POST(request);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO activity_logs'),
        expect.arrayContaining([
          'user-123',
          'account_archived',
          JSON.stringify({ reason: 'Test reason' }),
          '10.0.0.1',
          'Test Browser'
        ])
      );
    });

    it('should handle database connection errors', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      const request = new NextRequest('http://localhost/api/auth/archive-account', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123',
          confirmArchive: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to delete account');
    });
  });
});