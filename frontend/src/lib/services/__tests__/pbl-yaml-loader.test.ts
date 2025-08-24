/**
 * Tests for PBLYAMLLoader
 * Priority: CRITICAL - 0% coverage → 95%+ coverage
 */

import { PBLYAMLLoader, pblYAMLLoader } from '../pbl-yaml-loader';
import type { PBLYAMLData, PBLScenarioInfo, PBLProgram } from '../pbl-yaml-loader';
import path from 'path';

// Mock file system operations and fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn(),
    access: jest.fn()
  }
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  readdir: jest.fn(),
  access: jest.fn()
}));

jest.mock('js-yaml', () => ({
  load: jest.fn()
}));

describe('PBLYAMLLoader', () => {
  let loader: PBLYAMLLoader;
  let mockFs: any;
  let mockYaml: any;
  let consoleWarn: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  const mockPBLData: PBLYAMLData = {
    scenario_info: {
      id: 'test-scenario',
      title: 'Test PBL Scenario',
      title_zhTW: 'PBL測試情境',
      title_es: 'Escenario PBL de prueba',
      description: 'A test scenario for PBL',
      description_zhTW: '用於PBL的測試情境',
      difficulty: 'beginner',
      estimated_duration: 60,
      target_domains: ['engaging_with_ai'],
      target_audience: 'students',
      prerequisites: ['basic_ai_knowledge'],
      learning_objectives: ['understand AI basics']
    },
    programs: [
      {
        id: 'program-1',
        title: 'Test Program',
        title_zhTW: '測試程式',
        tasks: [
          {
            id: 'task-1',
            title: 'First Task',
            title_zhTW: '第一個任務',
            type: 'question',
            description: 'A test task',
            objectives: ['learn something'],
            estimated_time: 30,
            ksa_codes: ['K1', 'S1'],
            ai_modules: ['chat', 'analysis']
          }
        ]
      }
    ],
    ksa_mappings: [
      {
        domain: 'engaging_with_ai',
        competency: 'ai_interaction',
        ksa_codes: {
          knowledge: ['K1', 'K2'],
          skills: ['S1', 'S2'],
          attitudes: ['A1']
        }
      }
    ],
    ai_modules: {
      chat: { type: 'conversational' },
      analysis: { type: 'analytical' }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks for both fs and fs/promises
    const fsModule = require('fs');
    const fsPromisesModule = require('fs/promises');
    mockFs = {
      ...fsModule.promises,
      ...fsPromisesModule
    };
    mockYaml = require('js-yaml');
    
    // Setup mocks for both the direct fs/promises import and the dynamic import
    mockFs.readFile = jest.fn();
    mockFs.readdir = jest.fn();
    mockFs.access = jest.fn();
    
    // Mock the fs module promises as well
    fsModule.promises.readFile = mockFs.readFile;
    fsModule.promises.readdir = mockFs.readdir;
    fsModule.promises.access = mockFs.access;
    
    // Spy on console methods
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    consoleError = jest.spyOn(console, 'error').mockImplementation();
    
    loader = new PBLYAMLLoader();
  });

  afterEach(() => {
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(loader['loaderName']).toBe('PBLYAMLLoader');
      expect(loader['basePath']).toBe(path.join(process.cwd(), 'public', 'pbl_data', 'scenarios'));
    });

    it('should have singleton instance available', () => {
      expect(pblYAMLLoader).toBeInstanceOf(PBLYAMLLoader);
    });
  });

  describe('load method', () => {
    it('should successfully load valid YAML file', async () => {
      const yamlContent = 'scenario_info:\n  id: test-scenario\n  title: Test';
      
      mockFs.readFile.mockResolvedValue(yamlContent);
      mockYaml.load.mockReturnValue(mockPBLData);

      const result = await loader.load('test-scenario');

      expect(result.data).toEqual(mockPBLData);
      expect(result.error).toBeUndefined();
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(process.cwd(), 'public', 'pbl_data', 'scenarios', 'test-scenario', 'test-scenario_en.yaml'),
        'utf8'
      );
    });

    it('should handle file not found error', async () => {
      const error = new Error('ENOENT: no such file or directory');
      mockFs.readFile.mockRejectedValue(error);

      const result = await loader.load('non-existent');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(error);
    });

    it('should handle YAML parsing error', async () => {
      const yamlContent = 'invalid: yaml: content:';
      const yamlError = new Error('YAML parsing failed');
      
      mockFs.readFile.mockResolvedValue(yamlContent);
      mockYaml.load.mockImplementation(() => {
        throw yamlError;
      });

      const result = await loader.load('invalid-yaml');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(yamlError);
    });

    it('should handle general errors', async () => {
      const error = new Error('Unknown error');
      mockFs.readFile.mockRejectedValue(error);

      const result = await loader.load('error-scenario');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(error);
    });
  });

  describe('getFilePath', () => {
    it('should generate correct file path for scenario', () => {
      const filePath = loader['getFilePath']('test-scenario');
      
      expect(filePath).toBe(
        path.join(process.cwd(), 'public', 'pbl_data', 'scenarios', 'test-scenario', 'test-scenario_en.yaml')
      );
    });

    it('should handle scenario ID with _scenario suffix', () => {
      const filePath = loader['getFilePath']('test-scenario_scenario');
      
      expect(filePath).toBe(
        path.join(process.cwd(), 'public', 'pbl_data', 'scenarios', 'test-scenario', 'test-scenario_en.yaml')
      );
    });
  });

  describe('loadScenario', () => {
    it('should load scenario successfully', async () => {
      mockFs.readFile.mockResolvedValue('valid yaml content');
      mockYaml.load.mockReturnValue(mockPBLData);

      const result = await loader.loadScenario('test-scenario');

      expect(result).toEqual(mockPBLData);
    });

    it('should return null when scenario fails to load', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await loader.loadScenario('non-existent');

      expect(result).toBeNull();
    });

    it('should return null when YAML data is null', async () => {
      mockFs.readFile.mockResolvedValue('content');
      mockYaml.load.mockReturnValue(null);

      const result = await loader.loadScenario('empty-scenario');

      expect(result).toBeNull();
    });
  });

  describe('scanScenarios', () => {
    it('should scan and return valid scenario folders', async () => {
      const mockDirents = [
        { name: 'scenario1', isDirectory: () => true },
        { name: 'scenario2', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false }, // Should be filtered out
        { name: 'scenario3', isDirectory: () => true }
      ];

      // Mock both the direct fs/promises and the dynamic import
      const fsPromisesModule = require('fs/promises');
      fsPromisesModule.readdir.mockResolvedValue(mockDirents);
      fsPromisesModule.access
        .mockResolvedValueOnce(undefined) // scenario1 has valid file
        .mockResolvedValueOnce(undefined) // scenario2 has valid file
        .mockRejectedValueOnce(new Error('No such file')); // scenario3 missing file

      const scenarios = await loader.scanScenarios();

      expect(scenarios).toEqual(['scenario1', 'scenario2']);
      expect(consoleWarn).toHaveBeenCalledWith('No English scenario file found in scenario3');
    });

    it('should return empty array when directory does not exist', async () => {
      const fsPromisesModule = require('fs/promises');
      fsPromisesModule.readdir.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const scenarios = await loader.scanScenarios();

      expect(scenarios).toEqual([]);
      expect(consoleError).toHaveBeenCalledWith('Error scanning PBL scenarios:', expect.any(Error));
    });

    it('should handle access errors gracefully', async () => {
      const mockDirents = [
        { name: 'inaccessible', isDirectory: () => true }
      ];

      const fsPromisesModule = require('fs/promises');
      fsPromisesModule.readdir.mockResolvedValue(mockDirents);
      fsPromisesModule.access.mockRejectedValue(new Error('Permission denied'));

      const scenarios = await loader.scanScenarios();

      expect(scenarios).toEqual([]);
      expect(consoleWarn).toHaveBeenCalledWith('No English scenario file found in inaccessible');
    });
  });

  describe('getScenarioMetadata', () => {
    it('should return scenario info when scenario exists', async () => {
      mockFs.readFile.mockResolvedValue('yaml content');
      mockYaml.load.mockReturnValue(mockPBLData);

      const metadata = await loader.getScenarioMetadata('test-scenario');

      expect(metadata).toEqual(mockPBLData.scenario_info);
    });

    it('should return null when scenario does not exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const metadata = await loader.getScenarioMetadata('non-existent');

      expect(metadata).toBeNull();
    });

    it('should return null when scenario has no scenario_info', async () => {
      const dataWithoutInfo = { ...mockPBLData };
      delete (dataWithoutInfo as any).scenario_info;
      
      mockFs.readFile.mockResolvedValue('yaml content');
      mockYaml.load.mockReturnValue(dataWithoutInfo);

      const metadata = await loader.getScenarioMetadata('incomplete-scenario');

      expect(metadata).toBeNull();
    });
  });

  describe('validateData', () => {
    it('should return valid for any data', async () => {
      const result = await loader['validateData']();

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('postProcess', () => {
    it('should add missing IDs to programs and tasks', async () => {
      const dataWithoutIds: PBLYAMLData = {
        scenario_info: {
          title: 'Test',
          description: 'Test desc',
          difficulty: 'beginner',
          estimated_duration: 60,
          target_domains: []
        } as PBLScenarioInfo,
        programs: [
          {
            title: 'Program 1',
            tasks: [
              { title: 'Task 1', type: 'question' },
              { title: 'Task 2', type: 'creation' }
            ]
          },
          {
            id: 'existing-id',
            title: 'Program 2', 
            tasks: [
              { id: 'existing-task-id', title: 'Task 3', type: 'analysis' }
            ]
          }
        ] as PBLProgram[]
      };

      const result = await loader['postProcess'](dataWithoutIds);

      expect(result.programs[0].id).toBe('program_1');
      expect(result.programs[0].tasks[0].id).toBe('task_1_1');
      expect(result.programs[0].tasks[1].id).toBe('task_1_2');
      
      expect(result.programs[1].id).toBe('existing-id'); // Existing ID preserved
      expect(result.programs[1].tasks[0].id).toBe('existing-task-id'); // Existing ID preserved
    });

    it('should add ID to scenario_info if missing', async () => {
      const dataWithoutScenarioId: PBLYAMLData = {
        scenario_info: {
          title: 'Test',
          description: 'Test desc', 
          difficulty: 'beginner',
          estimated_duration: 60,
          target_domains: []
        } as PBLScenarioInfo,
        programs: []
      };

      const result = await loader['postProcess'](dataWithoutScenarioId);

      expect(result.scenario_info.id).toBe('pbl_scenario');
    });

    it('should preserve existing scenario_info ID', async () => {
      const result = await loader['postProcess'](mockPBLData);

      expect(result.scenario_info.id).toBe('test-scenario');
    });

    it('should handle missing programs gracefully', async () => {
      const dataWithoutPrograms: PBLYAMLData = {
        scenario_info: mockPBLData.scenario_info,
        programs: undefined as any
      };

      const result = await loader['postProcess'](dataWithoutPrograms);

      expect(result.programs).toBeUndefined();
    });

    it('should handle programs without tasks', async () => {
      const dataWithoutTasks: PBLYAMLData = {
        scenario_info: mockPBLData.scenario_info,
        programs: [
          { title: 'Program 1', tasks: undefined as any }
        ] as PBLProgram[]
      };

      const result = await loader['postProcess'](dataWithoutTasks);

      expect(result.programs[0].tasks).toEqual([]);
    });
  });

  describe('getTranslatedField', () => {
    const testData = {
      title: 'English Title',
      title_zhTW: '中文標題',
      title_es: 'Título en Español',
      description: 'English Description'
      // Note: no description_zhTW
    };

    it('should return English field when language is en', () => {
      const result = loader.getTranslatedField(testData, 'title', 'en');
      expect(result).toBe('English Title');
    });

    it('should return translated field when available', () => {
      const result = loader.getTranslatedField(testData, 'title', 'zhTW');
      expect(result).toBe('中文標題');
    });

    it('should return Spanish translation when available', () => {
      const result = loader.getTranslatedField(testData, 'title', 'es');
      expect(result).toBe('Título en Español');
    });

    it('should fallback to English when translation not available', () => {
      const result = loader.getTranslatedField(testData, 'description', 'zhTW');
      expect(result).toBe('English Description');
    });

    it('should return empty string when field does not exist', () => {
      const result = loader.getTranslatedField(testData, 'non_existent_field', 'en');
      expect(result).toBe('');
    });

    it('should handle null/undefined data gracefully', () => {
      const result = loader.getTranslatedField({}, 'title', 'en');
      expect(result).toBe('');
    });
  });

  describe('extractAllKSACodes', () => {
    it('should extract KSA codes from mappings and tasks', () => {
      const codes = loader.extractAllKSACodes(mockPBLData);
      
      // From ksa_mappings: K1, K2, S1, S2, A1
      // From tasks: K1, S1
      // Expected unique codes: K1, K2, S1, S2, A1
      expect(codes).toContain('K1');
      expect(codes).toContain('K2');
      expect(codes).toContain('S1');
      expect(codes).toContain('S2');
      expect(codes).toContain('A1');
      expect(codes).toHaveLength(5);
    });

    it('should handle missing ksa_mappings', () => {
      const dataWithoutMappings = {
        ...mockPBLData,
        ksa_mappings: undefined
      };
      
      const codes = loader.extractAllKSACodes(dataWithoutMappings);
      
      // Should only have codes from tasks: K1, S1
      expect(codes).toContain('K1');
      expect(codes).toContain('S1');
      expect(codes).toHaveLength(2);
    });

    it('should handle missing programs', () => {
      const dataWithoutPrograms = {
        ...mockPBLData,
        programs: undefined
      };
      
      const codes = loader.extractAllKSACodes(dataWithoutPrograms);
      
      // Should only have codes from ksa_mappings
      expect(codes).toContain('K1');
      expect(codes).toContain('K2');
      expect(codes).toContain('S1');
      expect(codes).toContain('S2');
      expect(codes).toContain('A1');
      expect(codes).toHaveLength(5);
    });

    it('should return empty array when no KSA codes exist', () => {
      const emptyData: PBLYAMLData = {
        scenario_info: mockPBLData.scenario_info,
        programs: [
          {
            id: 'program-1',
            title: 'Program',
            tasks: [
              { id: 'task-1', title: 'Task', type: 'question' }
            ]
          }
        ]
      };
      
      const codes = loader.extractAllKSACodes(emptyData);
      expect(codes).toEqual([]);
    });

    it('should handle nested null values gracefully', () => {
      const dataWithNulls: PBLYAMLData = {
        scenario_info: mockPBLData.scenario_info,
        programs: [
          {
            id: 'program-1',
            title: 'Program',
            tasks: [
              { id: 'task-1', title: 'Task', type: 'question', ksa_codes: undefined }
            ]
          }
        ],
        ksa_mappings: [
          {
            domain: 'test',
            competency: 'test',
            ksa_codes: {
              knowledge: undefined,
              skills: [],
              attitudes: ['A1']
            }
          }
        ]
      };
      
      const codes = loader.extractAllKSACodes(dataWithNulls);
      expect(codes).toEqual(['A1']);
    });
  });

  describe('extractAIModules', () => {
    it('should extract AI modules from tasks', () => {
      const modules = loader.extractAIModules(mockPBLData);
      
      expect(modules).toContain('chat');
      expect(modules).toContain('analysis');
      expect(modules).toHaveLength(2);
    });

    it('should handle missing programs', () => {
      const dataWithoutPrograms = {
        ...mockPBLData,
        programs: undefined
      };
      
      const modules = loader.extractAIModules(dataWithoutPrograms);
      expect(modules).toEqual([]);
    });

    it('should handle tasks without AI modules', () => {
      const dataWithoutModules: PBLYAMLData = {
        scenario_info: mockPBLData.scenario_info,
        programs: [
          {
            id: 'program-1',
            title: 'Program',
            tasks: [
              { id: 'task-1', title: 'Task', type: 'question' }
            ]
          }
        ]
      };
      
      const modules = loader.extractAIModules(dataWithoutModules);
      expect(modules).toEqual([]);
    });

    it('should handle duplicate modules', () => {
      const dataWithDuplicates: PBLYAMLData = {
        scenario_info: mockPBLData.scenario_info,
        programs: [
          {
            id: 'program-1',
            title: 'Program',
            tasks: [
              { id: 'task-1', title: 'Task 1', type: 'question', ai_modules: ['chat', 'analysis'] },
              { id: 'task-2', title: 'Task 2', type: 'creation', ai_modules: ['chat', 'generation'] },
              { id: 'task-3', title: 'Task 3', type: 'analysis', ai_modules: ['analysis'] }
            ]
          }
        ]
      };
      
      const modules = loader.extractAIModules(dataWithDuplicates);
      
      expect(modules).toContain('chat');
      expect(modules).toContain('analysis');
      expect(modules).toContain('generation');
      expect(modules).toHaveLength(3); // Should be unique
    });

    it('should handle undefined ai_modules gracefully', () => {
      const dataWithUndefinedModules: PBLYAMLData = {
        scenario_info: mockPBLData.scenario_info,
        programs: [
          {
            id: 'program-1',
            title: 'Program',
            tasks: [
              { id: 'task-1', title: 'Task', type: 'question', ai_modules: undefined }
            ]
          }
        ]
      };
      
      const modules = loader.extractAIModules(dataWithUndefinedModules);
      expect(modules).toEqual([]);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow from load to extraction', async () => {
      mockFs.readFile.mockResolvedValue('yaml content');
      mockYaml.load.mockReturnValue(mockPBLData);

      // Load scenario
      const data = await loader.loadScenario('test-scenario');
      expect(data).not.toBeNull();

      // Extract metadata
      const metadata = await loader.getScenarioMetadata('test-scenario');
      expect(metadata?.id).toBe('test-scenario');

      // Extract KSA codes
      const ksaCodes = loader.extractAllKSACodes(data!);
      expect(ksaCodes.length).toBeGreaterThan(0);

      // Extract AI modules
      const aiModules = loader.extractAIModules(data!);
      expect(aiModules.length).toBeGreaterThan(0);
    });

    it('should handle error cases gracefully in full workflow', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const data = await loader.loadScenario('non-existent');
      expect(data).toBeNull();

      const metadata = await loader.getScenarioMetadata('non-existent');
      expect(metadata).toBeNull();
    });
  });
});