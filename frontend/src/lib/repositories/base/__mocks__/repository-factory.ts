// Mock the singleton instance
export const repositoryFactory = {
  getScenarioRepository: jest.fn(),
  getProgramRepository: jest.fn(),
  getTaskRepository: jest.fn(),
  getEvaluationRepository: jest.fn(),
  getUserRepository: jest.fn(),
  getAchievementRepository: jest.fn(),
  getDiscoveryRepository: jest.fn()
};

// Mock the class
export class RepositoryFactory {
  static getInstance() {
    return repositoryFactory;
  }
}