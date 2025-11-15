import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Discovery Program API Route Tests
 * 測試探索程序 API
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/unified-auth', () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() => ({
    json: () => Promise.resolve({ success: false, error: 'Authentication required' }),
    status: 401
  }))
}));

// Mock console
const mockConsoleError = createMockConsoleError();

describe('/api/discovery/programs/[programId]', () => {
  // Mock repositories
  const mockProgramRepo = {
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockTaskRepo = {
    findByProgram: jest.fn(),
  };

  const mockScenarioRepo = {
    findById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repository factory mocks
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    (getUnifiedAuth as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET - Get Discovery Program Details', () => {
    const mockProgram = {
      id: 'prog-123',
      mode: 'discovery',
      scenarioId: 'scenario-456',
      userId: 'user-789',
      status: 'active',
      totalScore: 75,
      completedTaskCount: 2,
      totalTaskCount: 4,
      startedAt: '2025-01-01T10:00:00Z',
      discoveryData: {
        careerType: 'data-scientist',
        interests: ['machine-learning', 'statistics'],
      },
    };

    const mockTasks = [
      {
        id: 'task-1',
        programId: 'prog-123',
        title: { en: 'Explore Career Path' },
        type: 'question',
        status: 'completed',
        score: 90,
      },
      {
        id: 'task-2',
        programId: 'prog-123',
        title: { en: 'Build Portfolio' },
        type: 'creation',
        status: 'completed',
        score: 60,
      },
      {
        id: 'task-3',
        programId: 'prog-123',
        title: { en: 'Interview Prep' },
        type: 'chat',
        status: 'active',
      },
    ];

    const mockScenario = {
      id: 'scenario-456',
      title: { en: 'Data Science Career Path' },
      description: { en: 'Explore data science careers' },
      difficulty: 'intermediate',
    };

    it('should return program details for authorized user', async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com', role: 'student' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123');
      const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.program).toMatchObject({
        id: 'prog-123',
        mode: 'discovery',
        status: 'active',
      });
      expect(data.tasks).toHaveLength(3);
      expect(data.scenario).toMatchObject({
        id: 'scenario-456',
        title: { en: 'Data Science Career Path' },
        description: { en: 'Explore data science careers' },
      });
      expect(data.totalTasks).toBe(3);
      expect(data.completedTasks).toBe(2);
    });

    it('should return 404 when program not found', async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com', role: 'student' },
      });

      mockProgramRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/non-existent');
      const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Program not found');
    });

    it('should return 403 when user is not program owner', async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue({
        user: { id: 'other-user', email: 'other@example.com', role: 'student' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123');
      const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('should return 401 when not authenticated', async () => {
      (getUnifiedAuth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123');
      const response = await GET(request, { params: Promise.resolve({'programId':'test-id'}) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });
});

/**
 * Discovery Program API Considerations:
 *
 * 1. Authorization:
 *    - Must verify user owns the program
 *    - Returns 403 for unauthorized access
 *
 * 2. Discovery-specific Data:
 *    - Career type tracking
 *    - Interest areas
 *    - Skills assessment
 *
 * 3. Program Lifecycle:
 *    - Supports status updates
 *    - Tracks completion timestamps
 *    - Preserves historical data
 *
 * 4. Related Data:
 *    - Loads tasks for program
 *    - Includes scenario details
 *    - Calculates progress
 *
 * 5. Error Handling:
 *    - Graceful handling of missing methods
 *    - Detailed error messages
 */
