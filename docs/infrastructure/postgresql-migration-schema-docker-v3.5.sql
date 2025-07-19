-- AI Square PostgreSQL Database Schema V3.5 (Balanced Normalization - Docker Version)
-- Version: 3.5.1
-- Date: 2025-01-19
-- Description: Consolidated schema with all features including onboarding and question bank
-- This is the primary schema file - all other versions have been deprecated

-- ========================================
-- Database Setup
-- ========================================
-- Note: Docker already creates the database, so we skip CREATE DATABASE

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For full-text search
CREATE EXTENSION IF NOT EXISTS btree_gin; -- For composite GIN indexes

-- ========================================
-- Language System Tables
-- ========================================

CREATE TABLE languages (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    fallback_language VARCHAR(10) REFERENCES languages(code),
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    direction VARCHAR(3) DEFAULT 'ltr',
    requires_special_font BOOLEAN DEFAULT FALSE,
    date_format VARCHAR(50),
    number_format VARCHAR(50),
    sort_order INTEGER DEFAULT 999,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial languages
INSERT INTO languages (code, name, native_name, fallback_language, is_active, is_default, sort_order) VALUES
('en', 'English', 'English', NULL, TRUE, TRUE, 1),
('zh', 'Chinese', '中文', 'en', TRUE, FALSE, 2),
('zhTW', 'Traditional Chinese', '繁體中文', 'zh', TRUE, FALSE, 3),
('zhCN', 'Simplified Chinese', '简体中文', 'zh', TRUE, FALSE, 4),
('es', 'Spanish', 'Español', 'en', TRUE, FALSE, 5),
('pt', 'Portuguese', 'Português', 'en', TRUE, FALSE, 6),
('ar', 'Arabic', 'العربية', 'en', TRUE, FALSE, 7),
('id', 'Indonesian', 'Bahasa Indonesia', 'en', TRUE, FALSE, 8),
('th', 'Thai', 'ไทย', 'en', TRUE, FALSE, 9),
('ja', 'Japanese', '日本語', 'en', TRUE, FALSE, 10),
('ko', 'Korean', '한국어', 'en', TRUE, FALSE, 11),
('fr', 'French', 'Français', 'en', TRUE, FALSE, 12),
('de', 'German', 'Deutsch', 'en', TRUE, FALSE, 13),
('ru', 'Russian', 'Русский', 'en', TRUE, FALSE, 14),
('it', 'Italian', 'Italiano', 'en', TRUE, FALSE, 15);

-- ========================================
-- Core Tables
-- ========================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    preferred_language VARCHAR(10) DEFAULT 'en' REFERENCES languages(code),
    level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    learning_preferences JSONB DEFAULT '{}'::jsonb,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);
CREATE INDEX idx_users_metadata_gin ON users USING GIN(metadata);

-- KSA Competencies
CREATE TABLE ksa_competencies (
    code VARCHAR(50) PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('knowledge', 'skill', 'attitude')),
    domain VARCHAR(100) NOT NULL,
    parent_code VARCHAR(50),
    level INTEGER NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ksa_type ON ksa_competencies(type);
CREATE INDEX idx_ksa_domain ON ksa_competencies(domain);
CREATE INDEX idx_ksa_parent ON ksa_competencies(parent_code);

-- Scenarios
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('pbl', 'assessment', 'discovery')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    version VARCHAR(20) DEFAULT '1.0.0',
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    estimated_minutes INTEGER,
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

CREATE INDEX idx_scenarios_type_status ON scenarios(type, status);
CREATE INDEX idx_scenarios_difficulty ON scenarios(difficulty_level);
CREATE INDEX idx_scenarios_tasks_gin ON scenarios USING GIN(tasks);

-- Scenario domains (HIGH CP VALUE extraction)
CREATE TABLE scenario_domains (
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    domain VARCHAR(100) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (scenario_id, domain)
);
CREATE INDEX idx_scenario_domains_domain ON scenario_domains(domain);

-- Programs
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenarios(id),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'abandoned')),
    current_task_index INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    total_tasks INTEGER NOT NULL,
    total_score DECIMAL(5,2) DEFAULT 0,
    ksa_scores JSONB DEFAULT '{}'::jsonb,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_spent_seconds INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_programs_user_scenario ON programs(user_id, scenario_id);
CREATE INDEX idx_programs_user_status ON programs(user_id, status);
CREATE INDEX idx_programs_scenario_status ON programs(scenario_id, status);
CREATE INDEX idx_programs_last_activity ON programs(last_activity_at DESC);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    task_index INTEGER NOT NULL,
    scenario_task_index INTEGER,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
    type VARCHAR(50) NOT NULL,
    expected_duration INTEGER,
    allowed_attempts INTEGER DEFAULT 3,
    context JSONB DEFAULT '{}'::jsonb,
    user_solution TEXT,
    score DECIMAL(5,2),
    time_spent_seconds INTEGER DEFAULT 0,
    attempt_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(program_id, task_index)
);

CREATE INDEX idx_tasks_program_status ON tasks(program_id, status);
CREATE INDEX idx_tasks_program_index ON tasks(program_id, task_index);

-- Task KSA mappings (HIGH CP VALUE extraction)
CREATE TABLE task_ksa_mappings (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    ksa_code VARCHAR(50) REFERENCES ksa_competencies(code),
    weight DECIMAL(3,2) DEFAULT 1.0,
    PRIMARY KEY (task_id, ksa_code)
);
CREATE INDEX idx_task_ksa_code ON task_ksa_mappings(ksa_code);

-- ========================================
-- HIGH CP VALUE: Extract Interactions
-- ========================================

CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, sequence_number)
);

CREATE INDEX idx_interactions_task_seq ON interactions(task_id, sequence_number);
CREATE INDEX idx_interactions_created ON interactions(created_at DESC);

-- ========================================
-- Evaluations
-- ========================================

CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    evaluation_type VARCHAR(50) NOT NULL CHECK (evaluation_type IN ('task', 'program', 'final', 'peer', 'self')),
    module_type VARCHAR(50) NOT NULL CHECK (module_type IN ('pbl', 'assessment', 'discovery')),
    overall_score DECIMAL(5,2),
    ksa_scores JSONB DEFAULT '{}'::jsonb,
    dimension_scores JSONB DEFAULT '{}'::jsonb,
    quality_metrics JSONB DEFAULT '{}'::jsonb,
    time_spent_seconds INTEGER,
    interaction_count INTEGER,
    xp_earned INTEGER DEFAULT 0,
    evaluator_model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
    evaluation_criteria JSONB DEFAULT '{}'::jsonb,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evaluations_user_type ON evaluations(user_id, evaluation_type);
CREATE INDEX idx_evaluations_program ON evaluations(program_id);
CREATE INDEX idx_evaluations_task ON evaluations(task_id);
CREATE INDEX idx_evaluations_created ON evaluations(created_at DESC);

-- ========================================
-- HIGH CP VALUE: AI Usage Tracking
-- ========================================

CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    feature VARCHAR(50) NOT NULL,
    context_type VARCHAR(50),
    context_id UUID,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens INTEGER GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
    estimated_cost_usd DECIMAL(10,6),
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_usage_user_date ON ai_usage(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_feature ON ai_usage(feature, created_at DESC);
CREATE INDEX idx_ai_usage_model ON ai_usage(provider, model);

-- Daily aggregation
CREATE TABLE ai_usage_daily (
    user_id UUID REFERENCES users(id),
    usage_date DATE NOT NULL,
    total_tokens INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,4) DEFAULT 0,
    chat_tokens INTEGER DEFAULT 0,
    evaluation_tokens INTEGER DEFAULT 0,
    translation_tokens INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX idx_ai_usage_daily_date ON ai_usage_daily(usage_date DESC);

-- ========================================
-- HIGH CP VALUE: Achievement System
-- ========================================

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    achievement_type VARCHAR(50) NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    icon_url TEXT,
    unlock_criteria JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_achievements_type ON achievements(achievement_type);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id),
    program_id UUID REFERENCES programs(id),
    scenario_id UUID REFERENCES scenarios(id),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned ON user_achievements(earned_at DESC);

-- ========================================
-- Keep existing tables from V3
-- ========================================

-- Chat sessions
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    type VARCHAR(50) DEFAULT 'general' CHECK (type IN ('general', 'pbl', 'discovery', 'assessment', 'mentor')),
    program_id UUID REFERENCES programs(id),
    task_id UUID REFERENCES tasks(id),
    total_messages INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_chat_sessions_user_type ON chat_sessions(user_id, type);
CREATE INDEX idx_chat_sessions_last_message ON chat_sessions(last_message_at DESC);

-- Chat messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model_used VARCHAR(100),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);

-- Scenario KSA mappings
CREATE TABLE scenario_ksa_mappings (
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    ksa_code VARCHAR(50) NOT NULL REFERENCES ksa_competencies(code),
    is_primary BOOLEAN DEFAULT FALSE,
    weight DECIMAL(3,2) DEFAULT 1.0,
    PRIMARY KEY (scenario_id, ksa_code)
);

CREATE INDEX idx_scenario_ksa_scenario ON scenario_ksa_mappings(scenario_id);
CREATE INDEX idx_scenario_ksa_code ON scenario_ksa_mappings(ksa_code);

-- User progress
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_type VARCHAR(50) NOT NULL,
    scenarios_started INTEGER DEFAULT 0,
    scenarios_completed INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    highest_score DECIMAL(5,2),
    ksa_progress JSONB DEFAULT '{}'::jsonb,
    first_activity_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module_type)
);

CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_updated ON user_progress(updated_at DESC);

-- User preferences
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_frequency VARCHAR(20) DEFAULT 'weekly',
    ui_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Program progress (HIGH CP VALUE)
CREATE TABLE program_progress (
    program_id UUID PRIMARY KEY REFERENCES programs(id) ON DELETE CASCADE,
    total_xp_earned INTEGER DEFAULT 0,
    milestone_reached INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_milestone_at TIMESTAMP WITH TIME ZONE,
    perfect_tasks INTEGER DEFAULT 0,
    hints_used INTEGER DEFAULT 0,
    retries_used INTEGER DEFAULT 0
);

-- Program KSA scores (HIGH CP VALUE)
CREATE TABLE program_ksa_scores (
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    ksa_code VARCHAR(50) REFERENCES ksa_competencies(code),
    score DECIMAL(5,2) DEFAULT 0,
    max_possible_score DECIMAL(5,2) DEFAULT 100,
    evaluations_count INTEGER DEFAULT 0,
    last_evaluated_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (program_id, ksa_code)
);

CREATE INDEX idx_program_ksa_scores ON program_ksa_scores(program_id);

-- ========================================
-- Translation System
-- ========================================

CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code),
    content TEXT NOT NULL,
    content_format VARCHAR(20) DEFAULT 'plain' CHECK (content_format IN ('plain', 'markdown', 'html')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected')),
    is_machine_translated BOOLEAN DEFAULT FALSE,
    quality_score DECIMAL(3,2),
    needs_update BOOLEAN DEFAULT FALSE,
    translator_id UUID REFERENCES users(id),
    reviewer_id UUID REFERENCES users(id),
    translated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES translations(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_translation UNIQUE(entity_type, entity_id, field_name, language_code)
);

CREATE INDEX idx_translation_lookup ON translations(entity_type, entity_id, field_name, language_code);
CREATE INDEX idx_translation_language ON translations(language_code);
CREATE INDEX idx_translation_status ON translations(status);
CREATE INDEX idx_translation_needs_update ON translations(needs_update) WHERE needs_update = TRUE;

-- Translation cache
CREATE TABLE translation_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    field_names TEXT[],
    languages TEXT[],
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_entity ON translation_cache(entity_type, entity_id);
CREATE INDEX idx_cache_expiry ON translation_cache(expires_at) WHERE expires_at IS NOT NULL;

-- ========================================
-- Onboarding System Tables
-- ========================================

-- Onboarding flows definition
CREATE TABLE onboarding_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0.0',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    
    -- Multi-language content
    title JSONB NOT NULL, -- {"en": "Welcome to AI Square", "zh": "歡迎來到 AI Square"}
    description JSONB NOT NULL,
    
    -- Flow configuration
    target_audience VARCHAR(50), -- 'student', 'teacher', 'professional', 'general'
    estimated_minutes INTEGER DEFAULT 10,
    
    -- Steps definition
    steps JSONB NOT NULL, -- Array of step definitions
    
    -- Completion rewards
    completion_xp INTEGER DEFAULT 100,
    unlock_features JSONB DEFAULT '[]'::jsonb, -- Features to unlock after completion
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_onboarding_flows_status ON onboarding_flows(status);
CREATE INDEX idx_onboarding_flows_audience ON onboarding_flows(target_audience);

-- User onboarding progress
CREATE TABLE user_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flow_id UUID NOT NULL REFERENCES onboarding_flows(id),
    
    -- Progress tracking
    current_step_index INTEGER DEFAULT 0,
    completed_steps INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
    
    -- User responses/choices
    responses JSONB DEFAULT '{}'::jsonb, -- Store user's answers and preferences
    
    -- Personalization data collected
    interests TEXT[], -- AI domains of interest
    experience_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
    learning_goals JSONB DEFAULT '[]'::jsonb,
    preferred_content_types TEXT[], -- 'video', 'text', 'interactive', 'quiz'
    time_availability VARCHAR(50), -- 'daily', 'weekly', 'weekend'
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(user_id, flow_id)
);

CREATE INDEX idx_user_onboarding_user_status ON user_onboarding_progress(user_id, status);
CREATE INDEX idx_user_onboarding_flow ON user_onboarding_progress(flow_id);

-- Onboarding step interactions
CREATE TABLE onboarding_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progress_id UUID NOT NULL REFERENCES user_onboarding_progress(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    
    -- Interaction details
    interaction_type VARCHAR(50) NOT NULL, -- 'question_answered', 'video_watched', 'skill_selected', etc.
    interaction_data JSONB NOT NULL,
    
    -- Timing
    time_spent_seconds INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_onboarding_interactions_progress ON onboarding_interactions(progress_id, step_index);

-- Recommended learning paths based on onboarding
CREATE TABLE onboarding_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    progress_id UUID REFERENCES user_onboarding_progress(id),
    
    -- Recommendations
    recommended_scenarios JSONB DEFAULT '[]'::jsonb, -- Array of scenario IDs with reasons
    recommended_skills JSONB DEFAULT '[]'::jsonb, -- KSA codes to focus on
    learning_path_type VARCHAR(50), -- 'structured', 'exploratory', 'mixed'
    
    -- Personalization factors
    factors JSONB NOT NULL, -- What factors led to these recommendations
    confidence_score DECIMAL(3,2), -- How confident the system is
    
    -- Usage tracking
    scenarios_started INTEGER DEFAULT 0,
    scenarios_completed INTEGER DEFAULT 0,
    feedback_rating INTEGER, -- 1-5 star rating
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- Recommendations might expire
    
    UNIQUE(user_id)
);

CREATE INDEX idx_onboarding_recommendations_user ON onboarding_recommendations(user_id);

-- ========================================
-- Question Bank System Tables
-- ========================================

-- Questions table - central repository of all questions
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Question categorization
    type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'open_ended', 'coding', 'true_false', 'matching', 'ranking'
    subtype VARCHAR(50), -- 'conceptual', 'analytical', 'practical', 'creative'
    
    -- Domain and difficulty
    domain VARCHAR(100), -- 'ai_fundamentals', 'machine_learning', 'ethics', 'applications'
    subdomain VARCHAR(100), -- More specific categorization
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    
    -- Question content (no language-specific content here)
    code VARCHAR(100) UNIQUE, -- e.g., 'AI_FUND_001' for easy reference
    
    -- Scoring and timing
    points INTEGER DEFAULT 1,
    time_limit_seconds INTEGER, -- NULL means no time limit
    
    -- Features
    hint_available BOOLEAN DEFAULT TRUE,
    explanation_available BOOLEAN DEFAULT TRUE,
    partial_credit_allowed BOOLEAN DEFAULT FALSE,
    randomize_options BOOLEAN DEFAULT TRUE, -- For multiple choice
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2), -- Average success rate
    avg_time_seconds INTEGER, -- Average time to answer
    
    -- Metadata
    tags TEXT[], -- ['beginner-friendly', 'real-world', 'conceptual']
    prerequisites TEXT[], -- Question codes that should be answered first
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'deprecated')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Version control
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES questions(id)
);

-- Indexes for efficient querying
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_domain ON questions(domain, subdomain);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_code ON questions(code);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);

-- Question options for multiple choice questions
CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    
    -- Option details (no language-specific content)
    option_code VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', 'D' or '1', '2', '3', '4'
    is_correct BOOLEAN DEFAULT FALSE,
    partial_credit DECIMAL(3,2) DEFAULT 0, -- 0.0 to 1.0 for partial credit
    
    -- Feedback codes for translations
    feedback_code VARCHAR(100), -- Reference to feedback translation
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Analytics
    selection_count INTEGER DEFAULT 0,
    
    UNIQUE(question_id, option_code)
);

CREATE INDEX idx_options_question ON question_options(question_id);

-- Question KSA mappings (which competencies does this question assess)
CREATE TABLE question_ksa_mappings (
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    ksa_code VARCHAR(50) REFERENCES ksa_competencies(code),
    weight DECIMAL(3,2) DEFAULT 1.0, -- How much this question contributes to the competency
    is_primary BOOLEAN DEFAULT FALSE, -- Primary competency being assessed
    
    PRIMARY KEY (question_id, ksa_code)
);

CREATE INDEX idx_question_ksa_code ON question_ksa_mappings(ksa_code);

-- Enhanced task_questions linking table
CREATE TABLE task_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    
    -- Question context in this task
    position INTEGER NOT NULL, -- Order within the task
    is_required BOOLEAN DEFAULT TRUE,
    
    -- Task-specific overrides
    points_override INTEGER, -- Override default question points
    time_limit_override INTEGER, -- Override default time limit
    
    -- Adaptive settings
    show_if_condition JSONB, -- {"previous_score": ">= 80"} for adaptive questioning
    
    -- Context and scaffolding
    context_code VARCHAR(100), -- Reference to task-specific context translation
    hint_code VARCHAR(100), -- Task-specific hint translation
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(task_id, position)
);

CREATE INDEX idx_task_questions_task ON task_questions(task_id);
CREATE INDEX idx_task_questions_question ON task_questions(question_id);

-- Track how questions perform in different contexts
CREATE TABLE question_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id),
    
    -- Context
    module_type VARCHAR(50) NOT NULL, -- 'pbl', 'assessment', 'discovery'
    scenario_type VARCHAR(50),
    user_segment VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
    
    -- Metrics
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    partial_attempts INTEGER DEFAULT 0,
    avg_time_seconds INTEGER,
    avg_score DECIMAL(5,2),
    
    -- Difficulty analysis
    discrimination_index DECIMAL(3,2), -- How well it discriminates skill levels
    difficulty_index DECIMAL(3,2), -- Actual difficulty based on performance
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(question_id, module_type, user_segment, period_start)
);

CREATE INDEX idx_question_perf_question ON question_performance(question_id);
CREATE INDEX idx_question_perf_period ON question_performance(period_start, period_end);

-- ========================================
-- Helper Functions
-- ========================================

-- Get translation with fallback
CREATE OR REPLACE FUNCTION get_translation(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_field_name VARCHAR,
    p_language_code VARCHAR
) RETURNS TEXT AS $$
DECLARE
    v_content TEXT;
    v_current_lang VARCHAR := p_language_code;
BEGIN
    -- Try cache first
    SELECT data->p_field_name->>p_language_code INTO v_content
    FROM translation_cache
    WHERE entity_type = p_entity_type 
      AND entity_id = p_entity_id
      AND p_field_name = ANY(field_names)
      AND p_language_code = ANY(languages)
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
    
    IF v_content IS NOT NULL THEN
        RETURN v_content;
    END IF;
    
    -- Try direct translation
    LOOP
        SELECT content INTO v_content
        FROM translations
        WHERE entity_type = p_entity_type
          AND entity_id = p_entity_id
          AND field_name = p_field_name
          AND language_code = v_current_lang
          AND status = 'approved';
        
        IF v_content IS NOT NULL THEN
            RETURN v_content;
        END IF;
        
        -- Get fallback language
        SELECT fallback_language INTO v_current_lang
        FROM languages
        WHERE code = v_current_lang;
        
        EXIT WHEN v_current_lang IS NULL;
    END LOOP;
    
    -- Final fallback to English
    SELECT content INTO v_content
    FROM translations
    WHERE entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND field_name = p_field_name
      AND language_code = 'en';
    
    RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- Function to complete onboarding
CREATE OR REPLACE FUNCTION complete_onboarding()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Update user's onboarding status
        UPDATE users 
        SET 
            onboarding_completed = TRUE,
            learning_preferences = learning_preferences || jsonb_build_object(
                'interests', NEW.interests,
                'experience_level', NEW.experience_level,
                'learning_goals', NEW.learning_goals,
                'preferred_content_types', NEW.preferred_content_types
            ),
            total_xp = total_xp + (SELECT completion_xp FROM onboarding_flows WHERE id = NEW.flow_id)
        WHERE id = NEW.user_id;
        
        -- Generate recommendations
        INSERT INTO onboarding_recommendations (user_id, progress_id, factors, confidence_score)
        VALUES (
            NEW.user_id,
            NEW.id,
            jsonb_build_object(
                'interests', NEW.interests,
                'experience_level', NEW.experience_level,
                'goals', NEW.learning_goals
            ),
            0.85
        )
        ON CONFLICT (user_id) DO UPDATE
        SET 
            progress_id = NEW.id,
            factors = EXCLUDED.factors,
            created_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get suitable questions for a task
CREATE OR REPLACE FUNCTION get_questions_for_task(
    p_domain VARCHAR,
    p_difficulty VARCHAR,
    p_ksa_codes TEXT[],
    p_exclude_ids UUID[],
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    question_id UUID,
    code VARCHAR,
    type VARCHAR,
    match_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.code,
        q.type,
        (
            CASE WHEN q.domain = p_domain THEN 0.3 ELSE 0 END +
            CASE WHEN q.difficulty = p_difficulty THEN 0.3 ELSE 0 END +
            COALESCE(
                (SELECT SUM(0.4 / array_length(p_ksa_codes, 1))
                 FROM question_ksa_mappings qkm 
                 WHERE qkm.question_id = q.id 
                 AND qkm.ksa_code = ANY(p_ksa_codes)), 
                0
            )
        )::DECIMAL as match_score
    FROM questions q
    WHERE q.status = 'active'
    AND (p_exclude_ids IS NULL OR q.id != ALL(p_exclude_ids))
    ORDER BY match_score DESC, q.usage_count ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Performance Views
-- ========================================

-- User leaderboard
CREATE VIEW v_user_leaderboard AS
SELECT 
    u.id,
    u.name,
    u.level,
    u.total_xp,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'completed') as programs_completed,
    COUNT(DISTINCT ua.achievement_id) as achievements_earned,
    RANK() OVER (ORDER BY u.total_xp DESC) as xp_rank
FROM users u
LEFT JOIN programs p ON u.id = p.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
WHERE u.onboarding_completed = TRUE
GROUP BY u.id, u.name, u.level, u.total_xp;

-- AI cost summary
CREATE VIEW v_ai_cost_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as usage_date,
    provider,
    model,
    feature,
    COUNT(*) as request_count,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost_usd) as total_cost_usd,
    AVG(response_time_ms) as avg_response_time_ms
FROM ai_usage
GROUP BY DATE_TRUNC('day', created_at), provider, model, feature;

-- Onboarding funnel analysis
CREATE VIEW onboarding_funnel AS
SELECT 
    of.id as flow_id,
    of.name as flow_name,
    COUNT(DISTINCT uop.user_id) as users_started,
    COUNT(DISTINCT CASE WHEN uop.status = 'completed' THEN uop.user_id END) as users_completed,
    COUNT(DISTINCT CASE WHEN uop.status = 'skipped' THEN uop.user_id END) as users_skipped,
    AVG(CASE WHEN uop.status = 'completed' THEN uop.completed_steps END) as avg_steps_completed,
    AVG(EXTRACT(EPOCH FROM (uop.completed_at - uop.started_at))/60) as avg_completion_minutes
FROM onboarding_flows of
LEFT JOIN user_onboarding_progress uop ON of.id = uop.flow_id
GROUP BY of.id, of.name;

-- Question statistics view
CREATE VIEW v_question_statistics AS
SELECT 
    q.id,
    q.code,
    q.type,
    q.domain,
    q.difficulty,
    q.status,
    q.usage_count,
    q.success_rate,
    COUNT(DISTINCT tq.task_id) as task_count,
    COUNT(DISTINCT qkm.ksa_code) as ksa_count,
    COUNT(DISTINCT qo.id) as option_count,
    AVG(qp.difficulty_index) as actual_difficulty
FROM questions q
LEFT JOIN task_questions tq ON q.id = tq.question_id
LEFT JOIN question_ksa_mappings qkm ON q.id = qkm.question_id
LEFT JOIN question_options qo ON q.id = qo.question_id
LEFT JOIN question_performance qp ON q.id = qp.question_id
GROUP BY q.id;

-- ========================================
-- Triggers
-- ========================================

-- Update timestamp trigger
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

CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON translations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_languages_updated_at BEFORE UPDATE ON languages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ksa_competencies_updated_at BEFORE UPDATE ON ksa_competencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_flows_updated_at BEFORE UPDATE ON onboarding_flows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Invalidate cache on translation update
CREATE OR REPLACE FUNCTION invalidate_translation_cache()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM translation_cache
    WHERE entity_type = NEW.entity_type
      AND entity_id = NEW.entity_id
      AND NEW.field_name = ANY(field_names);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invalidate_cache_on_translation_change
    AFTER INSERT OR UPDATE OR DELETE ON translations
    FOR EACH ROW EXECUTE FUNCTION invalidate_translation_cache();

-- Update AI usage daily aggregation
CREATE OR REPLACE FUNCTION update_ai_usage_daily()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ai_usage_daily (
        user_id, 
        usage_date, 
        total_tokens,
        total_cost_usd,
        chat_tokens,
        evaluation_tokens,
        translation_tokens
    )
    VALUES (
        NEW.user_id,
        DATE(NEW.created_at),
        NEW.total_tokens,
        NEW.estimated_cost_usd,
        CASE WHEN NEW.feature = 'chat' THEN NEW.total_tokens ELSE 0 END,
        CASE WHEN NEW.feature = 'evaluation' THEN NEW.total_tokens ELSE 0 END,
        CASE WHEN NEW.feature = 'translation' THEN NEW.total_tokens ELSE 0 END
    )
    ON CONFLICT (user_id, usage_date) DO UPDATE SET
        total_tokens = ai_usage_daily.total_tokens + NEW.total_tokens,
        total_cost_usd = ai_usage_daily.total_cost_usd + NEW.estimated_cost_usd,
        chat_tokens = ai_usage_daily.chat_tokens + CASE WHEN NEW.feature = 'chat' THEN NEW.total_tokens ELSE 0 END,
        evaluation_tokens = ai_usage_daily.evaluation_tokens + CASE WHEN NEW.feature = 'evaluation' THEN NEW.total_tokens ELSE 0 END,
        translation_tokens = ai_usage_daily.translation_tokens + CASE WHEN NEW.feature = 'translation' THEN NEW.total_tokens ELSE 0 END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_usage_daily_on_insert
    AFTER INSERT ON ai_usage
    FOR EACH ROW 
    WHEN (NEW.user_id IS NOT NULL)
    EXECUTE FUNCTION update_ai_usage_daily();

-- Complete onboarding trigger
CREATE TRIGGER trigger_complete_onboarding
    AFTER UPDATE OF status ON user_onboarding_progress
    FOR EACH ROW EXECUTE FUNCTION complete_onboarding();

-- Update question usage count
CREATE OR REPLACE FUNCTION update_question_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE questions 
    SET usage_count = usage_count + 1
    WHERE id = NEW.question_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_usage_on_task_question
    AFTER INSERT ON task_questions
    FOR EACH ROW EXECUTE FUNCTION update_question_usage();

-- ========================================
-- Initial Data
-- ========================================

-- Insert some core achievements
INSERT INTO achievements (code, achievement_type, xp_reward, icon_url, unlock_criteria) VALUES
('first_scenario', 'milestone', 50, '/icons/achievements/first_scenario.png', '{"scenarios_completed": 1}'::jsonb),
('speed_learner', 'performance', 100, '/icons/achievements/speed_learner.png', '{"complete_under_minutes": 30}'::jsonb),
('perfect_score', 'mastery', 150, '/icons/achievements/perfect_score.png', '{"score": 100}'::jsonb),
('ai_explorer', 'exploration', 200, '/icons/achievements/ai_explorer.png', '{"unique_scenarios": 10}'::jsonb);

-- Insert sample KSA competencies
INSERT INTO ksa_competencies (code, type, domain, level, order_index) VALUES
('K1', 'knowledge', 'ai_fundamentals', 1, 1),
('K1.1', 'knowledge', 'ai_fundamentals', 2, 1),
('K1.2', 'knowledge', 'ai_fundamentals', 2, 2),
('S1', 'skill', 'ai_application', 1, 1),
('S1.1', 'skill', 'ai_application', 2, 1),
('A1', 'attitude', 'ai_ethics', 1, 1),
('A1.1', 'attitude', 'ai_ethics', 2, 1);

-- Insert a default onboarding flow
INSERT INTO onboarding_flows (name, title, description, target_audience, estimated_minutes, steps, completion_xp) VALUES (
    'default_onboarding',
    '{"en": "Welcome to AI Square", "zh": "歡迎來到 AI Square"}'::jsonb,
    '{"en": "Let us personalize your AI learning journey", "zh": "讓我們為您個性化 AI 學習之旅"}'::jsonb,
    'general',
    10,
    '[
        {
            "index": 0,
            "type": "welcome",
            "title": {"en": "Welcome!", "zh": "歡迎！"},
            "content": {"en": "Start your AI learning journey", "zh": "開始您的 AI 學習之旅"}
        },
        {
            "index": 1,
            "type": "survey",
            "title": {"en": "Tell us about yourself", "zh": "告訴我們關於您"},
            "questions": [
                {
                    "id": "experience",
                    "type": "single_choice",
                    "question": {"en": "What is your AI experience level?", "zh": "您的 AI 經驗水平如何？"},
                    "options": ["beginner", "intermediate", "advanced"]
                }
            ]
        }
    ]'::jsonb,
    100
);

-- Sample questions
INSERT INTO questions (code, type, domain, difficulty, points) VALUES
('AI_FUND_001', 'multiple_choice', 'ai_fundamentals', 'beginner', 1),
('ML_CONCEPT_001', 'open_ended', 'machine_learning', 'intermediate', 2),
('ETHICS_CASE_001', 'open_ended', 'ethics', 'advanced', 3),
('PYTHON_CODE_001', 'coding', 'applications', 'intermediate', 5);

-- ========================================
-- Success Message
-- ========================================
DO $$
BEGIN
    RAISE NOTICE 'AI Square consolidated database schema (v3.5.1) created successfully!';
    RAISE NOTICE 'Includes: Core tables, Onboarding system, Question bank, Translation system';
    RAISE NOTICE 'High CP-value fields extracted: interactions, AI usage, achievements, domains, KSA mappings';
    RAISE NOTICE 'This is the primary schema file - all other versions have been deprecated';
END $$;