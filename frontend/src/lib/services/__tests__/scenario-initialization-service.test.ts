/**
 * Unit tests for ScenarioInitializationService
 * Tests scenario loading and initialization logic
 */

import { ScenarioInitializationService } from '../scenario-initialization-service';
import { RepositoryFactory } from '@/lib/repositories/base/repository-factory';
import { IScenario, IProgram, ITask } from '@/types/unified-learning';

// Mock repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: jest.fn(),
    getProgramRepository: jest.fn(),
    getTaskRepository: jest.fn()
  }
}));

// Mock yaml loaders
jest.mock('../pbl-yaml-loader', () => ({
  pblYAMLLoader: {
    loadScenarios: jest.fn(),
    scanScenarios: jest.fn().mockResolvedValue(['test-scenario']),
    loadScenario: jest.fn().mockResolvedValue({})
  },
  PBLYAMLProcessor: jest.fn().mockImplementation(() => ({
    scanYAMLFiles: jest.fn().mockResolvedValue([]),
    loadYAML: jest.fn(),
    transformToScenario: jest.fn()
  }))
}));

jest.mock('../discovery-yaml-loader', () => ({
  discoveryYAMLLoader: {
    loadScenarios: jest.fn(),
    scanPaths: jest.fn().mockResolvedValue(['test-career']),
    loadPath: jest.fn().mockResolvedValue({})
  },
  DiscoveryYAMLProcessor: jest.fn().mockImplementation(() => ({
    scanYAMLFiles: jest.fn().mockResolvedValue([]),
    loadYAML: jest.fn(),
    transformToScenario: jest.fn()
  }))
}));

jest.mock('../assessment-yaml-loader', () => ({
  assessmentYAMLLoader: {
    loadScenarios: jest.fn(),
    scanAssessments: jest.fn().mockResolvedValue(['test-assessment']),
    loadAssessment: jest.fn().mockResolvedValue({}),
    getAvailableLanguages: jest.fn().mockResolvedValue(['en']),
    getTranslatedField: jest.fn().mockReturnValue('Translated Field')
  },
  AssessmentYAMLProcessor: jest.fn().mockImplementation(() => ({
    scanYAMLFiles: jest.fn().mockResolvedValue([]),
    loadYAML: jest.fn(),
    transformToScenario: jest.fn()
  }))
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

describe('ScenarioInitializationService', () => {
  let service: ScenarioInitializationService;
  let mockScenarioRepo: any;
  let mockProgramRepo: any;
  let mockTaskRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock repositories
    mockScenarioRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBySourcePath: jest.fn(),
      findByMode: jest.fn()
    };

    mockProgramRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn()
    };

    mockTaskRepo = {
      create: jest.fn(),
      findByProgramId: jest.fn(),
      update: jest.fn()
    };

    const { repositoryFactory } = require('@/lib/repositories/base/repository-factory');
    repositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);
    repositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
    repositoryFactory.getTaskRepository.mockReturnValue(mockTaskRepo);

    service = new ScenarioInitializationService();
  });

  describe('initializeAll', () => {
    it('should initialize all scenario types', async () => {
      const mockPBLScenarios = [
        {
          id: 'pbl-1',
          mode: 'pbl',
          title: { en: 'PBL Scenario 1' },
          description: { en: 'Description 1' },
          objectives: ['obj1', 'obj2'],
          taskTemplates: []
        }
      ];

      const { pblYAMLLoader } = require('../pbl-yaml-loader');
      pblYAMLLoader.loadScenarios.mockResolvedValue(mockPBLScenarios);
      
      const { discoveryYAMLLoader } = require('../discovery-yaml-loader');
      discoveryYAMLLoader.loadScenarios.mockResolvedValue([]);
      
      mockScenarioRepo.findBySourcePath.mockResolvedValue(null);
      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((s: any) => ({ ...s, id: 'created-1' }));

      const results = await service.initializeAll();

      expect(results).toHaveLength(3); // PBL, Discovery, Assessment
      expect(pblYAMLLoader.scanScenarios).toHaveBeenCalled();
      expect(discoveryYAMLLoader.scanPaths).toHaveBeenCalled();
    });
  });

  describe('initializePBLScenarios', () => {
    it('should load and save PBL scenarios from YAML', async () => {
      const mockPBLScenario = {
        id: 'pbl-1',
        mode: 'pbl',
        title: { en: 'PBL Scenario 1' },
        description: { en: 'Description 1' },
        objectives: ['obj1', 'obj2'],
        taskTemplates: []
      };

      // Mock the actual pblYAMLLoader that the processor uses
      const { pblYAMLLoader } = require('../pbl-yaml-loader');
      pblYAMLLoader.scanScenarios.mockResolvedValue(['test-scenario']);
      pblYAMLLoader.loadScenario.mockResolvedValue({
        scenario_info: {
          title: 'PBL Scenario 1',
          description: 'Description 1'
        },
        programs: [{
          tasks: []
        }]
      });

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((s: any) => ({ ...s, id: 'created-1' }));

      const result = await service.initializePBLScenarios();

      expect(pblYAMLLoader.scanScenarios).toHaveBeenCalled();
      expect(result.sourceType).toBe('pbl');
      expect(result.created).toBe(1);
    });

    it('should update existing scenarios instead of creating duplicates', async () => {
      const existingScenario = {
        id: 'existing-1',
        mode: 'pbl',
        title: { en: 'Old Title' },
        sourcePath: 'pbl_data/scenarios/test-scenario/test-scenario_scenario.yaml'
      };

      // Mock the actual pblYAMLLoader that the processor uses
      const { pblYAMLLoader } = require('../pbl-yaml-loader');
      pblYAMLLoader.scanScenarios.mockResolvedValue(['test-scenario']);
      pblYAMLLoader.loadScenario.mockResolvedValue({
        scenario_info: {
          title: 'New Title',
          description: 'New Description'
        },
        programs: [{
          tasks: []
        }]
      });

      // Mock findByMode instead of findBySourcePath since that's what the service actually uses
      mockScenarioRepo.findByMode.mockResolvedValue([existingScenario]);
      mockScenarioRepo.update.mockImplementation((id: string, data: any) => ({ ...existingScenario, ...data }));

      const result = await service.initializePBLScenarios({ forceUpdate: true });

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      // Mock the actual pblYAMLLoader to throw an error
      const { pblYAMLLoader } = require('../pbl-yaml-loader');
      pblYAMLLoader.scanScenarios.mockRejectedValue(new Error('YAML scan failed'));

      const result = await service.initializePBLScenarios();

      // The processor catches scan errors and returns empty array, so total is 0
      // This is the correct behavior - errors are handled gracefully  
      expect(result.total).toBe(0);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.sourceType).toBe('pbl');
    });
  });

  describe('initializeDiscoveryScenarios', () => {
    it('should load Discovery scenarios', async () => {
      const mockDiscoveryData = {
        metadata: {
          title: 'Career Path',
          long_description: 'Explore careers',
          estimated_hours: 2
        },
        category: 'technology',
        world_setting: {},
        skill_tree: {}
      };

      const { discoveryYAMLLoader } = require('../discovery-yaml-loader');
      discoveryYAMLLoader.scanPaths.mockResolvedValue(['app_developer']);
      discoveryYAMLLoader.loadPath.mockResolvedValue(mockDiscoveryData);

      mockScenarioRepo.findByMode.mockResolvedValue([]);
      mockScenarioRepo.create.mockImplementation((s: any) => ({ ...s, id: 'created-2' }));

      const result = await service.initializeDiscoveryScenarios();

      expect(discoveryYAMLLoader.scanPaths).toHaveBeenCalled();
      expect(result.sourceType).toBe('discovery');
    });
  });

  describe('initializeAssessmentScenarios', () => {
    it('should load Assessment scenarios with dry run option', async () => {
      const mockAssessmentData = {
        config: {
          title: 'AI Literacy Test',
          description: 'Test your AI knowledge',
          total_questions: 12,
          time_limit_minutes: 15
        },
        questions: []
      };

      const { assessmentYAMLLoader } = require('../assessment-yaml-loader');
      assessmentYAMLLoader.scanAssessments.mockResolvedValue(['ai_literacy']);
      assessmentYAMLLoader.loadAssessment.mockResolvedValue(mockAssessmentData);
      assessmentYAMLLoader.getAvailableLanguages.mockResolvedValue(['en']);
      assessmentYAMLLoader.getTranslatedField.mockReturnValue('AI Literacy Test');

      const result = await service.initializeAssessmentScenarios({ dryRun: true });

      // In dry run mode, nothing should be created
      expect(result.sourceType).toBe('assessment');
      expect(mockScenarioRepo.create).not.toHaveBeenCalled();
      expect(assessmentYAMLLoader.scanAssessments).toHaveBeenCalled();
    });
  });
});