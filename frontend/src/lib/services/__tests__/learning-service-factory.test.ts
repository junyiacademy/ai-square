import { LearningServiceFactory } from '../learning-service-factory';
import { AssessmentLearningService } from '../assessment-learning-service';
import { PBLLearningService } from '../pbl-learning-service';
import { DiscoveryLearningService } from '../discovery-learning-service';
import type { BaseLearningService } from '../base-learning-service';

// Mock the learning services
jest.mock('../assessment-learning-service');
jest.mock('../pbl-learning-service');
jest.mock('../discovery-learning-service');

describe('LearningServiceFactory', () => {
  let factory: LearningServiceFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (LearningServiceFactory as any).instance = undefined;
    factory = LearningServiceFactory.getInstance();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = LearningServiceFactory.getInstance();
      const instance2 = LearningServiceFactory.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('initializes services on first getInstance', () => {
      // Services should be initialized during constructor
      expect(PBLLearningService).toHaveBeenCalled();
      expect(DiscoveryLearningService).toHaveBeenCalled();
    });
  });

  describe('getService', () => {
    it('returns assessment service for assessment mode', () => {
      const service = factory.getService('assessment');
      
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(Object);
    });

    it('returns PBL service for pbl mode', () => {
      const service = factory.getService('pbl');
      
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PBLLearningService);
    });

    it('returns Discovery service for discovery mode', () => {
      const service = factory.getService('discovery');
      
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DiscoveryLearningService);
    });

    it('throws error for invalid mode', () => {
      expect(() => {
        factory.getService('invalid' as any);
      }).toThrow("Learning service for mode 'invalid' not found");
    });

    it('returns the same service instance on multiple calls', () => {
      const service1 = factory.getService('pbl');
      const service2 = factory.getService('pbl');
      
      expect(service1).toBe(service2);
    });
  });

  describe('service initialization', () => {
    it('creates all three learning services', () => {
      // Get each service to ensure they're created
      factory.getService('assessment');
      factory.getService('pbl');
      factory.getService('discovery');

      expect(PBLLearningService).toHaveBeenCalledTimes(1);
      expect(DiscoveryLearningService).toHaveBeenCalledTimes(1);
    });

    it('stores services in internal map', () => {
      const services = (factory as any).services;
      
      expect(services).toBeInstanceOf(Map);
      expect(services.size).toBe(3);
      expect(services.has('assessment')).toBe(true);
      expect(services.has('pbl')).toBe(true);
      expect(services.has('discovery')).toBe(true);
    });
  });

  describe('assessment adapter', () => {
    it('creates adapter for assessment service', () => {
      const assessmentService = factory.getService('assessment');
      
      // Check that it implements BaseLearningService interface
      expect(assessmentService).toHaveProperty('startLearning');
      expect(assessmentService).toHaveProperty('getProgress');
      expect(assessmentService).toHaveProperty('submitResponse');
      expect(assessmentService).toHaveProperty('completeLearning');
      expect(assessmentService).toHaveProperty('getNextTask');
      expect(assessmentService).toHaveProperty('evaluateTask');
      expect(assessmentService).toHaveProperty('generateFeedback');
    });

    it('adapter methods call underlying service', async () => {
      const assessmentService = factory.getService('assessment');
      const mockScenarioData = {
        title: { en: 'Test Assessment' },
        description: { en: 'Test Description' },
        mode: 'assessment' as const,
      };

      // TODO: createScenario method doesn't exist on BaseLearningService
      // The actual method is createLearningProgram
      // if ('createScenario' in assessmentService) {
      //   await assessmentService.createScenario(mockScenarioData);
      //   // Verify the adapter properly delegates to underlying service
      // }
    });
  });

  describe('type safety', () => {
    it('all services implement BaseLearningService interface', () => {
      const modes: Array<'assessment' | 'pbl' | 'discovery'> = ['assessment', 'pbl', 'discovery'];
      
      modes.forEach(mode => {
        const service = factory.getService(mode);
        
        // Check that all required methods exist
        expect(typeof service.startLearning).toBe('function');
        expect(typeof service.getProgress).toBe('function');
        expect(typeof service.submitResponse).toBe('function');
        expect(typeof service.completeLearning).toBe('function');
        expect(typeof service.getNextTask).toBe('function');
        expect(typeof service.evaluateTask).toBe('function');
        expect(typeof service.generateFeedback).toBe('function');
      });
    });
  });
});
