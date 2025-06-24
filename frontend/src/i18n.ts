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
import koAuth from '../public/locales/ko/auth.json';
import frAuth from '../public/locales/fr/auth.json';
import deAuth from '../public/locales/de/auth.json';
import ruAuth from '../public/locales/ru/auth.json';
import itAuth from '../public/locales/it/auth.json';

// Navigation 翻譯
import zhTWNavigation from '../public/locales/zh-TW/navigation.json';
import enNavigation from '../public/locales/en/navigation.json';
import esNavigation from '../public/locales/es/navigation.json';
import jaNavigation from '../public/locales/ja/navigation.json';
import koNavigation from '../public/locales/ko/navigation.json';
import frNavigation from '../public/locales/fr/navigation.json';
import deNavigation from '../public/locales/de/navigation.json';
import ruNavigation from '../public/locales/ru/navigation.json';
import itNavigation from '../public/locales/it/navigation.json';

// KSA 翻譯
import zhTWKsa from '../public/locales/zh-TW/ksa.json';
import enKsa from '../public/locales/en/ksa.json';
import esKsa from '../public/locales/es/ksa.json';
import jaKsa from '../public/locales/ja/ksa.json';
import koKsa from '../public/locales/ko/ksa.json';
import frKsa from '../public/locales/fr/ksa.json';
import deKsa from '../public/locales/de/ksa.json';
import ruKsa from '../public/locales/ru/ksa.json';
import itKsa from '../public/locales/it/ksa.json';

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
        auth: zhTWAuth,
        navigation: zhTWNavigation,
        ksa: zhTWKsa
      },
      en: { 
        relations: enRelations,
        auth: enAuth,
        navigation: enNavigation,
        ksa: enKsa
      },
      es: { 
        relations: esRelations,
        auth: esAuth,
        navigation: esNavigation,
        ksa: esKsa
      },
      ja: { 
        relations: jaRelations,
        auth: jaAuth,
        navigation: jaNavigation,
        ksa: jaKsa
      },
      ko: { 
        relations: koRelations,
        auth: koAuth,
        navigation: koNavigation,
        ksa: koKsa
      },
      fr: { 
        relations: frRelations,
        auth: frAuth,
        navigation: frNavigation,
        ksa: frKsa
      },
      de: { 
        relations: deRelations,
        auth: deAuth,
        navigation: deNavigation,
        ksa: deKsa
      },
      ru: { 
        relations: ruRelations,
        auth: ruAuth,
        navigation: ruNavigation,
        ksa: ruKsa
      },
      it: { 
        relations: itRelations,
        auth: itAuth,
        navigation: itNavigation,
        ksa: itKsa
      },
    },
    lng: getDefaultLng(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    defaultNS: 'relations', // 預設命名空間
  });

export default i18n; 