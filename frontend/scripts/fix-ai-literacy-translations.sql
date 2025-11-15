-- 補充 AI Literacy Assessment 的多語言翻譯
UPDATE scenarios
SET
    title = jsonb_build_object(
        'en', 'AI Literacy Assessment',
        'zhTW', 'AI 素養評估',
        'zhCN', 'AI 素养评估',
        'ja', 'AIリテラシー評価',
        'ko', 'AI 리터러시 평가',
        'es', 'Evaluación de Alfabetización en IA',
        'fr', 'Évaluation de la littératie en IA',
        'de', 'KI-Kompetenz-Bewertung',
        'pt', 'Avaliação de Literacia em IA',
        'it', 'Valutazione dell''Alfabetizzazione AI',
        'ru', 'Оценка ИИ-грамотности',
        'ar', 'تقييم محو الأمية في الذكاء الاصطناعي',
        'th', 'การประเมินความรู้ด้าน AI',
        'id', 'Penilaian Literasi AI'
    ),
    description = jsonb_build_object(
        'en', 'Assess your understanding of AI systems across four core domains: Engaging with AI, Creating with AI, Managing AI risks, and Designing AI solutions. This assessment helps identify your current AI knowledge level and areas for improvement.',
        'zhTW', '評估您對 AI 系統的理解，涵蓋四個核心領域：與 AI 互動、運用 AI 創作、管理 AI 風險，以及設計 AI 解決方案。此評估有助於識別您目前的 AI 知識水平並找出改進方向。',
        'zhCN', '评估您对 AI 系统的理解，涵盖四个核心领域：与 AI 互动、运用 AI 创作、管理 AI 风险，以及设计 AI 解决方案。此评估有助于识别您目前的 AI 知识水平并找出改进方向。',
        'ja', 'AIシステムの理解度を4つのコア領域で評価します：AIとの対話、AIを使った創造、AIリスクの管理、AIソリューションの設計。この評価により、現在のAI知識レベルと改善すべき領域を特定できます。',
        'ko', 'AI 시스템에 대한 이해도를 네 가지 핵심 영역에서 평가합니다: AI와의 상호작용, AI를 활용한 창작, AI 위험 관리, AI 솔루션 설계. 이 평가는 현재의 AI 지식 수준과 개선이 필요한 영역을 식별하는 데 도움이 됩니다.',
        'es', 'Evalúa tu comprensión de los sistemas de IA en cuatro dominios principales: Interactuar con IA, Crear con IA, Gestionar riesgos de IA y Diseñar soluciones de IA. Esta evaluación ayuda a identificar tu nivel actual de conocimiento de IA y áreas de mejora.',
        'fr', 'Évaluez votre compréhension des systèmes d''IA dans quatre domaines principaux : Interagir avec l''IA, Créer avec l''IA, Gérer les risques de l''IA et Concevoir des solutions d''IA. Cette évaluation aide à identifier votre niveau actuel de connaissances en IA et les domaines à améliorer.',
        'de', 'Bewerten Sie Ihr Verständnis von KI-Systemen in vier Kernbereichen: Umgang mit KI, Erstellen mit KI, Verwaltung von KI-Risiken und Entwerfen von KI-Lösungen. Diese Bewertung hilft, Ihr aktuelles KI-Wissensniveau und Verbesserungsbereiche zu identifizieren.',
        'pt', 'Avalie a sua compreensão dos sistemas de IA em quatro domínios principais: Interagir com IA, Criar com IA, Gerir riscos de IA e Projetar soluções de IA. Esta avaliação ajuda a identificar o seu nível atual de conhecimento de IA e áreas de melhoria.',
        'it', 'Valuta la tua comprensione dei sistemi di IA in quattro domini principali: Interagire con l''IA, Creare con l''IA, Gestire i rischi dell''IA e Progettare soluzioni di IA. Questa valutazione aiuta a identificare il tuo attuale livello di conoscenza dell''IA e le aree di miglioramento.',
        'ru', 'Оцените свое понимание систем ИИ в четырех основных областях: взаимодействие с ИИ, создание с помощью ИИ, управление рисками ИИ и разработка решений ИИ. Эта оценка помогает определить ваш текущий уровень знаний об ИИ и области для улучшения.',
        'ar', 'قيّم فهمك لأنظمة الذكاء الاصطناعي عبر أربعة مجالات أساسية: التفاعل مع الذكاء الاصطناعي، والإبداع باستخدام الذكاء الاصطناعي، وإدارة مخاطر الذكاء الاصطناعي، وتصميم حلول الذكاء الاصطناعي. يساعد هذا التقييم في تحديد مستوى معرفتك الحالي بالذكاء الاصطناعي ومجالات التحسين.',
        'th', 'ประเมินความเข้าใจของคุณเกี่ยวกับระบบ AI ใน 4 ด้านหลัก: การมีปฏิสัมพันธ์กับ AI, การสร้างสรรค์ด้วย AI, การจัดการความเสี่ยงของ AI และการออกแบบโซลูชัน AI การประเมินนี้ช่วยระบุระดับความรู้ AI ปัจจุบันของคุณและพื้นที่ที่ต้องปรับปรุง',
        'id', 'Menilai pemahaman Anda tentang sistem AI di empat domain inti: Berinteraksi dengan AI, Berkarya dengan AI, Mengelola risiko AI, dan Merancang solusi AI. Penilaian ini membantu mengidentifikasi tingkat pengetahuan AI Anda saat ini dan area yang perlu ditingkatkan.'
    )
WHERE id = '39ffe258-fbd4-4c02-a39f-309f59285adc';
