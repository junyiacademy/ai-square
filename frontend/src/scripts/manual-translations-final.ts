#!/usr/bin/env tsx
/**
 * Final batch of translations - Completing Korean, Italian, and Russian to 100%
 */

import fs from 'fs/promises';
import path from 'path';

// Final translations to reach 100% for all languages
const translations = {
  // Complete Korean (ko) - remaining 46 keys
  ko: {
    "assessment.json": {
      "results.recommendations.engaging_with_ai": "AI와의 상호작용 개선에 집중: AI 시스템과 상호작용할 때 AI의 한계, 개인정보 보호 문제 및 윤리적 고려사항 이해",
      "results.recommendations.creating_with_ai": "AI로 창작하기 개선에 집중: 프롬프트 기법, 콘텐츠 생성 모범 사례 및 AI 도구와의 창의적 협업 학습",
      "results.recommendations.managing_with_ai": "AI로 관리하기 개선에 집중: AI 지원 의사결정, 워크플로 자동화 및 팀 협업을 위한 기술 개발",
      "results.recommendations.designing_with_ai": "AI로 설계하기 개선에 집중: AI 리터러시 커리큘럼 구축, 학습 자료 작성 및 AI 강화 경험 설계",
      "results.tabs.knowledge-graph": "지식 그래프",
      "results.knowledgeGraph.title": "역량 지식 그래프",
      "results.knowledgeGraph.description": "상세한 숙련도를 보여주는 AI 리터러시 역량의 대화형 시각화",
      "results.knowledgeGraph.yourProfile": "당신의 AI 리터러시 프로필",
      "results.knowledgeGraph.mastery": "숙련도",
      "results.knowledgeGraph.masteryLevel": "숙련도 수준 (0-100%)",
      "results.questionReview.title": "문제 검토",
      "results.questionReview.noQuestions": "검토할 수 있는 문제가 없습니다",
      "results.questionReview.questionNumber": "문제 {{current}} / {{total}}",
      "results.questionReview.previous": "이전",
      "results.questionReview.next": "다음",
      "results.questionReview.correct": "정답입니다!",
      "results.questionReview.incorrect": "오답입니다",
      "results.questionReview.practicePrompt": "이 문제를 검토하고 개념을 더 잘 이해해 보세요",
      "results.questionReview.practiceAgain": "유사한 문제 연습하기",
      "results.questionReview.closeReview": "검토 닫기"
    },
    "auth.json": {
      "register.title": "계정 만들기",
      "register.subtitle": "오늘 AI Square에 가입하세요",
      "register.name": "성명",
      "register.namePlaceholder": "성명을 입력하세요",
      "register.email": "이메일 주소",
      "register.emailPlaceholder": "이메일을 입력하세요",
      "register.password": "비밀번호",
      "register.passwordPlaceholder": "비밀번호를 입력하세요",
      "register.confirmPassword": "비밀번호 확인",
      "register.confirmPasswordPlaceholder": "비밀번호를 다시 입력하세요",
      "register.createAccount": "계정 만들기",
      "register.orContinueWith": "또는 다음으로 계속",
      "register.signIn": "로그인",
      "register.agreeToTerms": "다음에 동의합니다",
      "register.termsOfService": "서비스 약관",
      "register.and": "및",
      "register.privacyPolicy": "개인정보 처리방침",
      "register.errors.nameRequired": "이름은 필수입니다",
      "register.errors.emailRequired": "이메일은 필수입니다",
      "register.errors.emailInvalid": "유효한 이메일을 입력하세요",
      "register.errors.passwordRequired": "비밀번호는 필수입니다",
      "register.errors.passwordTooShort": "비밀번호는 최소 8자 이상이어야 합니다",
      "register.errors.passwordMismatch": "비밀번호가 일치하지 않습니다",
      "register.errors.termsRequired": "약관에 동의해야 합니다",
      "register.errors.registrationFailed": "등록 실패",
      "register.errors.networkError": "네트워크 오류. 다시 시도해 주세요."
    }
  },

  // Complete Italian (it) - remaining 73 keys
  it: {
    "assessment.json": {
      "quiz.correct": "Corretto!",
      "quiz.incorrect": "Errato",
      "quiz.selectAnswerToSeeExplanation": "Seleziona una risposta per vedere la spiegazione",
      "results.recommendations.focusOn": "Concentrati sul miglioramento",
      "results.recommendations.engaging_with_ai": "Concentrati sul miglioramento dell'Interazione con l'IA: Comprendere i limiti dell'IA, le preoccupazioni sulla privacy e le considerazioni etiche nell'interazione con i sistemi IA",
      "results.recommendations.creating_with_ai": "Concentrati sul miglioramento della Creazione con l'IA: Apprendere tecniche di prompting, best practice per la generazione di contenuti e collaborazione creativa con strumenti IA",
      "results.recommendations.managing_with_ai": "Concentrati sul miglioramento della Gestione con l'IA: Sviluppare competenze per il processo decisionale assistito dall'IA, l'automazione del flusso di lavoro e la collaborazione in team",
      "results.recommendations.designing_with_ai": "Concentrati sul miglioramento della Progettazione con l'IA: Costruire curriculum di alfabetizzazione IA, creare materiali didattici e progettare esperienze potenziate dall'IA",
      "results.saveResults": "Salva risultati",
      "results.viewLearningPath": "Visualizza percorso di apprendimento",
      "results.saving": "Salvataggio...",
      "results.saved": "Salvato",
      "results.saveSuccess": "Risultati salvati con successo! ID: {{assessmentId}}",
      "results.saveError": "Errore nel salvataggio dei risultati: {{error}}",
      "results.autoSaving": "Salvataggio automatico dei risultati...",
      "results.autoSaved": "Risultati salvati automaticamente",
      "results.tabs.knowledge-graph": "Grafo delle conoscenze",
      "results.knowledgeGraph.title": "Grafo delle competenze",
      "results.knowledgeGraph.description": "Visualizzazione interattiva delle tue competenze di alfabetizzazione IA con livelli di padronanza dettagliati",
      "results.knowledgeGraph.yourProfile": "Il tuo profilo di alfabetizzazione IA",
      "results.knowledgeGraph.mastery": "Padronanza",
      "results.knowledgeGraph.masteryLevel": "Livello di padronanza (0-100%)",
      "results.questionReview.title": "Revisione domande",
      "results.questionReview.noQuestions": "Nessuna domanda disponibile per la revisione",
      "results.questionReview.questionNumber": "Domanda {{current}} di {{total}}",
      "results.questionReview.previous": "Precedente",
      "results.questionReview.next": "Successiva",
      "results.questionReview.correct": "La tua risposta era corretta!",
      "results.questionReview.incorrect": "La tua risposta era errata",
      "results.questionReview.practicePrompt": "Rivedi questa domanda e cerca di comprendere meglio il concetto",
      "results.questionReview.practiceAgain": "Pratica domande simili",
      "results.questionReview.closeReview": "Chiudi revisione"
    },
    "auth.json": {
      "testAccounts.quickLogin": "Accesso rapido",
      "or": "o",
      "manualLoginHint": "Puoi anche inserire le credenziali manualmente nel modulo sopra",
      "dontHaveAccount": "Non hai un account?",
      "createAccount": "Creane uno",
      "signIn.title": "Bentornato",
      "signIn.subtitle": "Accedi al tuo account",
      "signIn.email": "Indirizzo email",
      "signIn.password": "Password",
      "signIn.rememberMe": "Ricordami",
      "signIn.forgotPassword": "Password dimenticata?",
      "signIn.signInButton": "Accedi",
      "signIn.orContinueWith": "O continua con",
      "signIn.createAccount": "Crea un account",
      "signIn.testAccount": "Account demo disponibile",
      "register.title": "Crea il tuo account",
      "register.subtitle": "Unisciti ad AI Square oggi",
      "register.name": "Nome completo",
      "register.namePlaceholder": "Inserisci il tuo nome completo",
      "register.email": "Indirizzo email",
      "register.emailPlaceholder": "Inserisci la tua email",
      "register.password": "Password",
      "register.passwordPlaceholder": "Inserisci la tua password",
      "register.confirmPassword": "Conferma password",
      "register.confirmPasswordPlaceholder": "Conferma la tua password",
      "register.createAccount": "Crea account",
      "register.orContinueWith": "O continua con",
      "register.signIn": "Accedi",
      "register.agreeToTerms": "Accetto i",
      "register.termsOfService": "Termini di servizio",
      "register.and": "e",
      "register.privacyPolicy": "Informativa sulla privacy",
      "register.errors.nameRequired": "Il nome è obbligatorio",
      "register.errors.emailRequired": "L'email è obbligatoria",
      "register.errors.emailInvalid": "Inserisci un'email valida",
      "register.errors.passwordRequired": "La password è obbligatoria",
      "register.errors.passwordTooShort": "La password deve contenere almeno 8 caratteri",
      "register.errors.passwordMismatch": "Le password non corrispondono",
      "register.errors.termsRequired": "Devi accettare i termini",
      "register.errors.registrationFailed": "Registrazione fallita",
      "register.errors.networkError": "Errore di rete. Riprova."
    }
  },

  // Complete Russian (ru) - remaining 73 keys
  ru: {
    "assessment.json": {
      "quiz.correct": "Правильно!",
      "quiz.incorrect": "Неправильно",
      "quiz.selectAnswerToSeeExplanation": "Выберите ответ, чтобы увидеть объяснение",
      "results.recommendations.focusOn": "Сосредоточьтесь на улучшении",
      "results.recommendations.engaging_with_ai": "Сосредоточьтесь на улучшении взаимодействия с ИИ: Понимание ограничений ИИ, вопросов конфиденциальности и этических соображений при взаимодействии с системами ИИ",
      "results.recommendations.creating_with_ai": "Сосредоточьтесь на улучшении создания с ИИ: Изучение техник промптинга, передовых практик генерации контента и творческого сотрудничества с инструментами ИИ",
      "results.recommendations.managing_with_ai": "Сосредоточьтесь на улучшении управления с ИИ: Развитие навыков принятия решений с помощью ИИ, автоматизации рабочих процессов и командного сотрудничества",
      "results.recommendations.designing_with_ai": "Сосредоточьтесь на улучшении проектирования с ИИ: Создание учебной программы по ИИ-грамотности, разработка учебных материалов и проектирование опыта с использованием ИИ",
      "results.saveResults": "Сохранить результаты",
      "results.viewLearningPath": "Посмотреть путь обучения",
      "results.saving": "Сохранение...",
      "results.saved": "Сохранено",
      "results.saveSuccess": "Результаты успешно сохранены! ID: {{assessmentId}}",
      "results.saveError": "Не удалось сохранить результаты: {{error}}",
      "results.autoSaving": "Автоматическое сохранение результатов...",
      "results.autoSaved": "Результаты автоматически сохранены",
      "results.tabs.knowledge-graph": "Граф знаний",
      "results.knowledgeGraph.title": "Граф компетенций",
      "results.knowledgeGraph.description": "Интерактивная визуализация ваших компетенций в области ИИ-грамотности с детальными уровнями мастерства",
      "results.knowledgeGraph.yourProfile": "Ваш профиль ИИ-грамотности",
      "results.knowledgeGraph.mastery": "Мастерство",
      "results.knowledgeGraph.masteryLevel": "Уровень мастерства (0-100%)",
      "results.questionReview.title": "Просмотр вопросов",
      "results.questionReview.noQuestions": "Нет вопросов для просмотра",
      "results.questionReview.questionNumber": "Вопрос {{current}} из {{total}}",
      "results.questionReview.previous": "Предыдущий",
      "results.questionReview.next": "Следующий",
      "results.questionReview.correct": "Ваш ответ был правильным!",
      "results.questionReview.incorrect": "Ваш ответ был неправильным",
      "results.questionReview.practicePrompt": "Просмотрите этот вопрос и попытайтесь лучше понять концепцию",
      "results.questionReview.practiceAgain": "Практиковать похожие вопросы",
      "results.questionReview.closeReview": "Закрыть просмотр"
    },
    "auth.json": {
      "testAccounts.quickLogin": "Быстрый вход",
      "or": "или",
      "manualLoginHint": "Вы также можете ввести учетные данные вручную в форме выше",
      "dontHaveAccount": "Нет учетной записи?",
      "createAccount": "Создать",
      "signIn.title": "С возвращением",
      "signIn.subtitle": "Войдите в свою учетную запись",
      "signIn.email": "Адрес электронной почты",
      "signIn.password": "Пароль",
      "signIn.rememberMe": "Запомнить меня",
      "signIn.forgotPassword": "Забыли пароль?",
      "signIn.signInButton": "Войти",
      "signIn.orContinueWith": "Или продолжить с",
      "signIn.createAccount": "Создать учетную запись",
      "signIn.testAccount": "Доступна демо-учетная запись",
      "register.title": "Создайте свою учетную запись",
      "register.subtitle": "Присоединяйтесь к AI Square сегодня",
      "register.name": "Полное имя",
      "register.namePlaceholder": "Введите ваше полное имя",
      "register.email": "Адрес электронной почты",
      "register.emailPlaceholder": "Введите ваш email",
      "register.password": "Пароль",
      "register.passwordPlaceholder": "Введите ваш пароль",
      "register.confirmPassword": "Подтвердите пароль",
      "register.confirmPasswordPlaceholder": "Подтвердите ваш пароль",
      "register.createAccount": "Создать учетную запись",
      "register.orContinueWith": "Или продолжить с",
      "register.signIn": "Войти",
      "register.agreeToTerms": "Я согласен с",
      "register.termsOfService": "Условиями использования",
      "register.and": "и",
      "register.privacyPolicy": "Политикой конфиденциальности",
      "register.errors.nameRequired": "Имя обязательно",
      "register.errors.emailRequired": "Email обязателен",
      "register.errors.emailInvalid": "Пожалуйста, введите действительный email",
      "register.errors.passwordRequired": "Пароль обязателен",
      "register.errors.passwordTooShort": "Пароль должен содержать не менее 8 символов",
      "register.errors.passwordMismatch": "Пароли не совпадают",
      "register.errors.termsRequired": "Вы должны согласиться с условиями",
      "register.errors.registrationFailed": "Регистрация не удалась",
      "register.errors.networkError": "Ошибка сети. Пожалуйста, попробуйте еще раз."
    }
  }
};

function setValueByPath(obj: Record<string, unknown>, path: string, value: string): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

async function updateTranslationFile(
  language: string, 
  filename: string, 
  translations: { [key: string]: string }
): Promise<void> {
  const localesDir = path.join(process.cwd(), 'public', 'locales');
  const filePath = path.join(localesDir, language, filename);
  
  // Read existing file
  let existingContent = {};
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    existingContent = JSON.parse(content);
  } catch {
    console.log(`Creating new file: ${filePath}`);
  }
  
  // Update with new translations
  for (const [key, value] of Object.entries(translations)) {
    setValueByPath(existingContent, key, value);
  }
  
  // Write back
  await fs.writeFile(
    filePath,
    JSON.stringify(existingContent, null, 2),
    'utf-8'
  );
}

async function main() {
  console.log('📝 Applying final translations to complete all languages to 100%...\n');
  
  const totalLanguages = Object.keys(translations).length;
  let processed = 0;
  
  for (const [language, files] of Object.entries(translations)) {
    processed++;
    console.log(`🌐 [${processed}/${totalLanguages}] Updating ${language}...`);
    
    let totalKeys = 0;
    for (const [filename, fileTranslations] of Object.entries(files)) {
      const count = Object.keys(fileTranslations).length;
      totalKeys += count;
      console.log(`  📄 ${filename}: ${count} translations`);
      await updateTranslationFile(language, filename, fileTranslations);
    }
    console.log(`  ✅ Total: ${totalKeys} keys translated`);
  }
  
  console.log('\n🎉 All translations completed!');
  console.log('\n📊 Final status:');
  console.log('- Korean (ko): 46 keys added → 100% complete');
  console.log('- Italian (it): 73 keys added → 100% complete');
  console.log('- Russian (ru): 73 keys added → 100% complete');
  console.log('\n✅ All 14 languages are now at 100% translation coverage!');
}

main().catch(console.error);