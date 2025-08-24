/**
 * Tests for /api/pbl/scenarios/[id]/programs/[programId] route
 * Priority: CRITICAL - 25% coverage → 95%+ coverage
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

// Mock dependencies
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn()
}));

jest.mock('@/lib/db/repositories/factory', () => ({
  createRepositoryFactory: {
    getProgramRepository: jest.fn(),
    getUserRepository: jest.fn()
  }
}));

describe('/api/pbl/scenarios/[id]/programs/[programId]', () => {
  const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  let mockProgramRepo: any;
  let mockUserRepo: any;

  const validScenarioId = '123e4567-e89b-12d3-a456-426614174000';
  const validProgramId = '987e6543-e21b-34c5-a678-426614174001';
  const invalidId = 'not-a-uuid';

  const mockUser = {
    id: 'user-456',
    email: 'test@example.com',
    name: 'Test User'
  };

  const mockProgram = {
    id: validProgramId,
    userId: 'user-456',
    scenarioId: validScenarioId,
    status: 'active',
    title: 'Test Program'
  };

  const mockSession = {
    user: {
      email: 'test@example.com',
      id: 'user-456'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockProgramRepo = {
      findById: jest.fn()
    };
    
    mockUserRepo = {
      findByEmail: jest.fn()
    };

    const { createRepositoryFactory } = require('@/lib/db/repositories/factory');
    createRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
    createRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);
  });

  describe('URL Parameter Validation', () => {
    it('should reject invalid scenario ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const params = Promise.resolve({ id: invalidId, programId: validProgramId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid scenario ID format. UUID required.');
    });

    it('should reject invalid program ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const params = Promise.resolve({ id: validScenarioId, programId: invalidId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid program ID format. UUID required.');
    });

    it('should accept valid UUID formats', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const params = Promise.resolve({ id: validScenarioId, programId: validProgramId });

      mockGetServerSession.mockResolvedValue(mockSession);
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const params = Promise.resolve({ id: validScenarioId, programId: validProgramId });

      mockGetServerSession.mockResolvedValue(null);

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should require user email in session', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const params = Promise.resolve({ id: validScenarioId, programId: validProgramId });

      mockGetServerSession.mockResolvedValue({ user: {} });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Authorization', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    });

    it('should deny access when program belongs to different user', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const params = Promise.resolve({ id: validScenarioId, programId: validProgramId });

      const otherUserProgram = {
        ...mockProgram,
        userId: 'different-user-id'
      };
      mockProgramRepo.findById.mockResolvedValue(otherUserProgram);

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Access denied');
    });

    it('should allow access when program belongs to authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const params = Promise.resolve({ id: validScenarioId, programId: validProgramId });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle session errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const params = Promise.resolve({ id: validScenarioId, programId: validProgramId });

      mockGetServerSession.mockRejectedValue(new Error('Session error'));

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch program');
    });
  });
});