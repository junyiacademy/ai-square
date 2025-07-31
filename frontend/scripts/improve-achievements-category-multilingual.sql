-- 為 achievements.category 增加多語言支援

BEGIN;

-- 1. 新增 category_name JSONB 欄位來支援多語言類別名稱
ALTER TABLE achievements
ADD COLUMN IF NOT EXISTS category_name JSONB DEFAULT '{}'::jsonb;

-- 2. 為現有的類別設定多語言名稱
UPDATE achievements
SET category_name = CASE category
    WHEN 'milestone' THEN jsonb_build_object(
        'en', 'Milestone',
        'zhTW', '里程碑',
        'zhCN', '里程碑',
        'ja', 'マイルストーン',
        'ko', '마일스톤',
        'es', 'Hito',
        'fr', 'Jalon',
        'de', 'Meilenstein',
        'pt', 'Marco',
        'it', 'Traguardo',
        'ru', 'Веха',
        'ar', 'معلم بارز',
        'th', 'เหตุการณ์สำคัญ',
        'id', 'Tonggak'
    )
    WHEN 'performance' THEN jsonb_build_object(
        'en', 'Performance',
        'zhTW', '表現',
        'zhCN', '表现',
        'ja', 'パフォーマンス',
        'ko', '성과',
        'es', 'Rendimiento',
        'fr', 'Performance',
        'de', 'Leistung',
        'pt', 'Desempenho',
        'it', 'Prestazione',
        'ru', 'Производительность',
        'ar', 'الأداء',
        'th', 'ประสิทธิภาพ',
        'id', 'Kinerja'
    )
    ELSE jsonb_build_object('en', category)
END
WHERE category IS NOT NULL;

-- 3. 為欄位添加註解
COMMENT ON COLUMN achievements.category IS '成就類別代碼（系統使用）';
COMMENT ON COLUMN achievements.category_name IS '成就類別名稱（多語言）';

-- 4. 更新現有成就的顯示順序和其他屬性
UPDATE achievements SET display_order = 1 WHERE code = 'first_steps';
UPDATE achievements SET display_order = 2 WHERE code = 'quick_learner';
UPDATE achievements SET display_order = 3 WHERE code = 'perfect_score';

COMMIT;