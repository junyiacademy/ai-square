/**
 * Language utility functions
 */

export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  zhTW: "繁體中文",
  zhCN: "简体中文",
  pt: "Português",
  ar: "العربية",
  id: "Bahasa Indonesia",
  th: "ไทย",
  es: "Español",
  ja: "日本語",
  ko: "한국어",
  fr: "Français",
  de: "Deutsch",
  ru: "Русский",
  it: "Italiano",
};

/**
 * Extract language from request header
 */
export function getLanguageFromHeader(request: Request): string {
  const acceptLanguage = request.headers.get("accept-language");
  if (!acceptLanguage) return "en";

  // Extract primary language code
  const lang = acceptLanguage.split(",")[0].split("-")[0];

  // Map to supported languages
  const supportedLangs = [
    "en",
    "zhTW",
    "zhCN",
    "pt",
    "ar",
    "id",
    "th",
    "es",
    "ja",
    "ko",
    "fr",
    "de",
    "ru",
    "it",
  ];
  if (supportedLangs.includes(lang)) {
    return lang;
  }

  // Handle zh variants
  if (lang === "zh") {
    const variant = acceptLanguage.toLowerCase();
    if (variant.includes("tw") || variant.includes("hant")) {
      return "zhTW";
    }
    return "zhCN";
  }

  return "en";
}

/**
 * Detect if a language is RTL (Right-to-Left)
 */
export function isRTL(language: string): boolean {
  return language === "ar";
}

/**
 * Get the display name for a language code
 */
export function getLanguageDisplayName(languageCode: string): string {
  return LANGUAGE_NAMES[languageCode] || languageCode;
}

/**
 * Validate if a language code is supported
 */
export function isSupportedLanguage(languageCode: string): boolean {
  return Object.keys(LANGUAGE_NAMES).includes(languageCode);
}

/**
 * Get fallback language for unsupported languages
 */
export function getFallbackLanguage(languageCode: string): string {
  if (isSupportedLanguage(languageCode)) {
    return languageCode;
  }

  const normalized = languageCode.toLowerCase();

  // Handle Chinese variants
  if (normalized.startsWith("zh")) {
    if (normalized.includes("tw") || normalized.includes("hant")) {
      return "zhTW";
    }
    if (normalized.includes("cn") || normalized.includes("hans")) {
      return "zhCN";
    }
    return "zhCN"; // Default Chinese to simplified
  }

  // Handle language-region codes (e.g., en-US -> en)
  const baseLang = normalized.split("-")[0];
  if (isSupportedLanguage(baseLang)) {
    return baseLang;
  }

  return "en";
}

/**
 * Normalize language code to supported format
 */
export function normalizeLanguageCode(languageCode: string): string {
  return getFallbackLanguage(languageCode);
}
