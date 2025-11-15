import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock the repository factory
jest.mock('@/lib/repositories/base/repository-factory');

describe('/api/users/[id] Route', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    preferredLanguage: 'en',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  };

  let mockUserRepo: any;

  beforeEach(() => {
    mockUserRepo = {
      findById: jest.fn(),
      update: jest.fn(),
      updateLastActive: jest.fn(),
      delete: jest.fn()
    };

    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
  });

  describe('GET /api/users/[id]', () => {
    it('should handle async params correctly in Next.js 15', async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/users/test-user-id');
      const params = Promise.resolve({ id: 'test-user-id' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(mockUserRepo.findById).toHaveBeenCalledWith('test-user-id');
      expect(mockUserRepo.updateLastActive).toHaveBeenCalledWith('test-user-id');
      expect(data).toEqual(mockUser);
    });

    it('should return 404 when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users/nonexistent');
      const params = Promise.resolve({ id: 'nonexistent' });

      const response = await GET(request, { params });
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toEqual({ error: 'User not found' });
    });
  });

  describe('PATCH /api/users/[id]', () => {
    it('should handle async params and update allowed fields', async () => {
      const updateData = {
        name: 'Updated Name',
        preferredLanguage: 'zh-TW',
        notAllowedField: 'should be ignored'
      };

      const updatedUser = {
        ...mockUser,
        name: 'Updated Name',
        preferredLanguage: 'zh-TW'
      };

      mockUserRepo.update.mockResolvedValue(updatedUser);

      const request = new NextRequest('http://localhost:3000/api/users/test-user-id', {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
      const params = Promise.resolve({ id: 'test-user-id' });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(mockUserRepo.update).toHaveBeenCalledWith('test-user-id', {
        name: 'Updated Name',
        preferredLanguage: 'zh-TW'
      });

      expect(data).toEqual(updatedUser);
    });

    it('should return 404 when user not found during update', async () => {
      mockUserRepo.update.mockRejectedValue(new Error('User not found'));

      const request = new NextRequest('http://localhost:3000/api/users/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' })
      });
      const params = Promise.resolve({ id: 'nonexistent' });

      const response = await PATCH(request, { params });
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toEqual({ error: 'User not found' });
    });
  });

  describe('DELETE /api/users/[id]', () => {
    it('should handle async params and delete user', async () => {
      mockUserRepo.delete.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/users/test-user-id', {
        method: 'DELETE'
      });
      const params = Promise.resolve({ id: 'test-user-id' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(mockUserRepo.delete).toHaveBeenCalledWith('test-user-id');
      expect(data).toEqual({ message: 'User deleted successfully' });
    });

    it('should return 404 when user not found during delete', async () => {
      mockUserRepo.delete.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/users/nonexistent', {
        method: 'DELETE'
      });
      const params = Promise.resolve({ id: 'nonexistent' });

      const response = await DELETE(request, { params });
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toEqual({ error: 'User not found' });
    });
  });
});
