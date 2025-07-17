#!/usr/bin/env tsx
/**
 * Manual translations for missing keys
 */

import fs from 'fs/promises';
import path from 'path';

// Manual translations for critical missing keys
const translations = {
  // German (de)
  de: {
    "admin.json": {
      "dashboard.quickActions": "Schnellaktionen"
    },
    "navigation.json": {
      "dashboard": "Dashboard",
      "discovery": "Entdeckung",
      "more": "Mehr",
      "language": "Sprache",
      "theme": "Thema",
      "light": "Hell",
      "dark": "Dunkel"
    },
    "pbl.json": {
      "learn.completeProgram": "Programm abschließen"
    },
    "relations.json": {
      "loading": "Beziehungen werden geladen...",
      "frameworkResource": "KI-Kompetenzrahmen anzeigen (PDF)"
    },
    "homepage.json": {
      "hero.cta.continueLearning": "Weiter lernen",
      "hero.cta.takeAssessment": "Bewertung durchführen"
    },
    "assessment.json": {
      "quiz.correct": "Richtig!",
      "quiz.incorrect": "Falsch",
      "quiz.selectAnswerToSeeExplanation": "Wählen Sie eine Antwort, um die Erklärung zu sehen",
      "results.recommendations.focusOn": "Fokus auf Verbesserung",
      "results.recommendations.engaging_with_ai": "Fokus auf Verbesserung von KI-Interaktion: Verständnis von KI-Grenzen, Datenschutzbedenken und ethischen Überlegungen bei der Interaktion mit KI-Systemen",
      "results.recommendations.creating_with_ai": "Fokus auf Verbesserung von KI-Erstellung: Erlernen von Prompt-Techniken, Best Practices für Inhaltsgenerierung und kreative Zusammenarbeit mit KI-Tools",
      "results.recommendations.managing_with_ai": "Fokus auf Verbesserung von KI-Management: Entwicklung von Fähigkeiten für KI-unterstützte Entscheidungsfindung, Workflow-Automatisierung und Teamzusammenarbeit",
      "results.recommendations.designing_with_ai": "Fokus auf Verbesserung von KI-Design: Aufbau von KI-Kompetenz-Lehrplänen, Erstellung von Lernmaterialien und Gestaltung von KI-erweiterten Erfahrungen",
      "results.saveResults": "Ergebnisse speichern",
      "results.viewLearningPath": "Lernpfad anzeigen",
      "results.saving": "Speichern...",
      "results.saved": "Gespeichert",
      "results.saveSuccess": "Ergebnisse erfolgreich gespeichert! ID: {{assessmentId}}",
      "results.saveError": "Fehler beim Speichern der Ergebnisse: {{error}}",
      "results.autoSaving": "Ihre Ergebnisse werden automatisch gespeichert...",
      "results.autoSaved": "Ergebnisse automatisch gespeichert"
    },
    "auth.json": {
      "testAccounts.quickLogin": "Schnellanmeldung",
      "or": "oder",
      "manualLoginHint": "Sie können die Anmeldedaten auch manuell im obigen Formular eingeben",
      "dontHaveAccount": "Haben Sie noch kein Konto?",
      "createAccount": "Konto erstellen",
      "signIn.title": "Willkommen zurück",
      "signIn.subtitle": "Melden Sie sich bei Ihrem Konto an",
      "signIn.email": "E-Mail-Adresse",
      "signIn.password": "Passwort",
      "signIn.rememberMe": "Angemeldet bleiben",
      "signIn.forgotPassword": "Passwort vergessen?",
      "signIn.signInButton": "Anmelden",
      "signIn.orContinueWith": "Oder fortfahren mit",
      "signIn.createAccount": "Konto erstellen",
      "signIn.testAccount": "Demo-Konto verfügbar"
    }
  },
  
  // French (fr)
  fr: {
    "admin.json": {
      "dashboard.quickActions": "Actions rapides"
    },
    "navigation.json": {
      "dashboard": "Tableau de bord",
      "discovery": "Découverte",
      "more": "Plus",
      "language": "Langue",
      "theme": "Thème",
      "light": "Clair",
      "dark": "Sombre"
    },
    "pbl.json": {
      "learn.completeProgram": "Terminer le programme"
    },
    "relations.json": {
      "loading": "Chargement des relations...",
      "frameworkResource": "Voir le cadre de compétences IA (PDF)"
    },
    "homepage.json": {
      "hero.cta.continueLearning": "Continuer l'apprentissage",
      "hero.cta.takeAssessment": "Passer l'évaluation"
    },
    "assessment.json": {
      "quiz.correct": "Correct !",
      "quiz.incorrect": "Incorrect",
      "quiz.selectAnswerToSeeExplanation": "Sélectionnez une réponse pour voir l'explication",
      "results.recommendations.focusOn": "Se concentrer sur l'amélioration",
      "results.recommendations.engaging_with_ai": "Se concentrer sur l'amélioration de l'interaction avec l'IA : Comprendre les limites de l'IA, les préoccupations de confidentialité et les considérations éthiques lors de l'interaction avec les systèmes d'IA",
      "results.recommendations.creating_with_ai": "Se concentrer sur l'amélioration de la création avec l'IA : Apprendre les techniques de prompt, les meilleures pratiques de génération de contenu et la collaboration créative avec les outils d'IA",
      "results.recommendations.managing_with_ai": "Se concentrer sur l'amélioration de la gestion avec l'IA : Développer des compétences pour la prise de décision assistée par l'IA, l'automatisation des flux de travail et la collaboration en équipe",
      "results.recommendations.designing_with_ai": "Se concentrer sur l'amélioration de la conception avec l'IA : Construire un programme de compétences en IA, créer du matériel d'apprentissage et concevoir des expériences améliorées par l'IA",
      "results.saveResults": "Enregistrer les résultats",
      "results.viewLearningPath": "Voir le parcours d'apprentissage",
      "results.saving": "Enregistrement...",
      "results.saved": "Enregistré",
      "results.saveSuccess": "Résultats enregistrés avec succès ! ID : {{assessmentId}}",
      "results.saveError": "Échec de l'enregistrement des résultats : {{error}}",
      "results.autoSaving": "Sauvegarde automatique de vos résultats...",
      "results.autoSaved": "Résultats sauvegardés automatiquement"
    },
    "auth.json": {
      "testAccounts.quickLogin": "Connexion rapide",
      "or": "ou",
      "manualLoginHint": "Vous pouvez également entrer les identifiants manuellement dans le formulaire ci-dessus",
      "dontHaveAccount": "Vous n'avez pas de compte ?",
      "createAccount": "En créer un",
      "signIn.title": "Bienvenue",
      "signIn.subtitle": "Connectez-vous à votre compte",
      "signIn.email": "Adresse e-mail",
      "signIn.password": "Mot de passe",
      "signIn.rememberMe": "Se souvenir de moi",
      "signIn.forgotPassword": "Mot de passe oublié ?",
      "signIn.signInButton": "Se connecter",
      "signIn.orContinueWith": "Ou continuer avec",
      "signIn.createAccount": "Créer un compte",
      "signIn.testAccount": "Compte de démonstration disponible"
    }
  },

  // Japanese (ja)
  ja: {
    "admin.json": {
      "dashboard.quickActions": "クイックアクション"
    },
    "pbl.json": {
      "learn.completeProgram": "プログラムを完了"
    },
    "relations.json": {
      "loading": "関係を読み込み中...",
      "frameworkResource": "AIリテラシーフレームワークを表示 (PDF)"
    },
    "homepage.json": {
      "hero.cta.continueLearning": "学習を続ける",
      "hero.cta.takeAssessment": "評価を受ける"
    },
    "assessment.json": {
      "quiz.correct": "正解！",
      "quiz.incorrect": "不正解",
      "quiz.selectAnswerToSeeExplanation": "解説を見るには回答を選択してください",
      "results.recommendations.focusOn": "改善に焦点を当てる",
      "results.recommendations.engaging_with_ai": "AIとの関わり方の改善に焦点を当てる：AIシステムと対話する際のAIの限界、プライバシーの懸念、倫理的考慮事項の理解",
      "results.recommendations.creating_with_ai": "AIでの創造の改善に焦点を当てる：プロンプト技術、コンテンツ生成のベストプラクティス、AIツールとの創造的な協力の学習",
      "results.recommendations.managing_with_ai": "AIでの管理の改善に焦点を当てる：AI支援による意思決定、ワークフロー自動化、チームコラボレーションのスキル開発",
      "results.recommendations.designing_with_ai": "AIでの設計の改善に焦点を当てる：AIリテラシーカリキュラムの構築、学習教材の作成、AI拡張体験の設計",
      "results.saveResults": "結果を保存",
      "results.viewLearningPath": "学習パスを表示",
      "results.saving": "保存中...",
      "results.saved": "保存済み",
      "results.saveSuccess": "結果が正常に保存されました！ID: {{assessmentId}}",
      "results.saveError": "結果の保存に失敗しました: {{error}}",
      "results.autoSaving": "結果を自動保存しています...",
      "results.autoSaved": "結果が自動保存されました"
    },
    "auth.json": {
      "testAccounts.quickLogin": "クイックログイン",
      "or": "または",
      "manualLoginHint": "上記のフォームに手動で認証情報を入力することもできます",
      "dontHaveAccount": "アカウントをお持ちでないですか？",
      "createAccount": "作成する",
      "signIn.title": "おかえりなさい",
      "signIn.subtitle": "アカウントにサインイン",
      "signIn.email": "メールアドレス",
      "signIn.password": "パスワード",
      "signIn.rememberMe": "ログイン状態を保持",
      "signIn.forgotPassword": "パスワードをお忘れですか？",
      "signIn.signInButton": "サインイン",
      "signIn.orContinueWith": "または次で続ける",
      "signIn.createAccount": "アカウントを作成",
      "signIn.testAccount": "デモアカウント利用可能"
    }
  },

  // Traditional Chinese (zhTW)
  zhTW: {
    "assessment.json": {
      "results.viewLearningPath": "查看學習路徑"
    },
    "common.json": {
      "skip": "跳過",
      "warning": "警告",
      "info": "資訊",
      "backToDashboard": "返回儀表板",
      "minutes": "分鐘",
      "hours": "小時",
      "days": "天",
      "view": "檢視",
      "difficulty.beginner": "初級",
      "difficulty.intermediate": "中級",
      "difficulty.advanced": "高級",
      "send": "發送",
      "new": "新增",
      "zoomIn": "放大",
      "zoomOut": "縮小",
      "resetZoom": "重置縮放",
      "noData": "無可用資料",
      "pleaseLogin": "請登入",
      "start": "開始"
    },
    "relations.json": {
      "loading": "正在載入關係圖..."
    }
  },

  // Simplified Chinese (zhCN)
  zhCN: {
    "admin.json": {
      "dashboard.quickActions": "快速操作"
    },
    "navigation.json": {
      "discovery": "探索",
      "language": "语言",
      "theme": "主题",
      "light": "浅色",
      "dark": "深色"
    },
    "pbl.json": {
      "learn.completeProgram": "完成项目"
    }
  },

  // Spanish (es)
  es: {
    "homepage.json": {
      "hero.cta.continueLearning": "Continuar aprendiendo",
      "hero.cta.takeAssessment": "Realizar evaluación"
    },
    "pbl.json": {
      "learn.completeProgram": "Completar programa"
    },
    "relations.json": {
      "loading": "Cargando relaciones...",
      "frameworkResource": "Ver marco de competencias de IA (PDF)"
    },
    "assessment.json": {
      "quiz.correct": "¡Correcto!",
      "quiz.incorrect": "Incorrecto",
      "quiz.selectAnswerToSeeExplanation": "Selecciona una respuesta para ver la explicación",
      "results.saveResults": "Guardar resultados",
      "results.viewLearningPath": "Ver ruta de aprendizaje",
      "results.saving": "Guardando...",
      "results.saved": "Guardado",
      "results.saveSuccess": "¡Resultados guardados exitosamente! ID: {{assessmentId}}",
      "results.saveError": "Error al guardar los resultados: {{error}}",
      "results.autoSaving": "Guardando automáticamente tus resultados...",
      "results.autoSaved": "Resultados guardados automáticamente"
    },
    "auth.json": {
      "testAccounts.quickLogin": "Inicio rápido",
      "or": "o",
      "manualLoginHint": "También puedes ingresar las credenciales manualmente en el formulario anterior",
      "dontHaveAccount": "¿No tienes cuenta?",
      "createAccount": "Crear una",
      "signIn.title": "Bienvenido de nuevo",
      "signIn.subtitle": "Inicia sesión en tu cuenta",
      "signIn.email": "Correo electrónico",
      "signIn.password": "Contraseña",
      "signIn.rememberMe": "Recordarme",
      "signIn.forgotPassword": "¿Olvidaste tu contraseña?",
      "signIn.signInButton": "Iniciar sesión",
      "signIn.orContinueWith": "O continuar con",
      "signIn.createAccount": "Crear una cuenta",
      "signIn.testAccount": "Cuenta demo disponible"
    }
  }
};

function setValueByPath(obj: any, path: string, value: string): void {
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
  } catch (error) {
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
  console.log('📝 Applying manual translations...\n');
  
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
  
  console.log('\n✅ Manual translations applied!');
  console.log('\n📊 Summary:');
  console.log(`- Languages updated: ${totalLanguages}`);
  console.log(`- Key translations focused on: Navigation, Auth, Assessment basics`);
  console.log('\n💡 Next steps:');
  console.log('1. Run translation check to see remaining gaps');
  console.log('2. Additional manual translations can be added to this file');
  console.log('3. Or set up Google Cloud auth for automated translation');
}

main().catch(console.error);