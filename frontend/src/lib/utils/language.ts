/**
 * Language utility functions
 */

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  zhTW: '繁體中文',
  zhCN: '简体中文',
  pt: 'Português',
  ar: 'العربية',
  id: 'Bahasa Indonesia',
  th: 'ไทย',
  es: 'Español',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
  ru: 'Русский',
  it: 'Italiano'
};

/**
 * Extract language from request header
 */
export function getLanguageFromHeader(request: Request): string {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return 'en';
  
  // Extract primary language code
  const lang = acceptLanguage.split(',')[0].split('-')[0];
  
  // Map to supported languages
  const supportedLangs = ['en', 'zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
  if (supportedLangs.includes(lang)) {
    return lang;
  }
  
  // Handle zh variants
  if (lang === 'zh') {
    const variant = acceptLanguage.toLowerCase();
    if (variant.includes('tw') || variant.includes('hant')) {
      return 'zhTW';
    }
    return 'zhCN';
  }
  
  return 'en';
}

/**
 * Normalize language code to match our system format
 */
export function normalizeLanguageCode(lang: string): string {
  // Handle zh-TW format
  if (lang === 'zh-TW' || lang === 'zh_TW') {
    return 'zhTW';
  }
  
  // Handle zh-CN format
  if (lang === 'zh-CN' || lang === 'zh_CN' || lang === 'zh') {
    return 'zhCN';
  }
  
  // List of supported languages
  const supportedLangs = ['en', 'zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
  
  // Return if already in correct format
  if (supportedLangs.includes(lang)) {
    return lang;
  }
  
  // Default to English
  return 'en';
}