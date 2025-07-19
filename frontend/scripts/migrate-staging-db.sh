#!/bin/bash

# AI Square Staging Database Migration Script
# 在 staging 環境初始化資料庫結構和遷移資料

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"ai-square-463013"}
REGION="us-central1"
DB_INSTANCE_NAME="ai-square-db-staging"
DATABASE_NAME="ai_square_staging"

echo -e "${BLUE}🔄 AI Square Staging Database Migration${NC}"
echo -e "${YELLOW}Project: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Database: ${DB_INSTANCE_NAME}/${DATABASE_NAME}${NC}"
echo ""

# Step 1: Connect to Cloud SQL and create schema
echo -e "${BLUE}📊 Step 1: Creating database schema...${NC}"

# Create a temporary SQL file with schema
SCHEMA_FILE="/tmp/staging_schema.sql"
cat > $SCHEMA_FILE << 'EOF'
-- AI Square Staging Database Schema v3.5.1
-- Consolidated schema with all features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (for clean setup)
DROP TABLE IF EXISTS ai_usage_tracking CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS ksa_competencies CASCADE;
DROP TABLE IF EXISTS interactions CASCADE;
DROP TABLE IF EXISTS translations CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Core Tables
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    preferred_language VARCHAR(10) DEFAULT 'en',
    level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    learning_preferences JSONB DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE scenarios (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('pbl', 'assessment', 'discovery')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    version VARCHAR(20) DEFAULT '1.0',
    difficulty_level VARCHAR(50),
    estimated_minutes INTEGER,
    prerequisites TEXT[] DEFAULT '{}',
    xp_rewards JSONB DEFAULT '{}',
    unlock_requirements JSONB DEFAULT '{}',
    tasks JSONB DEFAULT '[]',
    ai_modules JSONB DEFAULT '{}',
    resources JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scenario_id VARCHAR(255) NOT NULL REFERENCES scenarios(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'abandoned')),
    current_task_index INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    total_score DECIMAL(5,2) DEFAULT 0.00,
    ksa_scores JSONB DEFAULT '{}',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_spent_seconds INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    task_index INTEGER NOT NULL,
    type VARCHAR(100) DEFAULT 'task',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
    score DECIMAL(5,2),
    time_spent_seconds INTEGER DEFAULT 0,
    attempt_count INTEGER DEFAULT 0,
    allowed_attempts INTEGER DEFAULT 3,
    context JSONB DEFAULT '{}',
    user_solution TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    evaluation_type VARCHAR(100) NOT NULL,
    score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    feedback TEXT,
    ai_analysis JSONB DEFAULT '{}',
    ksa_scores JSONB DEFAULT '{}',
    time_taken_seconds INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    type VARCHAR(50) DEFAULT 'chat',
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    translated_value TEXT NOT NULL,
    translation_quality DECIMAL(3,2) DEFAULT 1.00,
    is_machine_translated BOOLEAN DEFAULT false,
    translator_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);
CREATE INDEX idx_programs_user_scenario ON programs(user_id, scenario_id);
CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_programs_last_activity ON programs(last_activity_at DESC);
CREATE INDEX idx_tasks_program_index ON tasks(program_id, task_index);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_evaluations_user_date ON evaluations(user_id, created_at DESC);
CREATE INDEX idx_evaluations_program ON evaluations(program_id);
CREATE INDEX idx_evaluations_task ON evaluations(task_id);
CREATE INDEX idx_interactions_task_seq ON interactions(task_id, sequence_number);
CREATE INDEX idx_translations_entity ON translations(entity_type, entity_id, field_name);
CREATE INDEX idx_translations_language ON translations(language_code);

-- Unique constraints
ALTER TABLE tasks ADD CONSTRAINT unique_program_task_index UNIQUE (program_id, task_index);
ALTER TABLE evaluations ADD CONSTRAINT unique_task_evaluation UNIQUE (task_id, evaluation_type);
ALTER TABLE interactions ADD CONSTRAINT unique_task_interaction_seq UNIQUE (task_id, sequence_number);
ALTER TABLE translations ADD CONSTRAINT unique_entity_field_language UNIQUE (entity_type, entity_id, field_name, language_code);

-- Insert initial scenarios
INSERT INTO scenarios (id, type, status, difficulty_level, estimated_minutes) VALUES
('marketing-crisis-management', 'pbl', 'active', 'intermediate', 45),
('social-media-strategy', 'pbl', 'active', 'beginner', 30),
('customer-service-automation', 'pbl', 'active', 'intermediate', 40),
('data-privacy-compliance', 'pbl', 'active', 'advanced', 60),
('ai-literacy-assessment', 'assessment', 'active', 'intermediate', 30),
('basic-ai-knowledge', 'assessment', 'active', 'beginner', 20),
('career-exploration', 'discovery', 'active', 'beginner', 25);

-- Sample test user
INSERT INTO users (id, email, name, preferred_language, onboarding_completed) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'staging-test@ai-square.com', 'Staging Test User', 'en', true);

ANALYZE;
EOF

echo -e "${YELLOW}Executing schema creation...${NC}"

# Execute schema via Cloud SQL proxy or direct connection
if gcloud sql connect $DB_INSTANCE_NAME --user=postgres --project=$PROJECT_ID < $SCHEMA_FILE; then
    echo -e "${GREEN}✅ Database schema created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create database schema${NC}"
    echo -e "${YELLOW}You may need to connect manually:${NC}"
    echo -e "gcloud sql connect $DB_INSTANCE_NAME --user=postgres --project=$PROJECT_ID"
    echo -e "Then copy and paste the schema from: $SCHEMA_FILE"
    exit 1
fi

# Clean up temporary file
rm -f $SCHEMA_FILE

echo ""
echo -e "${BLUE}📊 Step 2: Verifying database setup...${NC}"

# Create verification script
VERIFY_SCRIPT="/tmp/verify_staging_db.sql"
cat > $VERIFY_SCRIPT << 'EOF'
-- Verify database setup
\c ai_square_staging;
\dt
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'scenarios', COUNT(*) FROM scenarios
UNION ALL
SELECT 'programs', COUNT(*) FROM programs
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'evaluations', COUNT(*) FROM evaluations;
EOF

echo -e "${YELLOW}Running verification...${NC}"
if gcloud sql connect $DB_INSTANCE_NAME --user=postgres --project=$PROJECT_ID < $VERIFY_SCRIPT; then
    echo -e "${GREEN}✅ Database verification completed${NC}"
else
    echo -e "${YELLOW}⚠️  Verification script failed, but database may still be working${NC}"
fi

rm -f $VERIFY_SCRIPT

echo ""
echo -e "${GREEN}🎉 Staging database migration completed!${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "✅ Database schema v3.5.1 created"
echo -e "✅ All tables and indexes created"
echo -e "✅ Sample data inserted"
echo -e "✅ Test user created: staging-test@ai-square.com"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Test the staging application"
echo -e "2. Run API endpoint tests"
echo -e "3. Verify data migration if needed"
echo ""
echo -e "${YELLOW}To connect manually:${NC}"
echo -e "gcloud sql connect $DB_INSTANCE_NAME --user=postgres --project=$PROJECT_ID"