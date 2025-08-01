/**
 * Discovery Translate API Route Tests
 * 測試探索內容翻譯 API
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { HybridTranslationService } from '@/lib/services/hybrid-translation-service';

// Mock dependencies
jest.mock('@/lib/services/hybrid-translation-service');

// Mock console
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('/api/discovery/translate', () => {
  const mockTranslate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup translation service mock
    (HybridTranslationService.getInstance as jest.Mock).mockReturnValue({
      translateContent: mockTranslate,
    });
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
  });

  describe('POST - Translate Discovery Content', () => {
    it('should translate content successfully', async () => {
      const mockTranslatedContent = {
        title: '資料科學家職業路徑',
        description: '探索資料科學職業的機會',
        objectives: [
          '了解資料科學家的角色',
          '學習必要的技能',
          '規劃職業發展',
        ],
        tasks: [
          {
            title: '探索資料科學基礎',
            description: '學習資料科學的核心概念',
            instructions: '完成以下學習活動',
          },
        ],
      };

      mockTranslate.mockResolvedValue(mockTranslatedContent);

      const request = new NextRequest('http://localhost:3000/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: {
            title: 'Data Scientist Career Path',
            description: 'Explore data science career opportunities',
            objectives: [
              'Understand the role of a data scientist',
              'Learn necessary skills',
              'Plan career development',
            ],
            tasks: [
              {
                title: 'Explore Data Science Basics',
                description: 'Learn core concepts of data science',
                instructions: 'Complete the following learning activities',
              },
            ],
          },
          targetLanguage: 'zh',
          mode: 'discovery',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.translatedContent).toEqual(mockTranslatedContent);
      expect(mockTranslate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Data Scientist Career Path',
        }),
        'zh',
        'discovery'
      );
    });

    it('should handle partial content translation', async () => {
      mockTranslate.mockResolvedValue({
        title: 'Título traducido',
        description: 'Descripción traducida',
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: {
            title: 'Translated Title',
            description: 'Translated Description',
          },
          targetLanguage: 'es',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.translatedContent.title).toBe('Título traducido');
      expect(data.data.translatedContent.description).toBe('Descripción traducida');
    });

    it('should return 400 when content is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({
          targetLanguage: 'zh',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Content and target language are required');
    });

    it('should return 400 when target language is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: { title: 'Test' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Content and target language are required');
    });

    it('should handle unsupported language gracefully', async () => {
      mockTranslate.mockRejectedValue(new Error('Unsupported language: xyz'));

      const request = new NextRequest('http://localhost:3000/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: { title: 'Test' },
          targetLanguage: 'xyz',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Unsupported language: xyz');
    });

    it('should handle complex nested content', async () => {
      const complexContent = {
        title: 'AI Engineer Path',
        description: 'Explore AI engineering',
        modules: [
          {
            name: 'Module 1',
            topics: ['Topic 1', 'Topic 2'],
            exercises: [
              {
                title: 'Exercise 1',
                description: 'Do this exercise',
                hints: ['Hint 1', 'Hint 2'],
              },
            ],
          },
        ],
        metadata: {
          difficulty: 'intermediate',
          duration: '3 months',
          prerequisites: ['Python', 'Math'],
        },
      };

      const translatedComplex = {
        title: 'AI工程師路徑',
        description: '探索AI工程',
        modules: [
          {
            name: '模組 1',
            topics: ['主題 1', '主題 2'],
            exercises: [
              {
                title: '練習 1',
                description: '完成這個練習',
                hints: ['提示 1', '提示 2'],
              },
            ],
          },
        ],
        metadata: {
          difficulty: '中級',
          duration: '3個月',
          prerequisites: ['Python', '數學'],
        },
      };

      mockTranslate.mockResolvedValue(translatedComplex);

      const request = new NextRequest('http://localhost:3000/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: complexContent,
          targetLanguage: 'zh',
          mode: 'discovery',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.translatedContent).toEqual(translatedComplex);
      expect(data.data.translatedContent.modules[0].exercises[0].hints).toHaveLength(2);
    });

    it('should cache translations for performance', async () => {
      const content = { title: 'Test Content' };
      const translated = { title: 'Contenido de prueba' };
      
      mockTranslate.mockResolvedValue(translated);

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({
          content,
          targetLanguage: 'es',
          cacheKey: 'test-cache-key',
        }),
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(200);
      expect(mockTranslate).toHaveBeenCalledTimes(1);

      // Second request with same cache key should return cached result
      const request2 = new NextRequest('http://localhost:3000/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({
          content,
          targetLanguage: 'es',
          cacheKey: 'test-cache-key',
        }),
      });

      const response2 = await POST(request2);
      const data2 = await response2.json();
      
      expect(response2.status).toBe(200);
      expect(data2.data.fromCache).toBe(true);
      // Translation service should not be called again
      expect(mockTranslate).toHaveBeenCalledTimes(1);
    });

    it('should handle translation service errors', async () => {
      const error = new Error('Translation service unavailable');
      mockTranslate.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: { title: 'Test' },
          targetLanguage: 'fr',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Translation failed');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Translation error:',
        error
      );
    });

    it('should validate supported languages', async () => {
      const supportedLanguages = ['en', 'zh', 'es', 'pt', 'ar', 'id', 'th', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
      
      mockTranslate.mockResolvedValue({ title: 'Translated' });

      for (const lang of supportedLanguages) {
        const request = new NextRequest('http://localhost:3000/api/discovery/translate', {
          method: 'POST',
          body: JSON.stringify({
            content: { title: 'Test' },
            targetLanguage: lang,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });

    it('should handle empty content gracefully', async () => {
      mockTranslate.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: {},
          targetLanguage: 'zh',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.translatedContent).toEqual({});
    });
  });
});

/**
 * Discovery Translate API Considerations:
 * 
 * 1. Translation Scope:
 *    - Titles and descriptions
 *    - Nested content structures
 *    - Arrays of strings
 *    - Metadata fields
 * 
 * 2. Language Support:
 *    - 14 supported languages
 *    - Validation of language codes
 *    - Fallback handling
 * 
 * 3. Performance:
 *    - Caching mechanism
 *    - Batch translation support
 *    - Partial content translation
 * 
 * 4. Error Handling:
 *    - Service unavailability
 *    - Unsupported languages
 *    - Malformed content
 * 
 * 5. Content Types:
 *    - Discovery scenarios
 *    - Task content
 *    - Career information
 *    - Learning objectives
 */