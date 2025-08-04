/**
 * Discovery Scenarios API Route Tests
 * 測試探索情境 API
 */

import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';
import { createMockScenarioRepository, createMockProgramRepository, createMockScenario, createMockProgram } from '@/test-utils/mocks/repository-helpers';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn(),
}));

// Mock console
const mockConsoleError = createMockConsoleError();

describe('/api/discovery/scenarios', () => {
  // Mock repositories
  let mockScenarioRepo: ReturnType<typeof createMockScenarioRepository>;
  let mockProgramRepo: ReturnType<typeof createMockProgramRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); // Clear module cache to reset the cachedScenarios Map
    
    // Create fresh mocks for each test
    mockScenarioRepo = createMockScenarioRepository();
    mockProgramRepo = createMockProgramRepository();
    
    // Setup repository factory mocks
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET - Discovery Scenarios', () => {
    let GET: typeof import('../route').GET;
    
    beforeEach(async () => {
      // Re-import GET after module reset to get fresh cache
      const module = await import('../route');
      GET = module.GET;
    });
    
    const mockScenarios = [
      {
        id: 'scenario-1',
        mode: 'discovery',
        title: { en: 'Career Explorer', zh: '職業探索' },
        description: { en: 'Explore AI careers', zh: '探索 AI 職業' },
        discoveryData: { careerType: 'tech' },
        difficulty: 'beginner',
        estimatedMinutes: 30,
      },
      {
        id: 'scenario-2',
        mode: 'discovery',
        title: { en: 'Data Scientist Path', zh: '數據科學家之路' },
        description: { en: 'Learn about data science', zh: '了解數據科學' },
        discoveryData: { careerType: 'data' },
        difficulty: 'intermediate',
        estimatedMinutes: 45,
      },
    ];

    it('should return discovery scenarios with default language', async () => {
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(mockScenarios);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(2);
      expect(data.data.scenarios[0]).toMatchObject({
        id: 'scenario-1',
        title: 'Career Explorer', // English by default
        description: 'Explore AI careers',
        titleObj: { en: 'Career Explorer', zh: '職業探索' },
        descObj: { en: 'Explore AI careers', zh: '探索 AI 職業' },
        discovery_data: { careerType: 'tech' },
        primaryStatus: 'new',
        currentProgress: 0,
      });
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledWith('discovery');
    });

    it('should return scenarios with specified language', async () => {
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(mockScenarios);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios?lang=zh');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // The API returns both the extracted title and the original titleObj
      expect(data.data.scenarios[0].title).toBe('職業探索'); // Chinese title
      expect(data.data.scenarios[0].titleObj).toEqual({ en: 'Career Explorer', zh: '職業探索' });
      expect(data.data.scenarios[0].description).toBe('探索 AI 職業');
      expect(data.meta.language).toBe('zh');
    });

    it('should include user progress when authenticated', async () => {
      const { getServerSession } = await import('@/lib/auth/session');
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(mockScenarios);
      mockProgramRepo.findByUser?.mockResolvedValue([
        createMockProgram({
          id: 'prog-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'completed',
          totalScore: 95,
          completedTaskCount: 5,
          totalTaskCount: 5,
        }),
        createMockProgram({
          id: 'prog-2',
          scenarioId: 'scenario-2',
          mode: 'discovery',
          status: 'active',
          totalScore: 0,
          completedTaskCount: 2,
          totalTaskCount: 4,
        }),
      ]);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Check first scenario (completed)
      expect(data.data.scenarios[0]).toMatchObject({
        id: 'scenario-1',
        primaryStatus: 'mastered',
        currentProgress: 100,
        stats: {
          completedCount: 1,
          activeCount: 0,
          totalAttempts: 1,
          bestScore: 95,
        },
        completedCount: 1,
        progress: 100,
        isActive: false,
      });

      // Check second scenario (in progress)
      expect(data.data.scenarios[1]).toMatchObject({
        id: 'scenario-2',
        primaryStatus: 'in-progress',
        currentProgress: 50, // 2/4 * 100
        stats: {
          completedCount: 0,
          activeCount: 1,
          totalAttempts: 1,
          bestScore: 0,
        },
        isActive: true,
      });

      expect(mockProgramRepo.findByUser).toHaveBeenCalledWith('user-123');
    });

    it('should handle empty scenarios', async () => {
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toEqual([]);
      expect(data.data.total).toBe(0);
    });

    it('should handle missing findByMode method', async () => {
      // Create a mock without findByMode
      const incompleteRepo = {
        findById: jest.fn(),
        findAll: jest.fn(),  
        findBySourcePath: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      };
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(incompleteRepo);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toEqual([]);
    });

    it('should fallback to English when language not available', async () => {
      const scenarioWithLimitedLanguages = [{
        id: 'scenario-3',
        mode: 'discovery',
        title: { en: 'English Only' }, // No Chinese
        description: { en: 'English description' },
      }];

      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(scenarioWithLimitedLanguages);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios?lang=zh');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].title).toBe('English Only'); // Falls back to English
      expect(data.data.scenarios[0].description).toBe('English description');
    });

    it('should handle malformed title/description objects', async () => {
      const malformedScenarios = [{
        id: 'scenario-4',
        mode: 'discovery' as const,
        title: 'String title instead of object' as unknown as Record<string, string>,
        description: null as unknown as Record<string, string>,
      }];

      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(malformedScenarios);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].title).toBe('Untitled');
      expect(data.data.scenarios[0].description).toBe('No description');
    });

    it('should handle multiple programs for same scenario', async () => {
      const { getServerSession } = await import('@/lib/auth/session');
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'user@example.com' },
      });

      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([mockScenarios[0]]);
      mockProgramRepo.findByUser?.mockResolvedValue([
        createMockProgram({
          id: 'prog-1',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'completed',
          totalScore: 85,
        }),
        createMockProgram({
          id: 'prog-2',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'completed',
          totalScore: 95, // Better score
        }),
        createMockProgram({
          id: 'prog-3',
          scenarioId: 'scenario-1',
          mode: 'discovery',
          status: 'active',
          completedTaskCount: 1,
          totalTaskCount: 5,
        }),
      ]);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].stats).toMatchObject({
        completedCount: 2,
        activeCount: 1,
        totalAttempts: 3,
        bestScore: 95, // Best of the two completed
      });
    });

    it('should cache responses for non-authenticated users', async () => {
      const { getServerSession } = await import('@/lib/auth/session');
      (getServerSession as jest.Mock).mockResolvedValue(null);

      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(mockScenarios);

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response1 = await GET(request1);
      expect(response1.status).toBe(200);
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledTimes(1);

      // Second request (should use cache)
      const request2 = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response2 = await GET(request2);
      const data2 = await response2.json();
      
      expect(response2.status).toBe(200);
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledTimes(1); // Not called again
      expect(data2.data.scenarios).toHaveLength(2);
    });

    it('should not cache responses for authenticated users', async () => {
      const { getServerSession } = await import('@/lib/auth/session');
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123' },
      });

      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(mockScenarios);
      mockProgramRepo.findByUser?.mockResolvedValue([]);

      // First request
      await GET(new NextRequest('http://localhost:3000/api/discovery/scenarios'));
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledTimes(1);

      // Second request (should not use cache)
      await GET(new NextRequest('http://localhost:3000/api/discovery/scenarios'));
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledTimes(2);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      (mockScenarioRepo.findByMode as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/discovery/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error in GET /api/discovery/scenarios:',
        error
      );
    });
  });
});

/**
 * Discovery Scenarios API Considerations:
 * 
 * 1. Multilingual Support:
 *    - Supports language parameter
 *    - Falls back to English
 *    - Preserves original language objects
 * 
 * 2. User Progress:
 *    - Tracks completed/active programs
 *    - Calculates best scores
 *    - Shows completion status
 * 
 * 3. Caching:
 *    - 5-minute cache for non-authenticated users
 *    - No cache for authenticated users
 *    - Language-specific caching
 * 
 * 4. Data Structure:
 *    - Unified learning architecture
 *    - Discovery-specific data preserved
 *    - Legacy field compatibility
 * 
 * 5. Performance:
 *    - Efficient program grouping
 *    - Single database query
 *    - Memory caching for repeated requests
 */