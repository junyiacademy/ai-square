/**
 * Scenario Translation Service Tests
 * Tests for the YAML-based translation loading service
 */

import { ScenarioTranslationService } from '../scenario-translation-service';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import type { IScenario } from '@/types/unified-learning';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('js-yaml');

describe('ScenarioTranslationService', () => {
  let service: ScenarioTranslationService;
  let mockTime: number;

  const mockScenario: IScenario = {
    id: 'test-scenario-123',
    mode: 'assessment',
    status: 'active',
    version: '1.0',
    sourceType: 'yaml',
    sourcePath: 'assessment_data/ai_literacy/ai_literacy_questions_en.yaml',
    sourceId: 'ai_literacy',
    sourceMetadata: { folderName: 'ai_literacy' },
    title: { en: 'AI Literacy Test' },
    description: { en: 'Test your AI knowledge' },
    objectives: [],
    difficulty: 'intermediate',
    estimatedMinutes: 30,
    prerequisites: [],
    taskCount: 20,
    taskTemplates: [],
    xpRewards: {},
    unlockRequirements: {},
    pblData: {},
    discoveryData: {},
    assessmentData: {},
    aiModules: {},
    resources: [],
    metadata: {},
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  };

  const mockYamlContent = {
    assessment_config: {
      title: 'AI 素養測試',
      description: '測試您的 AI 知識',
      total_questions: 20,
      time_limit_minutes: 30,
      passing_score: 70
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTime = Date.now();

    service = new ScenarioTranslationService();
    service.setTimeProvider(() => mockTime);

    // Setup default mocks
    (fs.readFile as jest.Mock).mockResolvedValue('yaml content');
    (yaml.load as jest.Mock).mockReturnValue(mockYamlContent);
  });

  describe('loadTranslation', () => {
    it('should return null for English language', async () => {
      const result = await service.loadTranslation(mockScenario, 'en');
      expect(result).toBeNull();
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should load translation from YAML file for non-English language', async () => {
      const result = await service.loadTranslation(mockScenario, 'zh');

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('ai_literacy_questions_zh.yaml'),
        'utf-8'
      );
      expect(yaml.load).toHaveBeenCalledWith('yaml content');
      expect(result).toEqual({
        title: 'AI 素養測試',
        description: '測試您的 AI 知識',
        config: {
          totalQuestions: 20,
          timeLimit: 30,
          passingScore: 70
        }
      });
    });

    it('should use cache for subsequent requests', async () => {
      // First call
      await service.loadTranslation(mockScenario, 'zh');
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await service.loadTranslation(mockScenario, 'zh');
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after TTL expires', async () => {
      // First call
      await service.loadTranslation(mockScenario, 'zh');
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // Advance time beyond TTL
      mockTime += 11 * 60 * 1000; // 11 minutes

      // Second call should refresh cache
      await service.loadTranslation(mockScenario, 'zh');
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should return null when scenario has no folderName', async () => {
      const scenarioWithoutFolder = {
        ...mockScenario,
        sourceMetadata: {}
      };

      const result = await service.loadTranslation(scenarioWithoutFolder, 'zh');
      expect(result).toBeNull();
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should return null when file does not exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await service.loadTranslation(mockScenario, 'zh');
      expect(result).toBeNull();
    });

    it('should return null when YAML parsing fails', async () => {
      (yaml.load as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      const result = await service.loadTranslation(mockScenario, 'zh');
      expect(result).toBeNull();
    });

    it('should handle different YAML structures', async () => {
      const alternativeYaml = {
        config: {
          title: 'Alternative Title',
          description: 'Alternative Description',
          total_questions: 15,
          time_limit_minutes: 20,
          passing_score: 60
        }
      };
      (yaml.load as jest.Mock).mockReturnValue(alternativeYaml);

      const result = await service.loadTranslation(mockScenario, 'zh');
      expect(result).toEqual({
        title: 'Alternative Title',
        description: 'Alternative Description',
        config: {
          totalQuestions: 15,
          timeLimit: 20,
          passingScore: 60
        }
      });
    });

    it('should handle non-assessment scenarios', async () => {
      const pblScenario = {
        ...mockScenario,
        mode: 'pbl' as const
      };
      const yamlData = { someData: 'value' };
      (yaml.load as jest.Mock).mockReturnValue(yamlData);

      const result = await service.loadTranslation(pblScenario, 'zh');
      expect(result).toEqual(yamlData);
    });

    it('should handle process.cwd() variations', async () => {
      const originalCwd = process.cwd;

      // Test when cwd ends with /frontend
      process.cwd = jest.fn().mockReturnValue('/path/to/frontend');
      const service1 = new ScenarioTranslationService();
      service1.setTimeProvider(() => mockTime);
      await service1.loadTranslation(mockScenario, 'zh');
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('/path/to/frontend/public/assessment_data'),
        'utf-8'
      );

      // Test when cwd doesn't end with /frontend
      jest.clearAllMocks();
      (fs.readFile as jest.Mock).mockResolvedValue('yaml content');
      process.cwd = jest.fn().mockReturnValue('/path/to/project');
      const service2 = new ScenarioTranslationService();
      service2.setTimeProvider(() => mockTime);
      await service2.loadTranslation(mockScenario, 'zh');
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('/path/to/project/frontend/public/assessment_data'),
        'utf-8'
      );

      process.cwd = originalCwd;
    });
  });

  describe('translateScenario', () => {
    it('should return original scenario for English', async () => {
      const result = await service.translateScenario(mockScenario, 'en');
      expect(result).toBe(mockScenario);
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should merge translation content with scenario', async () => {
      const result = await service.translateScenario(mockScenario, 'zh');

      expect(result).toEqual({
        ...mockScenario,
        title: { zh: 'AI 素養測試' },
        description: { zh: '測試您的 AI 知識' },
        metadata: {
          translatedFrom: 'yaml',
          config: {
            totalQuestions: 20,
            timeLimit: 30,
            passingScore: 70
          }
        }
      });
    });

    it('should add translationFailed flag when translation fails', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await service.translateScenario(mockScenario, 'zh');

      expect(result).toEqual({
        ...mockScenario,
        metadata: {
          translationFailed: true
        }
      });
    });

    it('should preserve existing metadata', async () => {
      const scenarioWithMetadata = {
        ...mockScenario,
        metadata: { existingKey: 'existingValue' }
      };

      const result = await service.translateScenario(scenarioWithMetadata, 'zh');

      expect(result.metadata).toEqual({
        existingKey: 'existingValue',
        translatedFrom: 'yaml',
        config: {
          totalQuestions: 20,
          timeLimit: 30,
          passingScore: 70
        }
      });
    });

    it('should handle non-string translation values', async () => {
      (yaml.load as jest.Mock).mockReturnValue({
        assessment_config: {
          title: { unexpected: 'object' },
          description: null
        }
      });

      const result = await service.translateScenario(mockScenario, 'zh');

      expect(result.title).toBe(mockScenario.title);
      expect(result.description).toBe(mockScenario.description);
    });
  });

  describe('translateMultipleScenarios', () => {
    it('should translate multiple scenarios in parallel', async () => {
      const scenarios = [
        mockScenario,
        { ...mockScenario, id: 'scenario-2', sourceId: 'ai_ethics' }
      ];

      const results = await service.translateMultipleScenarios(scenarios, 'zh');

      expect(results).toHaveLength(2);
      expect(results[0].title).toEqual({ zh: 'AI 素養測試' });
      expect(results[1].title).toEqual({ zh: 'AI 素養測試' });
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should handle empty array', async () => {
      const results = await service.translateMultipleScenarios([], 'zh');
      expect(results).toEqual([]);
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should return original scenarios for English', async () => {
      const scenarios = [mockScenario, { ...mockScenario, id: 'scenario-2' }];
      const results = await service.translateMultipleScenarios(scenarios, 'en');

      expect(results).toEqual(scenarios);
      expect(fs.readFile).not.toHaveBeenCalled();
    });
  });

  describe('clearExpiredCache', () => {
    it('should clear expired cache entries', async () => {
      // Load some translations
      await service.loadTranslation(mockScenario, 'zh');
      await service.loadTranslation(mockScenario, 'es');

      let stats = service.getCacheStats();
      expect(stats.size).toBe(2);

      // Advance time to expire first entry
      mockTime += 11 * 60 * 1000;

      // Load another translation
      await service.loadTranslation(mockScenario, 'fr');

      // Clear expired cache
      service.clearExpiredCache();

      stats = service.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toContain('ai_literacy-fr');
    });

    it('should not clear non-expired entries', () => {
      // Manually add cache entries for testing
      service['cache'].set('key1', { content: {}, timestamp: mockTime - 5 * 60 * 1000 });
      service['cache'].set('key2', { content: {}, timestamp: mockTime - 15 * 60 * 1000 });

      service.clearExpiredCache();

      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toContain('key1');
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const stats1 = service.getCacheStats();
      expect(stats1).toEqual({ size: 0, entries: [] });

      await service.loadTranslation(mockScenario, 'zh');
      await service.loadTranslation(mockScenario, 'es');

      const stats2 = service.getCacheStats();
      expect(stats2.size).toBe(2);
      expect(stats2.entries).toContain('ai_literacy-zh');
      expect(stats2.entries).toContain('ai_literacy-es');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined sourceMetadata', async () => {
      const scenarioWithoutMetadata = {
        ...mockScenario,
        sourceMetadata: undefined as any
      };

      const result = await service.loadTranslation(scenarioWithoutMetadata, 'zh');
      expect(result).toBeNull();
    });

    it('should handle empty assessment config', async () => {
      (yaml.load as jest.Mock).mockReturnValue({});

      const result = await service.loadTranslation(mockScenario, 'zh');
      expect(result).toEqual({
        title: undefined,
        description: undefined,
        config: {
          totalQuestions: undefined,
          timeLimit: undefined,
          passingScore: undefined
        }
      });
    });

    it('should handle concurrent requests for same translation', async () => {
      // Reset mock to track calls properly
      jest.clearAllMocks();
      (fs.readFile as jest.Mock).mockResolvedValue('yaml content');

      // Create a new service instance for this test
      const concurrentService = new ScenarioTranslationService();
      concurrentService.setTimeProvider(() => mockTime);

      const promises = [
        concurrentService.loadTranslation(mockScenario, 'zh'),
        concurrentService.loadTranslation(mockScenario, 'zh'),
        concurrentService.loadTranslation(mockScenario, 'zh')
      ];

      const results = await Promise.all(promises);

      // All should return same result
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);

      // Since these are truly concurrent, they might all hit the file system
      // before any of them can populate the cache
      expect(fs.readFile).toHaveBeenCalled();

      // But subsequent calls should use cache
      jest.clearAllMocks();
      const cachedResult = await concurrentService.loadTranslation(mockScenario, 'zh');
      expect(fs.readFile).not.toHaveBeenCalled();
      expect(cachedResult).toEqual(results[0]);
    });
  });
});
