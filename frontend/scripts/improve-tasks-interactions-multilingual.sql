-- 改進 tasks.interactions 的多語言支援
-- 定義支援多語言的互動記錄格式

BEGIN;

-- 1. 為 interactions 欄位添加詳細說明
COMMENT ON COLUMN tasks.interactions IS '
互動記錄陣列，支援多語言格式：
[{
  "id": "uuid",
  "type": "user" | "ai" | "system",
  "content": {
    "en": "English content",
    "zhTW": "繁體中文內容",
    "zhCN": "简体中文内容",
    ...
  },
  "timestamp": "ISO 8601 timestamp",
  "metadata": {
    "model": "AI model used",
    "confidence": 0.95,
    ...
  }
}]
';

-- 2. 創建一個輔助函數來添加多語言互動記錄
CREATE OR REPLACE FUNCTION add_task_interaction(
    p_task_id UUID,
    p_type TEXT,
    p_content JSONB,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    UPDATE tasks
    SET interactions = interactions || jsonb_build_array(
        jsonb_build_object(
            'id', gen_random_uuid(),
            'type', p_type,
            'content', p_content,
            'timestamp', CURRENT_TIMESTAMP,
            'metadata', p_metadata
        )
    ),
    interaction_count = COALESCE(interaction_count, 0) + 1,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql;

-- 3. 創建視圖來方便查詢特定語言的互動內容
CREATE OR REPLACE VIEW task_interactions_view AS
SELECT 
    t.id as task_id,
    t.program_id,
    i.value->>'id' as interaction_id,
    i.value->>'type' as interaction_type,
    i.value->'content' as content_multilingual,
    i.value->>'timestamp' as timestamp,
    i.value->'metadata' as metadata
FROM tasks t
CROSS JOIN LATERAL jsonb_array_elements(t.interactions) i(value)
WHERE t.interactions IS NOT NULL AND jsonb_array_length(t.interactions) > 0;

-- 4. 創建函數來獲取特定語言的互動內容
CREATE OR REPLACE FUNCTION get_task_interactions_by_language(
    p_task_id UUID,
    p_language TEXT DEFAULT 'en'
) RETURNS TABLE (
    interaction_id UUID,
    interaction_type TEXT,
    content TEXT,
    interaction_timestamp TIMESTAMPTZ,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (i.value->>'id')::UUID,
        i.value->>'type',
        COALESCE(
            i.value->'content'->>p_language,
            i.value->'content'->>'en',
            i.value->>'content'  -- 向後相容：如果 content 是字串
        ) as content,
        (i.value->>'timestamp')::TIMESTAMPTZ,
        i.value->'metadata'
    FROM tasks t
    CROSS JOIN LATERAL jsonb_array_elements(t.interactions) i(value)
    WHERE t.id = p_task_id
    ORDER BY (i.value->>'timestamp')::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql;

-- 5. 為 content 欄位也添加多語言支援說明
COMMENT ON COLUMN tasks.content IS '
任務內容，支援多語言格式：
{
  "instructions": {
    "en": "English instructions",
    "zhTW": "繁體中文說明",
    ...
  },
  "resources": [...],
  "hints": {
    "en": ["Hint 1", "Hint 2"],
    "zhTW": ["提示 1", "提示 2"],
    ...
  }
}
';

COMMIT;