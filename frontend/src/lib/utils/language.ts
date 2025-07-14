/**
 * Language utility functions for AI Square
 */

/**
 * Normalize language code from i18n format to our internal format
 * @param i18nLang - Language code from i18n (e.g., 'zh-TW', 'en', 'ja')
 * @returns Normalized language code (e.g., 'zhTW', 'en', 'ja')
 */
export function normalizeLanguageCode(i18nLang: string): string {
  // Handle Chinese variants specially
  if (i18nLang === 'zh-TW') return 'zhTW';
  if (i18nLang === 'zh-CN') return 'zhCN';
  
  // For other languages, use as-is
  return i18nLang || 'en';
}

/**
 * Get language code from Accept-Language header
 * @param acceptLanguage - Accept-Language header value
 * @returns Normalized language code
 */
export function getLanguageFromHeader(acceptLanguage: string | null): string {
  if (!acceptLanguage) return 'en';
  
  // Get the first language from the list
  const firstLang = acceptLanguage.split(',')[0].trim();
  
  // Normalize it
  return normalizeLanguageCode(firstLang);
}

/**
 * Supported languages in the system
 */
export const SUPPORTED_LANGUAGES = [
  'en',
  'zhTW',
  'zhCN',
  'pt',
  'ar',
  'id',
  'th',
  'es',
  'ja',
  'ko',
  'fr',
  'de',
  'ru',
  'it'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Language display names
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  'en': 'English',
  'zhTW': 'Traditional Chinese (繁體中文)',
  'zhCN': 'Simplified Chinese (简体中文)',
  'pt': 'Portuguese (Português)',
  'ar': 'Arabic (العربية)',
  'id': 'Indonesian (Bahasa Indonesia)',
  'th': 'Thai (ไทย)',
  'es': 'Spanish (Español)',
  'ja': 'Japanese (日本語)',
  'ko': 'Korean (한국어)',
  'fr': 'French (Français)',
  'de': 'German (Deutsch)',
  'ru': 'Russian (Русский)',
  'it': 'Italian (Italiano)'
};