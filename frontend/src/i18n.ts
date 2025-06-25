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

// Assessment 翻譯
import zhTWAssessment from '../public/locales/zh-TW/assessment.json';
import enAssessment from '../public/locales/en/assessment.json';
import esAssessment from '../public/locales/es/assessment.json';
import jaAssessment from '../public/locales/ja/assessment.json';
import koAssessment from '../public/locales/ko/assessment.json';
import frAssessment from '../public/locales/fr/assessment.json';
import deAssessment from '../public/locales/de/assessment.json';
import ruAssessment from '../public/locales/ru/assessment.json';
import itAssessment from '../public/locales/it/assessment.json';

// Homepage 翻譯
import zhTWHomepage from '../public/locales/zh-TW/homepage.json';
import enHomepage from '../public/locales/en/homepage.json';
import esHomepage from '../public/locales/es/homepage.json';
import jaHomepage from '../public/locales/ja/homepage.json';
import koHomepage from '../public/locales/ko/homepage.json';
import frHomepage from '../public/locales/fr/homepage.json';
import deHomepage from '../public/locales/de/homepage.json';
import ruHomepage from '../public/locales/ru/homepage.json';
import itHomepage from '../public/locales/it/homepage.json';

// 在伺服器端和客戶端都使用相同的預設語言避免 hydration mismatch
const getDefaultLng = () => {
  // 伺服器端總是返回英文作為預設語言
  // 客戶端的語言偵測會在 I18nProvider 中處理
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': { 
        relations: zhTWRelations,
        auth: zhTWAuth,
        navigation: zhTWNavigation,
        ksa: zhTWKsa,
        assessment: zhTWAssessment,
        homepage: zhTWHomepage
      },
      en: { 
        relations: enRelations,
        auth: enAuth,
        navigation: enNavigation,
        ksa: enKsa,
        assessment: enAssessment,
        homepage: enHomepage
      },
      es: { 
        relations: esRelations,
        auth: esAuth,
        navigation: esNavigation,
        ksa: esKsa,
        assessment: esAssessment,
        homepage: esHomepage
      },
      ja: { 
        relations: jaRelations,
        auth: jaAuth,
        navigation: jaNavigation,
        ksa: jaKsa,
        assessment: jaAssessment,
        homepage: jaHomepage
      },
      ko: { 
        relations: koRelations,
        auth: koAuth,
        navigation: koNavigation,
        ksa: koKsa,
        assessment: koAssessment,
        homepage: koHomepage
      },
      fr: { 
        relations: frRelations,
        auth: frAuth,
        navigation: frNavigation,
        ksa: frKsa,
        assessment: frAssessment,
        homepage: frHomepage
      },
      de: { 
        relations: deRelations,
        auth: deAuth,
        navigation: deNavigation,
        ksa: deKsa,
        assessment: deAssessment,
        homepage: deHomepage
      },
      ru: { 
        relations: ruRelations,
        auth: ruAuth,
        navigation: ruNavigation,
        ksa: ruKsa,
        assessment: ruAssessment,
        homepage: ruHomepage
      },
      it: { 
        relations: itRelations,
        auth: itAuth,
        navigation: itNavigation,
        ksa: itKsa,
        assessment: itAssessment,
        homepage: itHomepage
      },
    },
    lng: getDefaultLng(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    defaultNS: 'relations', // 預設命名空間
  });

export default i18n; 