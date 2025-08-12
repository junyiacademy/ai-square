-- AI Square Unified Schema V4
-- Purpose: Complete schema with authentication support
-- Changes from V3: Added authentication fields to users table
-- Date: 2025-01-12

-- For production/staging, we use CREATE IF NOT EXISTS pattern
CREATE SCHEMA IF NOT EXISTS public;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Type Definitions
-- ============================================

-- Learning mode types
DO $$ BEGIN
    CREATE TYPE learning_mode AS ENUM ('pbl', 'discovery', 'assessment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Status types
DO $$ BEGIN
    CREATE TYPE scenario_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE program_status AS ENUM ('pending', 'active', 'completed', 'abandoned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'active', 'completed', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Task types (unified across all modes)
DO $$ BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Source types
DO $$ BEGIN
    CREATE TYPE source_type AS ENUM ('yaml', 'api', 'ai-generated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Evaluation types
DO $$ BEGIN
    CREATE TYPE evaluation_type AS ENUM ('formative', 'summative', 'diagnostic', 'ai-feedback');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Achievement types
DO $$ BEGIN
    CREATE TYPE achievement_type AS ENUM ('milestone', 'badge', 'certificate', 'skill');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Users Table (with authentication - NEW in V4)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    
    -- Authentication fields (NEW in V4)
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'student',
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    account_status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Profile fields
    preferred_language VARCHAR(10) DEFAULT 'en',
    avatar_url TEXT,
    bio TEXT,
    
    -- Learning progress
    level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    
    -- Settings
    onboarding_completed BOOLEAN DEFAULT false,
    notification_settings JSONB DEFAULT '{"email": true, "push": false}'::jsonb,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints (NEW in V4)
    CONSTRAINT valid_role CHECK (role IN ('student', 'teacher', 'admin', 'parent', 'guest')),
    CONSTRAINT valid_account_status CHECK (account_status IN ('active', 'suspended', 'deleted', 'pending'))
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_date);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);

-- ============================================
-- Auth Sessions Table (NEW in V4)
-- ============================================

CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);

-- ============================================
-- Scenarios Table
-- ============================================

CREATE TABLE IF NOT EXISTS scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mode learning_mode NOT NULL,
    status scenario_status DEFAULT 'draft',
    
    -- Source tracking
    source_type source_type DEFAULT 'yaml',
    source_path TEXT,
    source_id VARCHAR(255),
    source_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Content (multilingual)
    title JSONB NOT NULL,
    description JSONB NOT NULL,
    objectives JSONB DEFAULT '[]'::jsonb,
    prerequisites JSONB DEFAULT '[]'::jsonb,
    
    -- Task templates
    task_templates JSONB DEFAULT '[]'::jsonb,
    
    -- Mode-specific data
    pbl_data JSONB DEFAULT '{}'::jsonb,
    discovery_data JSONB DEFAULT '{}'::jsonb,
    assessment_data JSONB DEFAULT '{}'::jsonb,
    
    -- AI configuration
    ai_modules JSONB DEFAULT '[]'::jsonb,
    ai_config JSONB DEFAULT '{}'::jsonb,
    
    -- Resources and metadata
    resources JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Statistics
    enrolled_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2),
    avg_completion_time INTEGER, -- in minutes
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for scenarios
CREATE INDEX IF NOT EXISTS idx_scenarios_mode ON scenarios(mode);
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios(status);
CREATE INDEX IF NOT EXISTS idx_scenarios_source ON scenarios(source_type, source_path);
CREATE INDEX IF NOT EXISTS idx_scenarios_created_at ON scenarios(created_at);
CREATE INDEX IF NOT EXISTS idx_scenarios_published_at ON scenarios(published_at);

-- ============================================
-- Programs Table (User's instance of a scenario)
-- ============================================

CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mode learning_mode NOT NULL, -- Denormalized for performance
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Status tracking
    status program_status DEFAULT 'pending',
    current_task_index INTEGER DEFAULT 0,
    
    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    
    -- Scoring
    total_score DECIMAL(5,2) DEFAULT 0,
    max_possible_score DECIMAL(5,2) DEFAULT 100,
    
    -- Time tracking
    time_spent_seconds INTEGER DEFAULT 0,
    estimated_time_remaining INTEGER, -- in seconds
    
    -- AI interaction data
    ai_interactions JSONB DEFAULT '[]'::jsonb,
    ai_feedback JSONB DEFAULT '{}'::jsonb,
    
    -- Learning outcomes
    learning_outcomes JSONB DEFAULT '{}'::jsonb,
    competencies_gained JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE -- For time-limited programs
);

-- Indexes for programs
CREATE INDEX IF NOT EXISTS idx_programs_mode ON programs(mode);
CREATE INDEX IF NOT EXISTS idx_programs_scenario_id ON programs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_programs_user_id ON programs(user_id);
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);
CREATE INDEX IF NOT EXISTS idx_programs_created_at ON programs(created_at);
CREATE INDEX IF NOT EXISTS idx_programs_completed_at ON programs(completed_at);

-- ============================================
-- Tasks Table
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mode learning_mode NOT NULL, -- Denormalized for performance
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    
    -- Task definition
    type task_type NOT NULL,
    status task_status DEFAULT 'pending',
    task_index INTEGER NOT NULL, -- Order within program
    
    -- Content (multilingual)
    title JSONB,
    instructions JSONB,
    content JSONB DEFAULT '{}'::jsonb, -- Flexible content structure
    
    -- Context and configuration
    context JSONB DEFAULT '{}'::jsonb,
    config JSONB DEFAULT '{}'::jsonb,
    
    -- User interactions
    interactions JSONB DEFAULT '[]'::jsonb,
    user_response JSONB,
    
    -- Scoring
    score DECIMAL(5,2),
    max_score DECIMAL(5,2) DEFAULT 10,
    attempts INTEGER DEFAULT 0,
    
    -- Time tracking
    time_spent_seconds INTEGER DEFAULT 0,
    time_limit_seconds INTEGER, -- Optional time limit
    
    -- AI data
    ai_feedback JSONB,
    ai_evaluation JSONB,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_mode ON tasks(mode);
CREATE INDEX IF NOT EXISTS idx_tasks_program_id ON tasks(program_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- ============================================
-- Evaluations Table
-- ============================================

CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mode learning_mode NOT NULL, -- Denormalized for performance
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Evaluation details
    evaluation_type evaluation_type NOT NULL,
    
    -- Scoring
    score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    percentage DECIMAL(5,2),
    
    -- Feedback
    feedback TEXT,
    detailed_feedback JSONB DEFAULT '{}'::jsonb,
    
    -- Rubric/Criteria
    criteria JSONB DEFAULT '[]'::jsonb,
    rubric JSONB DEFAULT '{}'::jsonb,
    
    -- AI evaluation
    ai_config JSONB DEFAULT '{}'::jsonb,
    ai_response JSONB,
    ai_confidence DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Competencies assessed
    competencies_assessed JSONB DEFAULT '[]'::jsonb,
    skills_demonstrated JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for evaluations
CREATE INDEX IF NOT EXISTS idx_evaluations_mode ON evaluations(mode);
CREATE INDEX IF NOT EXISTS idx_evaluations_task_id ON evaluations(task_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_program_id ON evaluations(program_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_type ON evaluations(evaluation_type);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at);

-- ============================================
-- Achievements Table
-- ============================================

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Achievement details
    type achievement_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Related entities
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
    
    -- Progress
    progress INTEGER DEFAULT 0,
    target INTEGER DEFAULT 100,
    completed BOOLEAN DEFAULT false,
    
    -- Rewards
    xp_reward INTEGER DEFAULT 0,
    badge_icon TEXT,
    certificate_url TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    achieved_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for achievements
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);
CREATE INDEX IF NOT EXISTS idx_achievements_completed ON achievements(completed);
CREATE INDEX IF NOT EXISTS idx_achievements_created_at ON achievements(created_at);

-- ============================================
-- System Configuration Table
-- ============================================

CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert schema version
INSERT INTO system_config (key, value, description) 
VALUES ('schema_version', 'v4', 'Database schema version')
ON CONFLICT (key) DO UPDATE SET value = 'v4', updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Triggers for mode propagation
-- ============================================

-- Trigger to copy mode from scenario to program
CREATE OR REPLACE FUNCTION propagate_scenario_mode_to_program()
RETURNS TRIGGER AS $$
BEGIN
    NEW.mode = (SELECT mode FROM scenarios WHERE id = NEW.scenario_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_propagate_scenario_mode ON programs;
CREATE TRIGGER trigger_propagate_scenario_mode
    BEFORE INSERT OR UPDATE ON programs
    FOR EACH ROW
    EXECUTE FUNCTION propagate_scenario_mode_to_program();

-- Trigger to copy mode from program to task
CREATE OR REPLACE FUNCTION propagate_program_mode_to_task()
RETURNS TRIGGER AS $$
BEGIN
    NEW.mode = (SELECT mode FROM programs WHERE id = NEW.program_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_propagate_program_mode ON tasks;
CREATE TRIGGER trigger_propagate_program_mode
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION propagate_program_mode_to_task();

-- Trigger to copy mode from task to evaluation
CREATE OR REPLACE FUNCTION propagate_mode_to_evaluation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.task_id IS NOT NULL THEN
        NEW.mode = (SELECT mode FROM tasks WHERE id = NEW.task_id);
    ELSIF NEW.program_id IS NOT NULL THEN
        NEW.mode = (SELECT mode FROM programs WHERE id = NEW.program_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_propagate_mode_to_evaluation ON evaluations;
CREATE TRIGGER trigger_propagate_mode_to_evaluation
    BEFORE INSERT OR UPDATE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION propagate_mode_to_evaluation();

-- ============================================
-- Update timestamps trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Insert Demo Users (with passwords)
-- ============================================

-- Demo users with hashed passwords (password: role+123)
-- student@example.com: student123
-- teacher@example.com: teacher123
-- admin@example.com: admin123

INSERT INTO users (id, email, name, password_hash, role, email_verified, email_verified_at, preferred_language, level, total_xp, onboarding_completed, metadata) VALUES
(gen_random_uuid(), 'student@example.com', 'Student User', 
 '$2b$10$GSLI4.ooV/jrN5RZMOAyf.SftBwwRsbmC.SMRDeDRLH1uCnIapR5e', 
 'student', true, CURRENT_TIMESTAMP, 'en', 1, 0, false, 
 '{"description": "Demo student account"}'::jsonb),
(gen_random_uuid(), 'teacher@example.com', 'Teacher User', 
 '$2b$10$xkTFHLjtA4BvhZrW8Pm6NOV/zJn5SX7gxZB9MSUcaptGrZrMPJJ5e',
 'teacher', true, CURRENT_TIMESTAMP, 'en', 1, 0, false, 
 '{"description": "Demo teacher account"}'::jsonb),
(gen_random_uuid(), 'admin@example.com', 'Admin User', 
 '$2b$10$9nEfXi5LULvFjV/LKp8WFuglp9Y5jttH9O4Ix0AwpVg4OZdvtTbiS',
 'admin', true, CURRENT_TIMESTAMP, 'en', 1, 0, false, 
 '{"description": "Demo admin account"}'::jsonb)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- Grant permissions (if needed)
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres;

-- Grant all privileges on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;

-- Grant all privileges on all sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ============================================
-- Schema V4 Complete
-- ============================================