import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Relations 翻譯
import zhTWRelations from '../public/locales/zhTW/relations.json';
import zhCNRelations from '../public/locales/zhCN/relations.json';
import ptRelations from '../public/locales/pt/relations.json';
import arRelations from '../public/locales/ar/relations.json';
import idRelations from '../public/locales/id/relations.json';
import thRelations from '../public/locales/th/relations.json';
import enRelations from '../public/locales/en/relations.json';
import esRelations from '../public/locales/es/relations.json';
import jaRelations from '../public/locales/ja/relations.json';
import koRelations from '../public/locales/ko/relations.json';
import frRelations from '../public/locales/fr/relations.json';
import deRelations from '../public/locales/de/relations.json';
import ruRelations from '../public/locales/ru/relations.json';
import itRelations from '../public/locales/it/relations.json';

// Auth 翻譯
import zhTWAuth from '../public/locales/zhTW/auth.json';
import zhCNAuth from '../public/locales/zhCN/auth.json';
import ptAuth from '../public/locales/pt/auth.json';
import arAuth from '../public/locales/ar/auth.json';
import idAuth from '../public/locales/id/auth.json';
import thAuth from '../public/locales/th/auth.json';
import enAuth from '../public/locales/en/auth.json';
import esAuth from '../public/locales/es/auth.json';
import jaAuth from '../public/locales/ja/auth.json';
import koAuth from '../public/locales/ko/auth.json';
import frAuth from '../public/locales/fr/auth.json';
import deAuth from '../public/locales/de/auth.json';
import ruAuth from '../public/locales/ru/auth.json';
import itAuth from '../public/locales/it/auth.json';

// Navigation 翻譯
import zhTWNavigation from '../public/locales/zhTW/navigation.json';
import zhCNNavigation from '../public/locales/zhCN/navigation.json';
import ptNavigation from '../public/locales/pt/navigation.json';
import arNavigation from '../public/locales/ar/navigation.json';
import idNavigation from '../public/locales/id/navigation.json';
import thNavigation from '../public/locales/th/navigation.json';
import enNavigation from '../public/locales/en/navigation.json';
import esNavigation from '../public/locales/es/navigation.json';
import jaNavigation from '../public/locales/ja/navigation.json';
import koNavigation from '../public/locales/ko/navigation.json';
import frNavigation from '../public/locales/fr/navigation.json';
import deNavigation from '../public/locales/de/navigation.json';
import ruNavigation from '../public/locales/ru/navigation.json';
import itNavigation from '../public/locales/it/navigation.json';

// KSA 翻譯
import zhTWKsa from '../public/locales/zhTW/ksa.json';
import zhCNKsa from '../public/locales/zhCN/ksa.json';
import ptKsa from '../public/locales/pt/ksa.json';
import arKsa from '../public/locales/ar/ksa.json';
import idKsa from '../public/locales/id/ksa.json';
import thKsa from '../public/locales/th/ksa.json';
import enKsa from '../public/locales/en/ksa.json';
import esKsa from '../public/locales/es/ksa.json';
import jaKsa from '../public/locales/ja/ksa.json';
import koKsa from '../public/locales/ko/ksa.json';
import frKsa from '../public/locales/fr/ksa.json';
import deKsa from '../public/locales/de/ksa.json';
import ruKsa from '../public/locales/ru/ksa.json';
import itKsa from '../public/locales/it/ksa.json';

// Assessment 翻譯
import zhTWAssessment from '../public/locales/zhTW/assessment.json';
import zhCNAssessment from '../public/locales/zhCN/assessment.json';
import ptAssessment from '../public/locales/pt/assessment.json';
import arAssessment from '../public/locales/ar/assessment.json';
import idAssessment from '../public/locales/id/assessment.json';
import thAssessment from '../public/locales/th/assessment.json';
import enAssessment from '../public/locales/en/assessment.json';
import esAssessment from '../public/locales/es/assessment.json';
import jaAssessment from '../public/locales/ja/assessment.json';
import koAssessment from '../public/locales/ko/assessment.json';
import frAssessment from '../public/locales/fr/assessment.json';
import deAssessment from '../public/locales/de/assessment.json';
import ruAssessment from '../public/locales/ru/assessment.json';
import itAssessment from '../public/locales/it/assessment.json';

// Homepage 翻譯
import zhTWHomepage from '../public/locales/zhTW/homepage.json';
import zhCNHomepage from '../public/locales/zhCN/homepage.json';
import ptHomepage from '../public/locales/pt/homepage.json';
import arHomepage from '../public/locales/ar/homepage.json';
import idHomepage from '../public/locales/id/homepage.json';
import thHomepage from '../public/locales/th/homepage.json';
import enHomepage from '../public/locales/en/homepage.json';
import esHomepage from '../public/locales/es/homepage.json';
import jaHomepage from '../public/locales/ja/homepage.json';
import koHomepage from '../public/locales/ko/homepage.json';
import frHomepage from '../public/locales/fr/homepage.json';
import deHomepage from '../public/locales/de/homepage.json';
import ruHomepage from '../public/locales/ru/homepage.json';
import itHomepage from '../public/locales/it/homepage.json';

// PBL 翻譯
import zhTWPbl from '../public/locales/zhTW/pbl.json';
import zhCNPbl from '../public/locales/zhCN/pbl.json';
import ptPbl from '../public/locales/pt/pbl.json';
import arPbl from '../public/locales/ar/pbl.json';
import idPbl from '../public/locales/id/pbl.json';
import thPbl from '../public/locales/th/pbl.json';
import enPbl from '../public/locales/en/pbl.json';
import esPbl from '../public/locales/es/pbl.json';
import jaPbl from '../public/locales/ja/pbl.json';
import koPbl from '../public/locales/ko/pbl.json';
import frPbl from '../public/locales/fr/pbl.json';
import dePbl from '../public/locales/de/pbl.json';
import ruPbl from '../public/locales/ru/pbl.json';
import itPbl from '../public/locales/it/pbl.json';

// Onboarding 翻譯
import enOnboarding from '../public/locales/en/onboarding.json';

// Common 翻譯
import enCommon from '../public/locales/en/common.json';

// Learning Path 翻譯
import enLearningPath from '../public/locales/en/learningPath.json';

// Dashboard 翻譯
import enDashboard from '../public/locales/en/dashboard.json';

// Chat 翻譯
import enChat from '../public/locales/en/chat.json';
import zhTWChat from '../public/locales/zhTW/chat.json';

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
      'zhTW': { 
        relations: zhTWRelations,
        auth: zhTWAuth,
        navigation: zhTWNavigation,
        ksa: zhTWKsa,
        assessment: zhTWAssessment,
        homepage: zhTWHomepage,
        pbl: zhTWPbl,
        chat: zhTWChat
      },
      'zhCN': { 
        relations: zhCNRelations,
        auth: zhCNAuth,
        navigation: zhCNNavigation,
        ksa: zhCNKsa,
        assessment: zhCNAssessment,
        homepage: zhCNHomepage,
        pbl: zhCNPbl
      },
      'pt': { 
        relations: ptRelations,
        auth: ptAuth,
        navigation: ptNavigation,
        ksa: ptKsa,
        assessment: ptAssessment,
        homepage: ptHomepage,
        pbl: ptPbl
      },
      'ar': { 
        relations: arRelations,
        auth: arAuth,
        navigation: arNavigation,
        ksa: arKsa,
        assessment: arAssessment,
        homepage: arHomepage,
        pbl: arPbl
      },
      'id': { 
        relations: idRelations,
        auth: idAuth,
        navigation: idNavigation,
        ksa: idKsa,
        assessment: idAssessment,
        homepage: idHomepage,
        pbl: idPbl
      },
      'th': { 
        relations: thRelations,
        auth: thAuth,
        navigation: thNavigation,
        ksa: thKsa,
        assessment: thAssessment,
        homepage: thHomepage,
        pbl: thPbl
      },
      en: { 
        relations: enRelations,
        auth: enAuth,
        navigation: enNavigation,
        ksa: enKsa,
        assessment: enAssessment,
        homepage: enHomepage,
        pbl: enPbl,
        onboarding: enOnboarding,
        common: enCommon,
        learningPath: enLearningPath,
        dashboard: enDashboard,
        chat: enChat
      },
      es: { 
        relations: esRelations,
        auth: esAuth,
        navigation: esNavigation,
        ksa: esKsa,
        assessment: esAssessment,
        homepage: esHomepage,
        pbl: esPbl
      },
      ja: { 
        relations: jaRelations,
        auth: jaAuth,
        navigation: jaNavigation,
        ksa: jaKsa,
        assessment: jaAssessment,
        homepage: jaHomepage,
        pbl: jaPbl
      },
      ko: { 
        relations: koRelations,
        auth: koAuth,
        navigation: koNavigation,
        ksa: koKsa,
        assessment: koAssessment,
        homepage: koHomepage,
        pbl: koPbl
      },
      fr: { 
        relations: frRelations,
        auth: frAuth,
        navigation: frNavigation,
        ksa: frKsa,
        assessment: frAssessment,
        homepage: frHomepage,
        pbl: frPbl
      },
      de: { 
        relations: deRelations,
        auth: deAuth,
        navigation: deNavigation,
        ksa: deKsa,
        assessment: deAssessment,
        homepage: deHomepage,
        pbl: dePbl
      },
      ru: { 
        relations: ruRelations,
        auth: ruAuth,
        navigation: ruNavigation,
        ksa: ruKsa,
        assessment: ruAssessment,
        homepage: ruHomepage,
        pbl: ruPbl
      },
      it: { 
        relations: itRelations,
        auth: itAuth,
        navigation: itNavigation,
        ksa: itKsa,
        assessment: itAssessment,
        homepage: itHomepage,
        pbl: itPbl
      },
    },
    lng: getDefaultLng(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    defaultNS: 'relations', // 預設命名空間
  });

export default i18n; 