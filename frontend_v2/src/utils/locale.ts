/**
 * Convert i18n language code to standard locale format
 * @param language - Language code from i18n (e.g., 'zhTW', 'zhCN', 'en')
 * @returns Standard locale code (e.g., 'zh-TW', 'zh-CN', 'en')
 */
export function getStandardLocale(language: string): string {
  const localeMap: Record<string, string> = {
    'zhTW': 'zh-TW',
    'zhCN': 'zh-CN',
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'pt': 'pt-BR',
    'ru': 'ru-RU',
    'ar': 'ar-SA',
    'th': 'th-TH',
    'id': 'id-ID'
  };
  
  return localeMap[language] || language;
}

/**
 * Format date with proper locale
 * @param date - Date to format (string or Date object)
 * @param language - Language code from i18n
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDateWithLocale(
  date: string | Date, 
  language: string, 
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = getStandardLocale(language);
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString(locale, options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format time with proper locale
 * @param date - Date to format (string or Date object)
 * @param language - Language code from i18n
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted time string
 */
export function formatTimeWithLocale(
  date: string | Date, 
  language: string, 
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = getStandardLocale(language);
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleTimeString(locale, options || {
    hour: '2-digit',
    minute: '2-digit'
  });
}