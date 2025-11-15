/**
 * Discovery My Scenarios API Tests
 * Following TDD principles from @CLAUDE.md
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock dependencies
jest.mock('@/lib/auth/unified-auth', () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() =>
    new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  )
}));
jest.mock('@/lib/repositories/base/repository-factory');

const mockGetUnifiedAuth = getUnifiedAuth as jest.MockedFunction<typeof getUnifiedAuth>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('/api/discovery/scenarios/my', () => {
  let mockProgramRepo: any;
  let mockScenarioRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock repositories
    mockProgramRepo = {
      findByUser: jest.fn(),
    };

    mockScenarioRepo = {
      findById: jest.fn(),
    };

    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
    mockRepositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUnifiedAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual({ success: false, error: 'Authentication required' });
    });

    it('should return 401 when user has no email', async () => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: 'user-123', email: '', role: 'student' }
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual({ success: false, error: 'Authentication required' });
    });

    it('should work with user id', async () => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'student' }
      });

      mockProgramRepo.findByUser.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockProgramRepo.findByUser).toHaveBeenCalledWith('user-123');
    });

    it('should work with email only', async () => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { email: 'test@example.com', id: '', role: 'student' }
      });

      mockProgramRepo.findByUser.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockProgramRepo.findByUser).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('Basic Functionality', () => {
    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'student' }
      });
    });

    it('should return empty array when user has no programs', async () => {
      mockProgramRepo.findByUser.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarios).toEqual([]);
    });

    it('should filter only discovery mode programs', async () => {
      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active'
        },
        {
          id: 'program-2',
          scenarioId: 'scenario-2',
          mode: 'pbl',
          status: 'active'
        },
        {
          id: 'program-3',
          scenarioId: 'scenario-3',
          mode: 'assessment',
          status: 'completed'
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      // Mock scenario for discovery program only
      mockScenarioRepo.findById.mockImplementation((id: string) => {
        if (id === 'scenario-1') {
          return Promise.resolve({
            id: 'scenario-1',
            title: { en: 'Discovery Scenario' },
            description: { en: 'Test Description' },
            discoveryData: { careerType: 'data_analyst' }
          });
        }
        return Promise.resolve(null);
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios).toHaveLength(1);
      expect(data.scenarios[0].scenarioId).toBe('scenario-1');
      expect(mockScenarioRepo.findById).toHaveBeenCalledTimes(1);
      expect(mockScenarioRepo.findById).toHaveBeenCalledWith('scenario-1');
    });

    it('should return detailed scenario information for single scenario', async () => {
      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active',
          completedTaskCount: 2,
          totalTaskCount: 4,
          totalScore: 75,
          xpEarned: 150,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z'
        }
      ];

      const mockScenario = {
        id: 'scenario-1',
        title: { en: 'Data Analyst Path', zh: '數據分析師路徑' },
        description: { en: 'Discover data analysis', zh: '探索數據分析' },
        discoveryData: { careerType: 'data_analyst' },
        metadata: {
          skillFocus: ['python', 'sql', 'statistics'],
          category: 'technology'
        }
      };

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios).toHaveLength(1);
      const scenario = data.scenarios[0];

      // Check basic fields
      expect(scenario.scenarioId).toBe('scenario-1');
      expect(scenario.id).toBe('data_analyst');
      expect(scenario.title).toBe('Data Analyst Path');
      expect(scenario.subtitle).toBe('Discover data analysis');
      expect(scenario.careerType).toBe('data_analyst');

      // Check status and progress
      expect(scenario.primaryStatus).toBe('in-progress');
      expect(scenario.currentProgress).toBe(50); // 2/4 = 50%
      expect(scenario.isActive).toBe(true);

      // Check statistics
      expect(scenario.stats.completedCount).toBe(0);
      expect(scenario.stats.activeCount).toBe(1);
      expect(scenario.stats.totalAttempts).toBe(1);
      expect(scenario.stats.bestScore).toBe(0);

      // Check active program details
      expect(scenario.userPrograms.active).toEqual({
        id: 'program-1',
        status: 'active',
        completedTasks: 2,
        totalTasks: 4,
        score: 75,
        xpEarned: 150
      });
      expect(scenario.userPrograms.total).toBe(1);

      // Check metadata
      expect(scenario.skills).toEqual(['python', 'sql', 'statistics']);
      expect(scenario.category).toBe('technology');
      expect(scenario.metadata).toEqual(mockScenario.metadata);
      expect(scenario.discoveryData).toEqual(mockScenario.discoveryData);
    });
  });

  describe('Multiple Programs Handling', () => {
    const mockScenario = {
      id: 'scenario-1',
      title: { en: 'Test Scenario' },
      description: { en: 'Test Description' },
      discoveryData: { careerType: 'ux_designer' },
      metadata: {}
    };

    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'student' }
      });
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
    });

    it('should handle multiple programs for same scenario', async () => {
      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'completed',
          totalScore: 85,
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'program-2',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'completed',
          totalScore: 92,
          createdAt: '2024-01-02T00:00:00Z'
        },
        {
          id: 'program-3',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active',
          completedTaskCount: 1,
          totalTaskCount: 3,
          totalScore: 30,
          createdAt: '2024-01-03T00:00:00Z'
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios).toHaveLength(1);
      const scenario = data.scenarios[0];

      // Should be mastered because has completed programs
      expect(scenario.primaryStatus).toBe('mastered');
      expect(scenario.currentProgress).toBe(100);

      // Should count all programs correctly
      expect(scenario.stats.completedCount).toBe(2);
      expect(scenario.stats.activeCount).toBe(1);
      expect(scenario.stats.totalAttempts).toBe(3);
      expect(scenario.stats.bestScore).toBe(92); // Best among completed

      // Should show the active program
      expect(scenario.userPrograms.active).toEqual({
        id: 'program-3',
        status: 'active',
        completedTasks: 1,
        totalTasks: 3,
        score: 30,
        xpEarned: 0
      });
    });

    it('should use first active program when multiple active', async () => {
      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active',
          completedTaskCount: 2,
          totalTaskCount: 4
        },
        {
          id: 'program-2',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active',
          completedTaskCount: 1,
          totalTaskCount: 3
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      const scenario = data.scenarios[0];
      expect(scenario.userPrograms.active.id).toBe('program-1'); // First active
      expect(scenario.stats.activeCount).toBe(2);
    });
  });

  describe('Progress Calculation', () => {
    const mockScenario = {
      id: 'scenario-1',
      title: { en: 'Test Scenario' },
      description: { en: 'Test Description' },
      discoveryData: { careerType: 'product_manager' },
      metadata: {}
    };

    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'student' }
      });
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
    });

    it('should calculate progress correctly for active program', async () => {
      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active',
          completedTaskCount: 3,
          totalTaskCount: 5
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      const scenario = data.scenarios[0];
      expect(scenario.primaryStatus).toBe('in-progress');
      expect(scenario.currentProgress).toBe(60); // 3/5 = 60%
    });

    it('should handle missing task count data', async () => {
      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active',
          completedTaskCount: undefined,
          totalTaskCount: null
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      const scenario = data.scenarios[0];
      expect(scenario.primaryStatus).toBe('in-progress');
      expect(scenario.currentProgress).toBe(0); // 0/1 = 0% (fallback)
    });

    it('should handle completed programs correctly', async () => {
      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'completed',
          totalScore: 88
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      const scenario = data.scenarios[0];
      expect(scenario.primaryStatus).toBe('mastered');
      expect(scenario.currentProgress).toBe(100);
      expect(scenario.stats.bestScore).toBe(88);
      expect(scenario.userPrograms.active).toBe(null);
    });
  });

  describe('Sorting and Activity Tracking', () => {
    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'student' }
      });
    });

    it('should sort scenarios by last activity (most recent first)', async () => {
      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active',
          updatedAt: '2024-01-01T12:00:00Z'
        },
        {
          id: 'program-2',
          scenarioId: 'scenario-2',
          mode: 'discovery',
          status: 'completed',
          updatedAt: '2024-01-03T12:00:00Z'
        },
        {
          id: 'program-3',
          scenarioId: 'scenario-3',
          mode: 'discovery',
          status: 'active',
          updatedAt: '2024-01-02T12:00:00Z'
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      // Mock scenarios
      mockScenarioRepo.findById.mockImplementation((id: string) => {
        return Promise.resolve({
          id,
          title: { en: `Scenario ${id}` },
          description: { en: `Description ${id}` },
          discoveryData: { careerType: `career_${id}` },
          metadata: {}
        });
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios).toHaveLength(3);

      // Should be sorted by updatedAt (most recent first)
      expect(data.scenarios[0].scenarioId).toBe('scenario-2'); // 2024-01-03
      expect(data.scenarios[1].scenarioId).toBe('scenario-3'); // 2024-01-02
      expect(data.scenarios[2].scenarioId).toBe('scenario-1'); // 2024-01-01
    });

    it('should use lastActivityAt if available', async () => {
      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active',
          lastActivityAt: '2024-01-05T12:00:00Z',
          updatedAt: '2024-01-01T12:00:00Z'
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);
      mockScenarioRepo.findById.mockResolvedValue({
        id: 'scenario-1',
        title: { en: 'Test Scenario' },
        description: { en: 'Test Description' },
        discoveryData: { careerType: 'test_career' },
        metadata: {}
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios[0].lastActivity).toBe('2024-01-05T12:00:00Z');
    });

    it('should fallback to createdAt if no other timestamp', async () => {
      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active',
          createdAt: '2024-01-01T12:00:00Z'
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);
      mockScenarioRepo.findById.mockResolvedValue({
        id: 'scenario-1',
        title: { en: 'Test Scenario' },
        description: { en: 'Test Description' },
        discoveryData: { careerType: 'test_career' },
        metadata: {}
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios[0].lastActivity).toBe('2024-01-01T12:00:00Z');
    });
  });

  describe('Localization', () => {
    const mockScenario = {
      id: 'scenario-1',
      title: { en: 'English Title', zh: '中文標題', zhTW: '繁體中文標題' },
      description: { en: 'English Description', zh: '中文描述', zhTW: '繁體中文描述' },
      discoveryData: { careerType: 'test_career' },
      metadata: {}
    };

    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'student' }
      });

      mockProgramRepo.findByUser.mockResolvedValue([
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active'
        }
      ]);

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
    });

    it('should return English content by default', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios[0].title).toBe('English Title');
      expect(data.scenarios[0].subtitle).toBe('English Description');
    });

    it('should return localized content based on lang parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my?lang=zhTW');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios[0].title).toBe('繁體中文標題');
      expect(data.scenarios[0].subtitle).toBe('繁體中文描述');
    });

    it('should handle zh-TW language mapping', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my?lang=zh-TW');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios[0].title).toBe('繁體中文標題');
      expect(data.scenarios[0].subtitle).toBe('繁體中文描述');
    });

    it('should fallback to English for unavailable language', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my?lang=fr');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios[0].title).toBe('English Title');
      expect(data.scenarios[0].subtitle).toBe('English Description');
    });

    it('should handle string fields gracefully', async () => {
      const stringScenario = {
        id: 'scenario-1',
        title: 'Simple String Title',
        description: 'Simple String Description',
        discoveryData: { careerType: 'test_career' },
        metadata: {}
      };

      mockScenarioRepo.findById.mockResolvedValue(stringScenario);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios[0].title).toBe('Simple String Title');
      expect(data.scenarios[0].subtitle).toBe('Simple String Description');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'student' }
      });
    });

    it('should handle program repository errors', async () => {
      mockProgramRepo.findByUser.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch scenarios');
    });

    it('should handle scenario repository errors', async () => {
      mockProgramRepo.findByUser.mockResolvedValue([
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active'
        }
      ]);

      mockScenarioRepo.findById.mockRejectedValue(new Error('Scenario query failed'));

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch scenarios');
    });

    it('should handle session service errors', async () => {
      mockGetUnifiedAuth.mockRejectedValue(new Error('Session service error'));

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch scenarios');
    });

    it('should handle missing scenarios gracefully', async () => {
      mockProgramRepo.findByUser.mockResolvedValue([
        {
          id: 'program-1',
          scenarioId: 'scenario-missing',
          mode: 'discovery',
          status: 'active'
        }
      ]);

      mockScenarioRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.scenarios).toHaveLength(0); // Should filter out missing scenarios
    });
  });

  describe('Career Type Mapping', () => {
    beforeEach(() => {
      mockGetUnifiedAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'student' }
      });

      mockProgramRepo.findByUser.mockResolvedValue([
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active'
        }
      ]);
    });

    it('should extract careerType from discoveryData', async () => {
      const mockScenario = {
        id: 'scenario-1',
        title: { en: 'Test Scenario' },
        description: { en: 'Test Description' },
        discoveryData: { careerType: 'data_scientist' },
        metadata: {}
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios[0].careerType).toBe('data_scientist');
      expect(data.scenarios[0].id).toBe('data_scientist');
    });

    it('should fallback to metadata careerType', async () => {
      const mockScenario = {
        id: 'scenario-1',
        title: { en: 'Test Scenario' },
        description: { en: 'Test Description' },
        discoveryData: {},
        metadata: { careerType: 'software_engineer' }
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios[0].careerType).toBe('software_engineer');
      expect(data.scenarios[0].id).toBe('software_engineer');
    });

    it('should use "unknown" for missing careerType', async () => {
      const mockScenario = {
        id: 'scenario-1',
        title: { en: 'Test Scenario' },
        description: { en: 'Test Description' },
        discoveryData: {},
        metadata: {}
      };

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/my');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.scenarios[0].careerType).toBe('unknown');
      expect(data.scenarios[0].id).toBe('unknown');
    });
  });
});
