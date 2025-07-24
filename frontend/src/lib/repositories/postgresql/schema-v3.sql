-- AI Square Unified Schema V3
-- Purpose: Complete rebuild with mode propagation to avoid excessive JOINs
-- Includes mode column in programs, tasks, evaluations tables

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Type Definitions
-- ============================================

-- Learning mode types
CREATE TYPE learning_mode AS ENUM ('pbl', 'discovery', 'assessment');

-- Status types
CREATE TYPE scenario_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE program_status AS ENUM ('pending', 'active', 'completed', 'abandoned');
CREATE TYPE task_status AS ENUM ('pending', 'active', 'completed', 'skipped');

-- Task types (unified across all modes)
CREATE TYPE task_type AS ENUM (
    -- Common types
    'interactive',      -- Interactive learning
    'reflection',       -- Reflection and thinking
    
    -- PBL specific
    'chat',            -- AI chat conversation
    'creation',        -- Content creation
    'analysis',        -- Analysis task
    
    -- Discovery specific
    'exploration',     -- Open exploration
    'experiment',      -- Experimentation
    'challenge',       -- Challenge task
    
    -- Assessment specific
    'question',        -- Single question
    'quiz',           -- Quiz set
    'assessment'       -- Formal assessment
);

-- Difficulty levels (unified)
CREATE TYPE difficulty_level AS ENUM (
    'beginner',
    'intermediate', 
    'advanced',
    'expert'
);

-- Source types
CREATE TYPE source_type AS ENUM ('yaml', 'api', 'ai-generated');

-- ============================================
-- Core Tables
-- ============================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    preferred_language VARCHAR(10) DEFAULT 'en',
    level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    
    -- Learning preferences
    learning_preferences JSONB DEFAULT '{}'::jsonb,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps (unified naming)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Extensible metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Scenarios table (unified structure)
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mode learning_mode NOT NULL,
    status scenario_status DEFAULT 'draft',
    version VARCHAR(20) DEFAULT '1.0.0',
    
    -- Source tracking (unified)
    source_type source_type DEFAULT 'yaml',
    source_path VARCHAR(500),          -- Path to source file
    source_id VARCHAR(255),            -- Unique source identifier
    source_metadata JSONB DEFAULT '{}'::jsonb,  -- Source-specific metadata
    
    -- Basic info (multi-language)
    title JSONB NOT NULL DEFAULT '{}'::jsonb,        -- {"en": "Title", "zh": "標題"}
    description JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {"en": "Desc", "zh": "描述"}
    objectives JSONB DEFAULT '[]'::jsonb,            -- Array of objectives
    
    -- Common attributes
    difficulty difficulty_level DEFAULT 'intermediate',
    estimated_minutes INTEGER DEFAULT 30,
    prerequisites JSONB DEFAULT '[]'::jsonb,         -- Array of prerequisite IDs
    
    -- Task templates
    task_templates JSONB DEFAULT '[]'::jsonb,        -- Array of task definitions
    task_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(task_templates)) STORED,
    
    -- Rewards and progression
    xp_rewards JSONB DEFAULT '{"completion": 100}'::jsonb,
    unlock_requirements JSONB DEFAULT '{}'::jsonb,
    
    -- Mode-specific data
    pbl_data JSONB DEFAULT '{}'::jsonb,              -- PBL: KSA mapping, AI guidelines
    discovery_data JSONB DEFAULT '{}'::jsonb,        -- Discovery: career info, skill tree
    assessment_data JSONB DEFAULT '{}'::jsonb,       -- Assessment: question bank, scoring
    
    -- Resources and AI
    ai_modules JSONB DEFAULT '{}'::jsonb,
    resources JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Extensible metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_title CHECK (title != '{}'::jsonb),
    CONSTRAINT valid_description CHECK (description != '{}'::jsonb)
);

-- Programs table (user instances) - NOW WITH MODE
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenarios(id),
    mode learning_mode NOT NULL,  -- NEW: Propagated from scenario
    status program_status DEFAULT 'pending',
    
    -- Progress tracking
    current_task_index INTEGER DEFAULT 0,
    completed_task_count INTEGER DEFAULT 0,
    total_task_count INTEGER NOT NULL,
    
    -- Scoring (unified)
    total_score DECIMAL(5,2) DEFAULT 0,              -- 0-100 scale
    dimension_scores JSONB DEFAULT '{}'::jsonb,      -- {"ksa": {...}, "creativity": 8}
    
    -- XP and rewards (mainly for Discovery)
    xp_earned INTEGER DEFAULT 0,
    badges_earned JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps (unified naming)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Time tracking
    time_spent_seconds INTEGER DEFAULT 0,
    
    -- Mode-specific data
    pbl_data JSONB DEFAULT '{}'::jsonb,              -- PBL: reflection notes
    discovery_data JSONB DEFAULT '{}'::jsonb,        -- Discovery: exploration path
    assessment_data JSONB DEFAULT '{}'::jsonb,       -- Assessment: answer sheet
    
    -- Extensible metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tasks table (unified structure) - NOW WITH MODE
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    mode learning_mode NOT NULL,  -- NEW: Propagated from program
    task_index INTEGER NOT NULL,                      -- Order within program
    scenario_task_index INTEGER,                      -- Reference to scenario template
    
    -- Basic info
    title VARCHAR(500),
    description TEXT,
    type task_type NOT NULL,
    status task_status DEFAULT 'pending',
    
    -- Content (unified structure)
    content JSONB DEFAULT '{}'::jsonb,                -- Instructions, questions, etc.
    
    -- Interaction tracking
    interactions JSONB DEFAULT '[]'::jsonb,           -- Array of interactions
    interaction_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(interactions)) STORED,
    
    -- Response/solution
    user_response JSONB DEFAULT '{}'::jsonb,          -- User's answer/solution
    
    -- Scoring
    score DECIMAL(5,2) DEFAULT 0,
    max_score DECIMAL(5,2) DEFAULT 100,
    
    -- Attempts and timing
    allowed_attempts INTEGER DEFAULT 3,
    attempt_count INTEGER DEFAULT 0,
    time_limit_seconds INTEGER,                       -- Optional time limit
    time_spent_seconds INTEGER DEFAULT 0,
    
    -- AI configuration
    ai_config JSONB DEFAULT '{}'::jsonb,              -- AI module settings
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Mode-specific data
    pbl_data JSONB DEFAULT '{}'::jsonb,              -- PBL: KSA focus
    discovery_data JSONB DEFAULT '{}'::jsonb,        -- Discovery: skill requirements
    assessment_data JSONB DEFAULT '{}'::jsonb,       -- Assessment: correct answer
    
    -- Extensible metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    UNIQUE(program_id, task_index)
);

-- Evaluations table (unified) - NOW WITH MODE
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    mode learning_mode NOT NULL,  -- NEW: Mode for easy filtering
    
    -- Evaluation scope
    evaluation_type VARCHAR(50) NOT NULL,             -- 'task', 'program', 'skill'
    evaluation_subtype VARCHAR(50),                   -- Mode-specific subtypes
    
    -- Scoring (unified 0-100 scale)
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    max_score DECIMAL(5,2) DEFAULT 100,
    
    -- Multi-dimensional scoring
    dimension_scores JSONB DEFAULT '{}'::jsonb,       -- {"accuracy": 90, "creativity": 85}
    
    -- Feedback
    feedback_text TEXT,
    feedback_data JSONB DEFAULT '{}'::jsonb,          -- Structured feedback
    
    -- AI analysis
    ai_provider VARCHAR(50),                          -- 'vertex', 'openai', etc.
    ai_model VARCHAR(100),
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    
    -- Time tracking
    time_taken_seconds INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Mode-specific data
    pbl_data JSONB DEFAULT '{}'::jsonb,              -- PBL: KSA breakdown
    discovery_data JSONB DEFAULT '{}'::jsonb,        -- Discovery: innovation score
    assessment_data JSONB DEFAULT '{}'::jsonb,       -- Assessment: question analysis
    
    -- Extensible metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- Domain and Competency Tables
-- ============================================

-- AI Literacy domains
CREATE TABLE domains (
    id VARCHAR(100) PRIMARY KEY,                      -- 'engaging_with_ai', etc.
    name JSONB NOT NULL,                              -- Multi-language names
    description JSONB NOT NULL,                       -- Multi-language descriptions
    icon VARCHAR(50),
    display_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scenario-Domain mapping
CREATE TABLE scenario_domains (
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    domain_id VARCHAR(100) NOT NULL REFERENCES domains(id),
    is_primary BOOLEAN DEFAULT FALSE,
    weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (scenario_id, domain_id)
);

-- ============================================
-- Achievement and Progression Tables
-- ============================================

-- Achievements definition
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name JSONB NOT NULL,                              -- Multi-language
    description JSONB NOT NULL,                       -- Multi-language
    category VARCHAR(50) NOT NULL,
    icon_url VARCHAR(500),
    xp_reward INTEGER DEFAULT 0,
    
    -- Unlock criteria
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Visibility
    is_hidden BOOLEAN DEFAULT FALSE,
    display_order INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User achievements
CREATE TABLE user_achievements (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    earned_context JSONB DEFAULT '{}'::jsonb,         -- How it was earned
    PRIMARY KEY (user_id, achievement_id)
);

-- ============================================
-- AI Usage Tracking
-- ============================================

CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id),
    task_id UUID REFERENCES tasks(id),
    
    -- AI details
    feature VARCHAR(100) NOT NULL,                    -- 'chat', 'evaluation', etc.
    provider VARCHAR(50) NOT NULL,                    -- 'vertex', 'openai', etc.
    model VARCHAR(100) NOT NULL,
    
    -- Token usage
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    -- Cost tracking
    estimated_cost_usd DECIMAL(10,6) DEFAULT 0,
    
    -- Request/response
    request_data JSONB DEFAULT '{}'::jsonb,
    response_data JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- Session Management
-- ============================================

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    
    -- Session info
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Session data
    data JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- Triggers for Mode Propagation
-- ============================================

-- Function to propagate mode from scenario to program
CREATE OR REPLACE FUNCTION propagate_mode_to_program()
RETURNS TRIGGER AS $$
BEGIN
    SELECT mode INTO NEW.mode FROM scenarios WHERE id = NEW.scenario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scenario % not found', NEW.scenario_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to propagate mode from program to task
CREATE OR REPLACE FUNCTION propagate_mode_to_task()
RETURNS TRIGGER AS $$
BEGIN
    SELECT mode INTO NEW.mode FROM programs WHERE id = NEW.program_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Program % not found', NEW.program_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set mode for evaluation based on program/task
CREATE OR REPLACE FUNCTION set_evaluation_mode()
RETURNS TRIGGER AS $$
BEGIN
    -- If evaluation has a task_id, get mode from task
    IF NEW.task_id IS NOT NULL THEN
        SELECT mode INTO NEW.mode FROM tasks WHERE id = NEW.task_id;
    -- Otherwise, get mode from program
    ELSIF NEW.program_id IS NOT NULL THEN
        SELECT mode INTO NEW.mode FROM programs WHERE id = NEW.program_id;
    ELSE
        RAISE EXCEPTION 'Evaluation must have either task_id or program_id';
    END IF;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referenced task/program not found';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER set_program_mode_trigger
BEFORE INSERT ON programs
FOR EACH ROW
EXECUTE FUNCTION propagate_mode_to_program();

CREATE TRIGGER set_task_mode_trigger
BEFORE INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION propagate_mode_to_task();

CREATE TRIGGER set_evaluation_mode_trigger
BEFORE INSERT ON evaluations
FOR EACH ROW
EXECUTE FUNCTION set_evaluation_mode();

-- ============================================
-- Data Validation Functions
-- ============================================

-- Validate scenario data based on mode
CREATE OR REPLACE FUNCTION validate_scenario_data()
RETURNS TRIGGER AS $$
BEGIN
    CASE NEW.mode
        WHEN 'pbl' THEN
            IF NEW.pbl_data IS NULL OR 
               NOT (NEW.pbl_data ? 'ksaMapping') THEN
                RAISE EXCEPTION 'PBL scenarios must have ksaMapping in pbl_data';
            END IF;
        WHEN 'discovery' THEN
            IF NEW.discovery_data IS NULL THEN
                RAISE EXCEPTION 'Discovery scenarios must have discovery_data';
            END IF;
        WHEN 'assessment' THEN
            IF NEW.assessment_data IS NULL THEN
                RAISE EXCEPTION 'Assessment scenarios must have assessment_data';
            END IF;
    END CASE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_scenario_data_trigger
BEFORE INSERT OR UPDATE ON scenarios
FOR EACH ROW
EXECUTE FUNCTION validate_scenario_data();

-- ============================================
-- Update Timestamp Trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Indexes
-- ============================================

-- User indexes
CREATE INDEX idx_users_email ON users(LOWER(email));
CREATE INDEX idx_users_preferred_language ON users(preferred_language);
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);

-- Scenario indexes
CREATE INDEX idx_scenarios_mode ON scenarios(mode);
CREATE INDEX idx_scenarios_status ON scenarios(status);
CREATE INDEX idx_scenarios_mode_status ON scenarios(mode, status);
CREATE INDEX idx_scenarios_difficulty ON scenarios(difficulty);
CREATE INDEX idx_scenarios_source_type ON scenarios(source_type);
CREATE INDEX idx_scenarios_source_id ON scenarios(source_id);
CREATE INDEX idx_scenarios_title_en ON scenarios((title->>'en'));

-- Program indexes (including new mode index)
CREATE INDEX idx_programs_user_id ON programs(user_id);
CREATE INDEX idx_programs_scenario_id ON programs(scenario_id);
CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_programs_mode ON programs(mode);
CREATE INDEX idx_programs_user_status ON programs(user_id, status);
CREATE INDEX idx_programs_user_mode ON programs(user_id, mode);
CREATE INDEX idx_programs_last_activity ON programs(last_activity_at DESC);

-- Task indexes (including new mode index)
CREATE INDEX idx_tasks_program_id ON tasks(program_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_mode ON tasks(mode);
CREATE INDEX idx_tasks_program_index ON tasks(program_id, task_index);
CREATE INDEX idx_tasks_mode_type ON tasks(mode, type);

-- Evaluation indexes (including new mode index)
CREATE INDEX idx_evaluations_user_id ON evaluations(user_id);
CREATE INDEX idx_evaluations_program_id ON evaluations(program_id);
CREATE INDEX idx_evaluations_task_id ON evaluations(task_id);
CREATE INDEX idx_evaluations_type ON evaluations(evaluation_type);
CREATE INDEX idx_evaluations_mode ON evaluations(mode);
CREATE INDEX idx_evaluations_created_at ON evaluations(created_at DESC);
CREATE INDEX idx_evaluations_user_mode ON evaluations(user_id, mode);

-- Achievement indexes
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned_at ON user_achievements(earned_at DESC);

-- AI usage indexes
CREATE INDEX idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_feature ON ai_usage(feature);
CREATE INDEX idx_ai_usage_created_at ON ai_usage(created_at DESC);

-- Session indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- ============================================
-- Views
-- ============================================

-- User progress overview
CREATE OR REPLACE VIEW user_progress_overview AS
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.level,
    u.total_xp,
    COUNT(DISTINCT p.id) as total_programs,
    COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_programs,
    COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_programs,
    AVG(CASE WHEN p.status = 'completed' THEN p.total_score END) as avg_score,
    SUM(p.time_spent_seconds) as total_time_seconds
FROM users u
LEFT JOIN programs p ON u.id = p.user_id
GROUP BY u.id;

-- Scenario statistics (can now filter by mode efficiently)
CREATE OR REPLACE VIEW scenario_statistics AS
SELECT 
    s.id,
    s.mode,
    s.title->>'en' as title_en,
    s.difficulty,
    COUNT(DISTINCT p.id) as total_programs,
    COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_programs,
    AVG(CASE WHEN p.status = 'completed' THEN p.total_score END) as avg_score,
    AVG(p.time_spent_seconds) as avg_time_seconds
FROM scenarios s
LEFT JOIN programs p ON s.id = p.scenario_id
GROUP BY s.id;

-- PBL-specific views
CREATE OR REPLACE VIEW pbl_scenarios_view AS
SELECT 
    id, status, title, description,
    source_type, source_path, source_id,
    difficulty, estimated_minutes,
    pbl_data->>'ksaMapping' as ksa_mapping,
    pbl_data->>'aiMentorGuidelines' as ai_mentor_guidelines,
    pbl_data
FROM scenarios
WHERE mode = 'pbl';

CREATE OR REPLACE VIEW pbl_programs_view AS
SELECT 
    p.*,
    s.title->>'en' as scenario_title,
    s.pbl_data->>'ksaMapping' as ksa_mapping
FROM programs p
JOIN scenarios s ON p.scenario_id = s.id
WHERE p.mode = 'pbl';

-- Discovery-specific views
CREATE OR REPLACE VIEW discovery_scenarios_view AS
SELECT 
    id, status, title, description,
    source_type, source_path, source_id,
    difficulty, estimated_minutes,
    discovery_data->>'careerType' as career_type,
    discovery_data->'careerInfo' as career_info,
    discovery_data
FROM scenarios
WHERE mode = 'discovery';

-- Assessment-specific views
CREATE OR REPLACE VIEW assessment_scenarios_view AS
SELECT 
    id, status, title, description,
    source_type, source_path, source_id,
    difficulty, estimated_minutes,
    assessment_data->>'assessmentType' as assessment_type,
    assessment_data->'questionBank' as question_bank,
    assessment_data
FROM scenarios
WHERE mode = 'assessment';

-- ============================================
-- Helper Functions
-- ============================================

-- Get user's programs by mode (no JOIN needed now!)
CREATE OR REPLACE FUNCTION get_user_programs_by_mode(
    p_user_id UUID,
    p_mode learning_mode
) RETURNS TABLE (
    id UUID,
    scenario_id UUID,
    status program_status,
    total_score DECIMAL,
    completed_task_count INTEGER,
    total_task_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.scenario_id,
        p.status,
        p.total_score,
        p.completed_task_count,
        p.total_task_count
    FROM programs p
    WHERE p.user_id = p_user_id 
      AND p.mode = p_mode
    ORDER BY p.last_activity_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Get tasks by mode and type (no JOIN needed!)
CREATE OR REPLACE FUNCTION get_tasks_by_mode_and_type(
    p_mode learning_mode,
    p_type task_type
) RETURNS TABLE (
    id UUID,
    program_id UUID,
    title VARCHAR,
    status task_status,
    score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.program_id,
        t.title,
        t.status,
        t.score
    FROM tasks t
    WHERE t.mode = p_mode 
      AND t.type = p_type
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Initial Data
-- ============================================

-- Insert domains
INSERT INTO domains (id, name, description, icon, display_order) VALUES
('engaging_with_ai', 
'{"en": "Engaging with AI", "zh": "與 AI 互動"}'::jsonb,
'{"en": "Understanding and interacting with AI systems", "zh": "理解並與 AI 系統互動"}'::jsonb,
'🤝', 1),
('creating_with_ai',
'{"en": "Creating with AI", "zh": "用 AI 創造"}'::jsonb,
'{"en": "Using AI for creative tasks", "zh": "使用 AI 進行創造性任務"}'::jsonb,
'🎨', 2),
('managing_ai',
'{"en": "Managing AI", "zh": "管理 AI"}'::jsonb,
'{"en": "Overseeing AI systems and outputs", "zh": "監督 AI 系統和輸出"}'::jsonb,
'📊', 3),
('designing_ai',
'{"en": "Designing AI", "zh": "設計 AI"}'::jsonb,
'{"en": "Creating and shaping AI systems", "zh": "創建和塑造 AI 系統"}'::jsonb,
'🔧', 4);

-- Insert initial achievements
INSERT INTO achievements (code, name, description, category, xp_reward, criteria) VALUES
('first_program', 
'{"en": "First Steps", "zh": "第一步"}'::jsonb,
'{"en": "Complete your first learning program", "zh": "完成第一個學習計劃"}'::jsonb,
'milestone', 50,
'{"type": "program_completion", "count": 1}'::jsonb),
('quick_learner',
'{"en": "Quick Learner", "zh": "快速學習者"}'::jsonb,
'{"en": "Complete a program in under 10 minutes", "zh": "在10分鐘內完成一個計劃"}'::jsonb,
'performance', 100,
'{"type": "speed_completion", "minutes": 10}'::jsonb),
('perfect_score',
'{"en": "Perfect Score", "zh": "滿分"}'::jsonb,
'{"en": "Achieve 100% on any evaluation", "zh": "在任何評估中獲得100分"}'::jsonb,
'performance', 150,
'{"type": "perfect_score"}'::jsonb);

-- ============================================
-- Demo Users
-- ============================================

-- Insert demo users for testing (passwords handled by application)
INSERT INTO users (id, email, name, preferred_language, level, total_xp, onboarding_completed, metadata) VALUES
(gen_random_uuid(), 'student@example.com', 'Student User', 'en', 1, 0, false, 
 '{"role": "student", "description": "Demo student account"}'::jsonb),
(gen_random_uuid(), 'teacher@example.com', 'Teacher User', 'en', 5, 500, true,
 '{"role": "teacher", "description": "Demo teacher account"}'::jsonb),
(gen_random_uuid(), 'admin@example.com', 'Admin User', 'en', 10, 1000, true,
 '{"role": "admin", "description": "Demo admin account"}'::jsonb);

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE scenarios IS 'Unified learning scenarios for PBL, Discovery, and Assessment modes';
COMMENT ON COLUMN scenarios.mode IS 'Learning mode: pbl, discovery, or assessment';
COMMENT ON COLUMN programs.mode IS 'Learning mode propagated from scenario for efficient querying';
COMMENT ON COLUMN tasks.mode IS 'Learning mode propagated from program for efficient querying';
COMMENT ON COLUMN evaluations.mode IS 'Learning mode for efficient filtering without JOINs';

-- End of schema v3