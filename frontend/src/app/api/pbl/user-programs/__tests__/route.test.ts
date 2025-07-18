import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { 
  getProgramRepository,
  getTaskRepository,
  getScenarioRepository
} from '@/lib/implementations/gcs-v2';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/implementations/gcs-v2');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockGetProgramRepository = getProgramRepository as jest.MockedFunction<typeof getProgramRepository>;
const mockGetTaskRepository = getTaskRepository as jest.MockedFunction<typeof getTaskRepository>;
const mockGetScenarioRepository = getScenarioRepository as jest.MockedFunction<typeof getScenarioRepository>;

describe('PBL User Programs API Route', () => {
  const mockUser = { email: 'test@example.com', name: 'Test User' };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/pbl/user-programs', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/pbl/user-programs');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return programs with task counts', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: mockUser });
      
      const mockPrograms = [
        {
          id: 'prog-1',
          scenarioId: 'scenario-1',
          userId: mockUser.email,
          status: 'active',
          startedAt: new Date('2025-01-01'),
          completedAt: null,
          metadata: {}
        },
        {
          id: 'prog-2',
          scenarioId: 'scenario-2',
          userId: mockUser.email,
          status: 'completed',
          startedAt: new Date('2025-01-02'),
          completedAt: new Date('2025-01-03'),
          metadata: {}
        }
      ];

      const mockTasks = {
        'prog-1': [
          { id: 'task-1', status: 'completed' },
          { id: 'task-2', status: 'active' },
          { id: 'task-3', status: 'pending' }
        ],
        'prog-2': [
          { id: 'task-4', status: 'completed' },
          { id: 'task-5', status: 'completed' }
        ]
      };

      const mockScenarios = {
        'scenario-1': {
          id: 'scenario-1',
          title: 'AI App Developer',
          description: 'Build AI applications',
          difficulty: 'intermediate',
          estimatedHours: 20
        },
        'scenario-2': {
          id: 'scenario-2',
          title: 'Data Analyst',
          description: 'Analyze data patterns',
          difficulty: 'beginner',
          estimatedHours: 15
        }
      };

      const mockProgramRepo = {
        findByUser: jest.fn().mockResolvedValue(mockPrograms)
      };
      
      const mockTaskRepo = {
        findByProgram: jest.fn((programId) => Promise.resolve(mockTasks[programId] || []))
      };

      const mockScenarioRepo = {
        findById: jest.fn((id) => Promise.resolve(mockScenarios[id]))
      };

      mockGetProgramRepository.mockReturnValue(mockProgramRepo as any);
      mockGetTaskRepository.mockReturnValue(mockTaskRepo as any);
      mockGetScenarioRepository.mockReturnValue(mockScenarioRepo as any);

      const request = new NextRequest('http://localhost:3000/api/pbl/user-programs');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.programs).toHaveLength(2);
      
      // Check first program
      expect(data.programs[0]).toMatchObject({
        id: 'prog-1',
        status: 'active',
        totalTasks: 3,
        completedTasks: 1,
        progress: 33.33,
        scenario: {
          title: 'AI App Developer',
          difficulty: 'intermediate'
        }
      });

      // Check second program  
      expect(data.programs[1]).toMatchObject({
        id: 'prog-2',
        status: 'completed',
        totalTasks: 2,
        completedTasks: 2,
        progress: 100,
        scenario: {
          title: 'Data Analyst',
          difficulty: 'beginner'
        }
      });
    });

    it('should filter by status correctly', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: mockUser });
      
      const mockPrograms = [
        {
          id: 'prog-1',
          scenarioId: 'scenario-1',
          userId: mockUser.email,
          status: 'active',
          metadata: {}
        },
        {
          id: 'prog-2',
          scenarioId: 'scenario-1',
          userId: mockUser.email,
          status: 'completed',
          metadata: {}
        },
        {
          id: 'prog-3',
          scenarioId: 'scenario-1',
          userId: mockUser.email,
          status: 'active',
          metadata: {}
        }
      ];

      const mockProgramRepo = {
        findByUser: jest.fn().mockResolvedValue(mockPrograms)
      };
      
      const mockTaskRepo = {
        findByProgram: jest.fn().mockResolvedValue([])
      };

      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'scenario-1',
          title: 'Test Scenario'
        })
      };

      mockGetProgramRepository.mockReturnValue(mockProgramRepo as any);
      mockGetTaskRepository.mockReturnValue(mockTaskRepo as any);
      mockGetScenarioRepository.mockReturnValue(mockScenarioRepo as any);

      // Test active filter
      const request1 = new NextRequest('http://localhost:3000/api/pbl/user-programs?status=active');
      const response1 = await GET(request1);
      const data1 = await response1.json();
      
      expect(data1.programs).toHaveLength(2);
      expect(data1.programs.every(p => p.status === 'active')).toBe(true);

      // Test completed filter
      const request2 = new NextRequest('http://localhost:3000/api/pbl/user-programs?status=completed');
      const response2 = await GET(request2);
      const data2 = await response2.json();
      
      expect(data2.programs).toHaveLength(1);
      expect(data2.programs[0].status).toBe('completed');
    });

    it('should filter by scenario ID correctly', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: mockUser });
      
      const mockPrograms = [
        {
          id: 'prog-1',
          scenarioId: 'scenario-1',
          userId: mockUser.email,
          status: 'active',
          metadata: {}
        },
        {
          id: 'prog-2',
          scenarioId: 'scenario-2',
          userId: mockUser.email,
          status: 'active',
          metadata: {}
        },
        {
          id: 'prog-3',
          scenarioId: 'scenario-1',
          userId: mockUser.email,
          status: 'completed',
          metadata: {}
        }
      ];

      const mockProgramRepo = {
        findByUser: jest.fn().mockResolvedValue(mockPrograms)
      };
      
      const mockTaskRepo = {
        findByProgram: jest.fn().mockResolvedValue([])
      };

      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'scenario-1',
          title: 'Test Scenario'
        })
      };

      mockGetProgramRepository.mockReturnValue(mockProgramRepo as any);
      mockGetTaskRepository.mockReturnValue(mockTaskRepo as any);
      mockGetScenarioRepository.mockReturnValue(mockScenarioRepo as any);

      const request = new NextRequest('http://localhost:3000/api/pbl/user-programs?scenarioId=scenario-1');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.programs).toHaveLength(2);
      expect(data.programs.every(p => p.scenarioId === 'scenario-1')).toBe(true);
    });

    it('should handle programs with no tasks', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: mockUser });
      
      const mockPrograms = [{
        id: 'prog-1',
        scenarioId: 'scenario-1',
        userId: mockUser.email,
        status: 'active',
        metadata: {}
      }];

      const mockProgramRepo = {
        findByUser: jest.fn().mockResolvedValue(mockPrograms)
      };
      
      const mockTaskRepo = {
        findByProgram: jest.fn().mockResolvedValue([])
      };

      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'scenario-1',
          title: 'Test Scenario'
        })
      };

      mockGetProgramRepository.mockReturnValue(mockProgramRepo as any);
      mockGetTaskRepository.mockReturnValue(mockTaskRepo as any);
      mockGetScenarioRepository.mockReturnValue(mockScenarioRepo as any);

      const request = new NextRequest('http://localhost:3000/api/pbl/user-programs');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.programs[0]).toMatchObject({
        totalTasks: 0,
        completedTasks: 0,
        progress: 0
      });
    });

    it('should handle errors gracefully', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: mockUser });
      
      const mockProgramRepo = {
        findByUser: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      
      mockGetProgramRepository.mockReturnValue(mockProgramRepo as any);

      const request = new NextRequest('http://localhost:3000/api/pbl/user-programs');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch user programs');
    });

    it('should include correct pagination metadata', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: mockUser });
      
      // Create 25 programs
      const mockPrograms = Array.from({ length: 25 }, (_, i) => ({
        id: `prog-${i}`,
        scenarioId: 'scenario-1',
        userId: mockUser.email,
        status: 'active',
        metadata: {}
      }));

      const mockProgramRepo = {
        findByUser: jest.fn().mockResolvedValue(mockPrograms)
      };
      
      const mockTaskRepo = {
        findByProgram: jest.fn().mockResolvedValue([])
      };

      const mockScenarioRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'scenario-1',
          title: 'Test Scenario'
        })
      };

      mockGetProgramRepository.mockReturnValue(mockProgramRepo as any);
      mockGetTaskRepository.mockReturnValue(mockTaskRepo as any);
      mockGetScenarioRepository.mockReturnValue(mockScenarioRepo as any);

      const request = new NextRequest('http://localhost:3000/api/pbl/user-programs?limit=10');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.programs).toHaveLength(10);
      expect(data.total).toBe(25);
      expect(data.page).toBe(1);
      expect(data.totalPages).toBe(3);
      expect(data.hasNext).toBe(true);
      expect(data.hasPrev).toBe(false);
    });
  });
});