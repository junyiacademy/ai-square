/**
 * Tests for User Data Service Interface
 * Testing type definitions and interface contracts
 */

import type {
  IUserDataService,
  UserDataServiceConfig,
  UserDataServiceFactory
} from '../user-data-service.interface';

describe('User Data Service Interface', () => {
  describe('IUserDataService Interface', () => {
    it('should define all required methods from UserDataOperations', () => {
      const mockService: Partial<IUserDataService> = {
        loadUserData: jest.fn(),
        saveUserData: jest.fn(),
        userDataExists: jest.fn(),
        saveAssessmentResults: jest.fn(),
        saveAchievements: jest.fn(),
        addAssessmentSession: jest.fn(),
        updateAchievements: jest.fn(),
        clearAllData: jest.fn(),
        exportData: jest.fn(),
        importData: jest.fn(),
        migrateFromLocalStorage: jest.fn(),
      };
      
      expect(mockService.loadUserData).toBeDefined();
      expect(mockService.saveUserData).toBeDefined();
      expect(mockService.userDataExists).toBeDefined();
      expect(mockService.saveAssessmentResults).toBeDefined();
      expect(mockService.saveAchievements).toBeDefined();
      expect(mockService.addAssessmentSession).toBeDefined();
      expect(mockService.updateAchievements).toBeDefined();
      expect(mockService.clearAllData).toBeDefined();
      expect(mockService.exportData).toBeDefined();
      expect(mockService.importData).toBeDefined();
      expect(mockService.migrateFromLocalStorage).toBeDefined();
    });
    
    it('should define all required methods from EvaluationOperations', () => {
      const mockService: Partial<IUserDataService> = {
        saveEvaluation: jest.fn(),
        loadEvaluation: jest.fn(),
        loadEvaluationsByType: jest.fn(),
        deleteEvaluation: jest.fn(),
      };
      
      expect(mockService.saveEvaluation).toBeDefined();
      expect(mockService.loadEvaluation).toBeDefined();
      expect(mockService.loadEvaluationsByType).toBeDefined();
      expect(mockService.deleteEvaluation).toBeDefined();
    });
    
    it('should allow optional clearCache method', () => {
      const serviceWithCache: Partial<IUserDataService> = {
        clearCache: jest.fn(),
      };
      
      const serviceWithoutCache: Partial<IUserDataService> = {};
      
      expect(serviceWithCache.clearCache).toBeDefined();
      expect(serviceWithoutCache.clearCache).toBeUndefined();
    });
  });
  
  describe('UserDataServiceConfig', () => {
    it('should accept valid configuration', () => {
      const config: UserDataServiceConfig = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        cacheEnabled: true,
        cacheExpiry: 3600,
      };
      
      expect(config.userId).toBe('user-123');
      expect(config.userEmail).toBe('test@example.com');
      expect(config.cacheEnabled).toBe(true);
      expect(config.cacheExpiry).toBe(3600);
    });
    
    it('should work with minimal configuration', () => {
      const minimalConfig: UserDataServiceConfig = {
        userId: 'user-456',
      };
      
      expect(minimalConfig.userId).toBe('user-456');
      expect(minimalConfig.userEmail).toBeUndefined();
      expect(minimalConfig.cacheEnabled).toBeUndefined();
      expect(minimalConfig.cacheExpiry).toBeUndefined();
    });
  });
  
  describe('UserDataServiceFactory', () => {
    it('should create service instance with factory function', () => {
      const mockFactory: UserDataServiceFactory = (config) => {
        return {
          loadUserData: jest.fn().mockResolvedValue(null),
          saveUserData: jest.fn().mockResolvedValue(undefined),
          userDataExists: jest.fn().mockResolvedValue(false),
          saveAssessmentResults: jest.fn().mockResolvedValue(undefined),
          saveAchievements: jest.fn().mockResolvedValue(undefined),
          addAssessmentSession: jest.fn().mockResolvedValue(undefined),
          updateAchievements: jest.fn().mockResolvedValue(undefined),
          clearAllData: jest.fn().mockResolvedValue(undefined),
          exportData: jest.fn().mockResolvedValue(null),
          importData: jest.fn().mockResolvedValue(undefined),
          saveEvaluation: jest.fn().mockResolvedValue(undefined),
          loadEvaluation: jest.fn().mockResolvedValue(null),
          loadEvaluationsByType: jest.fn().mockResolvedValue([]),
          deleteEvaluation: jest.fn().mockResolvedValue(undefined),
        };
      };
      
      const service = mockFactory({ userId: 'test-user' });
      expect(service).toBeDefined();
      expect(typeof service.loadUserData).toBe('function');
      expect(typeof service.saveEvaluation).toBe('function');
    });
  });
});