/**
 * Repository Mock Helpers
 * Provides complete mock implementations for all repository interfaces
 */

import type { 
  IUserRepository,
  IProgramRepository,
  ITaskRepository,
  IEvaluationRepository,
  IScenarioRepository,
  IDiscoveryRepository
} from '@/lib/repositories/interfaces';
import type { IScenario, IProgram } from '@/types/unified-learning';

/**
 * Create a complete mock for UserRepository
 */
export function createMockUserRepository(): jest.Mocked<IUserRepository> {
  return {
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
}

/**
 * Create a complete mock for ProgramRepository
 */
export function createMockProgramRepository(): jest.Mocked<IProgramRepository> {
  return {
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
}

/**
 * Create a complete mock for TaskRepository
 */
export function createMockTaskRepository(): jest.Mocked<ITaskRepository> {
  return {
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
}

/**
 * Create a complete mock for EvaluationRepository
 */
export function createMockEvaluationRepository(): jest.Mocked<IEvaluationRepository> {
  return {
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
}

/**
 * Create a complete mock for ScenarioRepository
 */
export function createMockScenarioRepository(): jest.Mocked<IScenarioRepository> {
  return {
    findById: jest.fn(),
    findBySource: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findByMode: jest.fn(),
    findActive: jest.fn(),
    updateStatus: jest.fn(),
  };
}

/**
 * Create a complete mock for DiscoveryRepository
 */
export function createMockDiscoveryRepository(): jest.Mocked<IDiscoveryRepository> {
  return {
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
}


/**
 * Create all repository mocks with default behaviors
 */
export function createAllRepositoryMocks() {
  return {
    userRepo: createMockUserRepository(),
    programRepo: createMockProgramRepository(),
    taskRepo: createMockTaskRepository(),
    evaluationRepo: createMockEvaluationRepository(),
    scenarioRepo: createMockScenarioRepository(),
    discoveryRepo: createMockDiscoveryRepository(),
  };
}

/**
 * Setup repository factory mock with all repositories
 */
export function setupRepositoryFactoryMock() {
  const mocks = createAllRepositoryMocks();
  
  jest.mock('@/lib/repositories/base/repository-factory', () => ({
    repositoryFactory: {
      getUserRepository: jest.fn(() => mocks.userRepo),
      getProgramRepository: jest.fn(() => mocks.programRepo),
      getTaskRepository: jest.fn(() => mocks.taskRepo),
      getEvaluationRepository: jest.fn(() => mocks.evaluationRepo),
      getScenarioRepository: jest.fn(() => mocks.scenarioRepo),
      getDiscoveryRepository: jest.fn(() => mocks.discoveryRepo),
    }
  }));
  
  return mocks;
}

/**
 * Create a complete mock IScenario object
 */
export function createMockScenario(overrides: Partial<IScenario> = {}): IScenario {
  return {
    id: 'mock-scenario-id',
    mode: 'assessment',
    status: 'active',
    version: '1.0.0',
    sourceType: 'yaml',
    sourcePath: '/mock/path',
    sourceId: undefined,
    sourceMetadata: {},
    title: { en: 'Mock Scenario', zh: '模擬情境' },
    description: { en: 'Mock scenario description', zh: '模擬情境描述' },
    objectives: ['Learn AI concepts'],
    difficulty: 'beginner',
    estimatedMinutes: 30,
    prerequisites: [],
    taskTemplates: [],
    taskCount: 1,
    xpRewards: { completion: 100 },
    unlockRequirements: {},
    pblData: {},
    discoveryData: {},
    assessmentData: {
      config: {
        total_questions: 12,
        time_limit_minutes: 15,
        passing_score: 60,
        domains: ['engaging_with_ai', 'creating_with_ai', 'managing_ai', 'designing_ai'],
      },
      domains: {
        engaging_with_ai: {
          name: 'Engaging with AI',
          name_zhTW: '與 AI 互動',
          description: 'Understanding and effectively communicating with AI systems',
          questions: 3,
        },
      },
      questions: {
        en: [{
          id: 'Q001',
          domain: 'engaging_with_ai',
          difficulty: 'basic',
          type: 'multiple_choice',
          question: 'What is AI?',
          options: [
            { id: 'a', text: 'Artificial Intelligence' },
            { id: 'b', text: 'Animal Intelligence' },
          ],
          correct_answer: 'a',
        }],
      },
    },
    aiModules: {},
    resources: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

/**
 * Create a complete mock IProgram object
 */
export function createMockProgram(overrides: Partial<IProgram> = {}): IProgram {
  return {
    id: 'mock-program-id',
    userId: 'mock-user-id',
    scenarioId: 'mock-scenario-id',
    mode: 'assessment',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 5,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: undefined,
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    timeSpentSeconds: 0,
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    metadata: {},
    ...overrides,
  };
}