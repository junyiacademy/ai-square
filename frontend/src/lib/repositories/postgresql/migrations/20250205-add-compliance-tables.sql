-- 使用條款和隱私政策版本表
CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'terms_of_service', 'privacy_policy'
    version VARCHAR(20) NOT NULL,
    title JSONB NOT NULL, -- 多語言標題
    content JSONB NOT NULL, -- 多語言內容
    summary_of_changes JSONB, -- 變更摘要
    effective_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, version)
);

-- 用戶同意記錄表
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES legal_documents(id),
    document_type VARCHAR(50) NOT NULL,
    document_version VARCHAR(20) NOT NULL,
    consented_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    consent_method VARCHAR(50) DEFAULT 'click' -- 'click', 'checkbox', 'api'
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_document_id ON user_consents(document_id);

-- 為 users 表添加帳號狀態相關欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active';
-- 狀態：'active', 'suspended', 'archived', 'pending_deletion'

ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE;

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_archived_at ON users(archived_at);

-- 插入初始版本的使用條款和隱私政策
INSERT INTO legal_documents (type, version, title, content, effective_date) VALUES
(
    'terms_of_service',
    '1.0.0',
    '{"en": "Terms of Service", "zhTW": "服務條款"}',
    '{"en": "By using AI Square, you agree to these terms...", "zhTW": "使用 AI Square 即表示您同意這些條款..."}',
    CURRENT_DATE
),
(
    'privacy_policy',
    '1.0.0',
    '{"en": "Privacy Policy", "zhTW": "隱私政策"}',
    '{"en": "We respect your privacy and protect your data...", "zhTW": "我們尊重您的隱私並保護您的資料..."}',
    CURRENT_DATE
)
ON CONFLICT (type, version) DO NOTHING;