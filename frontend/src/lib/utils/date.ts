/**
 * Format a date with locale support
 * @param date - The date to format
 * @param locale - The locale string (e.g., 'en', 'zh-TW', 'ja', etc.)
 * @returns Formatted date string
 */
export function formatDateWithLocale(date: Date, locale: string): string {
  // Validate date
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'zhTW': 'zh-TW',
    'zhCN': 'zh-CN',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'ru': 'ru-RU',
    'it': 'it-IT',
    'pt': 'pt-BR',
    'ar': 'ar-SA',
    'id': 'id-ID',
    'th': 'th-TH'
  };

  const browserLocale = localeMap[locale] || locale || 'en-US';

  try {
    return new Intl.DateTimeFormat(browserLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Safely create a Date object from a value
 * @param value - The value to convert to a Date
 * @returns A valid Date object or null if invalid
 */
export function safeDate(value: string | Date | undefined | null): Date | null {
  if (!value) return null;
  
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

/**
 * Format a date string with locale support, with safe handling
 * @param dateString - The date string to format
 * @param locale - The locale string
 * @returns Formatted date string or fallback text
 */
export function formatDateSafely(dateString: string | undefined | null, locale: string): string {
  if (!dateString) return 'N/A';
  const date = safeDate(dateString);
  if (!date) return 'N/A';
  return formatDateWithLocale(date, locale);
}

/**
 * Format a date as a relative time string (e.g., "2 hours ago")
 * @param date - The date to format
 * @param locale - The locale string
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date, locale: string): string {
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'zhTW': 'zh-TW',
    'zhCN': 'zh-CN',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'ru': 'ru-RU',
    'it': 'it-IT',
    'pt': 'pt-BR',
    'ar': 'ar-SA',
    'id': 'id-ID',
    'th': 'th-TH'
  };

  const browserLocale = localeMap[locale] || locale || 'en-US';
  const rtf = new Intl.RelativeTimeFormat(browserLocale, { numeric: 'auto' });
  
  const now = new Date();
  const diffInSeconds = (date.getTime() - now.getTime()) / 1000;
  
  if (Math.abs(diffInSeconds) < 60) {
    return rtf.format(Math.round(diffInSeconds), 'second');
  } else if (Math.abs(diffInSeconds) < 3600) {
    return rtf.format(Math.round(diffInSeconds / 60), 'minute');
  } else if (Math.abs(diffInSeconds) < 86400) {
    return rtf.format(Math.round(diffInSeconds / 3600), 'hour');
  } else {
    return rtf.format(Math.round(diffInSeconds / 86400), 'day');
  }
}