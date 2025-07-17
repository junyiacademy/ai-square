/**
 * Scenario Translation Service Tests
 * Following TDD: Red → Green → Refactor
 */

import { ScenarioTranslationService } from '../scenario-translation-service';
import { IScenario } from '@/types/unified-learning';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('js-yaml');

describe('ScenarioTranslationService', () => {
  let service: ScenarioTranslationService;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockYaml = yaml as jest.Mocked<typeof yaml>;

  beforeEach(() => {
    service = new ScenarioTranslationService();
    jest.clearAllMocks();
  });

  describe('loadTranslation', () => {
    const mockScenario: IScenario = {
      id: 'scenario-123',
      sourceType: 'assessment',
      title: 'AI Literacy Assessment',
      description: 'Evaluate your understanding',
      taskTemplates: [],
      metadata: {},
      sourceRef: {
        type: 'yaml',
        sourceId: 'ai_literacy',
        metadata: {
          folderName: 'ai_literacy',
          basePath: 'assessment_data/ai_literacy'
        }
      }
    };

    it('should load translation from YAML file for non-English language', async () => {
      // Arrange
      const expectedTranslation = {
        title: 'AI 素養評估',
        description: '評估您對 AI 系統的理解',
        config: {
          totalQuestions: 12,
          timeLimit: 15,
          passingScore: 60
        }
      };

      mockFs.readFile.mockResolvedValue(`
assessment_config:
  title: AI 素養評估
  description: 評估您對 AI 系統的理解
  total_questions: 12
  time_limit_minutes: 15
  passing_score: 60
`);

      mockYaml.load.mockReturnValue({
        assessment_config: {
          title: 'AI 素養評估',
          description: '評估您對 AI 系統的理解',
          total_questions: 12,
          time_limit_minutes: 15,
          passing_score: 60
        }
      });

      // Act
      const result = await service.loadTranslation(mockScenario, 'zhTW');

      // Assert
      expect(result).toEqual(expectedTranslation);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('ai_literacy_questions_zhTW.yaml'),
        'utf-8'
      );
    });

    it('should return null for English language', async () => {
      // Act
      const result = await service.loadTranslation(mockScenario, 'en');

      // Assert
      expect(result).toBeNull();
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('should return null when YAML file does not exist', async () => {
      // Arrange
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      // Act
      const result = await service.loadTranslation(mockScenario, 'ja');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle malformed YAML gracefully', async () => {
      // Arrange
      mockFs.readFile.mockResolvedValue('invalid yaml content');
      mockYaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      // Act
      const result = await service.loadTranslation(mockScenario, 'zhTW');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('translateScenario', () => {
    const mockScenario: IScenario = {
      id: 'scenario-123',
      sourceType: 'assessment',
      title: 'AI Literacy Assessment',
      description: 'Evaluate your understanding',
      taskTemplates: [],
      metadata: {},
      sourceRef: {
        type: 'yaml',
        sourceId: 'ai_literacy',
        metadata: {
          folderName: 'ai_literacy'
        }
      }
    };

    it('should return original scenario for English', async () => {
      // Act
      const result = await service.translateScenario(mockScenario, 'en');

      // Assert
      expect(result).toEqual(mockScenario);
    });

    it('should merge translation with original scenario', async () => {
      // Arrange
      const translation = {
        title: 'AI 素養評估',
        description: '評估您對 AI 系統的理解',
        config: { totalQuestions: 12 }
      };

      jest.spyOn(service, 'loadTranslation').mockResolvedValue(translation);

      // Act
      const result = await service.translateScenario(mockScenario, 'zhTW');

      // Assert
      expect(result.title).toBe('AI 素養評估');
      expect(result.description).toBe('評估您對 AI 系統的理解');
      expect(result.metadata.translatedFrom).toBe('yaml');
      expect(result.metadata.config).toEqual({ totalQuestions: 12 });
    });

    it('should fall back to original when translation fails', async () => {
      // Arrange
      jest.spyOn(service, 'loadTranslation').mockResolvedValue(null);

      // Act
      const result = await service.translateScenario(mockScenario, 'zhTW');

      // Assert
      expect(result.title).toBe(mockScenario.title);
      expect(result.description).toBe(mockScenario.description);
      expect(result.metadata.translationFailed).toBe(true);
    });
  });

  describe('translateMultipleScenarios', () => {
    it('should translate multiple scenarios in parallel', async () => {
      // Arrange
      const scenarios = [
        {
          id: '1',
          sourceType: 'assessment' as const,
          title: 'Test 1',
          description: 'Desc 1',
          taskTemplates: [],
          metadata: {},
          sourceRef: {
            type: 'yaml' as const,
            sourceId: 'test1',
            metadata: { folderName: 'test1' }
          }
        },
        {
          id: '2',
          sourceType: 'assessment' as const,
          title: 'Test 2',
          description: 'Desc 2',
          taskTemplates: [],
          metadata: {},
          sourceRef: {
            type: 'yaml' as const,
            sourceId: 'test2',
            metadata: { folderName: 'test2' }
          }
        }
      ];

      const translateSpy = jest.spyOn(service, 'translateScenario')
        .mockImplementation(async (scenario) => ({
          ...scenario,
          title: `Translated ${scenario.title}`
        }));

      // Act
      const results = await service.translateMultipleScenarios(scenarios, 'zhTW');

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Translated Test 1');
      expect(results[1].title).toBe('Translated Test 2');
      expect(translateSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('caching', () => {
    it('should cache translation results', async () => {
      // Arrange
      const scenario: IScenario = {
        id: 'scenario-123',
        sourceType: 'assessment',
        title: 'Test',
        description: 'Test',
        taskTemplates: [],
        metadata: {},
        sourceRef: {
          type: 'yaml',
          sourceId: 'test',
          metadata: { folderName: 'test' }
        }
      };

      mockFs.readFile.mockResolvedValue('title: 測試');
      mockYaml.load.mockReturnValue({ assessment_config: { title: '測試' } });

      // Act - First call
      await service.loadTranslation(scenario, 'zhTW');
      
      // Act - Second call (should use cache)
      await service.loadTranslation(scenario, 'zhTW');

      // Assert
      expect(mockFs.readFile).toHaveBeenCalledTimes(1); // Only called once due to cache
    });

    it('should expire cache after TTL', async () => {
      // Arrange
      let currentTime = 0;
      const mockTimeProvider = () => currentTime;
      service.setTimeProvider(mockTimeProvider);
      
      const scenario: IScenario = {
        id: 'scenario-123',
        sourceType: 'assessment',
        title: 'Test',
        description: 'Test',
        taskTemplates: [],
        metadata: {},
        sourceRef: {
          type: 'yaml',
          sourceId: 'test',
          metadata: { folderName: 'test' }
        }
      };

      mockFs.readFile.mockResolvedValue('title: 測試');
      mockYaml.load.mockReturnValue({ assessment_config: { title: '測試' } });

      // Act - First call at time 0
      currentTime = 0;
      await service.loadTranslation(scenario, 'zhTW');

      // Simulate cache expiry (advance time by 11 minutes)
      currentTime = 11 * 60 * 1000;

      // Act - Second call after expiry
      await service.loadTranslation(scenario, 'zhTW');

      // Assert
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });
  });
});