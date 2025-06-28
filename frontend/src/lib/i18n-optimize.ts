/**
 * i18n 優化配置
 * 按需載入語言包
 */

interface LanguageLoader {
  [key: string]: () => Promise<Record<string, unknown>>
}

// 定義語言載入器
export const languageLoaders: LanguageLoader = {
  'en': () => import('@/public/locales/en/common.json'),
  'zh-TW': () => import('@/public/locales/zh-TW/common.json'),
  'es': () => import('@/public/locales/es/common.json'),
  'ja': () => import('@/public/locales/ja/common.json'),
  'ko': () => import('@/public/locales/ko/common.json'),
  'fr': () => import('@/public/locales/fr/common.json'),
  'de': () => import('@/public/locales/de/common.json'),
  'ru': () => import('@/public/locales/ru/common.json'),
  'it': () => import('@/public/locales/it/common.json'),
}

// 載入語言包的快取
const loadedLanguages = new Map<string, Record<string, unknown>>()

/**
 * 動態載入語言包
 */
export async function loadLanguage(lang: string): Promise<Record<string, unknown>> {
  // 檢查快取
  if (loadedLanguages.has(lang)) {
    return loadedLanguages.get(lang)
  }

  // 載入語言包
  const loader = languageLoaders[lang]
  if (!loader) {
    console.warn(`Language ${lang} not supported, falling back to en`)
    return loadLanguage('en')
  }

  try {
    const translations = await loader()
    loadedLanguages.set(lang, translations.default || translations)
    return translations.default || translations
  } catch (error) {
    console.error(`Failed to load language ${lang}:`, error)
    // 降級到英文
    if (lang !== 'en') {
      return loadLanguage('en')
    }
    return {}
  }
}

/**
 * 預載常用語言
 */
export async function preloadCommonLanguages() {
  const commonLanguages = ['en', 'zh-TW']
  await Promise.all(commonLanguages.map(lang => loadLanguage(lang)))
}

/**
 * 清理不常用的語言快取
 */
export function cleanupLanguageCache(keepLanguages: string[] = ['en', 'zh-TW']) {
  loadedLanguages.forEach((_, lang) => {
    if (!keepLanguages.includes(lang)) {
      loadedLanguages.delete(lang)
    }
  })
}