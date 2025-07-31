-- 改進 evaluations 表的多語言支援
-- 將 feedback_text 遷移到 feedback JSONB 欄位

BEGIN;

-- 1. 新增 feedback JSONB 欄位來支援多語言
ALTER TABLE evaluations 
ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb;

-- 2. 如果有現有的 feedback_text 資料，遷移到新欄位
UPDATE evaluations
SET feedback = jsonb_build_object(
    'en', feedback_text,
    'zhTW', feedback_text,  -- 暫時複製，之後可以翻譯
    'zhCN', feedback_text   -- 暫時複製，之後可以翻譯
)
WHERE feedback_text IS NOT NULL 
  AND feedback_text != ''
  AND (feedback IS NULL OR feedback = '{}'::jsonb);

-- 3. 為 feedback 欄位添加註解
COMMENT ON COLUMN evaluations.feedback IS '多語言回饋內容 {"en": "...", "zhTW": "...", ...}';

-- 4. 保留 feedback_text 欄位但標記為棄用
COMMENT ON COLUMN evaluations.feedback_text IS '已棄用 - 請使用 feedback JSONB 欄位';

-- 5. 確保 feedback_data 有正確的結構（如果需要的話）
-- feedback_data 可以儲存更詳細的評估資料
COMMENT ON COLUMN evaluations.feedback_data IS '詳細評估資料，包含各項指標和建議';

COMMIT;