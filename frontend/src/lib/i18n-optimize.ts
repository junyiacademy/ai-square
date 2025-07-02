/**
 * i18n 優化配置
 * 按需載入語言包
 */

interface LanguageLoader {
  [key: string]: () => Promise<Record<string, unknown>>
}

// 定義語言載入器 - 使用 fetch 替代 dynamic import 來避免 TypeScript 模組解析問題
export const languageLoaders: LanguageLoader = {
  'en': () => fetch('/locales/en/common.json').then(res => res.json()),
  'zhTW': () => fetch('/locales/zhTW/common.json').then(res => res.json()),
  'es': () => fetch('/locales/es/common.json').then(res => res.json()),
  'ja': () => fetch('/locales/ja/common.json').then(res => res.json()),
  'ko': () => fetch('/locales/ko/common.json').then(res => res.json()),
  'fr': () => fetch('/locales/fr/common.json').then(res => res.json()),
  'de': () => fetch('/locales/de/common.json').then(res => res.json()),
  'ru': () => fetch('/locales/ru/common.json').then(res => res.json()),
  'it': () => fetch('/locales/it/common.json').then(res => res.json()),
}

// 載入語言包的快取
const loadedLanguages = new Map<string, Record<string, unknown>>()

/**
 * 動態載入語言包
 */
export async function loadLanguage(lang: string): Promise<Record<string, unknown>> {
  // 檢查快取
  if (loadedLanguages.has(lang)) {
    return loadedLanguages.get(lang) || {}
  }

  // 載入語言包
  const loader = languageLoaders[lang]
  if (!loader) {
    console.warn(`Language ${lang} not supported, falling back to en`)
    return loadLanguage('en')
  }

  try {
    const translations = await loader()
    const translationData = (translations as Record<string, unknown>)
    loadedLanguages.set(lang, translationData)
    return translationData
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
  const commonLanguages = ['en', 'zhTW']
  await Promise.all(commonLanguages.map(lang => loadLanguage(lang)))
}

/**
 * 清理不常用的語言快取
 */
export function cleanupLanguageCache(keepLanguages: string[] = ['en', 'zhTW']) {
  loadedLanguages.forEach((_, lang) => {
    if (!keepLanguages.includes(lang)) {
      loadedLanguages.delete(lang)
    }
  })
}