/**
 * Task Helper Utilities
 * Extracted from PBL Task Page for reusability and testability
 */

/**
 * Converts a numerical score to a qualitative rating
 * @param score - The numerical score (0-100)
 * @returns Object with rating label, color class, and i18n key
 */
export function getQualitativeRating(score: number): {
  label: "Good" | "Great" | "Perfect";
  color: string;
  i18nKey: string;
} {
  if (score >= 91) {
    return {
      label: "Perfect",
      color: "text-purple-600 dark:text-purple-400",
      i18nKey: "pbl:complete.rating.perfect",
    };
  }
  if (score >= 71) {
    return {
      label: "Great",
      color: "text-blue-600 dark:text-blue-400",
      i18nKey: "pbl:complete.rating.great",
    };
  }
  return {
    label: "Good",
    color: "text-green-600 dark:text-green-400",
    i18nKey: "pbl:complete.rating.good",
  };
}

/**
 * Gets a localized field value from an object
 * Uses language suffix pattern: fieldName_lang
 * Falls back to default field if localized version doesn't exist
 *
 * @param obj - The object containing the field
 * @param fieldName - The base field name (e.g., 'title')
 * @param language - The language code (e.g., 'en', 'zh')
 * @returns The localized field value as string, or empty string if not found
 *
 * @example
 * const obj = { title: 'Default', title_en: 'English', title_zh: '中文' };
 * getLocalizedField(obj, 'title', 'en') // 'English'
 * getLocalizedField(obj, 'title', 'fr') // 'Default'
 */
export function getLocalizedField<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  fieldName: string,
  language: string,
): string {
  if (!obj) return "";

  // Use language code directly as suffix
  const langSuffix = language;
  const fieldWithLang = `${fieldName}_${langSuffix}`;

  // Return localized field if exists, otherwise return default
  const value = obj[fieldWithLang] || obj[fieldName] || "";
  return String(value);
}
