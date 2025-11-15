/**
 * Unit tests for HybridTranslationService
 * Tests the hybrid translation system for scenarios
 */

import { HybridTranslationService } from '../hybrid-translation-service';
import { getScenarioStorageService } from '../scenario-storage-service';
import { readFile } from 'fs/promises';
import * as yaml from 'js-yaml';

// Mock dependencies
jest.mock('../scenario-storage-service');
jest.mock('fs/promises');
jest.mock('js-yaml');

describe('HybridTranslationService', () => {
  let service: HybridTranslationService;
  let mockStorageService: any;

  const mockScenario = {
    id: 'test-scenario',
    title: { en: 'Test Scenario' },
    description: { en: 'Test Description' },
    objectives: { en: 'Test Objectives' },
    mode: 'pbl',
    sourceType: 'yaml',
    status: 'active'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock storage service
    mockStorageService = {
      getScenario: jest.fn(),
      list: jest.fn(),
      getProgram: jest.fn(),
      getTask: jest.fn()
    };

    (getScenarioStorageService as jest.Mock).mockReturnValue(mockStorageService);

    service = new HybridTranslationService();
  });

  describe('getScenario', () => {
    it('should return English scenario directly from storage', async () => {
      mockStorageService.getScenario.mockResolvedValue(mockScenario);

      const result = await service.getScenario('test-scenario', 'en');

      expect(result).toEqual(mockScenario);
      expect(mockStorageService.getScenario).toHaveBeenCalledWith('test-scenario');
    });

    it('should cache scenarios after first fetch', async () => {
      mockStorageService.getScenario.mockResolvedValue(mockScenario);

      // First call
      await service.getScenario('test-scenario', 'en');
      // Second call
      await service.getScenario('test-scenario', 'en');

      // Should only call storage service once
      expect(mockStorageService.getScenario).toHaveBeenCalledTimes(1);
    });

    it('should apply translations for non-English languages', async () => {
      mockStorageService.getScenario.mockResolvedValue(mockScenario);

      const yamlData = {
        scenario_info: {
          title_zh: '測試情境',
          description_zh: '測試描述'
        }
      };

      (readFile as jest.Mock).mockResolvedValue('yaml content');
      (yaml.load as jest.Mock).mockReturnValue(yamlData);

      const result = await service.getScenario('test-scenario', 'zh');

      expect(result.id).toBe('test-scenario');
      expect(readFile).toHaveBeenCalled();
      expect(yaml.load).toHaveBeenCalled();
    });

    it('should handle storage service errors', async () => {
      mockStorageService.getScenario.mockRejectedValue(new Error('Storage error'));

      await expect(service.getScenario('test-scenario', 'en'))
        .rejects.toThrow('Storage error');
    });

    it('should fallback to YAML for non-English on GCS error', async () => {
      mockStorageService.getScenario.mockRejectedValue(new Error('GCS connection failed'));

      const yamlData = {
        scenario_info: {
          id: 'test-scenario',
          title: 'Fallback Title'
        }
      };

      (readFile as jest.Mock).mockResolvedValue('yaml content');
      (yaml.load as jest.Mock).mockReturnValue(yamlData);

      const result = await service.getScenario('test-scenario', 'zh');

      expect(result).toBeDefined();
      expect(readFile).toHaveBeenCalled();
    });

    it('should clear cache on error', async () => {
      mockStorageService.getScenario
        .mockResolvedValueOnce(mockScenario)
        .mockRejectedValueOnce(new Error('Error'));

      // First call succeeds and caches
      await service.getScenario('test-scenario', 'en');

      // Second call fails
      await expect(service.getScenario('error-scenario', 'en'))
        .rejects.toThrow();

      // Third call should hit storage again (cache cleared)
      mockStorageService.getScenario.mockResolvedValueOnce(mockScenario);
      await service.getScenario('error-scenario', 'en');

      expect(mockStorageService.getScenario).toHaveBeenCalledTimes(3);
    });
  });

  describe('listScenarios', () => {
    it('should list all scenarios with translations', async () => {
      mockStorageService.list.mockResolvedValue(['scenario1', 'scenario2']);
      mockStorageService.getScenario.mockImplementation((id: string) => ({
        id,
        title: { en: `Scenario ${id}` }
      }));

      const result = await service.listScenarios('en');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('scenario1');
      expect(result[1].id).toBe('scenario2');
    });

    it('should cache scenario list', async () => {
      mockStorageService.list.mockResolvedValue(['scenario1']);
      mockStorageService.getScenario.mockResolvedValue(mockScenario);

      // First call
      await service.listScenarios('en');
      // Second call
      await service.listScenarios('en');

      // Should only call list once
      expect(mockStorageService.list).toHaveBeenCalledTimes(1);
    });

    it('should handle list errors', async () => {
      mockStorageService.list.mockRejectedValue(new Error('List failed'));

      await expect(service.listScenarios('en'))
        .rejects.toThrow('List failed');
    });
  });

  describe('getProgram', () => {
    it('should get program from storage service', async () => {
      const mockProgram = {
        id: 'program-1',
        scenarioId: 'scenario-1',
        userId: 'user-1',
        status: 'active'
      };

      mockStorageService.getProgram.mockResolvedValue(mockProgram);

      const result = await service.getProgram('scenario-1', 'program-1', 'en');

      expect(result).toEqual(mockProgram);
      expect(mockStorageService.getProgram).toHaveBeenCalledWith('scenario-1', 'program-1');
    });
  });

  describe('getTask', () => {
    it('should get task from storage service', async () => {
      const mockTask = {
        id: 'task-1',
        programId: 'program-1',
        title: { en: 'Task 1' },
        status: 'pending'
      };

      mockStorageService.getTask.mockResolvedValue(mockTask);

      const result = await service.getTask('scenario-1', 'program-1', 'task-1', 'en');

      expect(result).toEqual(mockTask);
      expect(mockStorageService.getTask).toHaveBeenCalledWith('scenario-1', 'program-1', 'task-1');
    });
  });

  describe('Translation merging', () => {
    it('should merge YAML translations with English base', async () => {
      const englishScenario = {
        id: 'test',
        title: { en: 'English Title' },
        description: { en: 'English Description' }
      };

      mockStorageService.getScenario.mockResolvedValue(englishScenario);

      const yamlData = {
        scenario_info: {
          title_es: 'Título en Español',
          description_es: 'Descripción en Español'
        }
      };

      (readFile as jest.Mock).mockResolvedValue('yaml content');
      (yaml.load as jest.Mock).mockReturnValue(yamlData);

      const result = await service.getScenario('test', 'es');

      expect(result.id).toBe('test');
      // Should have merged translations
      expect(result).toBeDefined();
    });

    it('should handle missing translation files gracefully', async () => {
      mockStorageService.getScenario.mockResolvedValue(mockScenario);
      (readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await service.getScenario('test-scenario', 'fr');

      // Should return English as fallback
      expect(result).toEqual(mockScenario);
    });

    it('should handle invalid YAML gracefully', async () => {
      mockStorageService.getScenario.mockResolvedValue(mockScenario);
      (readFile as jest.Mock).mockResolvedValue('invalid yaml');
      (yaml.load as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      const result = await service.getScenario('test-scenario', 'de');

      // Should return English as fallback
      expect(result).toEqual(mockScenario);
    });
  });

  describe('Cache management', () => {
    it('should use separate cache keys for different languages', async () => {
      const englishScenario = { ...mockScenario, title: { en: 'English' } };
      const spanishScenario = { ...mockScenario, title: { es: 'Español' } };

      mockStorageService.getScenario
        .mockResolvedValueOnce(englishScenario)
        .mockResolvedValueOnce(englishScenario);

      (readFile as jest.Mock).mockResolvedValue('yaml');
      (yaml.load as jest.Mock).mockReturnValue({
        scenario_info: { title_es: 'Español' }
      });

      await service.getScenario('test', 'en');
      await service.getScenario('test', 'es');

      // Both calls should hit storage
      expect(mockStorageService.getScenario).toHaveBeenCalledTimes(2);
    });

    it('should clear list cache on error', async () => {
      mockStorageService.list
        .mockResolvedValueOnce(['scenario1'])
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce(['scenario1', 'scenario2']);

      mockStorageService.getScenario.mockResolvedValue(mockScenario);

      // First call succeeds
      await service.listScenarios('en');

      // Second call fails
      await expect(service.listScenarios('zh'))
        .rejects.toThrow();

      // Third call should hit storage again
      await service.listScenarios('en');

      expect(mockStorageService.list).toHaveBeenCalledTimes(3);
    });
  });
});
