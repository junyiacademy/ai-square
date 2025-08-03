/**
 * PBL Scenario Service Tests
 * 測試覆蓋率從 12.82% 提升到 95%+
 */

import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { PBLScenarioService } from '../pbl-scenario-service';
import type { IScenario } from '@/types/unified-learning';

// Mock fs, path, and yaml modules
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn()
  }
}));
jest.mock('js-yaml');
jest.mock('@/lib/repositories/base/repository-factory');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;

// Mock repository
const mockScenarioRepo = {
  create: jest.fn(),
  findBySource: jest.fn()
};

const mockRepositoryFactory = {
  getScenarioRepository: jest.fn(() => mockScenarioRepo)
};

// Apply the mock
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: mockRepositoryFactory
}));

describe('PBLScenarioService', () => {
  let service: PBLScenarioService;

  const mockPBLYAMLData = {
    scenario_info: {
      id: 'ai-education-design',
      title: 'AI Education Design',
      title_zhTW: 'AI 教育設計',
      description: 'Design AI-powered education',
      description_zhTW: '設計 AI 驅動的教育',
      difficulty: 'intermediate',
      estimated_duration: 120,
      target_domains: ['engaging_with_ai', 'creating_with_ai'],
      prerequisites: ['Basic AI knowledge'],
      learning_objectives: ['Design AI curriculum', 'Create AI tools'],
      learning_objectives_zhTW: ['設計 AI 課程', '創建 AI 工具']
    },
    tasks: [
      {
        id: 'task-1',
        title: 'Research AI Tools',
        title_zhTW: '研究 AI 工具',
        description: 'Research existing AI education tools',
        description_zhTW: '研究現有的 AI 教育工具',
        category: 'research',
        instructions: ['Find tools', 'Compare features'],
        instructions_zhTW: ['尋找工具', '比較功能'],
        expected_outcome: 'Tool comparison report',
        expected_outcome_zhTW: '工具比較報告',
        time_limit: 60
      },
      {
        id: 'task-2',
        title: 'Design Curriculum',
        title_zhTW: '設計課程',
        description: 'Create AI curriculum outline',
        description_zhTW: '創建 AI 課程大綱',
        category: 'design',
        instructions: ['Define modules', 'Set objectives'],
        expected_outcome: 'Curriculum document'
      }
    ],
    ksa_mapping: {
      knowledge: ['K001', 'K002', 'K003'],
      skills: ['S001', 'S002'],
      attitudes: ['A001']
    }
  };

  const mockCreatedScenario: IScenario = {
    id: 'uuid-123',
    mode: 'pbl',
    status: 'active',
    version: '1.0.0',
    sourceType: 'yaml',
    sourcePath: 'pbl_data/scenarios/ai_education_design',
    sourceId: 'ai-education-design',
    sourceMetadata: {
      yamlId: 'ai-education-design',
      language: 'en',
      originalId: 'ai-education-design'
    },
    title: { en: 'AI Education Design' },
    description: { en: 'Design AI-powered education' },
    objectives: ['Design AI curriculum', 'Create AI tools'],
    difficulty: 'intermediate',
    estimatedMinutes: 120,
    prerequisites: ['Basic AI knowledge'],
    taskTemplates: [],
    taskCount: 2,
    xpRewards: {},
    unlockRequirements: {},
    pblData: {
      targetDomains: ['engaging_with_ai', 'creating_with_ai'],
      ksaMapping: {
        knowledge: ['K001', 'K002', 'K003'],
        skills: ['S001', 'S002'],
        attitudes: ['A001']
      }
    },
    discoveryData: {},
    assessmentData: {},
    aiModules: {},
    resources: [],
    metadata: {},
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PBLScenarioService();
    
    // Setup default mocks
    mockScenarioRepo.create.mockResolvedValue(mockCreatedScenario);
    mockScenarioRepo.findBySource.mockResolvedValue([]);
    mockFs.readFile.mockResolvedValue(Buffer.from('yaml content'));
    mockYaml.load.mockReturnValue(mockPBLYAMLData);
  });

  describe('createScenarioFromYAML', () => {
    it('should create scenario from YAML with English content', async () => {
      mockFs.access.mockResolvedValue();

      const scenario = await service.createScenarioFromYAML('ai-education-design', 'en');

      expect(scenario).toEqual(mockCreatedScenario);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('ai_education_design_en.yaml'),
        'utf8'
      );
      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'pbl',
          sourceType: 'yaml',
          sourceId: 'ai-education-design',
          title: { en: 'AI Education Design' },
          description: { en: 'Design AI-powered education' }
        })
      );
    });

    it('should create scenario with Traditional Chinese content', async () => {
      mockFs.access.mockResolvedValue();
      
      const scenario = await service.createScenarioFromYAML('ai-education-design', 'zhTW');

      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('ai_education_design_zhTW.yaml'),
        'utf8'
      );
      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: { zhTW: 'AI 教育設計' },
          description: { zhTW: '設計 AI 驅動的教育' },
          objectives: ['設計 AI 課程', '創建 AI 工具']
        })
      );
    });

    it('should fall back to English when language file not found', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('File not found'));
      mockFs.access.mockResolvedValueOnce();

      await service.createScenarioFromYAML('ai-education-design', 'es');

      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('ai_education_design_en.yaml'),
        'utf8'
      );
    });

    it('should convert tasks to templates correctly', async () => {
      mockFs.access.mockResolvedValue();

      await service.createScenarioFromYAML('ai-education-design', 'en');

      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskTemplates: expect.arrayContaining([
            expect.objectContaining({
              id: 'task-1',
              title: { en: 'Research AI Tools' },
              type: 'chat',
              description: { en: 'Research existing AI education tools' },
              metadata: {
                category: 'research',
                instructions: ['Find tools', 'Compare features'],
                expectedOutcome: 'Tool comparison report',
                timeLimit: 60,
                originalTaskData: expect.any(Object)
              }
            })
          ]),
          taskCount: 2
        })
      );
    });

    it('should handle missing optional fields', async () => {
      const minimalData = {
        scenario_info: {
          id: 'minimal',
          title: 'Minimal Scenario',
          description: 'A minimal scenario',
          difficulty: 'beginner',
          estimated_duration: 30,
          target_domains: ['ai']
        }
      };
      mockYaml.load.mockReturnValue(minimalData);
      mockFs.access.mockResolvedValue();

      await service.createScenarioFromYAML('minimal', 'en');

      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          prerequisites: [],
          objectives: [],
          taskTemplates: [],
          taskCount: 0
        })
      );
    });

    it('should use default difficulty when not provided', async () => {
      const noDifficultyData = {
        ...mockPBLYAMLData,
        scenario_info: {
          ...mockPBLYAMLData.scenario_info,
          difficulty: undefined
        }
      };
      mockYaml.load.mockReturnValue(noDifficultyData);
      mockFs.access.mockResolvedValue();

      await service.createScenarioFromYAML('ai-education-design', 'en');

      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: 'intermediate'
        })
      );
    });

    it('should handle YAML parse errors', async () => {
      mockFs.access.mockResolvedValue();
      mockYaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      await expect(service.createScenarioFromYAML('invalid', 'en')).rejects.toThrow('Invalid YAML');
    });
  });

  describe('findOrCreateScenarioByYAMLId', () => {
    it('should return existing scenario if found', async () => {
      const existingScenario = {
        ...mockCreatedScenario,
        sourceMetadata: { yamlId: 'ai-education-design' }
      };
      mockScenarioRepo.findBySource.mockResolvedValue([existingScenario]);

      const result = await service.findOrCreateScenarioByYAMLId('ai-education-design', 'en');

      expect(result).toEqual(existingScenario);
      expect(mockScenarioRepo.create).not.toHaveBeenCalled();
    });

    it('should create new scenario if not found', async () => {
      mockScenarioRepo.findBySource.mockResolvedValue([]);
      mockFs.access.mockResolvedValue();

      const result = await service.findOrCreateScenarioByYAMLId('ai-education-design', 'en');

      expect(result).toEqual(mockCreatedScenario);
      expect(mockScenarioRepo.create).toHaveBeenCalled();
    });

    it('should handle multiple scenarios and find correct one', async () => {
      const scenarios = [
        { ...mockCreatedScenario, sourceMetadata: { yamlId: 'other-scenario' } },
        { ...mockCreatedScenario, sourceMetadata: { yamlId: 'ai-education-design' } },
        { ...mockCreatedScenario, sourceMetadata: { yamlId: 'another-scenario' } }
      ];
      mockScenarioRepo.findBySource.mockResolvedValue(scenarios);

      const result = await service.findOrCreateScenarioByYAMLId('ai-education-design', 'en');

      expect(result).toEqual(scenarios[1]);
    });

    it('should handle scenario without sourceMetadata', async () => {
      const scenarioWithoutMetadata = { ...mockCreatedScenario, sourceMetadata: undefined };
      mockScenarioRepo.findBySource.mockResolvedValue([scenarioWithoutMetadata]);
      mockFs.access.mockResolvedValue();

      const result = await service.findOrCreateScenarioByYAMLId('ai-education-design', 'en');

      expect(result).toEqual(mockCreatedScenario);
      expect(mockScenarioRepo.create).toHaveBeenCalled();
    });
  });

  describe('listAvailableYAMLIds', () => {
    it('should list all available YAML IDs', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'ai_education_design', isDirectory: () => true },
        { name: 'robotics_development', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false },
        { name: '_templates', isDirectory: () => true }
      ] as any);

      const ids = await service.listAvailableYAMLIds();

      expect(ids).toEqual(['ai-education-design', 'robotics-development']);
      expect(mockFs.readdir).toHaveBeenCalledWith(
        expect.stringContaining('pbl_data/scenarios'),
        { withFileTypes: true }
      );
    });

    it('should handle empty directory', async () => {
      mockFs.readdir.mockResolvedValue([]);

      const ids = await service.listAvailableYAMLIds();

      expect(ids).toEqual([]);
    });

    it('should handle directory read errors', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      await expect(service.listAvailableYAMLIds()).rejects.toThrow('Permission denied');
    });
  });

  describe('private methods through public API', () => {
    it('should handle language suffixes correctly', async () => {
      const dataWithSuffixes = {
        scenario_info: {
          ...mockPBLYAMLData.scenario_info,
          title_es: 'Diseño de Educación AI',
          description_es: 'Diseñar educación impulsada por AI',
          learning_objectives_es: ['Diseñar currículo AI', 'Crear herramientas AI']
        }
      };
      mockYaml.load.mockReturnValue(dataWithSuffixes);
      mockFs.access.mockResolvedValue();

      await service.createScenarioFromYAML('ai-education-design', 'es');

      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: { es: 'Diseño de Educación AI' },
          description: { es: 'Diseñar educación impulsada por AI' },
          objectives: ['Diseñar currículo AI', 'Crear herramientas AI']
        })
      );
    });

    it('should handle missing localized fields', async () => {
      const dataWithoutLocalized = {
        scenario_info: {
          id: 'test',
          title: 'Only English Title',
          description: 'Only English Description',
          difficulty: 'beginner',
          estimated_duration: 60,
          target_domains: ['ai'],
          learning_objectives: ['Learn AI']
        }
      };
      mockYaml.load.mockReturnValue(dataWithoutLocalized);
      mockFs.access.mockResolvedValue();

      await service.createScenarioFromYAML('test', 'zhTW');

      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: { zhTW: 'Only English Title' },
          description: { zhTW: 'Only English Description' },
          objectives: ['Learn AI']
        })
      );
    });

    it('should handle non-array objectives field', async () => {
      const dataWithStringObjectives = {
        ...mockPBLYAMLData,
        scenario_info: {
          ...mockPBLYAMLData.scenario_info,
          learning_objectives: 'Single objective as string'
        }
      };
      mockYaml.load.mockReturnValue(dataWithStringObjectives);
      mockFs.access.mockResolvedValue();

      await service.createScenarioFromYAML('test', 'en');

      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          objectives: []
        })
      );
    });

    it('should preserve original task data in metadata', async () => {
      mockFs.access.mockResolvedValue();

      await service.createScenarioFromYAML('ai-education-design', 'en');

      const createCall = mockScenarioRepo.create.mock.calls[0][0];
      expect(createCall.taskTemplates[0].metadata.originalTaskData).toEqual(mockPBLYAMLData.tasks[0]);
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent calls gracefully', async () => {
      mockFs.access.mockResolvedValue();

      const promises = Array(5).fill(null).map((_, i) =>
        service.createScenarioFromYAML(`scenario-${i}`, 'en')
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockScenarioRepo.create).toHaveBeenCalledTimes(5);
    });

    it('should handle special characters in IDs', async () => {
      mockFs.access.mockResolvedValue();

      await service.createScenarioFromYAML('ai-education-design-v2', 'en');

      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('ai_education_design_v2'),
        'utf8'
      );
      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourcePath: 'pbl_data/scenarios/ai_education_design_v2'
        })
      );
    });

    it('should handle empty KSA mapping', async () => {
      const dataWithoutKSA = {
        ...mockPBLYAMLData,
        ksa_mapping: undefined
      };
      mockYaml.load.mockReturnValue(dataWithoutKSA);
      mockFs.access.mockResolvedValue();

      await service.createScenarioFromYAML('test', 'en');

      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pblData: {
            targetDomains: ['engaging_with_ai', 'creating_with_ai'],
            ksaMapping: undefined
          }
        })
      );
    });

    it('should use singleton instance', () => {
      const { pblScenarioService } = require('../pbl-scenario-service');
      expect(pblScenarioService).toBeInstanceOf(PBLScenarioService);
    });
  });
});