/**
 * 翻譯服務 - 用於評價多語言版本
 */

import { VertexAIService } from '@/lib/ai/vertex-ai-service';

export class TranslationService {
  private aiService: VertexAIService;

  constructor() {
    this.aiService = new VertexAIService({
      systemPrompt: 'You are a professional translator specializing in educational feedback translation.',
      temperature: 0.3, // Lower temperature for more consistent translations
      model: 'gemini-2.5-flash'
    });
  }

  /**
   * 翻譯評價回饋文字
   * @param originalFeedback 原始回饋（英文）
   * @param targetLanguage 目標語言代碼
   * @param careerField 職業領域（用於專業術語翻譯）
   * @returns 翻譯後的回饋
   */
  async translateFeedback(
    originalFeedback: string,
    targetLanguage: string,
    careerField?: string
  ): Promise<string> {
    const prompt = `
You are translating educational feedback from English to language code: ${targetLanguage}.

Context:
${careerField ? `- Career Field: ${careerField}` : ''}
- Content Type: Educational evaluation feedback
- Style: Professional, encouraging, mentor-like tone

Original Feedback (English):
${originalFeedback}

Translation Requirements:
1. Maintain the same tone and style as the original
2. Preserve all formatting (markdown, bold text, bullet points, etc.)
3. Keep the authority figure name and signature in original form
4. Translate technical terms appropriately for the career field
5. Ensure the encouraging and professional tone is preserved
6. Keep the same structure and paragraph organization

Please provide the translation in language code: ${targetLanguage}`;

    try {
      const response = await this.aiService.sendMessage(prompt);
      return response.content;
    } catch (error) {
      console.error('Translation failed:', error);
      throw new Error(`Failed to translate feedback to ${targetLanguage}`);
    }
  }

  /**
   * 批量翻譯多個語言版本
   * @param originalFeedback 原始回饋
   * @param targetLanguages 目標語言列表
   * @param careerField 職業領域
   * @returns 語言版本對應表
   */
  async translateFeedbackBatch(
    originalFeedback: string,
    targetLanguages: string[],
    careerField?: string
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    // 並行翻譯所有目標語言
    const translations = await Promise.allSettled(
      targetLanguages.map(async (lang) => {
        const translated = await this.translateFeedback(originalFeedback, lang, careerField);
        return { lang, translated };
      })
    );

    // 處理翻譯結果
    translations.forEach((result, index) => {
      const lang = targetLanguages[index];
      if (result.status === 'fulfilled') {
        results[lang] = result.value.translated;
      } else {
        console.error(`Translation failed for ${lang}:`, result.reason);
        // 失敗的話保留原文
        results[lang] = originalFeedback;
      }
    });

    return results;
  }

  /**
   * 檢查是否需要翻譯
   * @param existingVersions 現有語言版本
   * @param requiredLanguage 需要的語言
   * @returns 是否需要翻譯
   */
  static needsTranslation(
    existingVersions: Record<string, string> | undefined,
    requiredLanguage: string
  ): boolean {
    if (!existingVersions) return true;
    return !existingVersions[requiredLanguage];
  }

  /**
   * 從版本記錄中獲取指定語言的回饋
   * @param versions 語言版本記錄
   * @param language 目標語言
   * @param fallbackLanguage 備用語言（預設為 en）
   * @returns 指定語言的回饋文字
   */
  static getFeedbackByLanguage(
    versions: Record<string, string> | undefined,
    language: string,
    fallbackLanguage: string = 'en'
  ): string | null {
    if (!versions) return null;
    
    // 優先返回指定語言
    if (versions[language]) {
      return versions[language];
    }
    
    // 備用語言
    if (versions[fallbackLanguage]) {
      return versions[fallbackLanguage];
    }
    
    // 返回任何可用的版本
    const availableVersions = Object.values(versions);
    return availableVersions.length > 0 ? availableVersions[0] : null;
  }
}