/**
 * Tests for GCSContentRepository
 * Full coverage following TDD Red → Green → Refactor principles
 */

import { GCSContentRepository } from '../content-repository';
import { Storage, Bucket } from '@google-cloud/storage';
import { parse as parseYaml } from 'yaml';

// Mock Google Cloud Storage
jest.mock('@google-cloud/storage');
jest.mock('yaml');

describe('GCSContentRepository', () => {
  let repository: GCSContentRepository;
  let mockStorage: any;
  let mockBucket: any;
  let mockFile: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFile = {
      exists: jest.fn(),
      download: jest.fn(),
      name: 'test-file.yaml'
    };

    mockBucket = {
      file: jest.fn().mockReturnValue(mockFile),
      getFiles: jest.fn()
    };

    mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket)
    };

    repository = new GCSContentRepository(mockStorage, 'test-bucket');
  });

  describe('constructor', () => {
    it('should initialize with storage and bucket name', () => {
      expect(mockStorage.bucket).toHaveBeenCalledWith('test-bucket');
      expect(repository).toBeDefined();
    });
  });

  describe('getYamlContent', () => {
    const mockYamlContent = {
      title: 'Test Scenario',
      description: 'Test Description',
      tasks: []
    };

    beforeEach(() => {
      (parseYaml as jest.Mock).mockReturnValue(mockYamlContent);
    });

    it('should successfully read and parse YAML content', async () => {
      mockFile.exists.mockResolvedValueOnce([true]);
      mockFile.download.mockResolvedValueOnce([Buffer.from('title: Test Scenario')]);

      const result = await repository.getYamlContent('test/path.yaml');

      expect(mockBucket.file).toHaveBeenCalledWith('test/path.yaml');
      expect(mockFile.exists).toHaveBeenCalled();
      expect(mockFile.download).toHaveBeenCalled();
      expect(parseYaml).toHaveBeenCalledWith('title: Test Scenario');
      expect(result).toEqual(mockYamlContent);
    });

    it('should throw error when file does not exist', async () => {
      mockFile.exists.mockResolvedValueOnce([false]);

      await expect(repository.getYamlContent('nonexistent.yaml'))
        .rejects.toThrow('File not found: nonexistent.yaml');

      expect(mockFile.download).not.toHaveBeenCalled();
    });

    it('should handle download errors', async () => {
      mockFile.exists.mockResolvedValueOnce([true]);
      mockFile.download.mockRejectedValueOnce(new Error('Download failed'));

      await expect(repository.getYamlContent('error.yaml'))
        .rejects.toThrow('Download failed');
    });

    it('should handle YAML parsing errors', async () => {
      mockFile.exists.mockResolvedValueOnce([true]);
      mockFile.download.mockResolvedValueOnce([Buffer.from('invalid: yaml: content:')]);
      (parseYaml as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid YAML');
      });

      await expect(repository.getYamlContent('invalid.yaml'))
        .rejects.toThrow('Invalid YAML');
    });
  });

  describe('listYamlFiles', () => {
    it('should list YAML files with given prefix', async () => {
      const mockFiles = [
        { name: 'scenarios/test1.yaml' },
        { name: 'scenarios/test2.yml' },
        { name: 'scenarios/test3.json' }, // Should be filtered out
        { name: 'scenarios/test4.yaml' }
      ];

      mockBucket.getFiles.mockResolvedValueOnce([mockFiles] as any);

      const result = await repository.listYamlFiles('scenarios/');

      expect(mockBucket.getFiles).toHaveBeenCalledWith({
        prefix: 'scenarios/',
        delimiter: '/'
      });
      expect(result).toEqual([
        'scenarios/test1.yaml',
        'scenarios/test2.yml',
        'scenarios/test4.yaml'
      ]);
    });

    it('should handle empty file list', async () => {
      mockBucket.getFiles.mockResolvedValueOnce([[]]);

      const result = await repository.listYamlFiles('empty/');

      expect(result).toEqual([]);
    });

    it('should handle GCS errors', async () => {
      mockBucket.getFiles.mockRejectedValueOnce(new Error('GCS error'));

      await expect(repository.listYamlFiles('error/'))
        .rejects.toThrow('GCS error');
    });
  });

  describe('getScenarioContent', () => {
    const mockScenarioData = {
      id: 'test-scenario',
      title: 'Test Scenario',
      description: 'Test Description',
      tasks: [
        { id: 'task1', title: 'Task 1' }
      ],
      mode: 'pbl'
    };

    beforeEach(() => {
      jest.spyOn(repository, 'getYamlContent').mockImplementation(async (path: string) => {
        if (path.includes('content_zh.yaml')) {
          return { ...mockScenarioData, title: '測試情境' };
        }
        if (path.includes('content.yaml') || path.includes('_scenario.yaml')) {
          return mockScenarioData;
        }
        throw new Error('File not found');
      });

      jest.spyOn(repository as any, 'transformScenarioContent').mockImplementation((content: any, id: string) => ({
        ...content,
        id,
        transformed: true
      }));
    });

    it('should get scenario content with language preference', async () => {
      const result: any = await repository.getScenarioContent('test-scenario', 'zh');

      expect(repository.getYamlContent).toHaveBeenCalledWith('scenarios/test-scenario/content_zh.yaml');
      expect(result.title).toBe('測試情境');
      expect(result.transformed).toBe(true);
    });

    it('should fallback to default language when specific language not found', async () => {
      jest.spyOn(repository, 'getYamlContent').mockImplementation(async (path: string) => {
        if (path.includes('content_fr.yaml')) {
          throw new Error('File not found');
        }
        if (path.includes('content.yaml')) {
          return mockScenarioData;
        }
        throw new Error('File not found');
      });

      const result = await repository.getScenarioContent('test-scenario', 'fr');

      expect(repository.getYamlContent).toHaveBeenCalledWith('scenarios/test-scenario/content_fr.yaml');
      expect(repository.getYamlContent).toHaveBeenCalledWith('scenarios/test-scenario/content.yaml');
      expect(result.title).toBe('Test Scenario');
    });

    it('should try different path patterns', async () => {
      jest.spyOn(repository, 'getYamlContent').mockImplementation(async (path: string) => {
        if (path.includes('pbl_data/test-scenario_scenario.yaml')) {
          return { ...mockScenarioData, mode: 'pbl' };
        }
        throw new Error('File not found');
      });

      const result = await repository.getScenarioContent('test-scenario');

      expect(repository.getYamlContent).toHaveBeenCalledWith('scenarios/test-scenario/content_en.yaml');
      expect(repository.getYamlContent).toHaveBeenCalledWith('scenarios/test-scenario/content.yaml');
      expect(repository.getYamlContent).toHaveBeenCalledWith('pbl_data/test-scenario_scenario.yaml');
      expect(result.mode).toBe('pbl');
    });

    it('should throw error when no content found', async () => {
      jest.spyOn(repository, 'getYamlContent').mockRejectedValue(new Error('File not found'));

      await expect(repository.getScenarioContent('nonexistent'))
        .rejects.toThrow('Scenario content not found: nonexistent');
    });
  });

  describe('getAllScenarios', () => {
    beforeEach(() => {
      jest.spyOn(repository, 'listYamlFiles').mockImplementation(async (prefix: string) => {
        if (prefix === 'pbl_data/') {
          return [
            'pbl_data/scenario1_scenario.yaml',
            'pbl_data/scenario2_scenario.yaml',
            'pbl_data/other_file.yaml' // Should be ignored
          ];
        }
        if (prefix === 'assessment_data/') {
          return ['assessment_data/quiz1_scenario.yaml'];
        }
        return [];
      });

      jest.spyOn(repository, 'getYamlContent').mockImplementation(async (path: string) => {
        if (path.includes('scenario1')) {
          return { id: 'scenario1', title: 'PBL Scenario 1' };
        }
        if (path.includes('scenario2')) {
          return { id: 'scenario2', title: 'PBL Scenario 2' };
        }
        if (path.includes('quiz1')) {
          return { id: 'quiz1', title: 'Assessment Quiz 1' };
        }
        throw new Error('File not found');
      });

      jest.spyOn(repository as any, 'transformScenarioContent').mockImplementation((content: any, id: string) => ({
        ...content,
        id,
        transformed: true
      }));
    });

    it('should get all scenarios without type filter', async () => {
      const result = await repository.getAllScenarios();

      expect(repository.listYamlFiles).toHaveBeenCalledWith('pbl_data/');
      expect(repository.listYamlFiles).toHaveBeenCalledWith('assessment_data/');
      expect(repository.listYamlFiles).toHaveBeenCalledWith('discovery_data/');
      
      expect(result).toHaveLength(3);
      expect(result.map(s => s.id)).toContain('scenario1');
      expect(result.map(s => s.id)).toContain('scenario2');
      expect(result.map(s => s.id)).toContain('quiz1');
    });

    it('should get scenarios filtered by type', async () => {
      const result = await repository.getAllScenarios('pbl');

      expect(repository.listYamlFiles).toHaveBeenCalledWith('pbl_data/');
      expect(repository.listYamlFiles).not.toHaveBeenCalledWith('assessment_data/');
      
      expect(result).toHaveLength(2);
      expect(result.every(s => s.transformed)).toBe(true);
    });

    it('should handle errors gracefully and continue processing', async () => {
      jest.spyOn(repository, 'getYamlContent').mockImplementation(async (path: string) => {
        if (path.includes('scenario1')) {
          throw new Error('Corrupted file');
        }
        if (path.includes('scenario2')) {
          return { id: 'scenario2', title: 'Valid Scenario' };
        }
        throw new Error('File not found');
      });

      const result = await repository.getAllScenarios('pbl');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('scenario2');
    });
  });

  describe('getKSAMappings', () => {
    const mockKSAData = {
      knowledge: {
        'K1.1': { domain: 'AI Concepts', description: 'Basic AI understanding' },
        'K1.2': { domain: 'AI Tools', description: 'AI tool knowledge' }
      },
      skills: {
        'S1.1': { domain: 'Problem Solving', description: 'AI problem solving' },
        'S2.1': { domain: 'Critical Thinking', description: 'AI critical thinking' }
      },
      attitudes: {
        'A1.1': { domain: 'Ethics', description: 'AI ethics awareness' }
      }
    };

    beforeEach(() => {
      jest.spyOn(repository, 'getYamlContent').mockResolvedValue(mockKSAData);
      (repository as any).extractMultilingualField = jest.fn().mockReturnValue({ en: 'Test description' });
    });

    it('should get KSA mappings successfully', async () => {
      const result = await repository.getKSAMappings();

      expect(repository.getYamlContent).toHaveBeenCalledWith('rubrics_data/ksa_codes.yaml');
      expect(result).toHaveLength(5); // 2 knowledge + 2 skills + 1 attitude
      expect(result[0]).toEqual({
        code: 'K1.1',
        type: 'knowledge',
        domain: 'AI Concepts',
        description: { en: 'Test description' }
      });
    });

    it('should handle missing KSA file and return empty array', async () => {
      jest.spyOn(repository, 'getYamlContent').mockRejectedValue(new Error('File not found'));

      const result = await repository.getKSAMappings();
      
      expect(result).toEqual([]);
    });
  });

  describe('getAILiteracyDomains', () => {
    const mockDomainsData = {
      domains: [
        { 
          id: 'engaging', 
          name: 'Engaging with AI',
          description: 'Understand AI capabilities',
          competencies: ['comp1', 'comp2']
        },
        { 
          id: 'creating', 
          name: 'Creating with AI',
          description: 'Create with AI tools',
          competencies: ['comp3', 'comp4']
        }
      ]
    };

    beforeEach(() => {
      jest.spyOn(repository, 'getYamlContent').mockResolvedValue(mockDomainsData);
      (repository as any).extractMultilingualField = jest.fn().mockReturnValue({ en: 'Test field' });
    });

    it('should get AI literacy domains successfully', async () => {
      const result = await repository.getAILiteracyDomains();

      expect(repository.getYamlContent).toHaveBeenCalledWith('rubrics_data/ai_lit_domains.yaml');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'engaging',
        name: { en: 'Test field' },
        description: { en: 'Test field' },
        competencies: ['comp1', 'comp2']
      });
    });

    it('should handle missing domains file and return empty array', async () => {
      jest.spyOn(repository, 'getYamlContent').mockRejectedValue(new Error('File not found'));

      const result = await repository.getAILiteracyDomains();
      
      expect(result).toEqual([]);
    });
  });

  describe('transformScenarioContent', () => {
    beforeEach(() => {
      (repository as any).extractMultilingualField = jest.fn()
        .mockImplementation((obj: any, field: string) => ({ en: obj[field] || 'Default value' }));
    });

    it('should transform raw content to ScenarioContent format', () => {
      const rawContent = {
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'pbl',
        difficulty: 'beginner',
        duration: 60,
        prerequisites: ['req1'],
        tasks: [
          { 
            id: 'task1', 
            title: 'Task 1',
            type: 'discussion',
            description: 'Task description',
            estimatedTime: 30,
            requiredForCompletion: true,
            ksaCodes: ['K1.1']
          }
        ],
        metadata: { additionalInfo: 'test' }
      };

      const result = (repository as any).transformScenarioContent(rawContent, 'test-id');

      expect(result).toEqual({
        id: 'test-id',
        type: 'pbl',
        title: { en: 'Test Scenario' },
        description: { en: 'Test Description' },
        tasks: [{
          id: 'task1',
          type: 'discussion',
          title: 'Task 1',
          description: 'Task description',
          estimatedTime: 30,
          requiredForCompletion: true,
          ksaCodes: ['K1.1']
        }],
        metadata: {
          difficulty: 'beginner',
          duration: 60,
          prerequisites: ['req1'],
          additionalInfo: 'test'
        }
      });
    });

    it('should provide default values for missing fields', () => {
      const minimalContent = {
        title: 'Minimal Scenario'
      };

      const result = (repository as any).transformScenarioContent(minimalContent, 'minimal-id');

      expect(result.id).toBe('minimal-id');
      expect(result.type).toBe('pbl');
      expect(result.title).toEqual({ en: 'Minimal Scenario' });
      expect(result.description).toEqual({ en: 'Default value' });
      expect(result.tasks).toEqual([]);
      expect(result.metadata.difficulty).toBeUndefined();
      expect(result.metadata.duration).toBeUndefined();
      expect(result.metadata.prerequisites).toBeUndefined();
    });

    it('should handle complex task arrays', () => {
      const contentWithTasks = {
        title: 'Test',
        tasks: [
          { id: 'task1' },
          { id: 'task2', type: 'quiz', title: 'Quiz Task' }
        ]
      };

      const result = (repository as any).transformScenarioContent(contentWithTasks, 'test-id');

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]).toEqual({
        id: 'task1',
        type: undefined,
        title: undefined,
        description: undefined,
        estimatedTime: undefined,
        requiredForCompletion: undefined,
        ksaCodes: undefined
      });
      expect(result.tasks[1]).toEqual({
        id: 'task2',
        type: 'quiz',
        title: 'Quiz Task',
        description: undefined,
        estimatedTime: undefined,
        requiredForCompletion: undefined,
        ksaCodes: undefined
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle bucket initialization errors', () => {
      mockStorage.bucket.mockImplementationOnce(() => {
        throw new Error('Bucket access denied');
      });

      expect(() => new GCSContentRepository(mockStorage, 'invalid-bucket'))
        .toThrow('Bucket access denied');
    });

    it('should handle network timeouts', async () => {
      mockFile.exists.mockResolvedValueOnce([true]);
      mockFile.download.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(repository.getYamlContent('timeout.yaml'))
        .rejects.toThrow('Timeout');
    });

    it('should handle empty YAML files', async () => {
      mockFile.exists.mockResolvedValueOnce([true]);
      mockFile.download.mockResolvedValueOnce([Buffer.from('')]);
      (parseYaml as jest.Mock).mockReturnValue(null);

      const result = await repository.getYamlContent('empty.yaml');

      expect(result).toBeNull();
    });

    it('should handle large file lists efficiently', async () => {
      const largeFileList = Array.from({ length: 1000 }, (_, i) => ({
        name: `file${i}.yaml`
      }));

      mockBucket.getFiles.mockResolvedValueOnce([largeFileList]);

      const result = await repository.listYamlFiles('large/');

      expect(result).toHaveLength(1000);
      expect(result[0]).toBe('file0.yaml');
      expect(result[999]).toBe('file999.yaml');
    });
  });
});