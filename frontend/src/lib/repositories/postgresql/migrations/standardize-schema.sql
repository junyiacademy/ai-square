-- Migration: Standardize schema for three learning modes
-- Purpose: Ensure PBL, Discovery, and Assessment modes use consistent database fields

-- ============================================
-- 1. Add source_ref to scenarios for content tracking
-- ============================================
ALTER TABLE scenarios 
ADD COLUMN IF NOT EXISTS source_ref JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN scenarios.source_ref IS 'Content source reference: {type: "yaml"|"api"|"ai-generated", path?: string, sourceId?: string, metadata: {}}';

-- ============================================
-- 2. Add basic fields to scenarios (multi-language support)
-- ============================================
ALTER TABLE scenarios 
ADD COLUMN IF NOT EXISTS title JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS description JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS objectives JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN scenarios.title IS 'Multi-language title: {"en": "Title", "zh": "標題", ...}';
COMMENT ON COLUMN scenarios.description IS 'Multi-language description: {"en": "Description", "zh": "描述", ...}';
COMMENT ON COLUMN scenarios.objectives IS 'Learning objectives array';

-- ============================================
-- 3. Standardize timestamp fields
-- ============================================
-- Fix programs table: use started_at instead of start_time
ALTER TABLE programs 
DROP COLUMN IF EXISTS start_time CASCADE;

-- Rename end_time to completed_at for consistency
ALTER TABLE programs 
RENAME COLUMN end_time TO completed_at;

-- ============================================
-- 4. Add constraints for task types
-- ============================================
-- Create a custom type for task types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type_enum') THEN
        CREATE TYPE task_type_enum AS ENUM (
            -- Common types
            'interactive',
            'reflection',
            -- PBL types
            'chat',
            'creation',
            'analysis',
            -- Assessment types
            'question',
            'assessment',
            'quiz',
            -- Discovery types
            'exploration',
            'experiment',
            'challenge'
        );
    END IF;
END $$;

-- Update the column type (requires type casting)
ALTER TABLE tasks 
ALTER COLUMN type TYPE task_type_enum USING type::task_type_enum;

-- ============================================
-- 5. Add multi-dimensional evaluation support
-- ============================================
ALTER TABLE evaluations 
ADD COLUMN IF NOT EXISTS dimensions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN evaluations.dimensions IS 'Multi-dimensional scores: [{dimension: string, score: number, maxScore: number, feedback?: string}]';

-- ============================================
-- 6. Add mode-specific extension tables (optional)
-- ============================================

-- Discovery-specific career exploration data
CREATE TABLE IF NOT EXISTS discovery_career_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    career_type VARCHAR(100) NOT NULL,
    skill_focus JSONB DEFAULT '[]'::jsonb,
    industry_tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scenario_id)
);

-- Assessment-specific configuration
CREATE TABLE IF NOT EXISTS assessment_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    question_bank JSONB DEFAULT '[]'::jsonb,
    scoring_rubric JSONB DEFAULT '{}'::jsonb,
    time_limits JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scenario_id)
);

-- PBL-specific task templates
CREATE TABLE IF NOT EXISTS pbl_task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    task_order INTEGER NOT NULL,
    template_data JSONB NOT NULL,
    ksa_focus JSONB DEFAULT '{}'::jsonb,
    ai_modules JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scenario_id, task_order)
);

-- ============================================
-- 7. Create unified views for each mode
-- ============================================

-- Unified scenario view with proper source tracking
CREATE OR REPLACE VIEW scenarios_with_source AS
SELECT 
    s.*,
    COALESCE(s.source_ref->>'type', 'yaml') as source_type,
    s.source_ref->>'path' as source_path,
    s.source_ref->>'sourceId' as source_id,
    COALESCE(s.title->>'en', s.metadata->>'title') as title_en,
    COALESCE(s.description->>'en', s.metadata->>'description') as description_en
FROM scenarios s;

-- Mode-specific views
CREATE OR REPLACE VIEW pbl_scenarios AS
SELECT s.*, p.* 
FROM scenarios_with_source s
LEFT JOIN pbl_task_templates p ON s.id = p.scenario_id
WHERE s.type = 'pbl';

CREATE OR REPLACE VIEW discovery_scenarios AS
SELECT s.*, d.*
FROM scenarios_with_source s
LEFT JOIN discovery_career_mappings d ON s.id = d.scenario_id
WHERE s.type = 'discovery';

CREATE OR REPLACE VIEW assessment_scenarios AS
SELECT s.*, a.*
FROM scenarios_with_source s
LEFT JOIN assessment_configurations a ON s.id = a.scenario_id
WHERE s.type = 'assessment';

-- ============================================
-- 8. Add indexes for new columns
-- ============================================
CREATE INDEX idx_scenarios_source_type ON scenarios((source_ref->>'type'));
CREATE INDEX idx_scenarios_title_en ON scenarios((title->>'en'));
CREATE INDEX idx_discovery_career_type ON discovery_career_mappings(career_type);

-- ============================================
-- 9. Data migration helpers
-- ============================================

-- Migrate existing metadata to new columns
UPDATE scenarios 
SET 
    title = CASE 
        WHEN metadata->>'title' IS NOT NULL 
        THEN jsonb_build_object('en', metadata->>'title')
        ELSE '{}'::jsonb
    END,
    description = CASE 
        WHEN metadata->>'description' IS NOT NULL 
        THEN jsonb_build_object('en', metadata->>'description')
        ELSE '{}'::jsonb
    END,
    source_ref = CASE
        WHEN type = 'pbl' THEN jsonb_build_object(
            'type', 'yaml',
            'path', COALESCE(metadata->>'yamlPath', 'pbl_data/unknown.yaml'),
            'metadata', jsonb_build_object('yamlId', id)
        )
        WHEN type = 'discovery' THEN jsonb_build_object(
            'type', 'yaml',
            'path', COALESCE(metadata->>'yamlPath', 'discovery_data/unknown.yaml'),
            'metadata', jsonb_build_object('careerType', metadata->>'careerType')
        )
        WHEN type = 'assessment' THEN jsonb_build_object(
            'type', 'yaml',
            'sourceId', COALESCE(metadata->>'assessmentId', 'assessment-unknown'),
            'metadata', jsonb_build_object('folderName', metadata->>'folderName')
        )
        ELSE '{}'::jsonb
    END
WHERE source_ref = '{}'::jsonb;

-- ============================================
-- 10. Validation queries
-- ============================================

-- Check for consistency across modes
SELECT 
    type,
    COUNT(*) as count,
    COUNT(CASE WHEN source_ref != '{}'::jsonb THEN 1 END) as has_source_ref,
    COUNT(CASE WHEN title != '{}'::jsonb THEN 1 END) as has_title,
    COUNT(CASE WHEN description != '{}'::jsonb THEN 1 END) as has_description
FROM scenarios
GROUP BY type;