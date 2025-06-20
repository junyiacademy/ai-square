import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTW from '../public/locales/zh-TW/relations.json';
import en from '../public/locales/en/relations.json';
import es from '../public/locales/es/relations.json';
import ja from '../public/locales/ja/relations.json';
import ko from '../public/locales/ko/relations.json';
import fr from '../public/locales/fr/relations.json';
import de from '../public/locales/de/relations.json';
import ru from '../public/locales/ru/relations.json';
import it from '../public/locales/it/relations.json';

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
      'zh-TW': { translation: zhTW },
      en: { translation: en },
      es: { translation: es },
      ja: { translation: ja },
      ko: { translation: ko },
      fr: { translation: fr },
      de: { translation: de },
      ru: { translation: ru },
      it: { translation: it },
    },
    lng: getDefaultLng(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n; 