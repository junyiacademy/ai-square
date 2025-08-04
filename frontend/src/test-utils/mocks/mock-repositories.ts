/**
 * Common mock repository implementations for tests
 */

export const createMockUserRepository = () => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0)
});

export const createMockScenarioRepository = () => ({
  findById: jest.fn(),
  findAll: jest.fn().mockResolvedValue([]),
  findByMode: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  search: jest.fn().mockResolvedValue([])
});

export const createMockProgramRepository = () => ({
  findById: jest.fn(),
  findByUser: jest.fn().mockResolvedValue([]),
  findByScenario: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateStatus: jest.fn(),
  recordCompletion: jest.fn(),
  getActivePrograms: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0)
});

export const createMockTaskRepository = () => ({
  findById: jest.fn(),
  findByProgram: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateStatus: jest.fn(),
  updateInteractions: jest.fn(),
  recordAttempt: jest.fn(),
  addInteraction: jest.fn(),
  count: jest.fn().mockResolvedValue(0)
});

export const createMockEvaluationRepository = () => ({
  findById: jest.fn(),
  findByProgram: jest.fn().mockResolvedValue([]),
  findByTask: jest.fn().mockResolvedValue([]),
  findByUser: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockImplementation(async (data) => ({ id: 'eval-123', ...data })),
  update: jest.fn(),
  delete: jest.fn(),
  getLatestForProgram: jest.fn(),
  count: jest.fn().mockResolvedValue(0)
});

export const createMockAchievementRepository = () => ({
  findById: jest.fn(),
  findByUser: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  award: jest.fn(),
  count: jest.fn().mockResolvedValue(0)
});

export const createMockRepositoryFactory = () => ({
  getUserRepository: jest.fn(() => createMockUserRepository()),
  getScenarioRepository: jest.fn(() => createMockScenarioRepository()),
  getProgramRepository: jest.fn(() => createMockProgramRepository()),
  getTaskRepository: jest.fn(() => createMockTaskRepository()),
  getEvaluationRepository: jest.fn(() => createMockEvaluationRepository()),
  getAchievementRepository: jest.fn(() => createMockAchievementRepository())
});