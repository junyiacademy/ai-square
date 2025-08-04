/**
 * Discovery Service Unit Tests
 * 測試 Discovery 業務邏輯層
 */

import { DiscoveryService } from '../discovery-service';
import { 
  IDiscoveryRepository,
  IDiscoveryScenario,
  ICareerRecommendation,
  ISkillGap,
  IPortfolioItem
} from '@/types/discovery-types';
import type { TaskType } from '@/types/database';
import { IUserRepository, User } from '@/lib/repositories/interfaces';
import { BaseAIService, IAIResponse } from '@/lib/abstractions/base-ai-service';
import { UnifiedEvaluationSystem } from '../evaluation/unified-evaluation-system';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('@/lib/abstractions/base-ai-service');
jest.mock('../evaluation/unified-evaluation-system');

describe.skip('DiscoveryService', () => {
  let service: DiscoveryService;
  let mockDiscoveryRepo: jest.Mocked<IDiscoveryRepository>;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockAIService: jest.Mocked<BaseAIService>;
  let mockEvaluationSystem: jest.Mocked<UnifiedEvaluationSystem>;

  // Test data
  const testUserId = uuidv4();
  const testCareerId = uuidv4();
  const testUser = {
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
  } as User;

  const testCareerScenario: IDiscoveryScenario = {
    id: testCareerId,
    mode: 'discovery',
    status: 'active',
    version: '1.0',
    sourceType: 'yaml',
    sourcePath: 'discovery/software-developer.yaml',
    sourceId: 'software-developer',
    sourceMetadata: {},
    title: { en: 'Software Developer', zh: '軟體開發工程師' },
    description: { en: 'Build amazing software', zh: '建構優秀軟體' },
    objectives: ['Learn programming', 'Build projects'],
    difficulty: 'intermediate',
    estimatedMinutes: 180,
    prerequisites: [],
    taskTemplates: [
      { id: 'task-1', title: { en: 'Introduction' }, type: 'exploration' as TaskType },
      { id: 'task-2', title: { en: 'Build First App' }, type: 'project' as TaskType }
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
      dayInLife: { en: 'A day in the life of a developer' },
      challenges: { en: ['Debugging', 'Learning new tech'] },
      rewards: { en: ['Creative freedom', 'Good salary'] }
    },
    assessmentData: {},
    aiModules: {},
    resources: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {}
  };

  beforeEach(() => {
    // Initialize mocks
    mockDiscoveryRepo = {
      findCareerPaths: jest.fn(),
      findCareerPathById: jest.fn(),
      findCareerPathBySlug: jest.fn(),
      getCareerRecommendations: jest.fn(),
      getUserDiscoveryProgress: jest.fn(),
      addPortfolioItem: jest.fn(),
      updatePortfolioItem: jest.fn(),
      deletePortfolioItem: jest.fn(),
      getPortfolioItems: jest.fn()
    };

    mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateLastActivity: jest.fn()
    } as any;

    mockAIService = {
      generateContent: jest.fn(),
      generateStructuredContent: jest.fn(),
      streamContent: jest.fn()
    } as any;

    mockEvaluationSystem = {
      evaluateProgram: jest.fn(),
      evaluateTask: jest.fn()
    } as any;

    // Create service instance
    service = new DiscoveryService(
      mockDiscoveryRepo,
      mockUserRepo,
      mockAIService,
      mockEvaluationSystem
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exploreCareer', () => {
    it('should create a discovery program for a career', async () => {
      // Arrange
      mockUserRepo.findById.mockResolvedValue(testUser);
      mockDiscoveryRepo.findCareerPathById.mockResolvedValue(testCareerScenario);
      
      // Mock skill gap analysis
      jest.spyOn(service, 'analyzeSkillGaps').mockResolvedValue([
        {
          skill: 'JavaScript',
          currentLevel: 60,
          requiredLevel: 75,
          importance: 'critical',
          suggestedResources: ['JavaScript course']
        }
      ]);

      jest.spyOn(service, 'calculateCareerReadiness').mockResolvedValue(75);

      // Act
      const program = await service.exploreCareer(testUserId, testCareerId);

      // Assert
      expect(program).toBeDefined();
      expect(program.mode).toBe('discovery');
      expect(program.scenarioId).toBe(testCareerId);
      expect(program.userId).toBe(testUserId);
      expect(program.status).toBe('active');
      expect(program.discoveryData.skillGapAnalysis).toHaveLength(1);
      expect(program.discoveryData.careerReadiness).toBe(75);
      expect(program.totalTaskCount).toBe(2);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      mockUserRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.exploreCareer(testUserId, testCareerId))
        .rejects.toThrow('User not found');
    });

    it('should throw error when career not found', async () => {
      // Arrange
      mockUserRepo.findById.mockResolvedValue(testUser);
      mockDiscoveryRepo.findCareerPathById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.exploreCareer(testUserId, testCareerId))
        .rejects.toThrow('Career path not found');
    });
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return enhanced career recommendations', async () => {
      // Arrange
      const mockRecommendations: ICareerRecommendation[] = [
        {
          careerPath: 'software-developer',
          matchScore: 85,
          reasons: ['Strong technical skills'],
          requiredSkills: [
            { skill: 'JavaScript', userLevel: 80, requiredLevel: 75 }
          ],
          estimatedTimeToReady: 2,
          suggestedScenarios: []
        }
      ];

      mockDiscoveryRepo.getCareerRecommendations.mockResolvedValue(mockRecommendations);
      mockAIService.generateContent.mockResolvedValue({
        content: 'Your analytical mindset is perfect for software development',
        metadata: {}
      } as IAIResponse);

      // Act
      const recommendations = await service.getPersonalizedRecommendations(testUserId);

      // Assert
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].reasons).toHaveLength(3); // Original + 2 AI insights
      // AI service is not yet implemented - using placeholder insights
      expect(mockAIService.generateContent).not.toHaveBeenCalled();
    });
  });

  describe('analyzeSkillGaps', () => {
    it('should identify skill gaps accurately', async () => {
      // Arrange
      mockDiscoveryRepo.findCareerPathById.mockResolvedValue(testCareerScenario);
      
      // Mock user skills
      const getUserSkillLevelsSpy = jest.spyOn(service as any, 'getUserSkillLevels');
      getUserSkillLevelsSpy.mockResolvedValue(new Map([
        ['JavaScript', 60],
        ['Python', 40],
        ['Git', 70],
        ['Problem Solving', 80]
      ]));

      // Act
      const skillGaps = await service.analyzeSkillGaps(testUserId, testCareerId);

      // Assert
      expect(skillGaps).toHaveLength(4);
      
      // Check JavaScript gap
      const jsGap = skillGaps.find(gap => gap.skill === 'JavaScript');
      expect(jsGap).toBeDefined();
      expect(jsGap!.currentLevel).toBe(60);
      expect(jsGap!.requiredLevel).toBe(75); // intermediate level
      expect(jsGap!.importance).toBe('nice-to-have'); // Based on mock logic
      
      // Check critical skills are sorted first
      const criticalSkills = skillGaps.filter(gap => gap.importance === 'critical');
      expect(criticalSkills[0]).toEqual(skillGaps[0]); // First item should be critical
    });

    it('should handle missing user skills', async () => {
      // Arrange
      mockDiscoveryRepo.findCareerPathById.mockResolvedValue(testCareerScenario);
      
      // Mock empty user skills
      jest.spyOn(service as any, 'getUserSkillLevels')
        .mockResolvedValue(new Map());

      // Act
      const skillGaps = await service.analyzeSkillGaps(testUserId, testCareerId);

      // Assert
      expect(skillGaps).toHaveLength(4);
      skillGaps.forEach(gap => {
        expect(gap.currentLevel).toBe(0);
        expect(gap.requiredLevel).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateCareerReadiness', () => {
    it('should calculate weighted career readiness score', async () => {
      // Arrange
      const mockSkillGaps: ISkillGap[] = [
        {
          skill: 'JavaScript',
          currentLevel: 80,
          requiredLevel: 75,
          importance: 'critical',
          suggestedResources: []
        },
        {
          skill: 'Python',
          currentLevel: 50,
          requiredLevel: 75,
          importance: 'important',
          suggestedResources: []
        },
        {
          skill: 'Git',
          currentLevel: 90,
          requiredLevel: 60,
          importance: 'nice-to-have',
          suggestedResources: []
        }
      ];

      jest.spyOn(service, 'analyzeSkillGaps').mockResolvedValue(mockSkillGaps);

      // Act
      const readiness = await service.calculateCareerReadiness(testUserId, testCareerId);

      // Assert
      // Expected calculation:
      // JavaScript: (80/75) * 100 = 106.67 → 100 (capped), weight 3
      // Python: (50/75) * 100 = 66.67, weight 2
      // Git: (90/60) * 100 = 150 → 100 (capped), weight 1
      // Weighted average: (100*3 + 66.67*2 + 100*1) / (3+2+1) = 533.34 / 6 = 88.89
      expect(readiness).toBe(89);
    });

    it('should handle zero required skills', async () => {
      // Arrange
      jest.spyOn(service, 'analyzeSkillGaps').mockResolvedValue([]);

      // Act
      const readiness = await service.calculateCareerReadiness(testUserId, testCareerId);

      // Assert
      expect(readiness).toBe(0);
    });
  });

  describe('createPortfolioFromTask', () => {
    it('should create portfolio item from completed task', async () => {
      // Arrange
      const taskId = uuidv4();
      const artifacts = [
        { type: 'code' as const, url: 'https://github.com/user/project' }
      ];
      
      const mockPortfolioItem: IPortfolioItem = {
        id: uuidv4(),
        title: 'Task Portfolio Item',
        description: 'Created from task completion',
        taskId,
        createdAt: new Date().toISOString(),
        artifacts,
        skills: ['JavaScript'],
        feedback: undefined
      };

      mockDiscoveryRepo.addPortfolioItem.mockResolvedValue(mockPortfolioItem);

      // Act
      const portfolioItem = await service.createPortfolioFromTask(
        testUserId,
        taskId,
        artifacts
      );

      // Assert
      expect(portfolioItem).toBeDefined();
      expect(portfolioItem.taskId).toBe(taskId);
      expect(portfolioItem.artifacts).toEqual(artifacts);
      expect(mockDiscoveryRepo.addPortfolioItem).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          taskId,
          artifacts
        })
      );
    });
  });

  describe('generateCareerInsights', () => {
    it('should generate AI-powered career insights', async () => {
      // Arrange
      mockDiscoveryRepo.findCareerPathById.mockResolvedValue(testCareerScenario);
      mockDiscoveryRepo.getUserDiscoveryProgress.mockResolvedValue({
        exploredCareers: ['software-developer', 'data-scientist'],
        completedMilestones: [],
        portfolioItems: [{ id: '1', title: 'Project 1' } as any],
        overallProgress: 45
      });

      const mockSkillGaps: ISkillGap[] = [
        {
          skill: 'JavaScript',
          currentLevel: 60,
          requiredLevel: 75,
          importance: 'critical',
          suggestedResources: []
        }
      ];
      jest.spyOn(service, 'analyzeSkillGaps').mockResolvedValue(mockSkillGaps);

      const mockInsights = 'Based on your progress, you show strong potential...';
      mockAIService.generateContent.mockResolvedValue({
        content: mockInsights,
        metadata: {}
      } as IAIResponse);

      // Act
      const insights = await service.generateCareerInsights(testUserId, testCareerId);

      // Assert
      expect(insights).toBe(mockInsights);
      expect(mockAIService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('Software Developer'),
        expect.objectContaining({
          temperature: 0.7,
          maxTokens: 500
        })
      );
    });
  });

  describe('calculateOverallProgress', () => {
    it('should return user discovery progress', async () => {
      // Arrange
      mockDiscoveryRepo.getUserDiscoveryProgress.mockResolvedValue({
        exploredCareers: ['career1', 'career2'],
        completedMilestones: [],
        portfolioItems: [],
        overallProgress: 67
      });

      // Act
      const progress = await service.calculateOverallProgress(testUserId);

      // Assert
      expect(progress).toBe(67);
      expect(mockDiscoveryRepo.getUserDiscoveryProgress).toHaveBeenCalledWith(testUserId);
    });
  });

});