/**
 * Mock implementation of GCS v2 repositories for testing
 */

export const mockScenarioRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  listAll: jest.fn(),
  findBySource: jest.fn(),
  update: jest.fn()
};

export const mockProgramRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByScenario: jest.fn(),
  findByUser: jest.fn(),
  updateProgress: jest.fn(),
  complete: jest.fn()
};

export const mockTaskRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByProgram: jest.fn(),
  updateStatus: jest.fn(),
  saveResponse: jest.fn(),
  addInteraction: jest.fn()
};

export const mockEvaluationRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEntity: jest.fn(),
  findByProgram: jest.fn(),
  findByUser: jest.fn(),
  update: jest.fn()
};

export const getScenarioRepository = () => mockScenarioRepo;
export const getProgramRepository = () => mockProgramRepo;
export const getTaskRepository = () => mockTaskRepo;
export const getEvaluationRepository = () => mockEvaluationRepo;