-- AI Square PostgreSQL Schema
-- Version: 1.0.0
-- Description: Complete database schema for AI Square learning platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Core Tables
-- ============================================

-- Users table: Core user information and learning preferences
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    preferred_language VARCHAR(10) DEFAULT 'en',
    level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    learning_preferences JSONB DEFAULT '{}'::jsonb,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Scenarios table: Learning scenarios (PBL, Assessment, Discovery)
CREATE TABLE IF NOT EXISTS scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('pbl', 'assessment', 'discovery')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
    version VARCHAR(20) DEFAULT '1.0.0',
    difficulty_level VARCHAR(20) DEFAULT 'intermediate',
    estimated_minutes INTEGER DEFAULT 30,
    prerequisites JSONB DEFAULT '[]'::jsonb,
    xp_rewards JSONB DEFAULT '{"completion": 100}'::jsonb,
    unlock_requirements JSONB DEFAULT '{}'::jsonb,
    tasks JSONB DEFAULT '[]'::jsonb,
    ai_modules JSONB DEFAULT '{}'::jsonb,
    resources JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE
);

-- Programs table: User's active learning programs
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenarios(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'abandoned')),
    current_task_index INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    total_tasks INTEGER NOT NULL,
    total_score DECIMAL(5,2) DEFAULT 0,
    ksa_scores JSONB DEFAULT '{}'::jsonb,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_spent_seconds INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table: Individual tasks within programs
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    task_index INTEGER NOT NULL,
    scenario_task_index INTEGER,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
    type VARCHAR(100) NOT NULL,
    expected_duration INTEGER DEFAULT 300, -- in seconds
    allowed_attempts INTEGER DEFAULT 3,
    context JSONB DEFAULT '{}'::jsonb,
    user_solution TEXT,
    score DECIMAL(5,2) DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    attempt_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Evaluations table: AI evaluations of user performance
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    evaluation_type VARCHAR(100) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    feedback TEXT,
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    ksa_scores JSONB DEFAULT '{}'::jsonb,
    time_taken_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Interactions table: Chat/interaction history for tasks
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Achievement System Tables
-- ============================================

-- Achievements table: Available achievements
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    achievement_type VARCHAR(50) NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    criteria JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User achievements junction table
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (user_id, achievement_id)
);

-- ============================================
-- Domain Mapping Tables
-- ============================================

-- Scenario domains junction table
CREATE TABLE IF NOT EXISTS scenario_domains (
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    domain VARCHAR(100) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (scenario_id, domain)
);

-- ============================================
-- AI Usage Tracking Table
-- ============================================

-- AI usage table: Track AI API usage for cost management
CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost_usd DECIMAL(10,6) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- User indexes
CREATE INDEX idx_users_email ON users(LOWER(email));
CREATE INDEX idx_users_last_active ON users(last_active_at);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Scenario indexes
CREATE INDEX idx_scenarios_type ON scenarios(type);
CREATE INDEX idx_scenarios_status ON scenarios(status);
CREATE INDEX idx_scenarios_type_status ON scenarios(type, status);
CREATE INDEX idx_scenarios_difficulty ON scenarios(difficulty_level);

-- Program indexes
CREATE INDEX idx_programs_user_id ON programs(user_id);
CREATE INDEX idx_programs_scenario_id ON programs(scenario_id);
CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_programs_user_status ON programs(user_id, status);
CREATE INDEX idx_programs_last_activity ON programs(last_activity_at);

-- Task indexes
CREATE INDEX idx_tasks_program_id ON tasks(program_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_program_index ON tasks(program_id, task_index);

-- Evaluation indexes
CREATE INDEX idx_evaluations_user_id ON evaluations(user_id);
CREATE INDEX idx_evaluations_program_id ON evaluations(program_id);
CREATE INDEX idx_evaluations_task_id ON evaluations(task_id);
CREATE INDEX idx_evaluations_type ON evaluations(evaluation_type);
CREATE INDEX idx_evaluations_created_at ON evaluations(created_at);

-- Interaction indexes
CREATE INDEX idx_interactions_task_id ON interactions(task_id);
CREATE INDEX idx_interactions_task_sequence ON interactions(task_id, sequence_number);

-- Achievement indexes
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned_at ON user_achievements(earned_at);

-- Domain indexes
CREATE INDEX idx_scenario_domains_domain ON scenario_domains(domain);

-- AI usage indexes
CREATE INDEX idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_feature ON ai_usage(feature);
CREATE INDEX idx_ai_usage_created_at ON ai_usage(created_at);

-- ============================================
-- Triggers for Updated Timestamps
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Views for Common Queries
-- ============================================

-- Active programs with user and scenario info
CREATE OR REPLACE VIEW active_programs_view AS
SELECT 
    p.*,
    u.email as user_email,
    u.name as user_name,
    s.type as scenario_type,
    s.difficulty_level as scenario_difficulty
FROM programs p
JOIN users u ON p.user_id = u.id
JOIN scenarios s ON p.scenario_id = s.id
WHERE p.status = 'active';

-- User progress summary view
CREATE OR REPLACE VIEW user_progress_view AS
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.level,
    u.total_xp,
    COUNT(DISTINCT p.id) as total_programs,
    COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_programs,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    AVG(e.score) as average_score,
    SUM(t.time_spent_seconds) as total_time_spent_seconds
FROM users u
LEFT JOIN programs p ON u.id = p.user_id
LEFT JOIN tasks t ON p.id = t.program_id
LEFT JOIN evaluations e ON t.id = e.task_id
GROUP BY u.id;

-- ============================================
-- User Assessment System Tables
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
CREATE INDEX idx_assessment_sessions_user_id ON assessment_sessions(user_id);
CREATE INDEX idx_assessment_sessions_created_at ON assessment_sessions(created_at);
CREATE INDEX idx_assessment_sessions_session_key ON assessment_sessions(session_key);

-- User badges indexes  
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_category ON user_badges(category);
CREATE INDEX idx_user_badges_unlocked_at ON user_badges(unlocked_at);

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
-- Initial Data Seeding (Optional)
-- ============================================

-- Insert default achievements
INSERT INTO achievements (code, achievement_type, xp_reward, criteria) VALUES
    ('first_scenario', 'milestone', 50, '{"description": "Complete your first scenario"}'::jsonb),
    ('fast_learner', 'performance', 100, '{"description": "Complete a scenario in under 10 minutes"}'::jsonb),
    ('perfect_score', 'performance', 200, '{"description": "Get a perfect score on any task"}'::jsonb),
    ('ai_explorer', 'exploration', 75, '{"description": "Try all AI features"}'::jsonb),
    ('consistent_learner', 'milestone', 150, '{"description": "Learn for 7 consecutive days"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Grants (Adjust based on your user setup)
-- ============================================

-- Grant permissions to application user (replace 'app_user' with your actual application user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;