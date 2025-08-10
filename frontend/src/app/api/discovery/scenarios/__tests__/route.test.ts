/**
 * Discovery Scenarios List API Tests
 * Following TDD principles from @CLAUDE.md
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

// typing for test-only global helper exposed by the module under test
declare global {
  // eslint-disable-next-line no-var
  var __clearDiscoveryScenariosCache: (() => void) | undefined;
}

describe('/api/discovery/scenarios', () => {
  let mockScenarioRepo: any;
  let mockProgramRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear cache before each test
    if (global.__clearDiscoveryScenariosCache) {
      (global.__clearDiscoveryScenariosCache as () => void)();
    }

    // Setup mock repositories
    mockScenarioRepo = {
      findByMode: jest.fn(),
    };

    mockProgramRepo = {
      findByUser: jest.fn(),
    };

    mockRepositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
  });

  describe('Basic Functionality', () => {
    it('should return scenarios list for anonymous users', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const mockScenarios = [
        {
          id: 'scenario-1',
          mode: 'discovery',
          title: { en: 'Data Analyst Path', zh: '數據分析師路徑' },
          description: { en: 'Discover data analysis', zh: '探索數據分析' },
          discoveryData: { careerType: 'data_analyst' }
        },
        {
          id: 'scenario-2',
          mode: 'discovery',
          title: { en: 'UX Designer Path', zh: 'UX設計師路徑' },
          description: { en: 'Discover UX design', zh: '探索UX設計' },
          discoveryData: { careerType: 'ux_designer' }
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(2);
      expect(data.data.total).toBe(2);
      expect(data.data.available).toBe(2);
      expect(data.meta.language).toBe('en');
      expect(data.meta.source).toBe('unified');
      expect(data.meta.version).toBe('1.0.0');
      expect(data.meta.timestamp).toBeDefined();

      // Check scenario structure
      const scenario1 = data.data.scenarios[0];
      expect(scenario1.title).toBe('Data Analyst Path');
      expect(scenario1.description).toBe('Discover data analysis');
      expect(scenario1.titleObj).toEqual({ en: 'Data Analyst Path', zh: '數據分析師路徑' });
      expect(scenario1.primaryStatus).toBe('new');
      expect(scenario1.currentProgress).toBe(0);
      expect(scenario1.stats.completedCount).toBe(0);
      expect(scenario1.discovery_data).toEqual({ careerType: 'data_analyst' });
    });

    it('should handle empty scenarios array', async () => {
      mockGetServerSession.mockResolvedValue(null);
      mockScenarioRepo.findByMode.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(0);
      expect(data.data.total).toBe(0);
      expect(data.data.available).toBe(0);
    });

    it('should handle null scenarios response', async () => {
      mockGetServerSession.mockResolvedValue(null);
      mockScenarioRepo.findByMode.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(0);
      expect(data.data.total).toBe(0);
      expect(data.data.available).toBe(0);
    });
  });

  describe('Language Support', () => {
    const mockScenarios = [
      {
        id: 'scenario-1',
        mode: 'discovery',
        title: { en: 'English Title', zh: '中文標題', es: 'Título Español' },
        description: { en: 'English Description', zh: '中文描述', es: 'Descripción Española' },
        discoveryData: {}
      }
    ];

    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(null);
      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
    });

    it('should return English content by default', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.meta.language).toBe('en');
      expect(data.data.scenarios[0].title).toBe('English Title');
      expect(data.data.scenarios[0].description).toBe('English Description');
    });

    it('should return Chinese content when lang=zh', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios?lang=zh');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.meta.language).toBe('zh');
      expect(data.data.scenarios[0].title).toBe('中文標題');
      expect(data.data.scenarios[0].description).toBe('中文描述');
    });

    it('should return Spanish content when lang=es', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios?lang=es');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.meta.language).toBe('es');
      expect(data.data.scenarios[0].title).toBe('Título Español');
      expect(data.data.scenarios[0].description).toBe('Descripción Española');
    });

    it('should fallback to English for unavailable language', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios?lang=fr');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.meta.language).toBe('fr');
      expect(data.data.scenarios[0].title).toBe('English Title');
      expect(data.data.scenarios[0].description).toBe('English Description');
    });

    it('should handle missing title and description gracefully', async () => {
      const incompleteScenarios = [
        {
          id: 'scenario-1',
          mode: 'discovery',
          title: null,
          description: null,
          discoveryData: {}
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(incompleteScenarios);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.scenarios[0].title).toBe('Untitled');
      expect(data.data.scenarios[0].description).toBe('No description');
    });
  });

  describe('User Progress Integration', () => {
    const mockScenarios = [
      {
        id: 'scenario-1',
        mode: 'discovery',
        title: { en: 'Test Scenario 1' },
        description: { en: 'Test Description 1' },
        discoveryData: {}
      },
      {
        id: 'scenario-2',
        mode: 'discovery',
        title: { en: 'Test Scenario 2' },
        description: { en: 'Test Description 2' },
        discoveryData: {}
      }
    ];

    beforeEach(() => {
      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
    });

    it('should include user progress for authenticated users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });

      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'completed',
          totalScore: 85,
          completedTaskCount: 5,
          totalTaskCount: 5
        },
        {
          id: 'program-2',
          scenarioId: 'scenario-2',
          mode: 'discovery',
          status: 'active',
          totalScore: 0,
          completedTaskCount: 2,
          totalTaskCount: 4
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Check completed scenario
      const scenario1 = data.data.scenarios.find((s: any) => s.id === 'scenario-1');
      expect(scenario1.primaryStatus).toBe('mastered');
      expect(scenario1.currentProgress).toBe(100);
      expect(scenario1.stats.completedCount).toBe(1);
      expect(scenario1.stats.bestScore).toBe(85);

      // Check in-progress scenario
      const scenario2 = data.data.scenarios.find((s: any) => s.id === 'scenario-2');
      expect(scenario2.primaryStatus).toBe('in-progress');
      expect(scenario2.currentProgress).toBe(50); // 2/4 = 50%
      expect(scenario2.stats.activeCount).toBe(1);
      expect(scenario2.isActive).toBe(true);

      expect(mockProgramRepo.findByUser).toHaveBeenCalledWith('user-123');
    });

    it('should handle user without programs', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-456', email: 'newuser@example.com' }
      });

      mockProgramRepo.findByUser.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // All scenarios should be 'new' status
      data.data.scenarios.forEach((scenario: any) => {
        expect(scenario.primaryStatus).toBe('new');
        expect(scenario.currentProgress).toBe(0);
        expect(scenario.stats.completedCount).toBe(0);
        expect(scenario.stats.activeCount).toBe(0);
      });
    });

    it('should handle multiple programs for same scenario', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-789', email: 'poweruser@example.com' }
      });

      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'completed',
          totalScore: 75
        },
        {
          id: 'program-2',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'completed',
          totalScore: 90
        },
        {
          id: 'program-3',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active',
          completedTaskCount: 1,
          totalTaskCount: 3
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const scenario1 = data.data.scenarios.find((s: any) => s.id === 'scenario-1');
      expect(scenario1.primaryStatus).toBe('mastered');
      expect(scenario1.stats.completedCount).toBe(2);
      expect(scenario1.stats.activeCount).toBe(1);
      expect(scenario1.stats.totalAttempts).toBe(3);
      expect(scenario1.stats.bestScore).toBe(90); // Best score among completed
    });

    it('should filter only discovery mode programs', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-mixed', email: 'mixed@example.com' }
      });

      const mockPrograms = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'completed',
          totalScore: 85
        },
        {
          id: 'program-2',
          scenarioId: 'scenario-1',
          mode: 'pbl',
          status: 'completed',
          totalScore: 95
        },
        {
          id: 'program-3',
          scenarioId: 'scenario-1',
          mode: 'assessment',
          status: 'completed',
          totalScore: 88
        }
      ];

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const scenario1 = data.data.scenarios.find((s: any) => s.id === 'scenario-1');
      expect(scenario1.stats.completedCount).toBe(1); // Only discovery program
      expect(scenario1.stats.bestScore).toBe(85); // Only discovery score
      expect(scenario1.stats.totalAttempts).toBe(1); // Only discovery attempt
    });
  });

  describe('Cache System', () => {
    const mockScenarios = [
      {
        id: 'scenario-1',
        mode: 'discovery',
        title: { en: 'Cached Scenario' },
        description: { en: 'Cached Description' },
        discoveryData: {}
      }
    ];

    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(null);
      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
    });

    it('should cache responses for anonymous users', async () => {
      // First request
      const request1 = new NextRequest('http://localhost:3000/api/discovery/scenarios?lang=en');
      const response1 = await GET(request1);
      expect(response1.status).toBe(200);
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledTimes(1);

      // Second request should use cache
      const request2 = new NextRequest('http://localhost:3000/api/discovery/scenarios?lang=en');
      const response2 = await GET(request2);
      expect(response2.status).toBe(200);
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledTimes(1); // Still 1, used cache

      const data1 = await response1.json();
      const data2 = await response2.json();
      expect(data1).toEqual(data2);
    });

    it('should use separate cache for different languages', async () => {
      // English request
      const requestEn = new NextRequest('http://localhost:3000/api/discovery/scenarios?lang=en');
      await GET(requestEn);
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledTimes(1);

      // Chinese request (different cache)
      const requestZh = new NextRequest('http://localhost:3000/api/discovery/scenarios?lang=zh');
      await GET(requestZh);
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledTimes(2);

      // Second English request (should use cache)
      const requestEn2 = new NextRequest('http://localhost:3000/api/discovery/scenarios?lang=en');
      await GET(requestEn2);
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledTimes(2); // Still 2
    });

    it('should not cache responses for authenticated users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });
      mockProgramRepo.findByUser.mockResolvedValue([]);

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/discovery/scenarios?lang=en');
      await GET(request1);
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledTimes(1);

      // Second request should not use cache
      const request2 = new NextRequest('http://localhost:3000/api/discovery/scenarios?lang=en');
      await GET(request2);
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledTimes(2); // Called again
    });
  });

  describe('Error Handling', () => {
    it('should handle scenario repository errors', async () => {
      mockGetServerSession.mockResolvedValue(null);
      mockScenarioRepo.findByMode.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle program repository errors for authenticated users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });

      mockScenarioRepo.findByMode.mockResolvedValue([
        {
          id: 'scenario-1',
          mode: 'discovery',
          title: { en: 'Test Scenario' },
          description: { en: 'Test Description' },
          discoveryData: {}
        }
      ]);

      mockProgramRepo.findByUser.mockRejectedValue(new Error('Program query failed'));

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle session service errors', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Session service error'));

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle missing repository methods gracefully', async () => {
      mockGetServerSession.mockResolvedValue(null);
      
      // Mock scenario repo without findByMode method
      const mockScenarioRepoWithoutMethod = {} as unknown as import('@/lib/repositories/interfaces').IScenarioRepository;
      mockRepositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepoWithoutMethod);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Should handle gracefully and return empty array
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle scenarios with malformed data', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const malformedScenarios = [
        {
          id: 'scenario-1',
          mode: 'discovery',
          title: 'string instead of object',
          description: undefined,
          discoveryData: null
        },
        {
          id: 'scenario-2',
          mode: 'discovery',
          title: { en: 'Valid Title' },
          description: { en: 'Valid Description' },
          discoveryData: 'string instead of object'
        }
      ];

      mockScenarioRepo.findByMode.mockResolvedValue(malformedScenarios);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(2);
      
      // Check graceful handling of malformed data
      const scenario1 = data.data.scenarios[0];
      expect(scenario1.title).toBe('Untitled'); // Fallback for non-object title
      expect(scenario1.description).toBe('No description'); // Fallback for undefined
    });

    it('should handle user session with email but no id', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' }
      } as unknown as { user: { id: string; email: string } });

      mockScenarioRepo.findByMode.mockResolvedValue([
        {
          id: 'scenario-1',
          mode: 'discovery',
          title: { en: 'Test Scenario' },
          description: { en: 'Test Description' },
          discoveryData: {}
        }
      ]);

      mockProgramRepo.findByUser.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(mockProgramRepo.findByUser).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle programs with missing task count data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' }
      } as unknown as { user: { id: string; email: string } });

      mockScenarioRepo.findByMode.mockResolvedValue([
        {
          id: 'scenario-1',
          mode: 'discovery',
          title: { en: 'Test Scenario' },
          description: { en: 'Test Description' },
          discoveryData: {}
        }
      ]);

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

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const scenario1 = data.data.scenarios.find((s: any) => s.id === 'scenario-1');
      expect(scenario1.primaryStatus).toBe('in-progress');
      expect(scenario1.currentProgress).toBe(0); // 0/1 = 0% (fallback)
    });
  });
}); 