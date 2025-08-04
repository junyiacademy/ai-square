import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { 
  createMockProgramRepository, 
  createMockTaskRepository,
  createMockEvaluationRepository,
  createMockUserRepository
} from '@/test-utils/mocks/repository-helpers';

// Mock auth session
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn()
}));

// Mock repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: jest.fn(),
    getTaskRepository: jest.fn(),
    getEvaluationRepository: jest.fn(),
    getUserRepository: jest.fn(),
  }
}));

// Get mocked functions
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockGetProgramRepository = repositoryFactory.getProgramRepository as jest.MockedFunction<typeof repositoryFactory.getProgramRepository>;
const mockGetTaskRepository = repositoryFactory.getTaskRepository as jest.MockedFunction<typeof repositoryFactory.getTaskRepository>;
const mockGetEvaluationRepository = repositoryFactory.getEvaluationRepository as jest.MockedFunction<typeof repositoryFactory.getEvaluationRepository>;
const mockGetUserRepository = repositoryFactory.getUserRepository as jest.MockedFunction<typeof repositoryFactory.getUserRepository>;

describe('/api/pbl/completion', () => {
  // Mock repositories using proper helpers
  const mockProgramRepo = createMockProgramRepository();
  const mockTaskRepo = createMockTaskRepository();
  const mockEvaluationRepo = createMockEvaluationRepository();
  const mockUserRepo = createMockUserRepository();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProgramRepository.mockReturnValue(mockProgramRepo);
    mockGetTaskRepository.mockReturnValue(mockTaskRepo);
    mockGetEvaluationRepository.mockReturnValue(mockEvaluationRepo);
    mockGetUserRepository.mockReturnValue(mockUserRepo);
  });

  describe('GET', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/pbl/completion?scenarioId=scenario1');

      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should retrieve completion data for authenticated users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' }
      });

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
      };

      const mockProgram = {
        id: 'prog1',
        userId: 'user123',
        scenarioId: 'scenario1',
        status: 'completed',
        completedTasks: 3,
        totalTasks: 3,
        endTime: new Date('2024-01-01T00:00:00Z'),
      };

      const mockTasks = [
        { id: 'task1', programId: 'prog1', status: 'completed' },
        { id: 'task2', programId: 'prog1', status: 'completed' },
        { id: 'task3', programId: 'prog1', status: 'completed' },
      ];

      const mockEvaluations = [
        { id: 'eval1', taskId: 'task1', score: 90 },
        { id: 'eval2', taskId: 'task2', score: 85 },
        { id: 'eval3', programId: 'prog1', score: 88 },
      ];

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
      mockEvaluationRepo.findByProgram.mockResolvedValue(mockEvaluations);

      const request = new NextRequest('http://localhost:3000/api/pbl/completion?programId=prog1&scenarioId=scenario1');

      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.program).toEqual(expect.objectContaining({
        id: 'prog1',
        status: 'completed'
      }));
      expect(data.data.tasks).toHaveLength(3);
      expect(data.data.evaluations).toHaveLength(3);
    });

    it('should return 404 for non-existent program', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' }
      });

      mockUserRepo.findByEmail.mockResolvedValue({ id: 'user123', email: 'test@example.com' });
      mockProgramRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/pbl/completion?programId=invalid&scenarioId=scenario1');

      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Program not found');
    });

    it('should handle missing programId parameter', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' }
      });

      const request = new NextRequest('http://localhost:3000/api/pbl/completion?scenarioId=scenario1');

      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing required parameters');
    });

    it('should handle repository errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' }
      });

      mockUserRepo.findByEmail.mockResolvedValue({ id: 'user123', email: 'test@example.com' });
      mockProgramRepo.findById.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/pbl/completion?programId=prog1&scenarioId=scenario1');

      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to retrieve completion data');
    });
  });
});