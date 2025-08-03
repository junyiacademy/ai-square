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
  IAchievementRepository,
  IDiscoveryNodeRepository
} from '@/lib/repositories/interfaces';

/**
 * Create a complete mock for UserRepository
 */
export function createMockUserRepository(): jest.Mocked<IUserRepository> {
  return {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateLastActive: jest.fn(),
    count: jest.fn(),
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
    update: jest.fn(),
    updateStatus: jest.fn(),
    getActiveProgram: jest.fn(),
    count: jest.fn(),
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
    update: jest.fn(),
    updateStatus: jest.fn(),
    recordInteraction: jest.fn(),
    getTasksWithStatus: jest.fn(),
  };
}

/**
 * Create a complete mock for EvaluationRepository
 */
export function createMockEvaluationRepository(): jest.Mocked<IEvaluationRepository> {
  return {
    findById: jest.fn(),
    findByTask: jest.fn(),
    findByProgram: jest.fn(),
    findByUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getUserProgress: jest.fn(),
    getLatestByTask: jest.fn(),
  };
}

/**
 * Create a complete mock for ScenarioRepository
 */
export function createMockScenarioRepository(): jest.Mocked<IScenarioRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findBySourcePath: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findByMode: jest.fn(),
    findActive: jest.fn(),
    updateStatus: jest.fn(),
    count: jest.fn(),
  };
}

/**
 * Create a complete mock for AchievementRepository
 */
export function createMockAchievementRepository(): jest.Mocked<IAchievementRepository> {
  return {
    findById: jest.fn(),
    findByUser: jest.fn(),
    create: jest.fn(),
    hasAchievement: jest.fn(),
    grantAchievement: jest.fn(),
    getUnlockedAchievements: jest.fn(),
  };
}

/**
 * Create a complete mock for DiscoveryNodeRepository
 */
export function createMockDiscoveryNodeRepository(): jest.Mocked<IDiscoveryNodeRepository> {
  return {
    findById: jest.fn(),
    findByScenario: jest.fn(),
    findByType: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    recordInteraction: jest.fn(),
    getConnectedNodes: jest.fn(),
    getNodePath: jest.fn(),
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
    achievementRepo: createMockAchievementRepository(),
    discoveryNodeRepo: createMockDiscoveryNodeRepository(),
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
      getAchievementRepository: jest.fn(() => mocks.achievementRepo),
      getDiscoveryNodeRepository: jest.fn(() => mocks.discoveryNodeRepo),
    }
  }));
  
  return mocks;
}