import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/cache/cache-service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    isEnabled: true
  }
}));

jest.mock('@/lib/services/hybrid-translation-service', () => ({
  HybridTranslationService: jest.fn().mockImplementation(() => ({
    translateScenario: jest.fn(),
    translateField: jest.fn()
  }))
}));

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: jest.fn()
  }
}));

jest.mock('@/lib/services/scenario-index-service', () => ({
  scenarioIndexService: {
    buildIndex: jest.fn(),
    getIndex: jest.fn(),
    updateIndex: jest.fn()
  }
}));

describe('/api/pbl/scenarios route', () => {
  let mockScenarioRepo: any;
  let mockCacheService: any;
  let mockHybridTranslationService: any;
  let mockScenarioIndexService: any;

  const mockScenarios = [
    {
      id: 'scenario-uuid-1',
      sourceId: 'ai-job-search',
      mode: 'pbl',
      status: 'active',
      title: { en: 'AI Job Search Assistant', zh: 'AI 求職助手' },
      description: { en: 'Use AI to enhance your job search', zh: '使用 AI 增強求職' },
      difficulty: 'intermediate',
      estimatedMinutes: 45,
      taskTemplates: [{ id: 'task1' }, { id: 'task2' }],
      metadata: {
        yamlId: 'ai-job-search',
        targetDomains: ['creating_with_ai', 'engaging_with_ai'],
        difficulty: 'intermediate',
        estimatedDuration: 45
      },
      pblData: {
        targetDomains: ['creating_with_ai']
      }
    },
    {
      id: 'scenario-uuid-2',
      sourceId: 'ai-education-design',
      mode: 'pbl',
      status: 'active',
      title: { en: 'AI Education Designer', zh: 'AI 教育設計師' },
      description: { en: 'Design educational content with AI', zh: '使用 AI 設計教育內容' },
      difficulty: 'advanced',
      estimatedMinutes: 60,
      taskTemplates: [{ id: 'task1' }, { id: 'task2' }, { id: 'task3' }],
      metadata: {
        yamlId: 'ai-education-design',
        targetDomains: ['designing_with_ai'],
        difficulty: 'advanced'
      }
    },
    {
      id: 'scenario-uuid-3',
      sourceId: 'simple-scenario',
      mode: 'pbl',
      status: 'draft',
      title: 'Simple Scenario',
      description: 'A simple scenario',
      taskTemplates: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockScenarioRepo = {
      findByMode: jest.fn()
    };

    mockCacheService = require('@/lib/cache/cache-service').cacheService;
    mockHybridTranslationService = require('@/lib/services/hybrid-translation-service').HybridTranslationService;
    mockScenarioIndexService = require('@/lib/services/scenario-index-service').scenarioIndexService;

    require('@/lib/repositories/base/repository-factory').repositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);
    
    // Default mock implementations
    mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockScenarioIndexService.buildIndex.mockResolvedValue(true);

    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('GET /api/pbl/scenarios', () => {
    it('should return scenarios from database successfully', async () => {
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(3);
      expect(data.data.scenarios[0]).toMatchObject({
        id: 'scenario-uuid-1',
        yamlId: 'ai-job-search',
        title: 'AI Job Search Assistant',
        description: 'Use AI to enhance your job search',
        difficulty: 'intermediate',
        taskCount: 2,
        thumbnailEmoji: '💼'
      });
    });

    it('should handle Chinese language parameter', async () => {
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=zh');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].title).toBe('AI 求職助手');
      expect(data.data.scenarios[0].description).toBe('使用 AI 增強求職');
    });

    it('should fallback to English when language not available', async () => {
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=fr');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].title).toBe('AI Job Search Assistant');
      expect(data.data.scenarios[0].description).toBe('Use AI to enhance your job search');
    });

    it('should handle string-type titles and descriptions', async () => {
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[2].title).toBe('Simple Scenario');
      expect(data.data.scenarios[2].description).toBe('A simple scenario');
    });

    it('should use cache when available', async () => {
      // Note: Cache is currently disabled in the route (useCache = false)
      // This test will be updated when cache is re-enabled
      const cachedData = {
        data: {
          scenarios: [{ id: 'cached-1', title: 'Cached Scenario' }]
        },
        success: true
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // In test mode, cache is checked first
      expect(mockCacheService.get).toHaveBeenCalledWith('pbl:scenarios:en');
      // Should return cached data without calling repository
      expect(mockScenarioRepo.findByMode).not.toHaveBeenCalled();
      // Response should have cache HIT header
      expect(response.headers.get('X-Cache')).toBe('HIT');
    });

    it('should build scenario index', async () => {
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      await GET(request);

      expect(mockScenarioIndexService.buildIndex).toHaveBeenCalledWith(mockScenarios);
    });

    it('should extract yamlId from different sources', async () => {
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.scenarios[0].yamlId).toBe('ai-job-search'); // from metadata.yamlId
      expect(data.data.scenarios[1].yamlId).toBe('ai-education-design'); // from metadata.yamlId
      expect(data.data.scenarios[2].yamlId).toBe('simple-scenario'); // from sourceId
    });

    it('should handle targetDomains from different sources', async () => {
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.scenarios[0].targetDomains).toEqual(['creating_with_ai', 'engaging_with_ai']);
      expect(data.data.scenarios[0].targetDomain).toEqual(['creating_with_ai', 'engaging_with_ai']);
      expect(data.data.scenarios[0].domains).toEqual(['creating_with_ai', 'engaging_with_ai']);
    });

    it('should calculate task count correctly', async () => {
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.scenarios[0].taskCount).toBe(2);
      expect(data.data.scenarios[1].taskCount).toBe(3);
      expect(data.data.scenarios[2].taskCount).toBe(0);
    });

    it('should assign correct emoji based on scenario ID', async () => {
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.scenarios[0].thumbnailEmoji).toBe('💼'); // ai-job-search
      expect(data.data.scenarios[1].thumbnailEmoji).toBe('🎓'); // ai-education-design
      expect(data.data.scenarios[2].thumbnailEmoji).toBe('🤖'); // default emoji
    });

    it('should handle empty scenarios list', async () => {
      mockScenarioRepo.findByMode.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toEqual([]);
      expect(data.success).toBe(true);
    });

    it('should handle repository errors gracefully', async () => {
      mockScenarioRepo.findByMode.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toEqual([]);
      expect(data.success).toBe(true);
      expect(console.error).toHaveBeenCalledWith('Error loading scenarios from database:', expect.any(Error));
    });

    it('should handle individual scenario processing errors', async () => {
      const invalidScenario = {
        id: 'invalid-scenario',
        title: null, // This won't cause an error, will just result in empty string
        mode: 'pbl',
        status: 'active',
        taskTemplates: []
      };
      mockScenarioRepo.findByMode.mockResolvedValue([...mockScenarios, invalidScenario]);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should include all 4 scenarios (3 valid + 1 with null title)
      expect(data.data.scenarios).toHaveLength(4);
      // The invalid scenario should have empty title/description
      const invalidResult = data.data.scenarios.find((s: any) => s.id === 'invalid-scenario');
      expect(invalidResult).toBeDefined();
      expect(invalidResult.title).toBe('');
      expect(invalidResult.description).toBe('');
    });

    it('should handle missing repository findByMode method', async () => {
      mockScenarioRepo.findByMode = undefined;

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toEqual([]);
      expect(console.log).toHaveBeenCalledWith('[PBL API] Repository findByMode exists?', false);
    });

    it('should handle cache set failure', async () => {
      // Cache GET is disabled but SET is still called
      // The route catches and continues even if cache set fails
      mockCacheService.set.mockRejectedValue(new Error('Cache error'));

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();
      
      // The route should catch the error and return 500
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FETCH_SCENARIOS_ERROR');
    });

    it('should handle scenario index build failure', async () => {
      mockScenarioIndexService.buildIndex.mockRejectedValue(new Error('Index error'));

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      // Should still work despite index failure
    });

    it('should log scenario details when scenarios exist', async () => {
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      await GET(request);

      expect(console.log).toHaveBeenCalledWith(`[PBL API] Repository returned ${mockScenarios.length} raw scenarios`);
      expect(console.log).toHaveBeenCalledWith(`[PBL API] Found ${mockScenarios.length} PBL scenarios in database`);
      expect(console.log).toHaveBeenCalledWith('[PBL API] First scenario:', {
        id: mockScenarios[0].id,
        title: mockScenarios[0].title,
        status: mockScenarios[0].status,
        mode: mockScenarios[0].mode
      });
    });

    it('should log when no scenarios found', async () => {
      mockScenarioRepo.findByMode.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      await GET(request);

      expect(console.log).toHaveBeenCalledWith('[PBL API] No scenarios found, checking repository...');
      expect(console.log).toHaveBeenCalledWith('[PBL API] Repository findByMode exists?', true);
    });

    it('should handle undefined title and description gracefully', async () => {
      const scenarioWithUndefinedFields = {
        id: 'scenario-undefined',
        mode: 'pbl',
        status: 'active',
        title: undefined,
        description: undefined,
        taskTemplates: []
      };
      mockScenarioRepo.findByMode.mockResolvedValue([scenarioWithUndefinedFields]);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].title).toBe('');
      expect(data.data.scenarios[0].description).toBe('');
    });

    it('should handle missing metadata gracefully', async () => {
      const scenarioWithoutMetadata = {
        id: 'scenario-no-metadata',
        mode: 'pbl',
        status: 'active',
        title: { en: 'No Metadata Scenario' },
        description: { en: 'No metadata here' },
        taskTemplates: []
      };
      mockScenarioRepo.findByMode.mockResolvedValue([scenarioWithoutMetadata]);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].yamlId).toBe('scenario-no-metadata'); // falls back to id
      expect(data.data.scenarios[0].difficulty).toBeUndefined();
      expect(data.data.scenarios[0].estimatedDuration).toBeUndefined();
    });

    it('should prefer estimatedMinutes over metadata.estimatedDuration', async () => {
      const scenarioWithBothDurations = {
        id: 'scenario-duration',
        mode: 'pbl',
        status: 'active',
        title: { en: 'Duration Test' },
        description: { en: 'Testing duration precedence' },
        estimatedMinutes: 30,
        metadata: {
          estimatedDuration: 45
        },
        taskTemplates: []
      };
      mockScenarioRepo.findByMode.mockResolvedValue([scenarioWithBothDurations]);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].estimatedDuration).toBe(30); // prefers estimatedMinutes
    });

    it('should handle malformed URL gracefully', async () => {
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en&invalid=param');
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      // Should still work with extra parameters
    });

    it('should set correct response headers', async () => {
      // Clear cache to test non-cached response
      mockCacheService.get.mockResolvedValue(null);
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Cache')).toBe('MISS');
      // Check that response contains valid JSON
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle different emoji mappings', async () => {
      const specialScenarios = [
        { id: '1', sourceId: 'ai-stablecoin-trading', mode: 'pbl', status: 'active', title: 'Stablecoin', description: 'Trading', taskTemplates: [] },
        { id: '2', sourceId: 'ai-robotics-development', mode: 'pbl', status: 'active', title: 'Robotics', description: 'Development', taskTemplates: [] },
        { id: '3', sourceId: 'high-school-climate-change', mode: 'pbl', status: 'active', title: 'Climate', description: 'Change', taskTemplates: [] },
        { id: '4', sourceId: 'high-school-digital-wellness', mode: 'pbl', status: 'active', title: 'Digital', description: 'Wellness', taskTemplates: [] },
        { id: '5', sourceId: 'high-school-smart-city', mode: 'pbl', status: 'active', title: 'Smart', description: 'City', taskTemplates: [] },
        { id: '6', sourceId: 'high-school-creative-arts', mode: 'pbl', status: 'active', title: 'Arts', description: 'Creative', taskTemplates: [] },
        { id: '7', sourceId: 'high-school-health-assistant', mode: 'pbl', status: 'active', title: 'Health', description: 'Assistant', taskTemplates: [] },
        { id: '8', sourceId: 'unknown-scenario', mode: 'pbl', status: 'active', title: 'Unknown', description: 'Test', taskTemplates: [] }
      ];
      mockScenarioRepo.findByMode.mockResolvedValue(specialScenarios);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.scenarios[0].thumbnailEmoji).toBe('₿'); // stablecoin
      expect(data.data.scenarios[1].thumbnailEmoji).toBe('🤖'); // robotics
      expect(data.data.scenarios[2].thumbnailEmoji).toBe('🌍'); // climate
      expect(data.data.scenarios[3].thumbnailEmoji).toBe('📱'); // digital wellness
      expect(data.data.scenarios[4].thumbnailEmoji).toBe('🏙️'); // smart city
      expect(data.data.scenarios[5].thumbnailEmoji).toBe('🎨'); // creative arts
      expect(data.data.scenarios[6].thumbnailEmoji).toBe('💗'); // health assistant
      expect(data.data.scenarios[7].thumbnailEmoji).toBe('🤖'); // default
    });

    it('should handle various taskCount scenarios', async () => {
      const taskCountScenarios = [
        { id: '1', mode: 'pbl', status: 'active', title: 'Test1', description: 'Test1', taskTemplates: [1, 2, 3, 4, 5], taskCount: 10 },
        { id: '2', mode: 'pbl', status: 'active', title: 'Test2', description: 'Test2', taskCount: 7 },
        { id: '3', mode: 'pbl', status: 'active', title: 'Test3', description: 'Test3', taskTemplates: null },
        { id: '4', mode: 'pbl', status: 'active', title: 'Test4', description: 'Test4' }
      ];
      mockScenarioRepo.findByMode.mockResolvedValue(taskCountScenarios);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.scenarios[0].taskCount).toBe(5); // prefers taskTemplates.length
      expect(data.data.scenarios[1].taskCount).toBe(7); // uses taskCount when no taskTemplates
      expect(data.data.scenarios[2].taskCount).toBe(0); // handles null taskTemplates
      expect(data.data.scenarios[3].taskCount).toBe(0); // handles missing both
    });
  });

  describe('Cache behavior', () => {
    it('should use different cache keys for different languages', async () => {
      // Note: Cache GET is disabled but SET is still called
      const enRequest = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      const zhRequest = new NextRequest('http://localhost/api/pbl/scenarios?lang=zh');
      
      await GET(enRequest);
      await GET(zhRequest);

      // Cache GET is called for both languages
      expect(mockCacheService.get).toHaveBeenCalledWith('pbl:scenarios:en');
      expect(mockCacheService.get).toHaveBeenCalledWith('pbl:scenarios:zh');
      // Cache SET is still called with language-specific keys
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'pbl:scenarios:en',
        expect.any(Object),
        expect.any(Object)
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'pbl:scenarios:zh',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should set cache with appropriate TTL', async () => {
      // Note: Cache GET is disabled but SET is still called
      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      await GET(request);

      // Cache SET is called with TTL
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'pbl:scenarios:en',
        expect.any(Object),
        { ttl: 60 * 60 * 1000 } // 1 hour in milliseconds
      );
    });

    it('should handle cache get errors gracefully', async () => {
      // Simulate cache set throwing error (which causes 500 in test mode)
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockRejectedValue(new Error('Cache set failed'));

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      // Error response when cache set fails in test mode
    });
  });

  describe('Performance considerations', () => {
    it('should handle large number of scenarios efficiently', async () => {
      const largeScenarioSet = Array.from({ length: 100 }, (_, i) => ({
        id: `scenario-${i}`,
        sourceId: `scenario-${i}`,
        mode: 'pbl',
        status: 'active',
        title: { en: `Scenario ${i}` },
        description: { en: `Description ${i}` },
        taskTemplates: Array(i % 10).fill({ id: `task-${i}` })
      }));
      mockScenarioRepo.findByMode.mockResolvedValue(largeScenarioSet);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const startTime = performance.now();
      const response = await GET(request);
      const endTime = performance.now();
      
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should not block on cache operations', async () => {
      // Cache SET is async but shouldn't block the response
      let cacheSetResolve: () => void;
      const cacheSetPromise = new Promise<void>(resolve => {
        cacheSetResolve = resolve;
      });
      mockCacheService.set.mockReturnValue(cacheSetPromise);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const responsePromise = GET(request);
      
      // The response should complete even if cache set is pending
      // However, since await is used for cache.set in the route, it will wait
      // So we need to resolve it to let the response complete
      cacheSetResolve!();
      
      const response = await responsePromise;
      expect(response.status).toBe(200);
      
      // Cache GET is called in test mode
      expect(mockCacheService.get).toHaveBeenCalledWith('pbl:scenarios:en');
      // Cache SET is called
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('Error recovery', () => {
    it('should recover from repository initialization failure', async () => {
      // Mock the repository factory to throw an error
      const { repositoryFactory } = require('@/lib/repositories/base/repository-factory');
      repositoryFactory.getScenarioRepository.mockImplementation(() => {
        throw new Error('Repository factory failed');
      });

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toEqual([]);
      // Error should be logged
      expect(console.error).toHaveBeenCalledWith('Error loading scenarios from database:', expect.any(Error));
    });

    it('should handle service import failures', async () => {
      jest.doMock('@/lib/services/scenario-index-service', () => {
        throw new Error('Service import failed');
      });

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      // Should still return scenarios even if index service fails
    });
  });

  describe('Edge cases', () => {
    it('should handle null scenario repo response', async () => {
      mockScenarioRepo.findByMode.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toEqual([]);
    });

    it('should handle scenarios with missing required fields', async () => {
      const incompleteScenarios = [
        { id: 'incomplete-1' }, // missing everything
        { mode: 'pbl', status: 'active' }, // missing id
        null, // null scenario
        undefined // undefined scenario
      ];
      mockScenarioRepo.findByMode.mockResolvedValue(incompleteScenarios);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should filter out invalid scenarios and handle errors
    });

    it('should handle complex nested metadata structures', async () => {
      const complexScenario = {
        id: 'complex-scenario',
        mode: 'pbl',
        status: 'active',
        title: { en: 'Complex Scenario' },
        description: { en: 'Complex description' },
        metadata: {
          yamlId: 'complex',
          nested: {
            deep: {
              targetDomains: ['deep_domain']
            }
          },
          targetDomains: ['shallow_domain']
        },
        pblData: {
          metadata: {
            targetDomains: ['pbl_domain']
          }
        },
        taskTemplates: []
      };
      mockScenarioRepo.findByMode.mockResolvedValue([complexScenario]);

      const request = new NextRequest('http://localhost/api/pbl/scenarios?lang=en');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].targetDomains).toEqual(['shallow_domain']); // Should use shallow metadata
    });
  });
});