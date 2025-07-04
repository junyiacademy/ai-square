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
import zhTWOnboarding from '../public/locales/zhTW/onboarding.json';
import zhCNOnboarding from '../public/locales/zhCN/onboarding.json';
import ptOnboarding from '../public/locales/pt/onboarding.json';
import arOnboarding from '../public/locales/ar/onboarding.json';
import idOnboarding from '../public/locales/id/onboarding.json';
import thOnboarding from '../public/locales/th/onboarding.json';
import enOnboarding from '../public/locales/en/onboarding.json';
import esOnboarding from '../public/locales/es/onboarding.json';
import jaOnboarding from '../public/locales/ja/onboarding.json';
import koOnboarding from '../public/locales/ko/onboarding.json';
import frOnboarding from '../public/locales/fr/onboarding.json';
import deOnboarding from '../public/locales/de/onboarding.json';
import ruOnboarding from '../public/locales/ru/onboarding.json';
import itOnboarding from '../public/locales/it/onboarding.json';

// Common 翻譯
import zhTWCommon from '../public/locales/zhTW/common.json';
import zhCNCommon from '../public/locales/zhCN/common.json';
import ptCommon from '../public/locales/pt/common.json';
import arCommon from '../public/locales/ar/common.json';
import idCommon from '../public/locales/id/common.json';
import thCommon from '../public/locales/th/common.json';
import enCommon from '../public/locales/en/common.json';
import esCommon from '../public/locales/es/common.json';
import jaCommon from '../public/locales/ja/common.json';
import koCommon from '../public/locales/ko/common.json';
import frCommon from '../public/locales/fr/common.json';
import deCommon from '../public/locales/de/common.json';
import ruCommon from '../public/locales/ru/common.json';
import itCommon from '../public/locales/it/common.json';

// Learning Path 翻譯
import zhTWLearningPath from '../public/locales/zhTW/learningPath.json';
import zhCNLearningPath from '../public/locales/zhCN/learningPath.json';
import ptLearningPath from '../public/locales/pt/learningPath.json';
import arLearningPath from '../public/locales/ar/learningPath.json';
import idLearningPath from '../public/locales/id/learningPath.json';
import thLearningPath from '../public/locales/th/learningPath.json';
import enLearningPath from '../public/locales/en/learningPath.json';
import esLearningPath from '../public/locales/es/learningPath.json';
import jaLearningPath from '../public/locales/ja/learningPath.json';
import koLearningPath from '../public/locales/ko/learningPath.json';
import frLearningPath from '../public/locales/fr/learningPath.json';
import deLearningPath from '../public/locales/de/learningPath.json';
import ruLearningPath from '../public/locales/ru/learningPath.json';
import itLearningPath from '../public/locales/it/learningPath.json';

// Dashboard 翻譯
import zhCNDashboard from '../public/locales/zhCN/dashboard.json';
import ptDashboard from '../public/locales/pt/dashboard.json';
import arDashboard from '../public/locales/ar/dashboard.json';
import idDashboard from '../public/locales/id/dashboard.json';
import thDashboard from '../public/locales/th/dashboard.json';
import enDashboard from '../public/locales/en/dashboard.json';
import esDashboard from '../public/locales/es/dashboard.json';
import jaDashboard from '../public/locales/ja/dashboard.json';
import koDashboard from '../public/locales/ko/dashboard.json';
import frDashboard from '../public/locales/fr/dashboard.json';
import deDashboard from '../public/locales/de/dashboard.json';
import ruDashboard from '../public/locales/ru/dashboard.json';
import itDashboard from '../public/locales/it/dashboard.json';
import zhTWDashboard from '../public/locales/zhTW/dashboard.json';

// Chat 翻譯
import zhTWChat from '../public/locales/zhTW/chat.json';
import zhCNChat from '../public/locales/zhCN/chat.json';
import ptChat from '../public/locales/pt/chat.json';
import arChat from '../public/locales/ar/chat.json';
import idChat from '../public/locales/id/chat.json';
import thChat from '../public/locales/th/chat.json';
import enChat from '../public/locales/en/chat.json';
import esChat from '../public/locales/es/chat.json';
import jaChat from '../public/locales/ja/chat.json';
import koChat from '../public/locales/ko/chat.json';
import frChat from '../public/locales/fr/chat.json';
import deChat from '../public/locales/de/chat.json';
import ruChat from '../public/locales/ru/chat.json';
import itChat from '../public/locales/it/chat.json';

// Journey 翻譯
import zhTWJourney from '../public/locales/zhTW/journey.json';
import zhCNJourney from '../public/locales/zhCN/journey.json';
import ptJourney from '../public/locales/pt/journey.json';
import arJourney from '../public/locales/ar/journey.json';
import idJourney from '../public/locales/id/journey.json';
import thJourney from '../public/locales/th/journey.json';
import enJourney from '../public/locales/en/journey.json';
import esJourney from '../public/locales/es/journey.json';
import jaJourney from '../public/locales/ja/journey.json';
import koJourney from '../public/locales/ko/journey.json';
import frJourney from '../public/locales/fr/journey.json';
import deJourney from '../public/locales/de/journey.json';
import ruJourney from '../public/locales/ru/journey.json';
import itJourney from '../public/locales/it/journey.json';

// Learning 翻譯  
import zhTWLearning from '../public/locales/zhTW/learning.json';
import zhCNLearning from '../public/locales/zhCN/learning.json';
import ptLearning from '../public/locales/pt/learning.json';
import arLearning from '../public/locales/ar/learning.json';
import idLearning from '../public/locales/id/learning.json';
import thLearning from '../public/locales/th/learning.json';
import enLearning from '../public/locales/en/learning.json';
import esLearning from '../public/locales/es/learning.json';
import jaLearning from '../public/locales/ja/learning.json';
import koLearning from '../public/locales/ko/learning.json';
import frLearning from '../public/locales/fr/learning.json';
import deLearning from '../public/locales/de/learning.json';
import ruLearning from '../public/locales/ru/learning.json';
import itLearning from '../public/locales/it/learning.json';

// Legal 翻譯
import zhTWLegal from '../public/locales/zhTW/legal.json';
import zhCNLegal from '../public/locales/zhCN/legal.json';
import ptLegal from '../public/locales/pt/legal.json';
import arLegal from '../public/locales/ar/legal.json';
import idLegal from '../public/locales/id/legal.json';
import thLegal from '../public/locales/th/legal.json';
import enLegal from '../public/locales/en/legal.json';
import esLegal from '../public/locales/es/legal.json';
import jaLegal from '../public/locales/ja/legal.json';
import koLegal from '../public/locales/ko/legal.json';
import frLegal from '../public/locales/fr/legal.json';
import deLegal from '../public/locales/de/legal.json';
import ruLegal from '../public/locales/ru/legal.json';
import itLegal from '../public/locales/it/legal.json';

// Career Discovery 翻譯
import enCareerDiscovery from '../public/locales/en/careerDiscovery.json';
import zhTWCareerDiscovery from '../public/locales/zhTW/careerDiscovery.json';

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
        chat: zhTWChat,
        dashboard: zhTWDashboard,
        onboarding: zhTWOnboarding,
        common: zhTWCommon,
        learningPath: zhTWLearningPath,
        journey: zhTWJourney,
        learning: zhTWLearning,
        legal: zhTWLegal,
        careerDiscovery: zhTWCareerDiscovery
      },
      'zhCN': { 
        relations: zhCNRelations,
        auth: zhCNAuth,
        navigation: zhCNNavigation,
        ksa: zhCNKsa,
        assessment: zhCNAssessment,
        homepage: zhCNHomepage,
        pbl: zhCNPbl,
        dashboard: zhCNDashboard,
        chat: zhCNChat,
        onboarding: zhCNOnboarding,
        common: zhCNCommon,
        learningPath: zhCNLearningPath,
        journey: zhCNJourney,
        learning: zhCNLearning,
        legal: zhCNLegal
      },
      'pt': { 
        relations: ptRelations,
        auth: ptAuth,
        navigation: ptNavigation,
        ksa: ptKsa,
        assessment: ptAssessment,
        homepage: ptHomepage,
        pbl: ptPbl,
        dashboard: ptDashboard,
        chat: ptChat,
        onboarding: ptOnboarding,
        common: ptCommon,
        learningPath: ptLearningPath,
        journey: ptJourney,
        learning: ptLearning,
        legal: ptLegal
      },
      'ar': { 
        relations: arRelations,
        auth: arAuth,
        navigation: arNavigation,
        ksa: arKsa,
        assessment: arAssessment,
        homepage: arHomepage,
        pbl: arPbl,
        dashboard: arDashboard,
        chat: arChat,
        onboarding: arOnboarding,
        common: arCommon,
        learningPath: arLearningPath,
        journey: arJourney,
        learning: arLearning,
        legal: arLegal
      },
      'id': { 
        relations: idRelations,
        auth: idAuth,
        navigation: idNavigation,
        ksa: idKsa,
        assessment: idAssessment,
        homepage: idHomepage,
        pbl: idPbl,
        dashboard: idDashboard,
        chat: idChat,
        onboarding: idOnboarding,
        common: idCommon,
        learningPath: idLearningPath,
        journey: idJourney,
        learning: idLearning,
        legal: idLegal
      },
      'th': { 
        relations: thRelations,
        auth: thAuth,
        navigation: thNavigation,
        ksa: thKsa,
        assessment: thAssessment,
        homepage: thHomepage,
        pbl: thPbl,
        dashboard: thDashboard,
        chat: thChat,
        onboarding: thOnboarding,
        common: thCommon,
        learningPath: thLearningPath,
        journey: thJourney,
        learning: thLearning,
        legal: thLegal
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
        chat: enChat,
        journey: enJourney,
        learning: enLearning,
        legal: enLegal,
        careerDiscovery: enCareerDiscovery
      },
      es: { 
        relations: esRelations,
        auth: esAuth,
        navigation: esNavigation,
        ksa: esKsa,
        assessment: esAssessment,
        homepage: esHomepage,
        pbl: esPbl,
        dashboard: esDashboard,
        chat: esChat,
        onboarding: esOnboarding,
        common: esCommon,
        learningPath: esLearningPath,
        journey: esJourney,
        learning: esLearning,
        legal: esLegal
      },
      ja: { 
        relations: jaRelations,
        auth: jaAuth,
        navigation: jaNavigation,
        ksa: jaKsa,
        assessment: jaAssessment,
        homepage: jaHomepage,
        pbl: jaPbl,
        dashboard: jaDashboard,
        chat: jaChat,
        onboarding: jaOnboarding,
        common: jaCommon,
        learningPath: jaLearningPath,
        journey: jaJourney,
        learning: jaLearning,
        legal: jaLegal
      },
      ko: { 
        relations: koRelations,
        auth: koAuth,
        navigation: koNavigation,
        ksa: koKsa,
        assessment: koAssessment,
        homepage: koHomepage,
        pbl: koPbl,
        dashboard: koDashboard,
        chat: koChat,
        onboarding: koOnboarding,
        common: koCommon,
        learningPath: koLearningPath,
        journey: koJourney,
        learning: koLearning,
        legal: koLegal
      },
      fr: { 
        relations: frRelations,
        auth: frAuth,
        navigation: frNavigation,
        ksa: frKsa,
        assessment: frAssessment,
        homepage: frHomepage,
        pbl: frPbl,
        dashboard: frDashboard,
        chat: frChat,
        onboarding: frOnboarding,
        common: frCommon,
        learningPath: frLearningPath,
        journey: frJourney,
        learning: frLearning,
        legal: frLegal
      },
      de: { 
        relations: deRelations,
        auth: deAuth,
        navigation: deNavigation,
        ksa: deKsa,
        assessment: deAssessment,
        homepage: deHomepage,
        pbl: dePbl,
        dashboard: deDashboard,
        chat: deChat,
        onboarding: deOnboarding,
        common: deCommon,
        learningPath: deLearningPath,
        journey: deJourney,
        learning: deLearning,
        legal: deLegal
      },
      ru: { 
        relations: ruRelations,
        auth: ruAuth,
        navigation: ruNavigation,
        ksa: ruKsa,
        assessment: ruAssessment,
        homepage: ruHomepage,
        pbl: ruPbl,
        dashboard: ruDashboard,
        chat: ruChat,
        onboarding: ruOnboarding,
        common: ruCommon,
        learningPath: ruLearningPath,
        journey: ruJourney,
        learning: ruLearning,
        legal: ruLegal
      },
      it: { 
        relations: itRelations,
        auth: itAuth,
        navigation: itNavigation,
        ksa: itKsa,
        assessment: itAssessment,
        homepage: itHomepage,
        pbl: itPbl,
        dashboard: itDashboard,
        chat: itChat,
        onboarding: itOnboarding,
        common: itCommon,
        learningPath: itLearningPath,
        journey: itJourney,
        learning: itLearning,
        legal: itLegal
      },
    },
    lng: getDefaultLng(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    defaultNS: 'relations', // 預設命名空間
  });

export default i18n; 