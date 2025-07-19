/**
 * Language utility functions
 */

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