-- ============================================
-- User Data Migration Tables
-- PostgreSQL schema for user assessment data
-- ============================================

-- Assessment sessions table: Store user assessment sessions and results
CREATE TABLE IF NOT EXISTS assessment_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_key VARCHAR(255) NOT NULL, -- For backward compatibility (assessment_<timestamp>)
    tech_score INTEGER NOT NULL CHECK (tech_score >= 0 AND tech_score <= 100),
    creative_score INTEGER NOT NULL CHECK (creative_score >= 0 AND creative_score <= 100),
    business_score INTEGER NOT NULL CHECK (business_score >= 0 AND business_score <= 100),
    answers JSONB DEFAULT '{}'::jsonb, -- Store user answers for each question
    generated_paths JSONB DEFAULT '[]'::jsonb, -- IDs of paths generated from this assessment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User badges table: Store earned badges separately from achievements
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    category VARCHAR(50) DEFAULT 'learning' CHECK (category IN ('exploration', 'learning', 'mastery', 'community', 'special')),
    xp_reward INTEGER DEFAULT 0,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, badge_id)
);

-- ============================================
-- Assessment System Indexes
-- ============================================

-- Assessment sessions indexes
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_id ON assessment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_created_at ON assessment_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_session_key ON assessment_sessions(session_key);

-- User badges indexes  
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_category ON user_badges(category);
CREATE INDEX IF NOT EXISTS idx_user_badges_unlocked_at ON user_badges(unlocked_at);

-- ============================================
-- Assessment System Views
-- ============================================

-- Latest assessment results view
CREATE OR REPLACE VIEW user_latest_assessment_view AS
SELECT DISTINCT ON (user_id)
    user_id,
    id as session_id,
    tech_score,
    creative_score,
    business_score,
    answers,
    generated_paths,
    created_at
FROM assessment_sessions
ORDER BY user_id, created_at DESC;

-- User badges summary view
CREATE OR REPLACE VIEW user_badges_summary_view AS
SELECT 
    user_id,
    COUNT(*) as total_badges,
    SUM(xp_reward) as total_badge_xp,
    COUNT(CASE WHEN category = 'exploration' THEN 1 END) as exploration_badges,
    COUNT(CASE WHEN category = 'learning' THEN 1 END) as learning_badges,
    COUNT(CASE WHEN category = 'mastery' THEN 1 END) as mastery_badges,
    COUNT(CASE WHEN category = 'community' THEN 1 END) as community_badges,
    COUNT(CASE WHEN category = 'special' THEN 1 END) as special_badges
FROM user_badges
GROUP BY user_id;

-- ============================================
-- Verification Query
-- ============================================

-- Run this to verify tables were created
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
    AND table_name IN ('assessment_sessions', 'user_badges', 'user_latest_assessment_view', 'user_badges_summary_view')
ORDER BY table_name;