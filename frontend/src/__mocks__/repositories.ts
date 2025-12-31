/**
 * Mock implementations for all repositories
 * Following @CLAUDE.md TDD principles
 */

// Base repository mock factory
export function createMockRepository<T>(defaultData: T[] = []) {
  return {
    findAll: jest.fn().mockResolvedValue(defaultData),
    findById: jest.fn().mockResolvedValue(defaultData[0] || null),
    findByUserId: jest.fn().mockResolvedValue(defaultData),
    create: jest
      .fn()
      .mockImplementation((data) =>
        Promise.resolve({ id: "mock-id", ...data }),
      ),
    update: jest
      .fn()
      .mockImplementation((id, data) => Promise.resolve({ id, ...data })),
    delete: jest.fn().mockResolvedValue(true),
    findActive: jest
      .fn()
      .mockResolvedValue(
        defaultData.filter(
          (item: unknown) =>
            (item as Record<string, unknown>).status === "active",
        ),
      ),
    updateStatus: jest.fn().mockResolvedValue(true),
  };
}

// Mock Scenario Repository
export const mockScenarioRepository = createMockRepository([
  {
    id: "scenario-1",
    mode: "pbl",
    title: { en: "Test Scenario" },
    description: { en: "Test Description" },
    status: "active",
    sourceType: "yaml",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]);

// Mock Program Repository
export const mockProgramRepository = createMockRepository([
  {
    id: "program-1",
    scenarioId: "scenario-1",
    userId: "user-1",
    mode: "pbl",
    status: "active",
    totalScore: 0,
    timeSpentSeconds: 0,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
  },
]);

// Mock Task Repository
export const mockTaskRepository = createMockRepository([
  {
    id: "task-1",
    programId: "program-1",
    mode: "pbl",
    type: "question",
    title: { en: "Test Task" },
    status: "pending",
    order: 1,
    createdAt: new Date().toISOString(),
  },
]);

// Mock Evaluation Repository
export const mockEvaluationRepository = createMockRepository([
  {
    id: "eval-1",
    taskId: "task-1",
    userId: "user-1",
    mode: "pbl",
    evaluationType: "formative",
    score: 85,
    feedback: { en: "Good job!" },
    createdAt: new Date().toISOString(),
  },
]);

// Mock User Repository
export const mockUserRepository = createMockRepository([
  {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    hashedPassword: "hashed-password",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]);

// Mock Achievement Repository
export const mockAchievementRepository = createMockRepository([
  {
    id: "achievement-1",
    userId: "user-1",
    type: "competency",
    category: "ai_literacy",
    name: { en: "AI Beginner" },
    description: { en: "Completed first AI task" },
    metadata: {},
    unlockedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
]);

// Export mock factory
export function createMockRepositoryFactory() {
  return {
    getScenarioRepository: jest.fn().mockReturnValue(mockScenarioRepository),
    getProgramRepository: jest.fn().mockReturnValue(mockProgramRepository),
    getTaskRepository: jest.fn().mockReturnValue(mockTaskRepository),
    getEvaluationRepository: jest
      .fn()
      .mockReturnValue(mockEvaluationRepository),
    getUserRepository: jest.fn().mockReturnValue(mockUserRepository),
    getAchievementRepository: jest
      .fn()
      .mockReturnValue(mockAchievementRepository),
  };
}
