/**
 * Database Mocks
 * Reusable mocks for database operations
 */

import type {
  IScenario,
  IProgram,
  ITask,
  IEvaluation,
} from "@/types/unified-learning";

// Mock Pool for PostgreSQL
export const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn(),
};

export const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

// Mock pg module
export const mockPg = {
  Pool: jest.fn().mockImplementation(() => mockPool),
};

// Sample data for mocking
export const mockScenario: IScenario = {
  id: "scenario-123",
  mode: "pbl",
  status: "active",
  sourceType: "yaml",
  sourcePath: "/test/scenario.yaml",
  sourceMetadata: {},
  title: { en: "Test Scenario" },
  description: { en: "Test Description" },
  objectives: ["Learn AI basics"],
  taskTemplates: [],
  version: "1.0.0",
  difficulty: "intermediate",
  estimatedMinutes: 60,
  prerequisites: [],
  taskCount: 0,
  xpRewards: {},
  unlockRequirements: {},
  publishedAt: new Date("2025-01-01").toISOString(),
  createdAt: new Date("2025-01-01").toISOString(),
  updatedAt: new Date("2025-01-01").toISOString(),
  pblData: {
    scenario: {
      background: { en: "Test background" },
      challenge: { en: "Test challenge" },
      role: { en: "Student" },
      context: { en: "Learning context" },
      deliverables: { en: ["Project"] },
      resources: [],
      timeline: "flexible",
      evaluation: { criteria: ["quality"], rubric: "standard" },
    },
  },
  discoveryData: {},
  assessmentData: {},
  aiModules: {},
  resources: [],
  metadata: {},
};

export const mockProgram: IProgram = {
  id: "program-123",
  mode: "pbl",
  scenarioId: "scenario-123",
  userId: "user-123",
  status: "active",
  currentTaskIndex: 0,
  completedTaskCount: 0,
  totalTaskCount: 5,
  domainScores: {},
  xpEarned: 0,
  badgesEarned: [],
  lastActivityAt: new Date("2025-01-01").toISOString(),
  metadata: {},
  pblData: {},
  discoveryData: {},
  assessmentData: {},
  createdAt: new Date("2025-01-01").toISOString(),
  startedAt: new Date("2025-01-01").toISOString(),
  updatedAt: new Date("2025-01-01").toISOString(),
  totalScore: 0,
  timeSpentSeconds: 0,
};

export const mockTask: ITask = {
  id: "task-123",
  mode: "pbl",
  programId: "program-123",
  type: "question",
  title: { en: "Test Task" },
  description: { en: "Complete the task" },
  status: "active",
  taskIndex: 0,
  interactionCount: 0,
  userResponse: {},
  score: 0,
  maxScore: 100,
  timeSpentSeconds: 0,
  allowedAttempts: 3,
  attemptCount: 0,
  aiConfig: {},
  metadata: {},
  pblData: {},
  discoveryData: {},
  assessmentData: {},
  createdAt: new Date("2025-01-01").toISOString(),
  startedAt: new Date("2025-01-01").toISOString(),
  updatedAt: new Date("2025-01-01").toISOString(),
  content: { question: "What is AI?" },
  interactions: [],
};

export const mockEvaluation: IEvaluation = {
  id: "eval-123",
  mode: "pbl",
  taskId: "task-123",
  programId: "program-123",
  userId: "user-123",
  evaluationType: "formative",
  score: 85,
  maxScore: 100,
  domainScores: {},
  feedbackData: { feedback: "Good work" },
  aiAnalysis: {},
  timeTakenSeconds: 120,
  pblData: {},
  discoveryData: {},
  assessmentData: {},
  metadata: {},
  createdAt: new Date("2025-01-01").toISOString(),
};

// Repository mock generators
export function createMockRepository(mockData: unknown[] = []) {
  return {
    findById: jest.fn().mockResolvedValue(mockData[0] || null),
    findAll: jest.fn().mockResolvedValue(mockData),
    create: jest.fn().mockResolvedValue(mockData[0]),
    update: jest.fn().mockResolvedValue(mockData[0]),
    delete: jest.fn().mockResolvedValue(true),
    // Optional methods with safe fallbacks
    findByUserId: jest.fn().mockResolvedValue(mockData),
    findByStatus: jest.fn().mockResolvedValue(mockData),
    updateStatus: jest.fn().mockResolvedValue(mockData[0]),
  };
}

// Mock repository factory
export const mockRepositoryFactory = {
  createScenarioRepository: () => createMockRepository([mockScenario]),
  createProgramRepository: () => createMockRepository([mockProgram]),
  createTaskRepository: () => createMockRepository([mockTask]),
  createEvaluationRepository: () => createMockRepository([mockEvaluation]),
};

/**
 * Setup database mocks for tests
 */
export function setupDatabaseMocks() {
  // Mock pg module
  jest.mock("pg", () => mockPg);

  // Default successful query responses
  mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  mockPool.connect.mockResolvedValue(mockClient);
  mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

  return { mockPool, mockClient };
}
