import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Unit tests for profile API route
 * Tests user profile retrieval and update functionality
 */

import { GET, PATCH } from '../route';
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getPool } from '@/lib/db/get-pool';
import { updateUserPasswordHash, getUserWithPassword } from '@/lib/auth/password-utils';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/db/get-pool');
jest.mock('@/lib/auth/password-utils');
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

describe('Profile API Route', () => {
  let mockUserRepo: any;
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'student',
    preferredLanguage: 'en',
    emailVerified: true,
    createdAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock user repository
    mockUserRepo = {
      findById: jest.fn(),
      update: jest.fn()
    };
    
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    (getPool as jest.Mock).mockReturnValue({});
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile for authenticated user', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        preferredLanguage: mockUser.preferredLanguage,
        emailVerified: mockUser.emailVerified,
        createdAt: mockUser.createdAt
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not authenticated');
    });

    it('should return 404 if user not found', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      mockUserRepo.findById.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should handle errors gracefully', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      mockUserRepo.findById.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to get profile');
    });
  });

  describe('PATCH /api/auth/profile', () => {
    it('should update user profile successfully', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      
      const updatedUser = {
        ...mockUser,
        name: 'Updated Name',
        preferredLanguage: 'zhTW'
      };
      mockUserRepo.update.mockResolvedValue(updatedUser);

      const request = new NextRequest('http://localhost/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Name',
          preferredLanguage: 'zhTW'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Profile updated successfully');
      expect(data.user.name).toBe('Updated Name');
      expect(data.user.preferredLanguage).toBe('zhTW');
    });

    it('should update password when valid current password provided', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      
      (getUserWithPassword as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-old-password'
      });

      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hashed-new-password');

      mockUserRepo.update.mockResolvedValue(mockUser);
      (updateUserPasswordHash as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword', 'hashed-old-password');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(updateUserPasswordHash).toHaveBeenCalledWith(
        expect.any(Object),
        'user-123',
        'hashed-new-password',
        'student'
      );
    });

    it('should reject password update with incorrect current password', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      
      (getUserWithPassword as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-old-password'
      });

      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Current password is incorrect');
    });

    it('should return 401 for unauthenticated user', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'New Name'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not authenticated');
    });

    it('should validate input data', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });

      const request = new NextRequest('http://localhost/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          newPassword: 'short' // Too short password
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Password must be at least 8 characters');
    });

    it('should handle database errors gracefully', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });

      mockUserRepo.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'New Name'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update profile');
      expect(data.details).toBe('Database error');
    });

    it('should handle invalid language preference', async () => {
      (getSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });

      const request = new NextRequest('http://localhost/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          preferredLanguage: 'invalid-lang'
        })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});