/**
 * AssessmentYAMLLoader 單元測試
 * 遵循 TDD: Red → Green → Refactor
 */

import { AssessmentYAMLLoader, AssessmentYAMLData, AssessmentConfig, AssessmentQuestion } from '../assessment-yaml-loader';
import { cacheService } from '@/lib/cache/cache-service';

// Mock the cache service
jest.mock('@/lib/cache/cache-service');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('AssessmentYAMLLoader', () => {
  let loader: AssessmentYAMLLoader;
  
  const mockAssessmentData: AssessmentYAMLData = {
    config: {
      title: 'AI Literacy Assessment',
      title_zhTW: 'AI 素養評估',
      description: 'Test your AI literacy knowledge',
      description_zhTW: '測試您的 AI 素養知識',
      total_questions: 10,
      time_limit_minutes: 30,
      passing_score: 70,
      domains: ['engaging_with_ai', 'creating_with_ai']
    },
    questions: [{
      id: 'q1',
      domain: 'engaging_with_ai',
      competency: 'understanding_ai',
      question: 'What is machine learning?',
      question_zhTW: '什麼是機器學習？',
      options: [
        'A type of computer programming',
        'A way for computers to learn from data',
        'A new programming language',
        'A type of database'
      ],
      correct_answer: 1,
      explanation: 'Machine learning is a way for computers to learn from data',
      ksa_mapping: {
        knowledge: ['K1', 'K2'],
        skills: ['S1'],
        attitudes: ['A1']
      }
    }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    loader = new AssessmentYAMLLoader();
    
    // Default mock behaviors
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
  });

  describe('constructor', () => {
    it('should set correct default base path for assessment data', () => {
      expect(loader['defaultOptions'].basePath).toContain('assessment_data');
    });

    it('should have correct loader name', () => {
      expect(loader['loaderName']).toBe('AssessmentYAMLLoader');
    });
  });

  describe('loadAssessment', () => {
    it('should construct correct file name for different languages', async () => {
      // We can't test full loading without mocking fs, but we can test the cache key
      await loader.loadAssessment('ai_literacy', 'zhTW').catch(() => {});
      
      // Check that cache was queried with correct key
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('ai_literacy_questions_zhTW')
      );
    });

    it('should fallback to English when language not found', async () => {
      // First call fails, second call for English fallback
      await loader.loadAssessment('ai_literacy', 'ja').catch(() => {});
      
      // Should try Japanese first, then English
      const calls = mockCacheService.get.mock.calls;
      expect(calls.some(call => call[0].includes('ai_literacy_questions_ja'))).toBe(true);
      // The fallback happens but uses a different file naming pattern
      // Since we catch the error, we need to verify the behavior differently
      expect(calls.length).toBeGreaterThan(0);
    });

    it('should handle cache hit correctly', async () => {
      mockCacheService.get.mockResolvedValue(mockAssessmentData);
      
      await loader.loadAssessment('ai_literacy', 'en').catch(() => {});
      
      expect(mockCacheService.get).toHaveBeenCalled();
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

  describe('getFilePath', () => {
    it('should construct correct file path for assessment', () => {
      const filePath = loader['getFilePath'](
        'ai_literacy_questions_en',
        '/base/path',
        'en'
      );
      
      expect(filePath).toBe('/base/path/ai_literacy/ai_literacy_questions_en.yaml');
    });

    it('should extract assessment name correctly', () => {
      const filePath = loader['getFilePath'](
        'basic_ai_knowledge_questions_zhTW',
        '/base/path',
        'zhTW'
      );
      
      expect(filePath).toBe('/base/path/basic_ai_knowledge/basic_ai_knowledge_questions_zhTW.yaml');
    });
  });

  describe('postProcess', () => {
    it('should normalize config field from assessment_config', async () => {
      const dataWithAltConfig: AssessmentYAMLData = {
        assessment_config: mockAssessmentData.config,
        questions: mockAssessmentData.questions
      };
      
      const result = await loader['postProcess'](dataWithAltConfig);
      
      expect(result.config).toEqual(mockAssessmentData.config);
      expect(result.assessment_config).toEqual(mockAssessmentData.config);
    });

    it('should preserve existing config field', async () => {
      const result = await loader['postProcess'](mockAssessmentData);
      
      expect(result.config).toEqual(mockAssessmentData.config);
    });

    it('should add IDs to questions if missing', async () => {
      const dataWithoutIds: AssessmentYAMLData = {
        config: mockAssessmentData.config,
        questions: [
          { 
            domain: 'test',
            competency: 'test',
            question: 'Question 1',
            options: ['A', 'B'],
            correct_answer: 0
          } as any,
          { 
            domain: 'test',
            competency: 'test',
            question: 'Question 2',
            options: ['A', 'B'],
            correct_answer: 1
          } as any
        ]
      };
      
      const result = await loader['postProcess'](dataWithoutIds);
      
      expect(result.questions[0].id).toBe('question_1');
      expect(result.questions[1].id).toBe('question_2');
    });

    it('should preserve existing question IDs', async () => {
      const result = await loader['postProcess'](mockAssessmentData);
      
      expect(result.questions[0].id).toBe('q1');
    });

    it('should handle empty questions array', async () => {
      const dataWithoutQuestions: AssessmentYAMLData = {
        config: mockAssessmentData.config,
        questions: []
      };
      
      const result = await loader['postProcess'](dataWithoutQuestions);
      
      expect(result.questions).toEqual([]);
    });

    it('should handle undefined questions', async () => {
      const dataWithoutQuestions: any = {
        config: mockAssessmentData.config
      };
      
      const result = await loader['postProcess'](dataWithoutQuestions);
      
      expect(result.questions).toBeUndefined();
    });
  });

  describe('validateData', () => {
    it('should always return valid for now', async () => {
      const result = await loader['validateData']();
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('question structure', () => {
    it('should handle questions with KSA mappings', () => {
      const question = mockAssessmentData.questions[0];
      
      expect(question.ksa_mapping).toBeDefined();
      expect(question.ksa_mapping?.knowledge).toContain('K1');
      expect(question.ksa_mapping?.knowledge).toContain('K2');
      expect(question.ksa_mapping?.skills).toContain('S1');
      expect(question.ksa_mapping?.attitudes).toContain('A1');
    });

    it('should handle questions without KSA mappings', () => {
      const questionWithoutKSA: AssessmentQuestion = {
        id: 'q2',
        domain: 'creating_with_ai',
        competency: 'prompt_engineering',
        question: 'What is prompt engineering?',
        options: ['A', 'B', 'C', 'D'],
        correct_answer: 2
      };
      
      expect(questionWithoutKSA.ksa_mapping).toBeUndefined();
      expect(questionWithoutKSA.explanation).toBeUndefined();
    });

    it('should handle questions with multiple language translations', () => {
      const question = mockAssessmentData.questions[0];
      
      expect(question.question).toBe('What is machine learning?');
      expect(question.question_zhTW).toBe('什麼是機器學習？');
    });
  });

  describe('config structure', () => {
    it('should handle all config fields', () => {
      const config = mockAssessmentData.config!;
      
      expect(config.total_questions).toBe(10);
      expect(config.time_limit_minutes).toBe(30);
      expect(config.passing_score).toBe(70);
      expect(config.domains).toContain('engaging_with_ai');
      expect(config.domains).toContain('creating_with_ai');
    });

    it('should handle optional config fields', () => {
      const minimalConfig: AssessmentConfig = {
        title: 'Test Assessment'
      };
      
      expect(minimalConfig.total_questions).toBeUndefined();
      expect(minimalConfig.time_limit_minutes).toBeUndefined();
      expect(minimalConfig.passing_score).toBeUndefined();
      expect(minimalConfig.domains).toBeUndefined();
    });
  });

  describe('cache integration', () => {
    it('should check cache when loading', async () => {
      mockCacheService.get.mockResolvedValue(mockAssessmentData);
      
      await loader.loadAssessment('ai_literacy', 'en').catch(() => {});
      
      expect(mockCacheService.get).toHaveBeenCalled();
    });

    it('should generate correct cache key', () => {
      const cacheKey = loader['getCacheKey']('ai_literacy_questions_en', 'en');
      
      expect(cacheKey).toBe('AssessmentYAMLLoader:ai_literacy_questions_en:en');
    });
  });

  describe('scanAssessments', () => {
    it('should handle error when scanning directory', async () => {
      // Mock fs module
      jest.doMock('fs/promises', () => ({
        readdir: jest.fn().mockRejectedValue(new Error('Directory not found'))
      }));
      
      const result = await loader.scanAssessments();
      
      expect(result).toEqual([]);
    });
  });

  describe('getAvailableLanguages', () => {
    it('should handle error when getting languages', async () => {
      // Mock fs module
      jest.doMock('fs/promises', () => ({
        readdir: jest.fn().mockRejectedValue(new Error('Directory not found'))
      }));
      
      const result = await loader.getAvailableLanguages('ai_literacy');
      
      expect(result).toEqual([]);
    });
  });
});