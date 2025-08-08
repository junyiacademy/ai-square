/**
 * Unit tests for repository interfaces
 * Tests the structure and type definitions of repository interfaces
 */

import type {
  IUserRepository,
  IProgramRepository,
  ITaskRepository,
  IEvaluationRepository,
  IScenarioRepository,
  IDiscoveryRepository,
  IContentRepository,
  IMediaRepository,
  User,
  CreateUserDto,
  UpdateUserDto,
  UserDataResponse,
  AssessmentSession,
  CreateProgramDto,
  CreateTaskDto,
  CreateEvaluationDto,
  UpdateEvaluationDto,
  UserProgress,
  CreateScenarioDto,
  UpdateScenarioDto
} from '../index';

describe('Repository Interfaces', () => {
  describe('IUserRepository', () => {
    it('should define user repository methods', () => {
      const mockUserRepo: Partial<IUserRepository> = {
        findById: jest.fn(),
        findByEmail: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findAll: jest.fn(),
        updateLastActive: jest.fn(),
        addAchievement: jest.fn(),
        saveAssessmentSession: jest.fn(),
        getAssessmentSessions: jest.fn(),
        getLatestAssessmentResults: jest.fn(),
        addBadge: jest.fn(),
        getUserBadges: jest.fn(),
        getUserData: jest.fn(),
        saveUserData: jest.fn(),
        deleteUserData: jest.fn(),
      };

      expect(mockUserRepo.findById).toBeDefined();
      expect(mockUserRepo.findByEmail).toBeDefined();
      expect(mockUserRepo.saveAssessmentSession).toBeDefined();
      expect(mockUserRepo.getUserBadges).toBeDefined();
    });
  });

  describe('IProgramRepository', () => {
    it('should define program repository methods', () => {
      const mockProgramRepo: Partial<IProgramRepository> = {
        findById: jest.fn(),
        findByUser: jest.fn(),
        findByScenario: jest.fn(),
        create: jest.fn(),
        updateProgress: jest.fn(),
        complete: jest.fn(),
        update: jest.fn(),
        updateStatus: jest.fn(),
        getActivePrograms: jest.fn(),
        getCompletedPrograms: jest.fn(),
      };

      expect(mockProgramRepo.findById).toBeDefined();
      expect(mockProgramRepo.findByUser).toBeDefined();
      expect(mockProgramRepo.updateProgress).toBeDefined();
      expect(mockProgramRepo.complete).toBeDefined();
    });
  });

  describe('ITaskRepository', () => {
    it('should define task repository methods', () => {
      const mockTaskRepo: Partial<ITaskRepository> = {
        findById: jest.fn(),
        findByProgram: jest.fn(),
        create: jest.fn(),
        createBatch: jest.fn(),
        updateInteractions: jest.fn(),
        complete: jest.fn(),
        update: jest.fn(),
        updateStatus: jest.fn(),
        recordAttempt: jest.fn(),
        getTaskWithInteractions: jest.fn(),
      };

      expect(mockTaskRepo.findById).toBeDefined();
      expect(mockTaskRepo.createBatch).toBeDefined();
      expect(mockTaskRepo.updateInteractions).toBeDefined();
      expect(mockTaskRepo.complete).toBeDefined();
    });
  });

  describe('IEvaluationRepository', () => {
    it('should define evaluation repository methods', () => {
      const mockEvalRepo: Partial<IEvaluationRepository> = {
        findById: jest.fn(),
        findByProgram: jest.fn(),
        findByTask: jest.fn(),
        findByUser: jest.fn(),
        findByType: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        getLatestForTask: jest.fn(),
        getUserProgress: jest.fn(),
      };

      expect(mockEvalRepo.findById).toBeDefined();
      expect(mockEvalRepo.findByTask).toBeDefined();
      expect(mockEvalRepo.findByType).toBeDefined();
      expect(mockEvalRepo.getUserProgress).toBeDefined();
    });
  });

  describe('IScenarioRepository', () => {
    it('should define scenario repository methods', () => {
      const mockScenarioRepo: Partial<IScenarioRepository> = {
        findById: jest.fn(),
        findBySource: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findByMode: jest.fn(),
        findActive: jest.fn(),
        updateStatus: jest.fn(),
      };

      expect(mockScenarioRepo.findById).toBeDefined();
      expect(mockScenarioRepo.findBySource).toBeDefined();
      expect(mockScenarioRepo.update).toBeDefined();
      expect(mockScenarioRepo.create).toBeDefined();
    });
  });

  describe('IContentRepository', () => {
    it('should define content repository methods', () => {
      const mockContentRepo: Partial<IContentRepository> = {
        getYamlContent: jest.fn(),
        listYamlFiles: jest.fn(),
        getScenarioContent: jest.fn(),
        getAllScenarios: jest.fn(),
        getKSAMappings: jest.fn(),
        getAILiteracyDomains: jest.fn(),
      };

      expect(mockContentRepo.getYamlContent).toBeDefined();
      expect(mockContentRepo.listYamlFiles).toBeDefined();
      expect(mockContentRepo.getScenarioContent).toBeDefined();
      expect(mockContentRepo.getAllScenarios).toBeDefined();
    });
  });

  describe('IMediaRepository', () => {
    it('should define media repository methods', () => {
      const mockMediaRepo: Partial<IMediaRepository> = {
        uploadFile: jest.fn(),
        getFileUrl: jest.fn(),
        deleteFile: jest.fn(),
        listFiles: jest.fn(),
      };

      expect(mockMediaRepo.uploadFile).toBeDefined();
      expect(mockMediaRepo.getFileUrl).toBeDefined();
      expect(mockMediaRepo.deleteFile).toBeDefined();
      expect(mockMediaRepo.listFiles).toBeDefined();
    });
  });


  describe('IDiscoveryRepository', () => {
    it('should define discovery repository methods', () => {
      const mockDiscoveryRepo: Partial<IDiscoveryRepository> = {
        findCareerPaths: jest.fn(),
        findCareerPathById: jest.fn(),
        findCareerPathBySlug: jest.fn(),
        getCareerRecommendations: jest.fn(),
        getUserDiscoveryProgress: jest.fn(),
        addPortfolioItem: jest.fn(),
        updatePortfolioItem: jest.fn(),
        deletePortfolioItem: jest.fn(),
        getPortfolioItems: jest.fn(),
      };

      expect(mockDiscoveryRepo.findCareerPaths).toBeDefined();
      expect(mockDiscoveryRepo.findCareerPathById).toBeDefined();
      expect(mockDiscoveryRepo.getCareerRecommendations).toBeDefined();
      expect(mockDiscoveryRepo.getUserDiscoveryProgress).toBeDefined();
    });
  });




  describe('Type definitions', () => {
    it('should define User type correctly', () => {
      const user: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        preferredLanguage: 'en',
        level: 1,
        totalXp: 0,
        learningPreferences: {},
        onboardingCompleted: false,
      };

      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.level).toBe(1);
    });

    it('should define CreateUserDto correctly', () => {
      const createUser: CreateUserDto = {
        email: 'new@example.com',
        name: 'New User',
        preferredLanguage: 'en',
      };

      expect(createUser.email).toBe('new@example.com');
      expect(createUser.name).toBe('New User');
    });

    it('should define AssessmentSession correctly', () => {
      const session: Partial<AssessmentSession> = {
        id: 'session-123',
        userId: 'user-123',
      };

      expect(session.id).toBe('session-123');
      expect(session.userId).toBe('user-123');
    });
  });

  describe('Repository method return types', () => {
    it('should return promises for async operations', async () => {
      const mockUserRepo: Partial<IUserRepository> = {
        findById: jest.fn().mockResolvedValue(null),
        findByEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: '123' }),
      };

      const result = await mockUserRepo.findById?.('123');
      expect(result).toBeNull();

      const created = await mockUserRepo.create?.({
        email: 'test@example.com',
        name: 'Test',
        preferredLanguage: 'en',
      });
      expect(created?.id).toBe('123');
    });
  });

  describe('Optional methods', () => {
    it('should handle optional repository methods', () => {
      const mockProgramRepo: IProgramRepository = {
        findById: jest.fn(),
        findByUser: jest.fn(),
        findByScenario: jest.fn(),
        create: jest.fn(),
        updateProgress: jest.fn(),
        complete: jest.fn(),
        // Optional methods may be undefined
      };

      expect(mockProgramRepo.update).toBeUndefined();
      expect(mockProgramRepo.updateStatus).toBeUndefined();
      expect(mockProgramRepo.getActivePrograms).toBeUndefined();
    });
  });
});