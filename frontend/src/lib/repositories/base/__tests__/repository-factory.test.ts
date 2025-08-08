import { RepositoryFactory, repositoryFactory } from '../repository-factory';

describe('repository-factory.ts', () => {
  describe('RepositoryFactory', () => {
    it('should be defined', () => {
      expect(RepositoryFactory).toBeDefined();
    });
    
    it('should work correctly', () => {
      // Add specific tests based on the function
      expect(typeof RepositoryFactory).toBe('function');
    });
  });

  describe('repositoryFactory', () => {
    it('should be defined', () => {
      expect(repositoryFactory).toBeDefined();
    });
    
    it('should be an instance of RepositoryFactory', () => {
      expect(repositoryFactory).toBeInstanceOf(RepositoryFactory);
    });
    
    it('should have repository getter methods', () => {
      expect(typeof repositoryFactory.getUserRepository).toBe('function');
      expect(typeof repositoryFactory.getProgramRepository).toBe('function');
      expect(typeof repositoryFactory.getTaskRepository).toBe('function');
      expect(typeof repositoryFactory.getEvaluationRepository).toBe('function');
      expect(typeof repositoryFactory.getScenarioRepository).toBe('function');
    });
  });
});