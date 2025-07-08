const fs = require('fs');
const path = require('path');

// Discovery translations for all languages
const discoveryTranslations = {
  es: {
    title: "Discovery",
    subtitle: "Aventura profesional personalizada",
    description: "Encuentra tu camino profesional ideal a través de la evaluación de IA y desarrolla habilidades profesionales en aventuras gamificadas.",
    userNeed: "¿Qué carrera es adecuada para mí?",
    features: [
      "Evaluación de coincidencia de carrera con IA",
      "Sistema de generación infinita de tareas",
      "Experiencia de aprendizaje gamificada",
      "Ajuste dinámico de dificultad de tareas"
    ]
  },
  ja: {
    title: "Discovery 探索",
    subtitle: "パーソナライズされたキャリア冒険",
    description: "AI評価で理想的なキャリアパスを見つけ、ゲーム化された冒険で専門スキルを開発します。",
    userNeed: "どのキャリアが私に適していますか？",
    features: [
      "AIキャリアマッチング評価",
      "無限タスク生成システム",
      "ゲーム化された学習体験",
      "動的タスク難易度調整"
    ]
  },
  ko: {
    title: "Discovery 탐색",
    subtitle: "개인화된 경력 모험",
    description: "AI 평가를 통해 이상적인 경력 경로를 찾고 게임화된 모험에서 전문 기술을 개발하세요.",
    userNeed: "어떤 경력이 나에게 맞을까요?",
    features: [
      "AI 경력 매칭 평가",
      "무한 작업 생성 시스템",
      "게임화된 학습 경험",
      "동적 작업 난이도 조정"
    ]
  },
  fr: {
    title: "Discovery",
    subtitle: "Aventure professionnelle personnalisée",
    description: "Trouvez votre parcours professionnel idéal grâce à l'évaluation IA et développez des compétences professionnelles dans des aventures gamifiées.",
    userNeed: "Quelle carrière me convient?",
    features: [
      "Évaluation de correspondance de carrière IA",
      "Système de génération de tâches infini",
      "Expérience d'apprentissage gamifiée",
      "Ajustement dynamique de la difficulté"
    ]
  },
  de: {
    title: "Discovery",
    subtitle: "Personalisiertes Karriere-Abenteuer",
    description: "Finden Sie Ihren idealen Karriereweg durch KI-Bewertung und entwickeln Sie berufliche Fähigkeiten in spielerischen Abenteuern.",
    userNeed: "Welche Karriere passt zu mir?",
    features: [
      "KI-Karriere-Matching-Bewertung",
      "Unendliches Aufgabengenerierungssystem",
      "Gamifizierte Lernerfahrung",
      "Dynamische Aufgabenschwierigkeit"
    ]
  },
  ru: {
    title: "Discovery",
    subtitle: "Персонализированное карьерное приключение",
    description: "Найдите свой идеальный карьерный путь с помощью ИИ-оценки и развивайте профессиональные навыки в игровых приключениях.",
    userNeed: "Какая карьера мне подходит?",
    features: [
      "ИИ-оценка соответствия карьеры",
      "Система бесконечной генерации задач",
      "Геймифицированный опыт обучения",
      "Динамическая корректировка сложности"
    ]
  },
  it: {
    title: "Discovery",
    subtitle: "Avventura professionale personalizzata",
    description: "Trova il tuo percorso professionale ideale attraverso la valutazione AI e sviluppa competenze professionali in avventure gamificate.",
    userNeed: "Quale carriera fa per me?",
    features: [
      "Valutazione di corrispondenza carriera AI",
      "Sistema di generazione infinita di compiti",
      "Esperienza di apprendimento gamificata",
      "Regolazione dinamica della difficoltà"
    ]
  },
  zhCN: {
    title: "Discovery 探索",
    subtitle: "个性化职业冒险",
    description: "通过 AI 评估找到适合的职业道路，在游戏化的冒险中培养专业技能。",
    userNeed: "哪个职业方向适合我？",
    features: [
      "AI 职业匹配评估",
      "无限任务生成系统",
      "游戏化学习体验",
      "动态任务调整难度"
    ]
  },
  ar: {
    title: "Discovery",
    subtitle: "مغامرة مهنية شخصية",
    description: "اعثر على مسارك المهني المثالي من خلال تقييم الذكاء الاصطناعي وطور مهارات احترافية في مغامرات ألعاب.",
    userNeed: "أي مسار مهني يناسبني؟",
    features: [
      "تقييم مطابقة المسار المهني بالذكاء الاصطناعي",
      "نظام توليد مهام لا نهائي",
      "تجربة تعلم بأسلوب الألعاب",
      "تعديل ديناميكي لصعوبة المهام"
    ]
  },
  th: {
    title: "Discovery",
    subtitle: "การผจญภัยอาชีพส่วนบุคคล",
    description: "ค้นหาเส้นทางอาชีพที่เหมาะสมผ่านการประเมิน AI และพัฒนาทักษะวิชาชีพในการผจญภัยแบบเกม",
    userNeed: "อาชีพใดที่เหมาะกับฉัน?",
    features: [
      "การประเมินการจับคู่อาชีพด้วย AI",
      "ระบบสร้างภารกิจไม่จำกัด",
      "ประสบการณ์การเรียนรู้แบบเกม",
      "การปรับระดับความยากแบบไดนามิก"
    ]
  },
  id: {
    title: "Discovery",
    subtitle: "Petualangan Karir Personal",
    description: "Temukan jalur karir ideal Anda melalui penilaian AI dan kembangkan keterampilan profesional dalam petualangan gamifikasi.",
    userNeed: "Karir mana yang cocok untuk saya?",
    features: [
      "Penilaian pencocokan karir AI",
      "Sistem pembuatan tugas tak terbatas",
      "Pengalaman belajar gamifikasi",
      "Penyesuaian kesulitan tugas dinamis"
    ]
  },
  pt: {
    title: "Discovery",
    subtitle: "Aventura profissional personalizada",
    description: "Encontre seu caminho profissional ideal através da avaliação de IA e desenvolva habilidades profissionais em aventuras gamificadas.",
    userNeed: "Qual carreira é adequada para mim?",
    features: [
      "Avaliação de correspondência de carreira com IA",
      "Sistema de geração infinita de tarefas",
      "Experiência de aprendizagem gamificada",
      "Ajuste dinâmico de dificuldade de tarefas"
    ]
  }
};

// Update all translation files
Object.entries(discoveryTranslations).forEach(([lang, translation]) => {
  const filePath = path.join(__dirname, '..', 'public', 'locales', lang, 'journey.json');
  
  try {
    // Read existing file
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Update subtitle from "Five" to "Six" in various languages
    if (data.subtitle) {
      data.subtitle = data.subtitle
        .replace(/Five/i, 'Six')
        .replace(/Cinco/i, 'Seis')
        .replace(/五つ/i, '六つ')
        .replace(/다섯/i, '여섯')
        .replace(/Cinq/i, 'Six')
        .replace(/Fünf/i, 'Sechs')
        .replace(/Пять/i, 'Шесть')
        .replace(/Cinque/i, 'Sei')
        .replace(/五/i, '六')
        .replace(/خمسة/i, 'ستة')
        .replace(/ห้า/i, 'หก')
        .replace(/Lima/i, 'Enam');
    }
    
    // Add discovery path
    data.paths.discovery = translation;
    
    // Write updated file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`✅ Updated ${lang}/journey.json`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}/journey.json:`, error.message);
  }
});

console.log('\n✨ All journey translations updated!');