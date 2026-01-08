/**
 * Repository Mocks
 * 統一的 repository mock 工廠，提供一致的測試資料
 */

import type {
  IScenario,
  IProgram,
  ITask,
  IEvaluation,
} from "@/types/unified-learning";
import type { User } from "@/lib/repositories/interfaces";

// Mock 資料生成器
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  preferredLanguage: "en",
  level: 1,
  totalXp: 0,
  learningPreferences: {},
  onboardingCompleted: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastActiveAt: new Date(),
  ...overrides,
});

export const createMockScenario = (
  overrides?: Partial<IScenario>,
): IScenario => ({
  id: "scenario-123",
  mode: "pbl",
  status: "active",
  sourceType: "yaml",
  sourcePath: "test-scenario.yaml",
  sourceMetadata: {},
  title: { en: "Test Scenario" },
  description: { en: "Test Description" },
  objectives: ["Learn testing"],
  difficulty: "intermediate",
  estimatedMinutes: 30,
  prerequisites: [],
  taskTemplates: [],
  taskCount: 0,
  xpRewards: {},
  unlockRequirements: {},
  aiModules: {},
  resources: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: "1.0.0",
  metadata: {},
  pblData: {},
  discoveryData: {},
  assessmentData: {},
  ...overrides,
});

export const createMockProgram = (overrides?: Partial<IProgram>): IProgram => ({
  id: "program-123",
  userId: "user-123",
  scenarioId: "scenario-123",
  mode: "pbl",
  status: "active",
  currentTaskIndex: 0,
  completedTaskCount: 0,
  totalTaskCount: 3,
  totalScore: 0,
  domainScores: {},
  xpEarned: 0,
  badgesEarned: [],
  createdAt: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
  timeSpentSeconds: 0,
  pblData: {},
  discoveryData: {},
  assessmentData: {},
  metadata: {},
  ...overrides,
});

export const createMockTask = (overrides?: Partial<ITask>): ITask => ({
  id: "task-123",
  programId: "program-123",
  mode: "pbl",
  taskIndex: 0,
  scenarioTaskIndex: 0,
  title: { en: "Test Task" },
  description: { en: "Test task description" },
  type: "question",
  status: "pending",
  content: { instructions: "Complete this task" },
  interactions: [],
  interactionCount: 0,
  userResponse: {},
  score: 0,
  maxScore: 100,
  allowedAttempts: 3,
  attemptCount: 0,
  timeSpentSeconds: 0,
  aiConfig: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pblData: {},
  discoveryData: {},
  assessmentData: {},
  metadata: {},
  ...overrides,
});

export const createMockEvaluation = (
  overrides?: Partial<IEvaluation>,
): IEvaluation => ({
  id: "eval-123",
  userId: "user-123",
  programId: "program-123",
  taskId: "task-123",
  mode: "pbl",
  evaluationType: "task",
  evaluationSubtype: "pbl_task",
  score: 85,
  maxScore: 100,
  domainScores: { engaging_with_ai: 90, creating_with_ai: 80 },
  feedbackData: {
    strengths: ["Good understanding"],
    improvements: ["Need more practice"],
    nextSteps: ["Try advanced features"],
  },
  aiAnalysis: { insights: "Good performance" },
  timeTakenSeconds: 300,
  createdAt: new Date().toISOString(),
  pblData: {
    ksaScores: { K1: 85, S2: 90 },
    rubricsScores: { clarity: 85, accuracy: 90 },
    conversationCount: 5,
  },
  discoveryData: {},
  assessmentData: {},
  metadata: {},
  ...overrides,
});

// Repository Mock 工廠
export const createMockRepository = <T>(defaultData: T | T[] = [] as T[]) => {
  const isArray = Array.isArray(defaultData);

  return {
    findAll: jest.fn().mockResolvedValue(isArray ? defaultData : [defaultData]),
    findById: jest
      .fn()
      .mockResolvedValue(isArray ? defaultData[0] : defaultData),
    findByEmail: jest
      .fn()
      .mockResolvedValue(isArray ? defaultData[0] : defaultData),
    create: jest.fn().mockResolvedValue(isArray ? defaultData[0] : defaultData),
    update: jest.fn().mockResolvedValue(isArray ? defaultData[0] : defaultData),
    delete: jest.fn().mockResolvedValue(true),
    // 額外的查詢方法
    findByUser: jest
      .fn()
      .mockResolvedValue(isArray ? defaultData : [defaultData]),
    findByProgram: jest
      .fn()
      .mockResolvedValue(isArray ? defaultData : [defaultData]),
    findByTask: jest
      .fn()
      .mockResolvedValue(isArray ? defaultData : [defaultData]),
    findByScenario: jest
      .fn()
      .mockResolvedValue(isArray ? defaultData : [defaultData]),
    findActive: jest
      .fn()
      .mockResolvedValue(isArray ? defaultData : [defaultData]),
  };
};

// Mock repositoryFactory
export const mockRepositoryFactory = {
  getUserRepository: jest.fn(() => createMockRepository(createMockUser())),
  getScenarioRepository: jest.fn(() =>
    createMockRepository(createMockScenario()),
  ),
  getProgramRepository: jest.fn(() =>
    createMockRepository(createMockProgram()),
  ),
  getTaskRepository: jest.fn(() => createMockRepository(createMockTask())),
  getEvaluationRepository: jest.fn(() =>
    createMockRepository(createMockEvaluation()),
  ),
};

// Mock the factory module
jest.mock("@/lib/repositories/base/repository-factory", () => ({
  repositoryFactory: mockRepositoryFactory,
  createRepositoryFactory: jest.fn(() => mockRepositoryFactory),
}));
