import { ScenarioIndexBuilder } from '../scenario-index-builder';
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
  let builder: ScenarioIndexBuilder;
  let mockScenarioRepo: any;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const mockPblScenarios: IScenario[] = [
    {
      id: 'pbl-1',
      mode: 'pbl',
      sourceType: 'yaml',
      sourcePath: 'pbl/scenario1.yaml',
      title: { en: 'PBL Scenario 1' },
      description: { en: 'PBL Test 1' },
      objectives: { en: 'Learn PBL' },
      taskTemplates: [],
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
      title: { en: 'Assessment Scenario 1' },
      description: { en: 'Assessment Test 1' },
      objectives: { en: 'Assess knowledge' },
      taskTemplates: [],
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
      title: { en: 'Discovery Scenario 1' },
      description: { en: 'Discovery Test 1' },
      objectives: { en: 'Explore careers' },
      taskTemplates: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (ScenarioIndexBuilder as any).instance = undefined;
    
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
      })
    };

    mockRepositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);
    mockScenarioIndexService.updateIndex.mockReturnValue(undefined);

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    builder = ScenarioIndexBuilder.getInstance();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = ScenarioIndexBuilder.getInstance();
      const instance2 = ScenarioIndexBuilder.getInstance();
      
      expect(instance1).toBe(instance2);
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
      expect(mockScenarioIndexService.updateIndex).toHaveBeenCalledWith(expectedScenarios);
    });

    it('groups scenarios by mode', async () => {
      await builder.buildFullIndex();

      expect(consoleLogSpy).toHaveBeenCalledWith('- PBL scenarios:', 1);
      expect(consoleLogSpy).toHaveBeenCalledWith('- Assessment scenarios:', 1);
      expect(consoleLogSpy).toHaveBeenCalledWith('- Discovery scenarios:', 1);
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
      expect(mockScenarioIndexService.updateIndex).not.toHaveBeenCalled();
    });

    it('logs build completion time', async () => {
      await builder.buildFullIndex();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^Scenario index built successfully in \d+ms$/)
      );
    });
  });

  describe('buildForMode', () => {
    it('builds index for specific mode only', async () => {
      await builder.buildForMode('pbl');

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith('pbl');
      expect(mockScenarioRepo.findBySource).toHaveBeenCalledTimes(1);
      expect(mockScenarioIndexService.updateModeScenarios).toHaveBeenCalledWith('pbl', mockPblScenarios);
    });

    it('handles assessment mode', async () => {
      await builder.buildForMode('assessment');

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith('assessment');
      expect(mockScenarioIndexService.updateModeScenarios).toHaveBeenCalledWith('assessment', mockAssessmentScenarios);
    });

    it('handles discovery mode', async () => {
      await builder.buildForMode('discovery');

      expect(mockScenarioRepo.findBySource).toHaveBeenCalledWith('discovery');
      expect(mockScenarioIndexService.updateModeScenarios).toHaveBeenCalledWith('discovery', mockDiscoveryScenarios);
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

  describe('clearIndex', () => {
    it('clears the scenario index', async () => {
      await builder.clearIndex();

      expect(mockScenarioIndexService.clearIndex).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Scenario index cleared');
    });
  });

  describe('getStats', () => {
    it('returns index statistics', () => {
      const mockStats = {
        totalScenarios: 10,
        pbl: 4,
        assessment: 3,
        discovery: 3,
        lastUpdated: new Date().toISOString()
      };
      mockScenarioIndexService.getStats.mockReturnValue(mockStats);

      const stats = builder.getStats();

      expect(stats).toEqual(mockStats);
      expect(mockScenarioIndexService.getStats).toHaveBeenCalled();
    });
  });
});
