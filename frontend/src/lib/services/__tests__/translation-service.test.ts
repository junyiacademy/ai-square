import { TranslationService } from '../translation-service';
import { VertexAIService } from '@/lib/ai/vertex-ai-service';

// Mock VertexAIService
jest.mock('@/lib/ai/vertex-ai-service');

const mockGenerateContent = jest.fn();
(VertexAIService as jest.MockedClass<typeof VertexAIService>).mockImplementation(() => ({
  generateContent: mockGenerateContent,
  model: 'gemini-2.5-flash',
  temperature: 0.3,
  systemPrompt: 'You are a professional translator specializing in educational feedback translation.',
}) as any);

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TranslationService();
  });

  describe('constructor', () => {
    it('initializes VertexAIService with correct config', () => {
      expect(VertexAIService).toHaveBeenCalledWith({
        systemPrompt: 'You are a professional translator specializing in educational feedback translation.',
        temperature: 0.3,
        model: 'gemini-2.5-flash'
      });
    });
  });

  describe('translateFeedback', () => {
    const originalFeedback = 'Great job! You have shown excellent understanding of AI concepts.';

    beforeEach(() => {
      mockGenerateContent.mockResolvedValue('Translated feedback');
    });

    it('translates feedback to Traditional Chinese (zhTW)', async () => {
      const result = await service.translateFeedback(originalFeedback, 'zhTW');
      
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Traditional Chinese (繁體中文)')
      );
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining(originalFeedback)
      );
      expect(result).toBe('Translated feedback');
    });

    it('handles zh-TW format correctly', async () => {
      await service.translateFeedback(originalFeedback, 'zh-TW');
      
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Traditional Chinese (繁體中文)')
      );
    });

    it('translates feedback to Simplified Chinese (zhCN)', async () => {
      await service.translateFeedback(originalFeedback, 'zhCN');
      
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Simplified Chinese (简体中文)')
      );
    });

    it('translates feedback to Spanish', async () => {
      await service.translateFeedback(originalFeedback, 'es');
      
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Spanish')
      );
    });

    it('translates feedback to Japanese', async () => {
      await service.translateFeedback(originalFeedback, 'ja');
      
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Japanese')
      );
    });

    it('includes career field context when provided', async () => {
      const careerField = 'Software Engineering';
      await service.translateFeedback(originalFeedback, 'zhTW', careerField);
      
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining(careerField)
      );
    });

    it('handles unsupported language codes', async () => {
      await service.translateFeedback(originalFeedback, 'unknown-lang');
      
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('unknown-lang')
      );
    });

    it('returns English feedback when target is English', async () => {
      const result = await service.translateFeedback(originalFeedback, 'en');
      
      // When translating to English, it should just return the original
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('English')
      );
      expect(result).toBe('Translated feedback');
    });

    it('handles empty feedback', async () => {
      await service.translateFeedback('', 'zhTW');
      
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('')
      );
    });

    it('supports all documented languages', async () => {
      const languages = [
        ['ko', 'Korean'],
        ['fr', 'French'],
        ['de', 'German'],
        ['ru', 'Russian'],
        ['it', 'Italian'],
        ['pt', 'Portuguese'],
        ['ar', 'Arabic'],
        ['id', 'Indonesian'],
        ['th', 'Thai']
      ];

      for (const [code, name] of languages) {
        await service.translateFeedback(originalFeedback, code);
        expect(mockGenerateContent).toHaveBeenCalledWith(
          expect.stringContaining(name)
        );
      }
    });

    it('propagates errors from AI service', async () => {
      const error = new Error('AI service error');
      mockGenerateContent.mockRejectedValue(error);

      await expect(service.translateFeedback(originalFeedback, 'zhTW'))
        .rejects.toThrow('AI service error');
    });
  });
});
