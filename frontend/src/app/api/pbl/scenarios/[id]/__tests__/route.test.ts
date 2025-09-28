import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db/pool', () => ({
  query: jest.fn(),
  getPool: () => ({
    query: jest.fn(),
    connect: jest.fn(),
  }),
}));

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: jest.fn()
  }
}));

jest.mock('@/lib/cache/distributed-cache-service', () => {
  const mockInstance = {
    getWithRevalidation: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
  };
  
  return {
    DistributedCacheService: jest.fn().mockImplementation(() => mockInstance),
    distributedCacheService: mockInstance
  };
});

jest.mock('@/lib/services/scenario-index-service', () => ({
  scenarioIndexService: {
    buildIndex: jest.fn(),
    getIndex: jest.fn(),
    updateIndex: jest.fn(),
    exists: jest.fn().mockResolvedValue(true),
    getUuidByYamlId: jest.fn().mockImplementation((yamlId) => {
      // Return test-id for our test scenarios
      if (yamlId === 'test-id') {
        return Promise.resolve('test-id');
      }
      return Promise.resolve(null);
    })
  }
}));

// Mock KSA loading function
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(`
domains:
  - id: creating_with_ai
    name: Creating with AI
knowledge:
  - code: K1
    description: Basic AI knowledge
skills:
  - code: S1
    description: Basic AI skills
attitudes:
  - code: A1
    description: Basic AI attitudes
`)
}));

jest.mock('yaml', () => ({
  load: jest.fn().mockReturnValue({
    domains: [{ id: 'creating_with_ai', name: 'Creating with AI' }],
    knowledge: [{ code: 'K1', description: 'Basic AI knowledge' }],
    skills: [{ code: 'S1', description: 'Basic AI skills' }],
    attitudes: [{ code: 'A1', description: 'Basic AI attitudes' }]
  }),
  parse: jest.fn().mockReturnValue({})
}));

describe('API Route: src/app/api/pbl/scenarios/[id]', () => {
  let mockScenarioRepo: any;
  let mockDistributedCache: any;

  const mockScenario = {
    id: 'test-id',
    mode: 'pbl',
    status: 'active',
    title: { en: 'Test Scenario', zh: '測試場景', zhTW: '測試場景' },
    description: { en: 'Test description', zh: '測試描述', zhTW: '測試描述' },
    objectives: { en: 'Test objectives', zh: '測試目標', zhTW: '測試目標' },
    estimatedMinutes: 60,
    difficulty: 'intermediate',
    prerequisites: ['Basic knowledge of AI'], // Legacy English array
    taskTemplates: [
      { id: 'task1', title: { en: 'Task 1' } },
      { id: 'task2', title: { en: 'Task 2' } }
    ],
    metadata: {
      targetDomains: ['creating_with_ai', 'designing_with_ai'],
      yamlId: 'test-scenario',
      multilingualPrerequisites: {
        en: [
          'Basic understanding of elements and compounds',
          'Familiarity with electricity and electrical devices',
          'Recommended: Watch this introductory video - https://youtu.be/cxf6eexA4f0'
        ],
        zhTW: [
          '對元素和化合物有基本認識',
          '熟悉電力和電子設備',
          '建議：觀看此介紹影片 - https://youtu.be/cxf6eexA4f0'
        ],
        zh: [
          '對元素和化合物有基本認識',
          '熟悉電力和電子設備',
          '建議：觀看此介紹影片 - https://youtu.be/cxf6eexA4f0'
        ]
      }
    },
    pblData: {
      aiModules: ['tutor', 'evaluator']
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup scenario repository mock
    mockScenarioRepo = {
      findById: jest.fn(),
      findByYamlId: jest.fn()
    };

    const { repositoryFactory } = require('@/lib/repositories/base/repository-factory');
    repositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);

    // Get the distributed cache mock
    mockDistributedCache = require('@/lib/cache/distributed-cache-service').distributedCacheService;

    // Default mock implementations
    mockScenarioRepo.findById.mockResolvedValue(mockScenario);
    mockScenarioRepo.findByYamlId.mockResolvedValue(mockScenario);
    
    // Mock the cache to call the handler function (second argument) to process the scenario
    mockDistributedCache.getWithRevalidation.mockImplementation(async (key: string, handler: () => Promise<any>) => {
      // Call the handler to get the processed result
      return await handler();
    });
  });
  
  describe('GET', () => {
    it('should handle successful request', async () => {
      const request = new NextRequest('http://localhost:3000/api/pbl/scenarios/test-id?lang=en', {
        method: 'GET',
      });
      
      const response = await GET(request, { params: Promise.resolve({ id: 'test-id' }) });
      const result = await response.json();
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('test-id');
      expect(result.data.title).toBe('Test Scenario');
      expect(result.data.description).toBe('Test description');
    });
    
    it('should handle Chinese language parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/pbl/scenarios/test-id?lang=zh', {
        method: 'GET',
      });
      
      const response = await GET(request, { params: Promise.resolve({ id: 'test-id' }) });
      const result = await response.json();
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.title).toBe('測試場景');
      expect(result.data.description).toBe('測試描述');
    });

    it('should return multilingual prerequisites for Traditional Chinese', async () => {
      const request = new NextRequest('http://localhost:3000/api/pbl/scenarios/test-id?lang=zhTW', {
        method: 'GET',
      });
      
      const response = await GET(request, { params: Promise.resolve({ id: 'test-id' }) });
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.prerequisites).toEqual([
        '對元素和化合物有基本認識',
        '熟悉電力和電子設備',
        '建議：觀看此介紹影片 - https://youtu.be/cxf6eexA4f0'
      ]);
    });

    it('should return multilingual prerequisites for English', async () => {
      const request = new NextRequest('http://localhost:3000/api/pbl/scenarios/test-id?lang=en', {
        method: 'GET',
      });
      
      const response = await GET(request, { params: Promise.resolve({ id: 'test-id' }) });
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.prerequisites).toEqual([
        'Basic understanding of elements and compounds',
        'Familiarity with electricity and electrical devices',
        'Recommended: Watch this introductory video - https://youtu.be/cxf6eexA4f0'
      ]);
    });

    it('should fallback to legacy prerequisites when no multilingual data exists', async () => {
      // Create a scenario without multilingual prerequisites
      const legacyScenario = {
        ...mockScenario,
        metadata: {
          ...mockScenario.metadata,
          multilingualPrerequisites: undefined
        }
      };
      
      mockScenarioRepo.findById.mockResolvedValue(legacyScenario);
      
      // Test English (should use legacy array)
      const requestEn = new NextRequest('http://localhost:3000/api/pbl/scenarios/test-id?lang=en', {
        method: 'GET',
      });
      
      const responseEn = await GET(requestEn, { params: Promise.resolve({ id: 'test-id' }) });
      const resultEn = await responseEn.json();
      
      expect(responseEn.status).toBe(200);
      expect(resultEn.data.prerequisites).toEqual(['Basic knowledge of AI']);
      
      // Test Chinese (should be empty as no multilingual data)
      const requestZh = new NextRequest('http://localhost:3000/api/pbl/scenarios/test-id?lang=zhTW', {
        method: 'GET',
      });
      
      const responseZh = await GET(requestZh, { params: Promise.resolve({ id: 'test-id' }) });
      const resultZh = await responseZh.json();
      
      expect(responseZh.status).toBe(200);
      expect(resultZh.data.prerequisites).toEqual([]);
    });
    
    it.skip('should handle scenario not found', async () => {
      // When scenario is not found, the handler should return null which causes an error
      mockScenarioRepo.findById.mockResolvedValue(null);
      mockScenarioRepo.findByYamlId.mockResolvedValue(null);
      
      // Disable SWR to force traditional caching which has proper error handling
      const originalGetWithRevalidation = mockDistributedCache.getWithRevalidation;
      
      // Mock to simulate that useDistributedCache is false, which bypasses SWR
      mockDistributedCache.getWithRevalidation.mockRejectedValue(new Error('SWR disabled for test'));
      
      // Mock the regular cache get to return null (cache miss)
      const mockCacheService = require('@/lib/cache/cache-service');
      mockCacheService.get = jest.fn().mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/pbl/scenarios/nonexistent', {
        method: 'GET',
      });
      
      // The GET should handle the error gracefully with the try-catch in cachedGET
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();
      
      expect(response).toBeDefined();
      // The cachedGET wrapper returns 500 for errors
      expect(response.status).toBe(500);
      // Should have an error property
      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe('string');
      
      // Restore the original mock
      mockDistributedCache.getWithRevalidation = originalGetWithRevalidation;
    });
  });
});