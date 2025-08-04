import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { 
  createMockProgramRepository, 
  createMockTaskRepository,
  createMockEvaluationRepository,
  createMockUserRepository,
  createMockUser,
  createMockProgram,
  createMockTask,
  createMockEvaluation
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

// Mock cachedGET to just call the handler directly
jest.mock('@/lib/api/optimization-utils', () => ({
  cachedGET: async (request: NextRequest, handler: () => Promise<unknown>) => {
    try {
      const result = await handler();
      // If the handler returns a NextResponse, return it directly
      if (result instanceof Response) {
        return result;
      }
      // If it's an error-like object with error property, check for status
      if (result && typeof result === 'object' && 'error' in result) {
        const { NextResponse } = require('next/server');
        return NextResponse.json(result, { status: 500 });
      }
      // Otherwise wrap in NextResponse
      const { NextResponse } = require('next/server');
      return NextResponse.json(result);
    } catch (error) {
      // Re-throw the error to be handled by the test
      throw error;
    }
  }
}));

// Get mocked functions
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockGetProgramRepository = repositoryFactory.getProgramRepository as jest.MockedFunction<typeof repositoryFactory.getProgramRepository>;
const mockGetTaskRepository = repositoryFactory.getTaskRepository as jest.MockedFunction<typeof repositoryFactory.getTaskRepository>;
const mockGetEvaluationRepository = repositoryFactory.getEvaluationRepository as jest.MockedFunction<typeof repositoryFactory.getEvaluationRepository>;
const mockGetUserRepository = repositoryFactory.getUserRepository as jest.MockedFunction<typeof repositoryFactory.getUserRepository>;

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

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
    
    // Default mock fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        evaluation: createMockEvaluation({ id: 'eval-complete', score: 88 })
      })
    } as Response);
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

      const mockUser = createMockUser({
        id: 'user123',
        email: 'test@example.com',
      });

      const mockProgram = createMockProgram({
        id: 'prog1',
        userId: 'user123',
        scenarioId: 'scenario1',
        status: 'completed',
        completedTaskCount: 3,
        totalTaskCount: 3,
        completedAt: '2024-01-01T00:00:00Z',
      });

      const mockTasks = [
        createMockTask({ id: 'task1', programId: 'prog1', status: 'completed' }),
        createMockTask({ id: 'task2', programId: 'prog1', status: 'completed' }),
        createMockTask({ id: 'task3', programId: 'prog1', status: 'completed' }),
      ];

      const mockEvaluations = [
        createMockEvaluation({ id: 'eval1', taskId: 'task1', score: 90 }),
        createMockEvaluation({ id: 'eval2', taskId: 'task2', score: 85 }),
        createMockEvaluation({ id: 'eval3', programId: 'prog1', score: 88 }),
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
      expect(data.data).toEqual(expect.objectContaining({
        programId: 'prog1',
        scenarioId: 'scenario1',
        status: 'completed',
        totalTasks: 3,
        completedTasks: 3,
        overallScore: 88,
        tasks: expect.any(Array)
      }));
      expect(data.data.tasks).toHaveLength(3);
    });

    it('should return 404 for non-existent program', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' }
      });

      mockUserRepo.findByEmail.mockResolvedValue(createMockUser({ id: 'user123', email: 'test@example.com' }));
      mockProgramRepo.findById.mockResolvedValue(null);
      
      // Since the route is wrapped in cachedGET, we need to ensure the mock properly returns null
      // Reset the fetch mock for this test
      mockFetch.mockClear();

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

      mockUserRepo.findByEmail.mockResolvedValue(createMockUser({ id: 'user123', email: 'test@example.com' }));
      
      const mockProgram = createMockProgram({
        id: 'prog1',
        userId: 'user123',
        scenarioId: 'scenario1',
      });
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      
      // Mock fetch to fail - need to override the default mock
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/pbl/completion?programId=prog1&scenarioId=scenario1');

      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to get program evaluation');
    });
  });
});