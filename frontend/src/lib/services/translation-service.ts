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
    // Map language codes to proper names
    const languageMap: Record<string, string> = {
      'zhTW': 'Traditional Chinese (繁體中文)',
      'zh-TW': 'Traditional Chinese (繁體中文)',
      'zhCN': 'Simplified Chinese (简体中文)',
      'zh-CN': 'Simplified Chinese (简体中文)',
      'en': 'English',
      'es': 'Spanish',
      'ja': 'Japanese',
      'ko': 'Korean',
      'fr': 'French',
      'de': 'German',
      'ru': 'Russian',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ar': 'Arabic',
      'id': 'Indonesian',
      'th': 'Thai'
    };

    const targetLanguageName = languageMap[targetLanguage] || targetLanguage;

    const prompt = `
Translate the following educational feedback to ${targetLanguageName}.

Original Text:
${originalFeedback}

Important:
- Provide ONLY the translation, no explanations or labels
- Maintain all formatting (markdown, **bold**, bullet points)
- Keep proper names and signatures unchanged
- Preserve the encouraging and professional tone
${careerField ? `- Use appropriate terminology for the ${careerField} field` : ''}

Translate now:`;

    try {
      const response = await this.aiService.sendMessage(prompt);

      // Clean up the response - remove any translation labels
      let content = response.content;

      // Remove common translation labels/headers
      content = content.replace(/^Translation.*?:\s*/gim, '');
      content = content.replace(/^Translated.*?:\s*/gim, '');
      content = content.replace(/^.*?Translation:\s*/gim, '');
      content = content.replace(/^.*?Snippet \d+:\s*/gim, '');

      // Remove bullet points that might be added
      if (content.startsWith('• ')) {
        content = content.substring(2);
      }

      // Trim any extra whitespace
      content = content.trim();

      return content;
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
