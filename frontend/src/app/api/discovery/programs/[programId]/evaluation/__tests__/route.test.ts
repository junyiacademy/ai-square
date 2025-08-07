import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Discovery Program Evaluation API Tests
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: jest.fn(),
    getEvaluationRepository: jest.fn(),
    getUserRepository: jest.fn(),
    getTaskRepository: jest.fn(),
  },
}));

// Mock auth session
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn(),
}));

import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('Discovery Program Evaluation API', () => {
  let mockProgramRepo: any;
  let mockEvaluationRepo: any;
  let mockUserRepo: any;
  let mockTaskRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockProgramRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    
    mockEvaluationRepo = {
      findByProgram: jest.fn(),
      create: jest.fn(),
    };
    
    mockUserRepo = {
      findByEmail: jest.fn(),
    };
    
    mockTaskRepo = {
      findByProgram: jest.fn(),
    };

    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
  });

  describe('GET /api/discovery/programs/[programId]/evaluation', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/discovery/programs/program123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program123'}) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 404 when program not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
      mockUserRepo.findByEmail.mockResolvedValue({ id: 'user123', email: 'test@example.com' });
      mockProgramRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/discovery/programs/program123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program123'}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Program not found or access denied');
    });

    it('should return evaluations for valid program', async () => {
      const mockProgram = {
        id: 'program123',
        userId: 'user123',
        status: 'completed',
      };

      const mockEvaluations = [
        {
          id: 'eval1',
          programId: 'program123',
          evaluationType: 'task',
          score: 85,
        },
        {
          id: 'eval2',
          programId: 'program123',
          evaluationType: 'program',
          score: 90,
        },
      ];

      mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
      mockUserRepo.findByEmail.mockResolvedValue({ id: 'user123', email: 'test@example.com' });
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue([]);
      mockEvaluationRepo.findByProgram.mockResolvedValue(mockEvaluations);

      const request = new NextRequest('http://localhost/api/discovery/programs/program123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program123'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.evaluation).toBeDefined();
      expect(data.program.id).toBe('program123');
      expect(mockEvaluationRepo.findByProgram).toHaveBeenCalledWith('program123');
    });

    it('should handle repository errors', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user123', email: 'test@example.com' } });
      mockUserRepo.findByEmail.mockResolvedValue({ id: 'user123', email: 'test@example.com' });
      mockProgramRepo.findById.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/discovery/programs/program123/evaluation');
      const response = await GET(request, { params: Promise.resolve({'programId':'program123'}) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to load evaluation');
    });
  });

  // NOTE: POST endpoint is not exported from the route file, so no POST tests
});