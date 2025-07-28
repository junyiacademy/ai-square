/**
 * Discovery Scenarios API Route Tests
 * 測試 Discovery 場景列表 API
 */

import { NextRequest } from 'next/server';
import { GET, clearCache } from '../route';
import { createMockNextRequest } from '@/test-utils/mock-next-request';
import type { IScenario } from '@/types/unified-learning';

// Mock repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: jest.fn()
  }
}));

// Get the mocked repository factory after mocking
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('GET /api/discovery/scenarios', () => {
  let mockScenarioRepo: any;

  const mockScenarios: IScenario[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      mode: 'discovery',
      status: 'active',
      version: '1.0',
      sourceType: 'yaml',
      sourcePath: 'discovery/software-developer.yaml',
      sourceId: 'software-developer',
      sourceMetadata: {},
      title: { 
        en: 'Software Developer',
        zh: '軟體開發工程師'
      },
      description: { 
        en: 'Build amazing software applications',
        zh: '建構優秀的軟體應用'
      },
      objectives: ['Learn programming', 'Build projects'],
      difficulty: 'intermediate',
      estimatedMinutes: 180,
      prerequisites: [],
      taskTemplates: [
        { id: 'task-1', title: 'Introduction', type: 'exploration' },
        { id: 'task-2', title: 'Build First App', type: 'project' }
      ],
      taskCount: 2,
      xpRewards: { completion: 1000 },
      unlockRequirements: {},
      pblData: {},
      discoveryData: {
        careerPath: 'software-developer',
        requiredSkills: ['JavaScript', 'Python', 'Git', 'Problem Solving'],
        industryInsights: {
          growth: 'High',
          demand: 'Very High'
        },
        careerLevel: 'intermediate',
        estimatedSalaryRange: { min: 60000, max: 120000, currency: 'USD' },
        relatedCareers: ['full-stack-developer', 'frontend-developer'],
        dayInLife: { 
          en: 'A typical day involves coding, debugging, and collaborating with team members',
          zh: '典型的一天包括編程、調試和與團隊成員協作'
        },
        challenges: { 
          en: ['Keeping up with new technologies', 'Debugging complex issues'],
          zh: ['跟上新技術', '調試複雜問題']
        },
        rewards: { 
          en: ['Creative problem solving', 'Good salary', 'Remote work opportunities'],
          zh: ['創意解決問題', '良好薪資', '遠程工作機會']
        }
      },
      assessmentData: {},
      aiModules: {},
      resources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {}
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      mode: 'discovery',
      status: 'active',
      version: '1.0',
      sourceType: 'yaml',
      sourcePath: 'discovery/data-scientist.yaml',
      sourceId: 'data-scientist',
      sourceMetadata: {},
      title: { 
        en: 'Data Scientist',
        zh: '數據科學家'
      },
      description: { 
        en: 'Extract insights from data',
        zh: '從數據中提取洞察'
      },
      objectives: ['Analyze data', 'Build ML models'],
      difficulty: 'advanced',
      estimatedMinutes: 240,
      prerequisites: ['Statistics', 'Programming'],
      taskTemplates: [],
      taskCount: 0,
      xpRewards: { completion: 1500 },
      unlockRequirements: {},
      pblData: {},
      discoveryData: {
        careerPath: 'data-scientist',
        requiredSkills: ['Python', 'Statistics', 'Machine Learning', 'SQL'],
        industryInsights: {},
        careerLevel: 'senior',
        estimatedSalaryRange: { min: 80000, max: 150000, currency: 'USD' },
        relatedCareers: ['ml-engineer', 'data-analyst'],
        dayInLife: { en: 'Analyzing datasets and building predictive models' },
        challenges: { en: ['Complex data problems', 'Communicating insights'] },
        rewards: { en: ['High impact work', 'Excellent compensation'] }
      },
      assessmentData: {},
      aiModules: {},
      resources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {}
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    clearCache(); // Clear the route cache

    // Mock repository
    mockScenarioRepo = {
      findByMode: jest.fn()
    };

    // Setup mocks
    mockRepositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);
  });

  afterEach(() => {
    // Clear cache by resetting module
    jest.resetModules();
  });

  describe('Success Cases', () => {
    it('should return all active discovery scenarios', async () => {
      // Arrange
      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(2);
      expect(data.data.scenarios[0].title).toBe('Software Developer');
      expect(data.data.total).toBe(2);
      expect(data.meta.source).toBe('unified');
    });

    it('should process language parameter correctly', async () => {
      // Arrange
      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios?lang=zh');

      // Act
      const response = await GET(request);
      const data = await response.json();


      // Assert
      expect(response.status).toBe(200);
      // The route correctly processes multilingual fields from scenarios
      expect(data.data.scenarios[0].title).toBe('軟體開發工程師');
      expect(data.data.scenarios[0].description).toBe('建構優秀的軟體應用');
      expect(data.meta.language).toBe('zh');
    });

    it('should fallback to English when translation not available', async () => {
      // Arrange
      const scenarioWithMissingTranslation = {
        ...mockScenarios[0],
        title: { en: 'English Only' }, // No zh translation
        description: { en: 'English Description' }
      };
      mockScenarioRepo.findByMode.mockResolvedValue([scenarioWithMissingTranslation]);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios?lang=zh');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].title).toBe('English Only');
      expect(data.data.scenarios[0].description).toBe('English Description');
    });

    it('should preserve original multilingual objects in response', async () => {
      // Arrange
      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].titleObj).toEqual({
        en: 'Software Developer',
        zh: '軟體開發工程師'
      });
      expect(data.data.scenarios[0].descObj).toEqual({
        en: 'Build amazing software applications',
        zh: '建構優秀的軟體應用'
      });
    });

    it('should use cache on subsequent requests', async () => {
      // Arrange
      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);

      const request1 = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/discovery/scenarios'
      });

      const request2 = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/discovery/scenarios'
      });

      // Act
      const response1 = await GET(request1);
      const response2 = await GET(request2);

      // Assert
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledTimes(1); // Called only once due to cache
    });
  });

  describe('Error Cases', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockScenarioRepo.findByMode.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle empty results', async () => {
      // Arrange
      mockScenarioRepo.findByMode.mockResolvedValue([]);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(0);
      expect(data.data.total).toBe(0);
    });

    it('should handle null repository response', async () => {
      // Arrange
      mockScenarioRepo.findByMode.mockResolvedValue(null);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.scenarios).toHaveLength(0);
    });

    it('should handle malformed title/description objects', async () => {
      // Arrange
      const malformedScenario = {
        ...mockScenarios[0],
        title: 'Plain string title', // Not an object
        description: null // Null description
      };
      mockScenarioRepo.findByMode.mockResolvedValue([malformedScenario]);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].title).toBe('Untitled');
      expect(data.data.scenarios[0].description).toBe('No description');
    });
  });

  describe('Response Format', () => {
    it('should include proper metadata', async () => {
      // Arrange
      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.meta).toBeDefined();
      expect(data.meta.timestamp).toBeDefined();
      expect(data.meta.version).toBe('1.0.0');
      expect(data.meta.language).toBe('en');
      expect(data.meta.source).toBe('unified');
    });

    it('should maintain consistent response structure', async () => {
      // Arrange
      mockScenarioRepo.findByMode.mockResolvedValue(mockScenarios);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('meta');
      expect(data.data).toHaveProperty('scenarios');
      expect(data.data).toHaveProperty('total');
      expect(data.data).toHaveProperty('available');
    });
  });
});