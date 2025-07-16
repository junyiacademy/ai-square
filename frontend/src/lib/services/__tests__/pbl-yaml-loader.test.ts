/**
 * PBLYAMLLoader 單元測試
 * 遵循 TDD: Red → Green → Refactor
 */

import { PBLYAMLLoader, PBLYAMLData, PBLScenarioInfo } from '../pbl-yaml-loader';
import { cacheService } from '@/lib/cache/cache-service';

// Mock the cache service
jest.mock('@/lib/cache/cache-service');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('PBLYAMLLoader', () => {
  let loader: PBLYAMLLoader;
  
  const mockScenarioData: PBLYAMLData = {
    scenario_info: {
      id: 'ai-job-search',
      title: 'AI-Powered Job Search',
      title_zhTW: 'AI 求職助手',
      description: 'Learn to use AI for job searching',
      description_zhTW: '學習使用 AI 進行求職',
      difficulty: 'intermediate',
      estimated_duration: 90,
      target_domains: ['engaging_with_ai', 'creating_with_ai']
    },
    programs: [{
      id: 'main',
      title: 'Main Program',
      tasks: [{
        id: 'task1',
        title: 'Resume Optimization',
        type: 'chat',
        ksa_codes: ['K1', 'S2'],
        ai_modules: ['gpt-4', 'resume-analyzer']
      }]
    }],
    ksa_mappings: [{
      domain: 'engaging_with_ai',
      competency: 'interaction',
      ksa_codes: {
        knowledge: ['K1'],
        skills: ['S2'],
        attitudes: ['A3']
      }
    }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    loader = new PBLYAMLLoader();
    
    // Default mock behaviors
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
  });

  describe('constructor', () => {
    it('should set correct default base path for PBL data', () => {
      expect(loader['defaultOptions'].basePath).toContain('pbl_data');
      expect(loader['defaultOptions'].basePath).toContain('scenarios');
    });

    it('should have correct loader name', () => {
      expect(loader['loaderName']).toBe('PBLYAMLLoader');
    });
  });

  describe('getTranslatedField', () => {
    it('should return translated field when available', () => {
      const data = {
        title: 'English Title',
        title_zhTW: '中文標題'
      };
      
      const result = loader.getTranslatedField(data, 'title', 'zhTW');
      
      expect(result).toBe('中文標題');
    });

    it('should fallback to default field when translation not available', () => {
      const data = {
        title: 'English Title'
      };
      
      const result = loader.getTranslatedField(data, 'title', 'zhTW');
      
      expect(result).toBe('English Title');
    });

    it('should return empty string when field not found', () => {
      const data = {};
      
      const result = loader.getTranslatedField(data, 'title', 'en');
      
      expect(result).toBe('');
    });

    it('should handle English language correctly (no suffix)', () => {
      const data = {
        title: 'English Title',
        title_zhTW: '中文標題'
      };
      
      const result = loader.getTranslatedField(data, 'title', 'en');
      
      expect(result).toBe('English Title');
    });
  });

  describe('extractAllKSACodes', () => {
    it('should extract KSA codes from mappings and tasks', () => {
      const codes = loader.extractAllKSACodes(mockScenarioData);
      
      expect(codes).toContain('K1');
      expect(codes).toContain('S2');
      expect(codes).toContain('A3');
      expect(codes).toHaveLength(3);
    });

    it('should handle missing data gracefully', () => {
      const emptyData: PBLYAMLData = {
        scenario_info: {} as PBLScenarioInfo,
        programs: []
      };
      
      const codes = loader.extractAllKSACodes(emptyData);
      
      expect(codes).toEqual([]);
    });

    it('should remove duplicates', () => {
      const dataWithDuplicates: PBLYAMLData = {
        ...mockScenarioData,
        programs: [{
          id: 'program1',
          title: 'Program 1',
          tasks: [
            { id: 'task1', title: 'Task 1', type: 'chat', ksa_codes: ['K1', 'K1', 'S2'] },
            { id: 'task2', title: 'Task 2', type: 'chat', ksa_codes: ['K1', 'S2'] }
          ]
        }]
      };
      
      const codes = loader.extractAllKSACodes(dataWithDuplicates);
      
      expect(codes.filter(c => c === 'K1')).toHaveLength(1);
    });

    it('should handle undefined KSA mappings', () => {
      const dataWithoutMappings: PBLYAMLData = {
        scenario_info: {} as PBLScenarioInfo,
        programs: [{
          id: 'program1',
          title: 'Program 1',
          tasks: [{ id: 'task1', title: 'Task 1', type: 'chat', ksa_codes: ['K1'] }]
        }]
      };
      
      const codes = loader.extractAllKSACodes(dataWithoutMappings);
      
      expect(codes).toEqual(['K1']);
    });
  });

  describe('extractAIModules', () => {
    it('should extract AI modules from tasks', () => {
      const modules = loader.extractAIModules(mockScenarioData);
      
      expect(modules).toContain('gpt-4');
      expect(modules).toContain('resume-analyzer');
      expect(modules).toHaveLength(2);
    });

    it('should handle missing AI modules', () => {
      const dataWithoutModules: PBLYAMLData = {
        scenario_info: {} as PBLScenarioInfo,
        programs: [{
          id: 'program1',
          title: 'Program 1',
          tasks: [{ id: 'task1', title: 'Task 1', type: 'chat' }]
        }]
      };
      
      const modules = loader.extractAIModules(dataWithoutModules);
      
      expect(modules).toEqual([]);
    });

    it('should handle empty programs', () => {
      const dataWithoutPrograms: PBLYAMLData = {
        scenario_info: {} as PBLScenarioInfo,
        programs: []
      };
      
      const modules = loader.extractAIModules(dataWithoutPrograms);
      
      expect(modules).toEqual([]);
    });

    it('should remove duplicate modules', () => {
      const dataWithDuplicateModules: PBLYAMLData = {
        scenario_info: {} as PBLScenarioInfo,
        programs: [{
          id: 'program1',
          title: 'Program 1',
          tasks: [
            { id: 'task1', title: 'Task 1', type: 'chat', ai_modules: ['gpt-4', 'gpt-4'] },
            { id: 'task2', title: 'Task 2', type: 'chat', ai_modules: ['gpt-4', 'claude'] }
          ]
        }]
      };
      
      const modules = loader.extractAIModules(dataWithDuplicateModules);
      
      expect(modules).toContain('gpt-4');
      expect(modules).toContain('claude');
      expect(modules).toHaveLength(2);
    });
  });

  describe('postProcess', () => {
    it('should handle data with all IDs present', async () => {
      const result = await loader['postProcess'](mockScenarioData);
      
      expect(result.scenario_info.id).toBe('ai-job-search');
      expect(result.programs[0].id).toBe('main');
      expect(result.programs[0].tasks[0].id).toBe('task1');
    });

    it('should add missing program IDs', async () => {
      const dataWithoutProgramId: PBLYAMLData = {
        scenario_info: { id: 'test' } as PBLScenarioInfo,
        programs: [{
          title: 'Program Without ID',
          tasks: []
        } as any]
      };
      
      const result = await loader['postProcess'](dataWithoutProgramId);
      
      expect(result.programs[0].id).toBe('program_1');
    });

    it('should add missing task IDs', async () => {
      const dataWithoutTaskIds: PBLYAMLData = {
        scenario_info: { id: 'test' } as PBLScenarioInfo,
        programs: [{
          id: 'program1',
          title: 'Program 1',
          tasks: [
            { title: 'Task Without ID', type: 'chat' } as any,
            { title: 'Another Task', type: 'chat' } as any
          ]
        }]
      };
      
      const result = await loader['postProcess'](dataWithoutTaskIds);
      
      expect(result.programs[0].tasks[0].id).toBe('task_1_1');
      expect(result.programs[0].tasks[1].id).toBe('task_1_2');
    });

    it('should add scenario ID if missing', async () => {
      const dataWithoutScenarioId: PBLYAMLData = {
        scenario_info: { 
          title: 'Test Scenario',
          description: 'Test'
        } as any,
        programs: []
      };
      
      const result = await loader['postProcess'](dataWithoutScenarioId);
      
      expect(result.scenario_info.id).toBe('pbl_scenario');
    });

    it('should handle empty programs array', async () => {
      const dataWithEmptyPrograms: PBLYAMLData = {
        scenario_info: { id: 'test' } as PBLScenarioInfo,
        programs: []
      };
      
      const result = await loader['postProcess'](dataWithEmptyPrograms);
      
      expect(result.programs).toEqual([]);
    });

    it('should handle undefined programs', async () => {
      const dataWithoutPrograms: any = {
        scenario_info: { id: 'test' }
      };
      
      const result = await loader['postProcess'](dataWithoutPrograms);
      
      expect(result.programs).toBeUndefined();
    });
  });

  describe('validateData', () => {
    it('should always return valid for now', async () => {
      const result = await loader['validateData']();
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('cache integration', () => {
    it('should check cache when loading', async () => {
      mockCacheService.get.mockResolvedValue(mockScenarioData);
      
      // Try to load with caching enabled (would need actual file system to test fully)
      await loader.loadScenario('test-scenario').catch(() => {});
      
      expect(mockCacheService.get).toHaveBeenCalled();
    });

    it('should generate correct cache key', () => {
      const cacheKey = loader['getCacheKey']('test-file', 'zhTW');
      
      expect(cacheKey).toBe('PBLYAMLLoader:test-file:zhTW');
    });

    it('should generate cache key without language', () => {
      const cacheKey = loader['getCacheKey']('test-file');
      
      expect(cacheKey).toBe('PBLYAMLLoader:test-file');
    });
  });
});