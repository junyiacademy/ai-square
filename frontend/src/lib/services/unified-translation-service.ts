/**
 * 統一翻譯服務
 * 根據資料類型決定翻譯策略
 */

export interface TranslationStrategy {
  type: 'static' | 'dynamic' | 'none';
  source: 'yaml' | 'gcs' | 'ai';
}

export class UnifiedTranslationService {
  // 定義每種資料類型的翻譯策略
  private strategies: Record<string, TranslationStrategy> = {
    scenario: {
      type: 'static',
      source: 'yaml'
    },
    program: {
      type: 'none',
      source: 'gcs'
    },
    task: {
      type: 'static',
      source: 'yaml'
    },
    evaluation: {
      type: 'dynamic',
      source: 'ai'
    }
  };

  /**
   * 獲取翻譯內容
   */
  async getTranslation(
    entityType: string,
    entityId: string,
    language: string,
    fallbackContent?: any
  ): Promise<any> {
    const strategy = this.strategies[entityType];
    
    if (!strategy || strategy.type === 'none') {
      return fallbackContent;
    }

    switch (strategy.source) {
      case 'yaml':
        return this.loadFromYaml(entityType, entityId, language);
      
      case 'ai':
        return this.translateWithAI(fallbackContent, language);
      
      default:
        return fallbackContent;
    }
  }

  /**
   * 從 YAML 載入翻譯
   */
  private async loadFromYaml(
    entityType: string,
    entityId: string,
    language: string
  ): Promise<any> {
    // 實作 YAML 載入邏輯
    // 根據 entityType 和 entityId 找到對應的 YAML 檔案
    try {
      const response = await fetch(
        `/api/translations/${entityType}/${entityId}?lang=${language}`
      );
      return await response.json();
    } catch (error) {
      console.error('Failed to load translation:', error);
      return null;
    }
  }

  /**
   * 使用 AI 即時翻譯
   */
  private async translateWithAI(
    content: any,
    targetLanguage: string
  ): Promise<any> {
    // 實作 AI 翻譯邏輯
    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          targetLanguage
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to translate with AI:', error);
      return content;
    }
  }

  /**
   * 批次預載翻譯
   */
  async preloadTranslations(
    items: Array<{ type: string; id: string }>,
    language: string
  ): Promise<void> {
    const staticItems = items.filter(
      item => this.strategies[item.type]?.type === 'static'
    );

    // 批次載入靜態翻譯
    await Promise.all(
      staticItems.map(item =>
        this.getTranslation(item.type, item.id, language)
      )
    );
  }
}