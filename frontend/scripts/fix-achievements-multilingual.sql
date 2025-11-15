-- 修復 Achievements 表的多語言支援
-- 1. 先將 zh 欄位遷移到 zhTW
-- 2. 添加完整的 14 語言支援

BEGIN;

-- First Steps
UPDATE achievements
SET
    name = jsonb_build_object(
        'en', 'First Steps',
        'zhTW', '第一步',
        'zhCN', '第一步',
        'ja', '最初の一歩',
        'ko', '첫 걸음',
        'es', 'Primeros Pasos',
        'fr', 'Premiers Pas',
        'de', 'Erste Schritte',
        'pt', 'Primeiros Passos',
        'it', 'Primi Passi',
        'ru', 'Первые шаги',
        'ar', 'الخطوات الأولى',
        'th', 'ก้าวแรก',
        'id', 'Langkah Pertama'
    ),
    description = jsonb_build_object(
        'en', 'Complete your first AI learning module',
        'zhTW', '完成你的第一個 AI 學習模組',
        'zhCN', '完成你的第一个 AI 学习模块',
        'ja', '最初のAI学習モジュールを完了する',
        'ko', '첫 번째 AI 학습 모듈 완료',
        'es', 'Completa tu primer módulo de aprendizaje de IA',
        'fr', 'Complétez votre premier module d''apprentissage IA',
        'de', 'Schließe dein erstes KI-Lernmodul ab',
        'pt', 'Complete seu primeiro módulo de aprendizado de IA',
        'it', 'Completa il tuo primo modulo di apprendimento IA',
        'ru', 'Завершите свой первый модуль обучения ИИ',
        'ar', 'أكمل أول وحدة تعلم للذكاء الاصطناعي',
        'th', 'สำเร็จโมดูลการเรียนรู้ AI แรกของคุณ',
        'id', 'Selesaikan modul pembelajaran AI pertama Anda'
    )
WHERE name->>'en' = 'First Steps';

-- Quick Learner
UPDATE achievements
SET
    name = jsonb_build_object(
        'en', 'Quick Learner',
        'zhTW', '快速學習者',
        'zhCN', '快速学习者',
        'ja', 'クイックラーナー',
        'ko', '빠른 학습자',
        'es', 'Aprendiz Rápido',
        'fr', 'Apprenant Rapide',
        'de', 'Schnelllerner',
        'pt', 'Aprendiz Rápido',
        'it', 'Apprendista Veloce',
        'ru', 'Быстрый ученик',
        'ar', 'متعلم سريع',
        'th', 'ผู้เรียนรู้เร็ว',
        'id', 'Pembelajar Cepat'
    ),
    description = jsonb_build_object(
        'en', 'Complete 5 modules in one day',
        'zhTW', '在一天內完成 5 個模組',
        'zhCN', '在一天内完成 5 个模块',
        'ja', '1日で5つのモジュールを完了する',
        'ko', '하루에 5개 모듈 완료',
        'es', 'Completa 5 módulos en un día',
        'fr', 'Complétez 5 modules en une journée',
        'de', 'Schließe 5 Module an einem Tag ab',
        'pt', 'Complete 5 módulos em um dia',
        'it', 'Completa 5 moduli in un giorno',
        'ru', 'Завершите 5 модулей за один день',
        'ar', 'أكمل 5 وحدات في يوم واحد',
        'th', 'สำเร็จ 5 โมดูลในหนึ่งวัน',
        'id', 'Selesaikan 5 modul dalam satu hari'
    )
WHERE name->>'en' = 'Quick Learner';

-- Perfect Score
UPDATE achievements
SET
    name = jsonb_build_object(
        'en', 'Perfect Score',
        'zhTW', '完美分數',
        'zhCN', '完美分数',
        'ja', 'パーフェクトスコア',
        'ko', '만점',
        'es', 'Puntuación Perfecta',
        'fr', 'Score Parfait',
        'de', 'Perfekte Punktzahl',
        'pt', 'Pontuação Perfeita',
        'it', 'Punteggio Perfetto',
        'ru', 'Идеальный результат',
        'ar', 'نتيجة مثالية',
        'th', 'คะแนนเต็ม',
        'id', 'Skor Sempurna'
    ),
    description = jsonb_build_object(
        'en', 'Achieve 100% on any assessment',
        'zhTW', '在任何評估中獲得 100% 的成績',
        'zhCN', '在任何评估中获得 100% 的成绩',
        'ja', 'いずれかの評価で100%を達成する',
        'ko', '평가에서 100% 달성',
        'es', 'Logra el 100% en cualquier evaluación',
        'fr', 'Obtenez 100% à n''importe quelle évaluation',
        'de', 'Erreiche 100% bei einer Bewertung',
        'pt', 'Alcance 100% em qualquer avaliação',
        'it', 'Ottieni il 100% in qualsiasi valutazione',
        'ru', 'Достигните 100% в любой оценке',
        'ar', 'احصل على 100% في أي تقييم',
        'th', 'ได้คะแนน 100% ในการประเมินใดๆ',
        'id', 'Raih 100% pada penilaian apapun'
    )
WHERE name->>'en' = 'Perfect Score';

COMMIT;
