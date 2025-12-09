export class MultilingualHelper {
  static processMultilingual(value: unknown, requestedLanguage: string): unknown {
    if (typeof value === 'string' && value.startsWith('{')) {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && parsed !== null && requestedLanguage in parsed) {
          return parsed[requestedLanguage] || parsed['en'] || value;
        }
      } catch {
        // Not JSON, return as-is
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if ('en' in obj || 'zhTW' in obj) {
        return obj[requestedLanguage] || obj['en'] || value;
      }
    }
    return value;
  }

  static extractTitle(titleObj: string | Record<string, string> | undefined, requestedLanguage: string): string {
    if (typeof titleObj === 'string') {
      if (titleObj.startsWith('{')) {
        try {
          const parsed = JSON.parse(titleObj);
          return parsed[requestedLanguage] || parsed['en'] || titleObj;
        } catch {
          return titleObj;
        }
      }
      return titleObj;
    } else if (typeof titleObj === 'object' && titleObj !== null) {
      return titleObj[requestedLanguage] || titleObj['en'] || '';
    }
    return '';
  }

  static processContent(content: Record<string, unknown>, requestedLanguage: string): Record<string, unknown> {
    return {
      ...content,
      instructions: this.processMultilingual(content.instructions, requestedLanguage),
      description: this.processMultilingual(content.description, requestedLanguage)
    };
  }
}
