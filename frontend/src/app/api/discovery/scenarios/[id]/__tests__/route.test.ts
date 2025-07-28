/**
 * Discovery Scenario Detail API Route Tests
 * 測試單一 Discovery 場景詳細資訊 API
 */

import { GET } from '../route';
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

describe('GET /api/discovery/scenarios/[id]', () => {
  let mockScenarioRepo: any;

  const mockScenario: IScenario = {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock repository
    mockScenarioRepo = {
      findById: jest.fn()
    };

    // Setup mocks
    mockRepositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);
  });

  describe('Success Cases', () => {
    it('should return scenario details by ID', async () => {
      // Arrange
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/550e8400-e29b-41d4-a716-446655440001');

      // Act
      const response = await GET(request, { params: { id: '550e8400-e29b-41d4-a716-446655440001' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenario.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(data.data.scenario.title).toBe('Software Developer');
      expect(data.data.scenario.mode).toBe('discovery');
    });

    it('should process language parameter correctly', async () => {
      // Arrange
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/550e8400-e29b-41d4-a716-446655440001?lang=zh');

      // Act
      const response = await GET(request, { params: { id: '550e8400-e29b-41d4-a716-446655440001' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.scenario.title).toBe('軟體開發工程師');
      expect(data.data.scenario.description).toBe('建構優秀的軟體應用');
      expect(data.meta.language).toBe('zh');
    });

    it('should include discovery-specific data', async () => {
      // Arrange
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/550e8400-e29b-41d4-a716-446655440001');

      // Act
      const response = await GET(request, { params: { id: '550e8400-e29b-41d4-a716-446655440001' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.scenario.discoveryData).toBeDefined();
      expect(data.data.scenario.discoveryData.careerPath).toBe('software-developer');
      expect(data.data.scenario.discoveryData.requiredSkills).toHaveLength(4);
      expect(data.data.scenario.discoveryData.careerLevel).toBe('intermediate');
    });

    it('should process multilingual discovery data', async () => {
      // Arrange
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/550e8400-e29b-41d4-a716-446655440001?lang=zh');

      // Act
      const response = await GET(request, { params: { id: '550e8400-e29b-41d4-a716-446655440001' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.scenario.discoveryData.dayInLife).toBe('典型的一天包括編程、調試和與團隊成員協作');
      expect(data.data.scenario.discoveryData.challenges).toEqual(['跟上新技術', '調試複雜問題']);
      expect(data.data.scenario.discoveryData.rewards).toEqual(['創意解決問題', '良好薪資', '遠程工作機會']);
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent scenario', async () => {
      // Arrange
      mockScenarioRepo.findById.mockResolvedValue(null);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/non-existent-id');

      // Act
      const response = await GET(request, { params: { id: 'non-existent-id' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Scenario not found');
    });

    it('should return 404 for non-discovery scenario', async () => {
      // Arrange
      const pblScenario = {
        ...mockScenario,
        mode: 'pbl'
      };
      mockScenarioRepo.findById.mockResolvedValue(pblScenario);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/550e8400-e29b-41d4-a716-446655440001');

      // Act
      const response = await GET(request, { params: { id: '550e8400-e29b-41d4-a716-446655440001' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe('Scenario not found');
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockScenarioRepo.findById.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/550e8400-e29b-41d4-a716-446655440001');

      // Act
      const response = await GET(request, { params: { id: '550e8400-e29b-41d4-a716-446655440001' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Response Format', () => {
    it('should include proper metadata', async () => {
      // Arrange
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/550e8400-e29b-41d4-a716-446655440001');

      // Act
      const response = await GET(request, { params: { id: '550e8400-e29b-41d4-a716-446655440001' } });
      const data = await response.json();

      // Assert
      expect(data.meta).toBeDefined();
      expect(data.meta.timestamp).toBeDefined();
      expect(data.meta.version).toBe('1.0.0');
      expect(data.meta.language).toBe('en');
    });

    it('should preserve original multilingual objects', async () => {
      // Arrange
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/550e8400-e29b-41d4-a716-446655440001');

      // Act
      const response = await GET(request, { params: { id: '550e8400-e29b-41d4-a716-446655440001' } });
      const data = await response.json();

      // Assert
      expect(data.data.scenario.titleObj).toEqual({
        en: 'Software Developer',
        zh: '軟體開發工程師'
      });
      expect(data.data.scenario.descObj).toEqual({
        en: 'Build amazing software applications',
        zh: '建構優秀的軟體應用'
      });
    });

    it('should handle missing translations gracefully', async () => {
      // Arrange
      const scenarioWithMissingTranslation = {
        ...mockScenario,
        discoveryData: {
          ...mockScenario.discoveryData,
          dayInLife: { en: 'English only' }, // No zh
          challenges: { en: ['English challenge'] }, // No zh
          rewards: null // Null value
        }
      };
      mockScenarioRepo.findById.mockResolvedValue(scenarioWithMissingTranslation);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/scenarios/550e8400-e29b-41d4-a716-446655440001?lang=zh');

      // Act
      const response = await GET(request, { params: { id: '550e8400-e29b-41d4-a716-446655440001' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // Should fallback to English
      expect(data.data.scenario.discoveryData.dayInLife).toBe('English only');
      expect(data.data.scenario.discoveryData.challenges).toEqual(['English challenge']);
      expect(data.data.scenario.discoveryData.rewards).toEqual([]);
    });
  });
});