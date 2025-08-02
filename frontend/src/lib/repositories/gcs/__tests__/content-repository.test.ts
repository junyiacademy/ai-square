/**
 * GCS Content Repository Tests
 * 提升覆蓋率從 1.36% 到 80%+
 */

import { Storage, Bucket } from '@google-cloud/storage';
import { GCSContentRepository } from '../content-repository';
import type { ScenarioContent, KSAMapping, AILiteracyDomain } from '../../interfaces';

// Mock Google Cloud Storage
jest.mock('@google-cloud/storage');

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation()
};

describe('GCSContentRepository', () => {
  let repository: GCSContentRepository;
  let mockStorage: jest.Mocked<Storage>;
  let mockBucket: jest.Mocked<Bucket>;
  let mockFile: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock file
    mockFile = {
      exists: jest.fn().mockResolvedValue([true]),
      download: jest.fn()
    };

    // Setup mock bucket
    mockBucket = {
      file: jest.fn().mockReturnValue(mockFile),
      getFiles: jest.fn()
    } as unknown as jest.Mocked<Bucket>;

    // Setup mock storage
    mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket)
    } as unknown as jest.Mocked<Storage>;

    repository = new GCSContentRepository(mockStorage, 'test-bucket');
  });

  afterEach(() => {
    consoleSpy.error.mockClear();
  });

  describe('getYamlContent', () => {
    it('should get and parse YAML content', async () => {
      const yamlContent = `
title: Test Scenario
description: Test Description
tasks:
  - id: task1
    type: question
`;
      (mockFile.download as jest.Mock).mockResolvedValue([Buffer.from(yamlContent)]);

      const result = await repository.getYamlContent('test.yaml');

      expect(mockBucket.file).toHaveBeenCalledWith('test.yaml');
      expect(mockFile.exists).toHaveBeenCalled();
      expect(mockFile.download).toHaveBeenCalled();
      expect(result).toEqual({
        title: 'Test Scenario',
        description: 'Test Description',
        tasks: [{ id: 'task1', type: 'question' }]
      });
    });

    it('should throw error when file not found', async () => {
      (mockFile.exists as jest.Mock).mockResolvedValue([false]);

      await expect(repository.getYamlContent('missing.yaml'))
        .rejects.toThrow('File not found: missing.yaml');
    });

    it('should handle download errors', async () => {
      (mockFile.download as jest.Mock).mockRejectedValue(new Error('Download failed'));

      await expect(repository.getYamlContent('error.yaml'))
        .rejects.toThrow('Download failed');
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error reading YAML from GCS: error.yaml',
        expect.any(Error)
      );
    });
  });

  describe('listYamlFiles', () => {
    it('should list YAML files with .yaml extension', async () => {
      const mockFiles = [
        { name: 'test1.yaml' },
        { name: 'test2.yml' },
        { name: 'test3.json' },
        { name: 'test4.yaml' }
      ];
      (mockBucket.getFiles as jest.Mock).mockResolvedValue([mockFiles, {}, {}]);

      const result = await repository.listYamlFiles('scenarios/');

      expect(mockBucket.getFiles).toHaveBeenCalledWith({
        prefix: 'scenarios/',
        delimiter: '/'
      });
      expect(result).toEqual(['test1.yaml', 'test2.yml', 'test4.yaml']);
    });

    it('should handle listing errors', async () => {
      (mockBucket.getFiles as jest.Mock).mockRejectedValue(new Error('List failed'));

      await expect(repository.listYamlFiles('error/'))
        .rejects.toThrow('List failed');
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error listing YAML files: error/',
        expect.any(Error)
      );
    });
  });

  describe('getScenarioContent', () => {
    const mockScenarioYaml = {
      type: 'pbl',
      title: 'Test Scenario',
      title_zh: '測試場景',
      description: 'Test Description',
      description_zh: '測試描述',
      tasks: [
        {
          id: 'task1',
          type: 'question',
          title: 'Task 1',
          description: 'Task 1 Description',
          estimatedTime: 30,
          requiredForCompletion: true,
          ksaCodes: ['K1', 'S2']
        }
      ],
      difficulty: 'intermediate',
      duration: 60,
      prerequisites: ['basic-ai'],
      metadata: {
        tags: ['ai', 'test']
      }
    };

    it('should get scenario content with language-specific file', async () => {
      (mockFile.download as jest.Mock).mockResolvedValue([Buffer.from(JSON.stringify(mockScenarioYaml))]);
      jest.spyOn(repository as any, 'getYamlContent')
        .mockResolvedValueOnce(mockScenarioYaml);

      const result = await repository.getScenarioContent('test-scenario', 'zh');

      expect(result).toEqual({
        id: 'test-scenario',
        type: 'pbl',
        title: { en: 'Test Scenario', zh: '測試場景' },
        description: { en: 'Test Description', zh: '測試描述' },
        tasks: [{
          id: 'task1',
          type: 'question',
          title: 'Task 1',
          description: 'Task 1 Description',
          estimatedTime: 30,
          requiredForCompletion: true,
          ksaCodes: ['K1', 'S2']
        }],
        metadata: {
          difficulty: 'intermediate',
          duration: 60,
          prerequisites: ['basic-ai'],
          tags: ['ai', 'test']
        }
      });
    });

    it('should fallback to default content file', async () => {
      const getYamlSpy = jest.spyOn(repository as any, 'getYamlContent');
      getYamlSpy
        .mockRejectedValueOnce(new Error('Not found')) // language-specific fails
        .mockResolvedValueOnce(mockScenarioYaml); // default succeeds

      const result = await repository.getScenarioContent('test-scenario', 'fr');

      expect(getYamlSpy).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('test-scenario');
    });

    it('should try all possible paths', async () => {
      const getYamlSpy = jest.spyOn(repository as any, 'getYamlContent');
      getYamlSpy
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(mockScenarioYaml);

      const result = await repository.getScenarioContent('test-scenario');

      expect(getYamlSpy).toHaveBeenCalledTimes(5);
      expect(result.id).toBe('test-scenario');
    });

    it('should throw error when scenario not found', async () => {
      jest.spyOn(repository as any, 'getYamlContent')
        .mockRejectedValue(new Error('Not found'));

      await expect(repository.getScenarioContent('missing-scenario'))
        .rejects.toThrow('Scenario content not found: missing-scenario');
    });
  });

  describe('getAllScenarios', () => {
    it('should get all scenarios of specific type', async () => {
      const mockFiles = [
        'pbl_data/scenario1_scenario.yaml',
        'pbl_data/scenario2_scenario.yaml',
        'pbl_data/other.yaml'
      ];
      (mockBucket.getFiles as jest.Mock).mockResolvedValue([[
        { name: mockFiles[0] },
        { name: mockFiles[1] },
        { name: mockFiles[2] }
      ], {}, {}]);

      const mockScenarioContent = {
        type: 'pbl',
        title: 'Scenario'
      };
      jest.spyOn(repository as any, 'getYamlContent')
        .mockResolvedValue(mockScenarioContent);

      const result = await repository.getAllScenarios('pbl' as any);

      expect(mockBucket.getFiles).toHaveBeenCalledWith({
        prefix: 'pbl_data/',
        delimiter: '/'
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('scenario1');
      expect(result[1].id).toBe('scenario2');
    });

    it('should get all scenarios when no type specified', async () => {
      (mockBucket.getFiles as jest.Mock).mockResolvedValue([[], {}, {}]);

      const result = await repository.getAllScenarios();

      expect(mockBucket.getFiles).toHaveBeenCalledTimes(3); // pbl, assessment, discovery
      expect(result).toEqual([]);
    });

    it('should handle errors when loading individual scenarios', async () => {
      (mockBucket.getFiles as jest.Mock).mockResolvedValue([[
        { name: 'pbl_data/error_scenario.yaml' }
      ], {}, {}]);

      jest.spyOn(repository as any, 'getYamlContent')
        .mockRejectedValue(new Error('Parse error'));

      const result = await repository.getAllScenarios('pbl' as any);

      expect(result).toEqual([]);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error loading scenario: pbl_data/error_scenario.yaml',
        expect.any(Error)
      );
    });
  });

  describe('getKSAMappings', () => {
    it('should get and transform KSA mappings', async () => {
      const mockKSAContent = {
        knowledge: {
          K1: {
            domain: 'Engaging_with_AI',
            description: 'Basic AI concepts',
            description_zh: '基礎AI概念'
          }
        },
        skills: {
          S1: {
            domain: 'Creating_with_AI',
            description: 'Prompt engineering',
            description_zh: '提示工程'
          }
        },
        attitudes: {
          A1: {
            domain: 'Managing_AI',
            description: 'Ethical considerations',
            description_zh: '倫理考量'
          }
        }
      };

      jest.spyOn(repository as any, 'getYamlContent')
        .mockResolvedValue(mockKSAContent);

      const result = await repository.getKSAMappings();

      expect(result).toEqual([
        {
          code: 'K1',
          type: 'knowledge',
          domain: 'Engaging_with_AI',
          description: { en: 'Basic AI concepts', zh: '基礎AI概念' }
        },
        {
          code: 'S1',
          type: 'skill',
          domain: 'Creating_with_AI',
          description: { en: 'Prompt engineering', zh: '提示工程' }
        },
        {
          code: 'A1',
          type: 'attitude',
          domain: 'Managing_AI',
          description: { en: 'Ethical considerations', zh: '倫理考量' }
        }
      ]);
    });

    it('should return empty array on error', async () => {
      jest.spyOn(repository as any, 'getYamlContent')
        .mockRejectedValue(new Error('File not found'));

      const result = await repository.getKSAMappings();

      expect(result).toEqual([]);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error loading KSA mappings',
        expect.any(Error)
      );
    });
  });

  describe('getAILiteracyDomains', () => {
    it('should get and transform AI literacy domains', async () => {
      const mockDomainsContent = {
        domains: [
          {
            id: 'engaging_with_ai',
            name: 'Engaging with AI',
            name_zh: '與AI互動',
            description: 'Understanding AI',
            description_zh: '理解AI',
            competencies: ['C1', 'C2']
          },
          {
            id: 'creating_with_ai',
            name: 'Creating with AI',
            name_zh: '用AI創造',
            description: 'Using AI tools',
            description_zh: '使用AI工具',
            competencies: ['C3', 'C4']
          }
        ]
      };

      jest.spyOn(repository as any, 'getYamlContent')
        .mockResolvedValue(mockDomainsContent);

      const result = await repository.getAILiteracyDomains();

      expect(result).toEqual([
        {
          id: 'engaging_with_ai',
          name: { en: 'Engaging with AI', zh: '與AI互動' },
          description: { en: 'Understanding AI', zh: '理解AI' },
          competencies: ['C1', 'C2']
        },
        {
          id: 'creating_with_ai',
          name: { en: 'Creating with AI', zh: '用AI創造' },
          description: { en: 'Using AI tools', zh: '使用AI工具' },
          competencies: ['C3', 'C4']
        }
      ]);
    });

    it('should return empty array on error', async () => {
      jest.spyOn(repository as any, 'getYamlContent')
        .mockRejectedValue(new Error('File not found'));

      const result = await repository.getAILiteracyDomains();

      expect(result).toEqual([]);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error loading AI literacy domains',
        expect.any(Error)
      );
    });

    it('should handle missing domains array', async () => {
      jest.spyOn(repository as any, 'getYamlContent')
        .mockResolvedValue({ someOtherField: 'value' });

      const result = await repository.getAILiteracyDomains();

      expect(result).toEqual([]);
    });
  });

  describe('extractMultilingualField', () => {
    it('should extract multilingual fields correctly', async () => {
      const obj = {
        title: 'English Title',
        title_zh: '中文標題',
        title_zhTW: '繁體中文標題',
        title_es: 'Título en español',
        title_fr: 'Titre français',
        description: 'English Description'
      };

      // Access private method through transformScenarioContent
      const mockContent = {
        ...obj,
        type: 'pbl',
        tasks: []
      };
      jest.spyOn(repository as any, 'getYamlContent')
        .mockResolvedValue(mockContent);

      const result = await repository.getScenarioContent('test');

      expect(result.title).toEqual({
        en: 'English Title',
        zh: '中文標題',
        zhTW: '繁體中文標題',
        es: 'Título en español',
        fr: 'Titre français'
      });
      expect(result.description).toEqual({
        en: 'English Description'
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined data gracefully', async () => {
      const mockContent = {
        type: null,
        title: undefined,
        tasks: null,
        metadata: undefined
      };
      jest.spyOn(repository as any, 'getYamlContent')
        .mockResolvedValue(mockContent);

      const result = await repository.getScenarioContent('test');

      expect(result).toEqual({
        id: 'test',
        type: 'pbl', // defaults to 'pbl'
        title: {},
        description: {},
        tasks: [],
        metadata: {
          difficulty: undefined,
          duration: undefined,
          prerequisites: undefined
        }
      });
    });

    it('should handle invalid KSA data structure', async () => {
      const mockKSAContent = {
        knowledge: 'invalid', // Should be object
        skills: null,
        attitudes: {
          A1: 'string instead of object'
        }
      };

      jest.spyOn(repository as any, 'getYamlContent')
        .mockResolvedValue(mockKSAContent);

      const result = await repository.getKSAMappings();

      expect(result).toEqual([]); // Should handle gracefully
    });
  });
});