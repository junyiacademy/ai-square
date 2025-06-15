import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTW from '../public/locales/zh-TW/relations.json';
import en from '../public/locales/en/relations.json';

// 可根據實際需求自動偵測語言，這裡預設 zh-TW
const getDefaultLng = () => {
  if (typeof window !== 'undefined') {
    const lang = navigator.language;
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('zh')) return 'zh-TW';
  }
  return 'zh-TW';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': { translation: zhTW },
      en: { translation: en },
    },
    lng: getDefaultLng(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n; 