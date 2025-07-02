/**
 * 國際化動態載入優化
 * 按需載入語言包，減少初始 Bundle 大小
 */

import { initReactI18next } from 'react-i18next';
import i18n from 'i18next';

// 支援的語言列表
export const SUPPORTED_LANGUAGES = [
  'en', 'zhTW', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// 動態載入語言資源 - 使用 fetch 替代 dynamic import
const loadLanguageResources = async (language: SupportedLanguage) => {
  const resources: { [key: string]: unknown } = {};
  
  try {
    // 動態載入通用翻譯
    const commonResponse = await fetch(`/locales/${language}/common.json`);
    if (commonResponse.ok) {
      resources.common = await commonResponse.json();
    }
    
    // 動態載入 PBL 翻譯（如果存在）
    try {
      const pblResponse = await fetch(`/locales/${language}/pbl.json`);
      if (pblResponse.ok) {
        resources.pbl = await pblResponse.json();
      }
    } catch {
      // PBL 翻譯不存在時忽略
    }
    
    return resources;
  } catch (error) {
    console.warn(`Failed to load language resources for ${language}:`, error);
    // Fallback to English
    if (language !== 'en') {
      return loadLanguageResources('en');
    }
    return {};
  }
};

// 初始化 i18n 實例
export const initI18n = async (initialLanguage: SupportedLanguage = 'en') => {
  const resources = await loadLanguageResources(initialLanguage);
  
  await i18n
    .use(initReactI18next)
    .init({
      lng: initialLanguage,
      fallbackLng: 'en',
      debug: process.env.NODE_ENV === 'development',
      
      resources: {
        [initialLanguage]: resources as Record<string, Record<string, string>>
      },
      
      ns: ['common', 'pbl'],
      defaultNS: 'common',
      
      interpolation: {
        escapeValue: false,
      },
      
      react: {
        useSuspense: false, // 避免 SSR 問題
      }
    });
    
  return i18n;
};

// 動態切換語言
export const changeLanguage = async (language: SupportedLanguage) => {
  // 檢查是否已經載入
  if (!i18n.hasResourceBundle(language, 'common')) {
    const resources = await loadLanguageResources(language);
    
    // 添加資源到 i18n 實例
    Object.entries(resources).forEach(([namespace, resource]) => {
      i18n.addResourceBundle(language, namespace, resource, true, true);
    });
  }
  
  return i18n.changeLanguage(language);
};

// 預載入語言（在背景載入常用語言）
export const preloadLanguages = async (languages: SupportedLanguage[]) => {
  const loadPromises = languages.map(async (lang) => {
    if (!i18n.hasResourceBundle(lang, 'common')) {
      try {
        const resources = await loadLanguageResources(lang);
        Object.entries(resources).forEach(([namespace, resource]) => {
          i18n.addResourceBundle(lang, namespace, resource, true, true);
        });
      } catch (error) {
        console.warn(`Failed to preload language ${lang}:`, error);
      }
    }
  });
  
  await Promise.allSettled(loadPromises);
};

export default i18n;