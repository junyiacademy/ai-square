import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Relations 翻譯
import zhTWRelations from '../public/locales/zh-TW/relations.json';
import enRelations from '../public/locales/en/relations.json';
import esRelations from '../public/locales/es/relations.json';
import jaRelations from '../public/locales/ja/relations.json';
import koRelations from '../public/locales/ko/relations.json';
import frRelations from '../public/locales/fr/relations.json';
import deRelations from '../public/locales/de/relations.json';
import ruRelations from '../public/locales/ru/relations.json';
import itRelations from '../public/locales/it/relations.json';

// Auth 翻譯
import zhTWAuth from '../public/locales/zh-TW/auth.json';
import enAuth from '../public/locales/en/auth.json';
import esAuth from '../public/locales/es/auth.json';
import jaAuth from '../public/locales/ja/auth.json';

// 可根據實際需求自動偵測語言，這裡預設 en
const getDefaultLng = () => {
  if (typeof window !== 'undefined') {
    // 從 localStorage 優先讀取用戶偏好
    const savedLang = localStorage.getItem('ai-square-language');
    if (savedLang) return savedLang;
    
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('zh')) return 'zh-TW';
    if (lang.startsWith('es')) return 'es';
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('de')) return 'de';
    if (lang.startsWith('ru')) return 'ru';
    if (lang.startsWith('it')) return 'it';
    // fallback to English for other languages like en-US, en-GB
    if (lang.startsWith('en')) return 'en';
  }
  return 'en'; // 改為默認英文
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': { 
        relations: zhTWRelations,
        auth: zhTWAuth
      },
      en: { 
        relations: enRelations,
        auth: enAuth
      },
      es: { 
        relations: esRelations,
        auth: esAuth
      },
      ja: { 
        relations: jaRelations,
        auth: jaAuth
      },
      ko: { 
        relations: koRelations,
        auth: enAuth // 暫時使用英文，需要時再翻譯
      },
      fr: { 
        relations: frRelations,
        auth: enAuth // 暫時使用英文，需要時再翻譯
      },
      de: { 
        relations: deRelations,
        auth: enAuth // 暫時使用英文，需要時再翻譯
      },
      ru: { 
        relations: ruRelations,
        auth: enAuth // 暫時使用英文，需要時再翻譯
      },
      it: { 
        relations: itRelations,
        auth: enAuth // 暫時使用英文，需要時再翻譯
      },
    },
    lng: getDefaultLng(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    defaultNS: 'relations', // 預設命名空間
  });

export default i18n; 