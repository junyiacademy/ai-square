#!/usr/bin/env tsx
/**
 * Manual translations batch 2 - Completing remaining translations
 */

import fs from 'fs/promises';
import path from 'path';

// Additional translations for remaining keys
const translations = {
  // Complete Arabic, Indonesian, Portuguese, Thai (only 8 keys each)
  ar: {
    "admin.json": {
      "dashboard.quickActions": "إجراءات سريعة"
    },
    "navigation.json": {
      "discovery": "الاستكشاف",
      "more": "المزيد",
      "language": "اللغة",
      "theme": "المظهر",
      "light": "فاتح",
      "dark": "داكن"
    },
    "pbl.json": {
      "learn.completeProgram": "إكمال البرنامج"
    }
  },
  
  id: {
    "admin.json": {
      "dashboard.quickActions": "Tindakan Cepat"
    },
    "navigation.json": {
      "discovery": "Penemuan",
      "more": "Lainnya",
      "language": "Bahasa",
      "theme": "Tema",
      "light": "Terang",
      "dark": "Gelap"
    },
    "pbl.json": {
      "learn.completeProgram": "Selesaikan Program"
    }
  },
  
  pt: {
    "admin.json": {
      "dashboard.quickActions": "Ações Rápidas"
    },
    "navigation.json": {
      "discovery": "Descoberta",
      "more": "Mais",
      "language": "Idioma",
      "theme": "Tema",
      "light": "Claro",
      "dark": "Escuro"
    },
    "pbl.json": {
      "learn.completeProgram": "Concluir Programa"
    }
  },
  
  th: {
    "admin.json": {
      "dashboard.quickActions": "การดำเนินการด่วน"
    },
    "navigation.json": {
      "discovery": "การค้นพบ",
      "more": "เพิ่มเติม",
      "language": "ภาษา",
      "theme": "ธีม",
      "light": "สว่าง",
      "dark": "มืด"
    },
    "pbl.json": {
      "learn.completeProgram": "เสร็จสิ้นโปรแกรม"
    }
  },

  // Complete German (de) - remaining assessment and auth keys
  de: {
    "assessment.json": {
      "results.tabs.knowledge-graph": "Wissensgraph",
      "results.knowledgeGraph.title": "Kompetenz-Wissensgraph",
      "results.knowledgeGraph.description": "Interaktive Visualisierung Ihrer KI-Kompetenzen mit detaillierten Beherrschungsgraden",
      "results.knowledgeGraph.yourProfile": "Ihr KI-Kompetenzprofil",
      "results.knowledgeGraph.mastery": "Beherrschung",
      "results.knowledgeGraph.masteryLevel": "Beherrschungsgrad (0-100%)",
      "results.questionReview.title": "Fragenüberprüfung",
      "results.questionReview.noQuestions": "Keine Fragen zur Überprüfung verfügbar",
      "results.questionReview.questionNumber": "Frage {{current}} von {{total}}",
      "results.questionReview.previous": "Zurück",
      "results.questionReview.next": "Weiter",
      "results.questionReview.correct": "Ihre Antwort war richtig!",
      "results.questionReview.incorrect": "Ihre Antwort war falsch",
      "results.questionReview.practicePrompt": "Überprüfen Sie diese Frage und versuchen Sie, das Konzept besser zu verstehen",
      "results.questionReview.practiceAgain": "Ähnliche Fragen üben",
      "results.questionReview.closeReview": "Überprüfung schließen"
    },
    "auth.json": {
      "register.title": "Konto erstellen",
      "register.subtitle": "Treten Sie AI Square heute bei",
      "register.name": "Vollständiger Name",
      "register.namePlaceholder": "Geben Sie Ihren vollständigen Namen ein",
      "register.email": "E-Mail-Adresse",
      "register.emailPlaceholder": "Geben Sie Ihre E-Mail ein",
      "register.password": "Passwort",
      "register.passwordPlaceholder": "Geben Sie Ihr Passwort ein",
      "register.confirmPassword": "Passwort bestätigen",
      "register.confirmPasswordPlaceholder": "Bestätigen Sie Ihr Passwort",
      "register.createAccount": "Konto erstellen",
      "register.orContinueWith": "Oder fortfahren mit",
      "register.signIn": "Anmelden",
      "register.agreeToTerms": "Ich stimme den",
      "register.termsOfService": "Nutzungsbedingungen",
      "register.and": "und",
      "register.privacyPolicy": "Datenschutzrichtlinien",
      "register.errors.nameRequired": "Name ist erforderlich",
      "register.errors.emailRequired": "E-Mail ist erforderlich",
      "register.errors.emailInvalid": "Bitte geben Sie eine gültige E-Mail ein",
      "register.errors.passwordRequired": "Passwort ist erforderlich",
      "register.errors.passwordTooShort": "Passwort muss mindestens 8 Zeichen lang sein",
      "register.errors.passwordMismatch": "Passwörter stimmen nicht überein",
      "register.errors.termsRequired": "Sie müssen den Bedingungen zustimmen",
      "register.errors.registrationFailed": "Registrierung fehlgeschlagen",
      "register.errors.networkError": "Netzwerkfehler. Bitte versuchen Sie es erneut."
    }
  },

  // Complete French (fr) - remaining assessment and auth keys
  fr: {
    "assessment.json": {
      "results.tabs.knowledge-graph": "Graphe de connaissances",
      "results.knowledgeGraph.title": "Graphe de compétences",
      "results.knowledgeGraph.description": "Visualisation interactive de vos compétences en IA avec des niveaux de maîtrise détaillés",
      "results.knowledgeGraph.yourProfile": "Votre profil de compétences IA",
      "results.knowledgeGraph.mastery": "Maîtrise",
      "results.knowledgeGraph.masteryLevel": "Niveau de maîtrise (0-100%)",
      "results.questionReview.title": "Révision des questions",
      "results.questionReview.noQuestions": "Aucune question disponible pour la révision",
      "results.questionReview.questionNumber": "Question {{current}} sur {{total}}",
      "results.questionReview.previous": "Précédent",
      "results.questionReview.next": "Suivant",
      "results.questionReview.correct": "Votre réponse était correcte !",
      "results.questionReview.incorrect": "Votre réponse était incorrecte",
      "results.questionReview.practicePrompt": "Révisez cette question et essayez de mieux comprendre le concept",
      "results.questionReview.practiceAgain": "Pratiquer des questions similaires",
      "results.questionReview.closeReview": "Fermer la révision"
    },
    "auth.json": {
      "register.title": "Créez votre compte",
      "register.subtitle": "Rejoignez AI Square aujourd'hui",
      "register.name": "Nom complet",
      "register.namePlaceholder": "Entrez votre nom complet",
      "register.email": "Adresse e-mail",
      "register.emailPlaceholder": "Entrez votre e-mail",
      "register.password": "Mot de passe",
      "register.passwordPlaceholder": "Entrez votre mot de passe",
      "register.confirmPassword": "Confirmer le mot de passe",
      "register.confirmPasswordPlaceholder": "Confirmez votre mot de passe",
      "register.createAccount": "Créer un compte",
      "register.orContinueWith": "Ou continuer avec",
      "register.signIn": "Se connecter",
      "register.agreeToTerms": "J'accepte les",
      "register.termsOfService": "Conditions d'utilisation",
      "register.and": "et",
      "register.privacyPolicy": "Politique de confidentialité",
      "register.errors.nameRequired": "Le nom est requis",
      "register.errors.emailRequired": "L'e-mail est requis",
      "register.errors.emailInvalid": "Veuillez entrer un e-mail valide",
      "register.errors.passwordRequired": "Le mot de passe est requis",
      "register.errors.passwordTooShort": "Le mot de passe doit contenir au moins 8 caractères",
      "register.errors.passwordMismatch": "Les mots de passe ne correspondent pas",
      "register.errors.termsRequired": "Vous devez accepter les conditions",
      "register.errors.registrationFailed": "Échec de l'inscription",
      "register.errors.networkError": "Erreur réseau. Veuillez réessayer."
    }
  },

  // Complete Japanese (ja) - remaining assessment and auth keys
  ja: {
    "assessment.json": {
      "results.tabs.knowledge-graph": "ナレッジグラフ",
      "results.knowledgeGraph.title": "コンピテンシーナレッジグラフ",
      "results.knowledgeGraph.description": "AIリテラシーコンピテンシーの詳細な習熟度を示すインタラクティブな可視化",
      "results.knowledgeGraph.yourProfile": "あなたのAIリテラシープロファイル",
      "results.knowledgeGraph.mastery": "習熟度",
      "results.knowledgeGraph.masteryLevel": "習熟レベル (0-100%)",
      "results.questionReview.title": "問題レビュー",
      "results.questionReview.noQuestions": "レビュー可能な問題がありません",
      "results.questionReview.questionNumber": "問題 {{current}} / {{total}}",
      "results.questionReview.previous": "前へ",
      "results.questionReview.next": "次へ",
      "results.questionReview.correct": "正解です！",
      "results.questionReview.incorrect": "不正解です",
      "results.questionReview.practicePrompt": "この問題を復習して、概念をよりよく理解してください",
      "results.questionReview.practiceAgain": "類似問題を練習",
      "results.questionReview.closeReview": "レビューを閉じる"
    },
    "auth.json": {
      "register.title": "アカウントを作成",
      "register.subtitle": "今すぐAI Squareに参加",
      "register.name": "フルネーム",
      "register.namePlaceholder": "フルネームを入力してください",
      "register.email": "メールアドレス",
      "register.emailPlaceholder": "メールアドレスを入力してください",
      "register.password": "パスワード",
      "register.passwordPlaceholder": "パスワードを入力してください",
      "register.confirmPassword": "パスワードの確認",
      "register.confirmPasswordPlaceholder": "パスワードを再入力してください",
      "register.createAccount": "アカウントを作成",
      "register.orContinueWith": "または次で続ける",
      "register.signIn": "サインイン",
      "register.agreeToTerms": "私は以下に同意します",
      "register.termsOfService": "利用規約",
      "register.and": "および",
      "register.privacyPolicy": "プライバシーポリシー",
      "register.errors.nameRequired": "名前は必須です",
      "register.errors.emailRequired": "メールアドレスは必須です",
      "register.errors.emailInvalid": "有効なメールアドレスを入力してください",
      "register.errors.passwordRequired": "パスワードは必須です",
      "register.errors.passwordTooShort": "パスワードは8文字以上である必要があります",
      "register.errors.passwordMismatch": "パスワードが一致しません",
      "register.errors.termsRequired": "利用規約に同意する必要があります",
      "register.errors.registrationFailed": "登録に失敗しました",
      "register.errors.networkError": "ネットワークエラー。もう一度お試しください。"
    }
  },

  // Complete Spanish (es) - remaining assessment and auth keys
  es: {
    "assessment.json": {
      "results.recommendations.focusOn": "Enfocarse en mejorar",
      "results.recommendations.engaging_with_ai": "Enfocarse en mejorar la Interacción con IA: Comprensión de las limitaciones de la IA, preocupaciones de privacidad y consideraciones éticas al interactuar con sistemas de IA",
      "results.recommendations.creating_with_ai": "Enfocarse en mejorar la Creación con IA: Aprendizaje de técnicas de prompts, mejores prácticas de generación de contenido y colaboración creativa con herramientas de IA",
      "results.recommendations.managing_with_ai": "Enfocarse en mejorar la Gestión con IA: Desarrollo de habilidades para la toma de decisiones asistida por IA, automatización de flujos de trabajo y colaboración en equipo",
      "results.recommendations.designing_with_ai": "Enfocarse en mejorar el Diseño con IA: Construcción de currículum de alfabetización en IA, creación de materiales de aprendizaje y diseño de experiencias mejoradas con IA",
      "results.tabs.knowledge-graph": "Grafo de conocimiento",
      "results.knowledgeGraph.title": "Grafo de competencias",
      "results.knowledgeGraph.description": "Visualización interactiva de sus competencias de alfabetización en IA mostrando niveles detallados de dominio",
      "results.knowledgeGraph.yourProfile": "Su perfil de alfabetización en IA",
      "results.knowledgeGraph.mastery": "Dominio",
      "results.knowledgeGraph.masteryLevel": "Nivel de dominio (0-100%)",
      "results.questionReview.title": "Revisión de preguntas",
      "results.questionReview.noQuestions": "No hay preguntas disponibles para revisión",
      "results.questionReview.questionNumber": "Pregunta {{current}} de {{total}}",
      "results.questionReview.previous": "Anterior",
      "results.questionReview.next": "Siguiente",
      "results.questionReview.correct": "¡Su respuesta fue correcta!",
      "results.questionReview.incorrect": "Su respuesta fue incorrecta",
      "results.questionReview.practicePrompt": "Revise esta pregunta e intente comprender mejor el concepto",
      "results.questionReview.practiceAgain": "Practicar preguntas similares",
      "results.questionReview.closeReview": "Cerrar revisión"
    },
    "auth.json": {
      "register.title": "Crea tu cuenta",
      "register.subtitle": "Únete a AI Square hoy",
      "register.name": "Nombre completo",
      "register.namePlaceholder": "Ingresa tu nombre completo",
      "register.email": "Correo electrónico",
      "register.emailPlaceholder": "Ingresa tu correo",
      "register.password": "Contraseña",
      "register.passwordPlaceholder": "Ingresa tu contraseña",
      "register.confirmPassword": "Confirmar contraseña",
      "register.confirmPasswordPlaceholder": "Confirma tu contraseña",
      "register.createAccount": "Crear cuenta",
      "register.orContinueWith": "O continuar con",
      "register.signIn": "Iniciar sesión",
      "register.agreeToTerms": "Acepto los",
      "register.termsOfService": "Términos de servicio",
      "register.and": "y",
      "register.privacyPolicy": "Política de privacidad",
      "register.errors.nameRequired": "El nombre es requerido",
      "register.errors.emailRequired": "El correo es requerido",
      "register.errors.emailInvalid": "Por favor ingresa un correo válido",
      "register.errors.passwordRequired": "La contraseña es requerida",
      "register.errors.passwordTooShort": "La contraseña debe tener al menos 8 caracteres",
      "register.errors.passwordMismatch": "Las contraseñas no coinciden",
      "register.errors.termsRequired": "Debes aceptar los términos",
      "register.errors.registrationFailed": "Registro fallido",
      "register.errors.networkError": "Error de red. Por favor intenta de nuevo."
    }
  },

  // Korean (ko) - adding missing keys
  ko: {
    "admin.json": {
      "dashboard.quickActions": "빠른 작업"
    },
    "navigation.json": {
      "dashboard": "대시보드",
      "discovery": "탐색"
    },
    "homepage.json": {
      "hero.cta.continueLearning": "학습 계속하기",
      "hero.cta.takeAssessment": "평가 받기"
    },
    "pbl.json": {
      "learn.completeProgram": "프로그램 완료"
    },
    "relations.json": {
      "loading": "관계 로딩 중...",
      "frameworkResource": "AI 리터러시 프레임워크 보기 (PDF)"
    },
    "assessment.json": {
      "quiz.correct": "정답입니다!",
      "quiz.incorrect": "오답입니다",
      "quiz.selectAnswerToSeeExplanation": "설명을 보려면 답변을 선택하세요",
      "results.recommendations.focusOn": "개선에 집중",
      "results.saveResults": "결과 저장",
      "results.viewLearningPath": "학습 경로 보기",
      "results.saving": "저장 중...",
      "results.saved": "저장됨",
      "results.saveSuccess": "결과가 성공적으로 저장되었습니다! ID: {{assessmentId}}",
      "results.saveError": "결과 저장 실패: {{error}}",
      "results.autoSaving": "결과를 자동 저장하는 중...",
      "results.autoSaved": "결과가 자동 저장되었습니다"
    },
    "auth.json": {
      "testAccounts.quickLogin": "빠른 로그인",
      "or": "또는",
      "manualLoginHint": "위 양식에 수동으로 자격 증명을 입력할 수도 있습니다",
      "dontHaveAccount": "계정이 없으신가요?",
      "createAccount": "계정 만들기",
      "signIn.title": "다시 오신 것을 환영합니다",
      "signIn.subtitle": "계정에 로그인",
      "signIn.email": "이메일 주소",
      "signIn.password": "비밀번호",
      "signIn.rememberMe": "로그인 상태 유지",
      "signIn.forgotPassword": "비밀번호를 잊으셨나요?",
      "signIn.signInButton": "로그인",
      "signIn.orContinueWith": "또는 다음으로 계속",
      "signIn.createAccount": "계정 만들기",
      "signIn.testAccount": "데모 계정 사용 가능"
    }
  },

  // Italian (it) and Russian (ru) - sample translations
  it: {
    "admin.json": {
      "dashboard.quickActions": "Azioni rapide"
    },
    "navigation.json": {
      "dashboard": "Dashboard",
      "discovery": "Scoperta",
      "more": "Altro",
      "language": "Lingua",
      "theme": "Tema",
      "light": "Chiaro",
      "dark": "Scuro"
    },
    "pbl.json": {
      "learn.completeProgram": "Completa il programma"
    },
    "relations.json": {
      "loading": "Caricamento relazioni...",
      "frameworkResource": "Visualizza il framework di competenze IA (PDF)"
    },
    "homepage.json": {
      "hero.cta.continueLearning": "Continua ad apprendere",
      "hero.cta.takeAssessment": "Fai la valutazione"
    }
  },

  ru: {
    "admin.json": {
      "dashboard.quickActions": "Быстрые действия"
    },
    "navigation.json": {
      "dashboard": "Панель управления",
      "discovery": "Открытие",
      "more": "Ещё",
      "language": "Язык",
      "theme": "Тема",
      "light": "Светлая",
      "dark": "Тёмная"
    },
    "pbl.json": {
      "learn.completeProgram": "Завершить программу"
    },
    "relations.json": {
      "loading": "Загрузка связей...",
      "frameworkResource": "Просмотреть структуру ИИ-грамотности (PDF)"
    },
    "homepage.json": {
      "hero.cta.continueLearning": "Продолжить обучение",
      "hero.cta.takeAssessment": "Пройти оценку"
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
  console.log('📝 Applying manual translations batch 2...\n');
  
  const totalLanguages = Object.keys(translations).length;
  let processed = 0;
  
  for (const [language, files] of Object.entries(translations)) {
    processed++;
    console.log(`🌐 [${processed}/${totalLanguages}] Updating ${language}...`);
    
    for (const [filename, fileTranslations] of Object.entries(files)) {
      const count = Object.keys(fileTranslations).length;
      console.log(`  📄 ${filename}: ${count} translations`);
      await updateTranslationFile(language, filename, fileTranslations);
    }
  }
  
  console.log('\n✅ Manual translations batch 2 applied!');
  console.log('\n📊 Languages updated:');
  console.log('- Arabic, Indonesian, Portuguese, Thai: Now 100% complete');
  console.log('- German, French, Japanese, Spanish: ~100% complete');
  console.log('- Korean: Significantly improved');
  console.log('- Italian, Russian: Basic translations added');
}

main().catch(console.error);