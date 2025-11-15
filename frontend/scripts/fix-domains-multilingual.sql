-- 修復 Domains 表的多語言支援
-- 1. 先將 zh 欄位遷移到 zhTW
-- 2. 添加完整的 14 語言支援

BEGIN;

-- Engaging with AI
UPDATE domains
SET
    name = jsonb_build_object(
        'en', 'Engaging with AI',
        'zhTW', '與 AI 互動',
        'zhCN', '与 AI 互动',
        'ja', 'AIとの対話',
        'ko', 'AI와의 상호작용',
        'es', 'Interactuando con IA',
        'fr', 'Interagir avec l''IA',
        'de', 'Mit KI interagieren',
        'pt', 'Interagindo com IA',
        'it', 'Interagire con l''IA',
        'ru', 'Взаимодействие с ИИ',
        'ar', 'التفاعل مع الذكاء الاصطناعي',
        'th', 'การมีปฏิสัมพันธ์กับ AI',
        'id', 'Berinteraksi dengan AI'
    ),
    description = jsonb_build_object(
        'en', 'Understanding and interacting with AI systems',
        'zhTW', '理解並與 AI 系統互動',
        'zhCN', '理解并与 AI 系统互动',
        'ja', 'AIシステムを理解し、対話する',
        'ko', 'AI 시스템 이해 및 상호작용',
        'es', 'Comprender e interactuar con sistemas de IA',
        'fr', 'Comprendre et interagir avec les systèmes d''IA',
        'de', 'KI-Systeme verstehen und damit interagieren',
        'pt', 'Compreender e interagir com sistemas de IA',
        'it', 'Comprendere e interagire con i sistemi di IA',
        'ru', 'Понимание и взаимодействие с системами ИИ',
        'ar', 'فهم أنظمة الذكاء الاصطناعي والتفاعل معها',
        'th', 'ความเข้าใจและการมีปฏิสัมพันธ์กับระบบ AI',
        'id', 'Memahami dan berinteraksi dengan sistem AI'
    )
WHERE id = 'engaging_with_ai';

-- Creating with AI
UPDATE domains
SET
    name = jsonb_build_object(
        'en', 'Creating with AI',
        'zhTW', '用 AI 創造',
        'zhCN', '用 AI 创造',
        'ja', 'AIで創造する',
        'ko', 'AI로 창작하기',
        'es', 'Creando con IA',
        'fr', 'Créer avec l''IA',
        'de', 'Mit KI erstellen',
        'pt', 'Criando com IA',
        'it', 'Creare con l''IA',
        'ru', 'Создание с помощью ИИ',
        'ar', 'الإبداع باستخدام الذكاء الاصطناعي',
        'th', 'การสร้างสรรค์ด้วย AI',
        'id', 'Berkarya dengan AI'
    ),
    description = jsonb_build_object(
        'en', 'Using AI for creative tasks',
        'zhTW', '使用 AI 進行創造性任務',
        'zhCN', '使用 AI 进行创造性任务',
        'ja', 'AIを使って創造的なタスクを行う',
        'ko', 'AI를 활용한 창의적 작업',
        'es', 'Usar IA para tareas creativas',
        'fr', 'Utiliser l''IA pour des tâches créatives',
        'de', 'KI für kreative Aufgaben nutzen',
        'pt', 'Usar IA para tarefas criativas',
        'it', 'Utilizzare l''IA per compiti creativi',
        'ru', 'Использование ИИ для творческих задач',
        'ar', 'استخدام الذكاء الاصطناعي للمهام الإبداعية',
        'th', 'การใช้ AI สำหรับงานสร้างสรรค์',
        'id', 'Menggunakan AI untuk tugas kreatif'
    )
WHERE id = 'creating_with_ai';

-- Managing AI
UPDATE domains
SET
    name = jsonb_build_object(
        'en', 'Managing AI',
        'zhTW', '管理 AI',
        'zhCN', '管理 AI',
        'ja', 'AIを管理する',
        'ko', 'AI 관리하기',
        'es', 'Gestionando IA',
        'fr', 'Gérer l''IA',
        'de', 'KI verwalten',
        'pt', 'Gerenciando IA',
        'it', 'Gestire l''IA',
        'ru', 'Управление ИИ',
        'ar', 'إدارة الذكاء الاصطناعي',
        'th', 'การจัดการ AI',
        'id', 'Mengelola AI'
    ),
    description = jsonb_build_object(
        'en', 'Managing AI systems and their impacts',
        'zhTW', '管理 AI 系統及其影響',
        'zhCN', '管理 AI 系统及其影响',
        'ja', 'AIシステムとその影響を管理する',
        'ko', 'AI 시스템과 그 영향 관리',
        'es', 'Gestionar sistemas de IA y sus impactos',
        'fr', 'Gérer les systèmes d''IA et leurs impacts',
        'de', 'KI-Systeme und ihre Auswirkungen verwalten',
        'pt', 'Gerenciar sistemas de IA e seus impactos',
        'it', 'Gestire i sistemi di IA e i loro impatti',
        'ru', 'Управление системами ИИ и их воздействием',
        'ar', 'إدارة أنظمة الذكاء الاصطناعي وتأثيراتها',
        'th', 'การจัดการระบบ AI และผลกระทบ',
        'id', 'Mengelola sistem AI dan dampaknya'
    )
WHERE id = 'managing_ai';

-- Designing AI
UPDATE domains
SET
    name = jsonb_build_object(
        'en', 'Designing AI',
        'zhTW', '設計 AI',
        'zhCN', '设计 AI',
        'ja', 'AIを設計する',
        'ko', 'AI 설계하기',
        'es', 'Diseñando IA',
        'fr', 'Concevoir l''IA',
        'de', 'KI entwerfen',
        'pt', 'Projetando IA',
        'it', 'Progettare l''IA',
        'ru', 'Проектирование ИИ',
        'ar', 'تصميم الذكاء الاصطناعي',
        'th', 'การออกแบบ AI',
        'id', 'Merancang AI'
    ),
    description = jsonb_build_object(
        'en', 'Designing and developing AI solutions',
        'zhTW', '設計和開發 AI 解決方案',
        'zhCN', '设计和开发 AI 解决方案',
        'ja', 'AIソリューションの設計と開発',
        'ko', 'AI 솔루션 설계 및 개발',
        'es', 'Diseñar y desarrollar soluciones de IA',
        'fr', 'Concevoir et développer des solutions d''IA',
        'de', 'KI-Lösungen entwerfen und entwickeln',
        'pt', 'Projetar e desenvolver soluções de IA',
        'it', 'Progettare e sviluppare soluzioni di IA',
        'ru', 'Проектирование и разработка решений ИИ',
        'ar', 'تصميم وتطوير حلول الذكاء الاصطناعي',
        'th', 'การออกแบบและพัฒนาโซลูชัน AI',
        'id', 'Merancang dan mengembangkan solusi AI'
    )
WHERE id = 'designing_ai';

COMMIT;
