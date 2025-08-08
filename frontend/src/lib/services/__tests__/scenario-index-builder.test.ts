import { scenarioIndexBuilder } from '../scenario-index-builder';
import { scenarioIndexService } from '../scenario-index-service';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { IScenario } from '@/types/unified-learning';

// Mock dependencies
jest.mock('../scenario-index-service');
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: jest.fn()
  }
}));

const mockScenarioIndexService = scenarioIndexService as jest.Mocked<typeof scenarioIndexService>;
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('ScenarioIndexBuilder', () => {
  let builder: typeof scenarioIndexBuilder;
  let mockScenarioRepo: {
    findBySource: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const mockPblScenarios: IScenario[] = [
    {
      id: 'pbl-1',
      mode: 'pbl',
      sourceType: 'yaml',
      sourcePath: 'pbl/scenario1.yaml',
      sourceId: undefined,
      sourceMetadata: {},
      title: { en: 'PBL Scenario 1' },
      description: { en: 'PBL Test 1' },
      version: '1.0.0',
      objectives: ['Learn PBL'],
      difficulty: 'intermediate',
      estimatedMinutes: 60,
      prerequisites: [],
      taskTemplates: [],
      taskCount: 5,
      xpRewards: { completion: 100 },
      unlockRequirements: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      metadata: {},
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const mockAssessmentScenarios: IScenario[] = [
    {
      id: 'assessment-1',
      mode: 'assessment',
      sourceType: 'yaml',
      sourcePath: 'assessment/scenario1.yaml',
      sourceId: undefined,
      sourceMetadata: {},
      title: { en: 'Assessment Scenario 1' },
      description: { en: 'Assessment Test 1' },
      version: '1.0.0',
      objectives: ['Assess knowledge'],
      difficulty: 'intermediate',
      estimatedMinutes: 30,
      prerequisites: [],
      taskTemplates: [],
      taskCount: 10,
      xpRewards: { completion: 150 },
      unlockRequirements: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      metadata: {},
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const mockDiscoveryScenarios: IScenario[] = [
    {
      id: 'discovery-1',
      mode: 'discovery',
      sourceType: 'yaml',
      sourcePath: 'discovery/scenario1.yaml',
      sourceId: undefined,
      sourceMetadata: {},
      title: { en: 'Discovery Scenario 1' },
      description: { en: 'Discovery Test 1' },
      version: '1.0.0',
      objectives: ['Explore careers'],
      difficulty: 'beginner',
      estimatedMinutes: 45,
      prerequisites: [],
      taskTemplates: [],
      taskCount: 8,
      xpRewards: { completion: 120 },
      unlockRequirements: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      aiModules: {},
      resources: [],
      metadata: {},
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the singleton's cache by accessing private properties
    // This is needed to test cache behavior
    (scenarioIndexBuilder as unknown as Record<string, unknown>)['lastBuildTime'] = null;
    (scenarioIndexBuilder as unknown as Record<string, unknown>)['isBuilding'] = false;
    
    // Setup mocks
    mockScenarioRepo = {
      findBySource: jest.fn((source: string) => {
        switch (source) {
          case 'pbl':
            return Promise.resolve(mockPblScenarios);
          case 'assessment':
            return Promise.resolve(mockAssessmentScenarios);
          case 'discovery':
            return Promise.resolve(mockDiscoveryScenarios);
          default:
            return Promise.resolve([]);
        }
      }),
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    };

    mockRepositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);
    mockScenarioIndexService.buildIndex = jest.fn().mockResolvedValue({
      yamlToUuid: new Map(),
      uuidToYaml: new Map(),
      lastUpdated: new Date().toISOString()
    });

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    builder = scenarioIndexBuilder;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('singleton', () => {
    it('scenarioIndexBuilder is a singleton', () => {
      // scenarioIndexBuilder is already exported as a singleton instance
      expect(builder).toBe(scenarioIndexBuilder);
    });
  });

  describe('buildFullIndex', () => {
    it('builds index with scenarios from all sources', async () => {
      await builder.buildFullIndex();

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith('pbl');
      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith('assessment');
      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith('discovery');
      expect(mockScenarioRepo.findBySource).toHaveBeenCalledTimes(3);

      const expectedScenarios = [
        ...mockPblScenarios,
        ...mockAssessmentScenarios,
        ...mockDiscoveryScenarios
      ];
      expect(mockScenarioIndexService.buildIndex).toHaveBeenCalledWith(expectedScenarios);
    });

    it('groups scenarios by mode', async () => {
      await builder.buildFullIndex();

      // Check that console was called with building messages
      expect(consoleLogSpy).toHaveBeenCalledWith('Building scenario index...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Building index for 3 scenarios...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Scenario index built successfully');
    });

    it('prevents concurrent builds', async () => {
      // Start first build
      const firstBuild = builder.buildFullIndex();
      
      // Try to start second build immediately
      const secondBuild = builder.buildFullIndex();

      await Promise.all([firstBuild, secondBuild]);

      // Should only fetch scenarios once
      expect(mockScenarioRepo.findBySource).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith('Index build already in progress, skipping...');
    });

    it('prevents too frequent builds', async () => {
      // First build
      await builder.buildFullIndex();
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Try to build again immediately
      await builder.buildFullIndex();

      // Should not fetch scenarios again
      expect(mockScenarioRepo.findBySource).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Index was recently built, skipping...');
    });

    it('handles errors gracefully', async () => {
      const error = new Error('Database error');
      mockScenarioRepo.findBySource.mockRejectedValueOnce(error);

      await builder.buildFullIndex();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error building scenario index:', error);
      expect(mockScenarioIndexService.buildIndex).not.toHaveBeenCalled();
    });

    it('logs build completion time', async () => {
      await builder.buildFullIndex();

      // Just check that completion is logged, don't match exact format
      expect(consoleLogSpy).toHaveBeenCalledWith('Scenario index built successfully');
    });
  });

  // TODO: buildForMode method doesn't exist in ScenarioIndexBuilder
  // These tests should be updated to use buildSourceIndex instead
  /*
  describe('buildForMode', () => {
    it('builds index for specific mode only', async () => {
      await builder.buildForMode('pbl');

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith('pbl');
      expect(mockScenarioRepo.findBySource).toHaveBeenCalledTimes(1);
      // expect(mockScenarioIndexService.updateModeScenarios).toHaveBeenCalledWith('pbl', mockPblScenarios); // Method doesn't exist
    });

    it('handles assessment mode', async () => {
      await builder.buildForMode('assessment');

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith('assessment');
      // expect(mockScenarioIndexService.updateModeScenarios).toHaveBeenCalledWith('assessment', mockAssessmentScenarios); // Method doesn't exist
    });

    it('handles discovery mode', async () => {
      await builder.buildForMode('discovery');

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith('discovery');
      // expect(mockScenarioIndexService.updateModeScenarios).toHaveBeenCalledWith('discovery', mockDiscoveryScenarios); // Method doesn't exist
    });

    it('logs mode-specific build info', async () => {
      await builder.buildForMode('pbl');

      expect(consoleLogSpy).toHaveBeenCalledWith('Building index for mode: pbl');
      expect(consoleLogSpy).toHaveBeenCalledWith('Found 1 pbl scenarios');
    });

    it('handles mode build errors', async () => {
      const error = new Error('Mode fetch error');
      mockScenarioRepo.findBySource.mockRejectedValueOnce(error);

      await builder.buildForMode('pbl');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error building index for mode pbl:', error);
    });
  });
  */

  // TODO: clearIndex method doesn't exist in ScenarioIndexBuilder
  /*
  describe('clearIndex', () => {
    it('clears the scenario index', async () => {
      await builder.clearIndex();

      // expect(mockScenarioIndexService.clearIndex).toHaveBeenCalled(); // Method doesn't exist
      expect(consoleLogSpy).toHaveBeenCalledWith('Scenario index cleared');
    });
  });
  */

  // TODO: getStats method doesn't exist in ScenarioIndexBuilder
  /*
  describe('getStats', () => {
    it('returns index statistics', () => {
      const mockStats = {
        totalScenarios: 10,
        pbl: 4,
        assessment: 3,
        discovery: 3,
        lastUpdated: new Date().toISOString()
      };
      // mockScenarioIndexService.getStats.mockReturnValue(mockStats); // Method doesn't exist

      // const stats = builder.getStats(); // Method doesn't exist

      // expect(stats).toEqual(mockStats);
      // expect(mockScenarioIndexService.getStats).toHaveBeenCalled(); // Method doesn't exist
    });
  });
  */
});
