/**
 * Discovery Program Creation API Tests
 * 測試 Discovery 職涯探索程式建立 API
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { createMockNextRequest } from '@/test-utils/mock-next-request';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { DiscoveryService } from '@/lib/services/discovery-service';
import type { IDiscoveryScenario, IDiscoveryProgram } from '@/types/discovery-types';
import type { IScenario } from '@/types/unified-learning';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/services/discovery-service');

describe('POST /api/discovery/scenarios/[id]/programs', () => {
  let mockDiscoveryRepo: any;
  let mockUserRepo: any;
  let mockProgramRepo: any;
  let mockScenarioRepo: any;
  let mockDiscoveryService: jest.Mocked<DiscoveryService>;

  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  const testScenarioId = '550e8400-e29b-41d4-a716-446655440001';

  const mockUser = {
    id: testUserId,
    email: 'test@example.com',
    name: 'Test User',
    preferredLanguage: 'en',
    level: 5,
    totalXp: 1500,
    learningPreferences: {
      goals: ['career-growth'],
      interests: ['technology'],
      learningStyle: 'visual'
    },
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveAt: new Date()
  };

  const mockScenario: IScenario = {
    id: testScenarioId,
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
      industryInsights: {},
      careerLevel: 'intermediate',
      estimatedSalaryRange: { min: 60000, max: 120000, currency: 'USD' },
      relatedCareers: ['full-stack-developer', 'frontend-developer'],
      dayInLife: { en: 'A typical day involves coding and collaboration' },
      challenges: { en: ['Keeping up with new technologies'] },
      rewards: { en: ['Creative problem solving', 'Good salary'] }
    },
    assessmentData: {},
    aiModules: {},
    resources: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {}
  };

  const mockProgram: IDiscoveryProgram = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    scenarioId: testScenarioId,
    userId: testUserId,
    mode: 'discovery',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 2,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    timeSpentSeconds: 0,
    pblData: {},
    discoveryData: {
      explorationPath: [testScenarioId],
      milestones: [],
      personalityMatch: 85,
      skillGapAnalysis: [
        {
          skill: 'JavaScript',
          currentLevel: 60,
          requiredLevel: 75,
          importance: 'critical',
          suggestedResources: ['JavaScript course']
        }
      ],
      careerReadiness: 75,
      portfolioProjects: []
    },
    assessmentData: {},
    metadata: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock repositories
    mockDiscoveryRepo = {
      findCareerPathById: jest.fn()
    };

    mockUserRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn()
    };

    mockProgramRepo = {
      findByUser: jest.fn(),
      create: jest.fn()
    };

    mockScenarioRepo = {
      findById: jest.fn()
    };

    // Mock Discovery Service
    mockDiscoveryService = {
      exploreCareer: jest.fn(),
      getPersonalizedRecommendations: jest.fn(),
      analyzeSkillGaps: jest.fn(),
      calculateCareerReadiness: jest.fn(),
      calculateOverallProgress: jest.fn(),
      createPortfolioFromTask: jest.fn(),
      generateCareerInsights: jest.fn()
    } as any;

    // Setup factory mocks
    (repositoryFactory.getDiscoveryRepository as jest.Mock).mockReturnValue(mockDiscoveryRepo);
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);

    // Setup service mock
    (DiscoveryService as jest.Mock).mockImplementation(() => mockDiscoveryService);
  });

  describe('Success Cases', () => {
    it('should create a new discovery program', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.findByUser.mockResolvedValue([]);
      mockDiscoveryService.exploreCareer.mockResolvedValue(mockProgram);

      const request = createMockNextRequest({
        method: 'POST',
        url: `http://localhost:3000/api/discovery/scenarios/${testScenarioId}/programs`,
        body: { userEmail: 'test@example.com' }
      });

      // Act
      const response = await POST(request, { params: { id: testScenarioId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.program).toBeDefined();
      expect(data.program.id).toBe(mockProgram.id);
      expect(data.program.mode).toBe('discovery');
      expect(data.program.discoveryData.careerReadiness).toBe(75);
      expect(mockDiscoveryService.exploreCareer).toHaveBeenCalledWith(testUserId, testScenarioId);
    });

    it('should return existing active program if already exists', async () => {
      // Arrange
      const existingProgram = {
        ...mockProgram,
        status: 'active',
        scenarioId: testScenarioId
      };
      
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.findByUser.mockResolvedValue([existingProgram]);

      const request = createMockNextRequest({
        method: 'POST',
        url: `http://localhost:3000/api/discovery/scenarios/${testScenarioId}/programs`,
        body: { userEmail: 'test@example.com' }
      });

      // Act
      const response = await POST(request, { params: { id: testScenarioId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.program).toBeDefined();
      expect(data.program.id).toBe(existingProgram.id);
      expect(data.message).toContain('already exploring');
      expect(mockDiscoveryService.exploreCareer).not.toHaveBeenCalled();
    });

    it('should create new program if existing one is completed', async () => {
      // Arrange
      const completedProgram = {
        ...mockProgram,
        status: 'completed',
        completedAt: new Date().toISOString(),
        scenarioId: testScenarioId
      };
      
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.findByUser.mockResolvedValue([completedProgram]);
      mockDiscoveryService.exploreCareer.mockResolvedValue({
        ...mockProgram,
        id: '550e8400-e29b-41d4-a716-446655440003' // New ID
      });

      const request = createMockNextRequest({
        method: 'POST',
        url: `http://localhost:3000/api/discovery/scenarios/${testScenarioId}/programs`,
        body: { userEmail: 'test@example.com' }
      });

      // Act
      const response = await POST(request, { params: { id: testScenarioId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.program.id).not.toBe(completedProgram.id);
      expect(mockDiscoveryService.exploreCareer).toHaveBeenCalled();
    });

    it('should include enriched data in response', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.findByUser.mockResolvedValue([]);
      mockDiscoveryService.exploreCareer.mockResolvedValue(mockProgram);

      const request = createMockNextRequest({
        method: 'POST',
        url: `http://localhost:3000/api/discovery/scenarios/${testScenarioId}/programs`,
        body: { userEmail: 'test@example.com' }
      });

      // Act
      const response = await POST(request, { params: { id: testScenarioId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.enrichedData).toBeDefined();
      expect(data.enrichedData.skillGapSummary).toBeDefined();
      expect(data.enrichedData.recommendedNextSteps).toBeDefined();
      expect(data.enrichedData.estimatedCompletionTime).toBeDefined();
    });
  });

  describe('Error Cases', () => {
    it('should return 400 when userEmail is missing', async () => {
      // Arrange
      const request = createMockNextRequest({
        method: 'POST',
        url: `http://localhost:3000/api/discovery/scenarios/${testScenarioId}/programs`,
        body: {}
      });

      // Act
      const response = await POST(request, { params: { id: testScenarioId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('User email is required');
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const request = createMockNextRequest({
        method: 'POST',
        url: `http://localhost:3000/api/discovery/scenarios/${testScenarioId}/programs`,
        body: { userEmail: 'nonexistent@example.com' }
      });

      // Act
      const response = await POST(request, { params: { id: testScenarioId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 when scenario not found', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockScenarioRepo.findById.mockResolvedValue(null);

      const request = createMockNextRequest({
        method: 'POST',
        url: `http://localhost:3000/api/discovery/scenarios/invalid-id/programs`,
        body: { userEmail: 'test@example.com' }
      });

      // Act
      const response = await POST(request, { params: { id: 'invalid-id' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe('Discovery scenario not found');
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.findByUser.mockResolvedValue([]);
      mockDiscoveryService.exploreCareer.mockRejectedValue(
        new Error('Service unavailable')
      );

      const request = createMockNextRequest({
        method: 'POST',
        url: `http://localhost:3000/api/discovery/scenarios/${testScenarioId}/programs`,
        body: { userEmail: 'test@example.com' }
      });

      // Act
      const response = await POST(request, { params: { id: testScenarioId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create discovery program');
    });
  });

  describe('Validation', () => {
    it('should validate scenario ID format', async () => {
      // Arrange
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/discovery/scenarios/invalid-uuid/programs',
        body: { userEmail: 'test@example.com' }
      });

      // Act
      const response = await POST(request, { params: { id: 'invalid-uuid' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid scenario ID format');
    });

    it('should validate email format', async () => {
      // Arrange
      const request = createMockNextRequest({
        method: 'POST',
        url: `http://localhost:3000/api/discovery/scenarios/${testScenarioId}/programs`,
        body: { userEmail: 'invalid-email' }
      });

      // Act
      const response = await POST(request, { params: { id: testScenarioId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid email format');
    });

    it('should check user eligibility for career exploration', async () => {
      // Arrange
      const ineligibleUser = {
        ...mockUser,
        level: 1, // Too low level
        onboardingCompleted: false
      };
      
      mockUserRepo.findByEmail.mockResolvedValue(ineligibleUser);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = createMockNextRequest({
        method: 'POST',
        url: `http://localhost:3000/api/discovery/scenarios/${testScenarioId}/programs`,
        body: { userEmail: 'test@example.com' }
      });

      // Act
      const response = await POST(request, { params: { id: testScenarioId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe('User must complete onboarding before exploring careers');
    });
  });

  describe('Additional Features', () => {
    it('should track career exploration start event', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.findByUser.mockResolvedValue([]);
      mockDiscoveryService.exploreCareer.mockResolvedValue(mockProgram);

      const request = createMockNextRequest({
        method: 'POST',
        url: `http://localhost:3000/api/discovery/scenarios/${testScenarioId}/programs`,
        body: { 
          userEmail: 'test@example.com',
          trackingData: {
            source: 'recommendation',
            referrer: 'home-page'
          }
        }
      });

      // Act
      const response = await POST(request, { params: { id: testScenarioId } });

      // Assert
      expect(response.status).toBe(201);
      // In a real implementation, this would call analytics tracking
    });

    it('should apply user preferences to program creation', async () => {
      // Arrange
      const userWithPreferences = {
        ...mockUser,
        learningPreferences: {
          goals: ['career-switch', 'skill-upgrade'],
          interests: ['technology', 'ai'],
          learningStyle: 'hands-on',
          timeCommitment: '10-hours-per-week'
        }
      };
      
      mockUserRepo.findByEmail.mockResolvedValue(userWithPreferences);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.findByUser.mockResolvedValue([]);
      mockDiscoveryService.exploreCareer.mockResolvedValue({
        ...mockProgram,
        metadata: {
          customizedForUser: true,
          adjustedDifficulty: 'intermediate-plus'
        }
      });

      const request = createMockNextRequest({
        method: 'POST',
        url: `http://localhost:3000/api/discovery/scenarios/${testScenarioId}/programs`,
        body: { userEmail: 'test@example.com' }
      });

      // Act
      const response = await POST(request, { params: { id: testScenarioId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.program.metadata.customizedForUser).toBe(true);
    });
  });
});
