/**
 * Locale mapping utilities
 * Maps between internal language codes and browser-standard locale codes
 */

/**
 * Map internal language code to browser-standard locale code
 * @param internalCode - Internal language code (e.g., 'zhTW')
 * @returns Browser-standard locale code (e.g., 'zh-TW')
 */
export function toBrowserLocale(internalCode: string): string {
  const mapping: Record<string, string> = {
    'zhTW': 'zh-TW',
    'zhCN': 'zh-CN',
    'pt': 'pt-BR',
    'ar': 'ar-SA',
    'id': 'id-ID',
    'th': 'th-TH',
    // Other languages remain the same
    'en': 'en',
    'es': 'es',
    'ja': 'ja',
    'ko': 'ko',
    'fr': 'fr',
    'de': 'de',
    'ru': 'ru',
    'it': 'it',
  };
  
  return mapping[internalCode] || internalCode;
}

/**
 * Map browser-standard locale code to internal language code
 * @param browserLocale - Browser-standard locale code (e.g., 'zh-TW')
 * @returns Internal language code (e.g., 'zhTW')
 */
export function fromBrowserLocale(browserLocale: string): string {
  const mapping: Record<string, string> = {
    'zh-TW': 'zhTW',
    'zh-CN': 'zhCN',
    'pt-BR': 'pt',
    'ar-SA': 'ar',
    'id-ID': 'id',
    'th-TH': 'th',
    // Other languages remain the same
    'en': 'en',
    'es': 'es',
    'ja': 'ja',
    'ko': 'ko',
    'fr': 'fr',
    'de': 'de',
    'ru': 'ru',
    'it': 'it',
  };
  
  return mapping[browserLocale] || browserLocale;
}