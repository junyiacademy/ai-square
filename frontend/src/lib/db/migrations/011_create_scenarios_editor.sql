-- Migration: Create scenarios_editor table for WYSIWYG editor
-- Description: Stores scenario data for the WYSIWYG editor with JSON content

-- Create scenarios_editor table
CREATE TABLE IF NOT EXISTS scenarios_editor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id VARCHAR(255) UNIQUE NOT NULL,
  mode VARCHAR(50) NOT NULL CHECK (mode IN ('pbl', 'discovery', 'assessment')),
  title JSONB NOT NULL DEFAULT '{"en": "", "zh": ""}',
  description JSONB NOT NULL DEFAULT '{"en": "", "zh": ""}',

  -- Complete scenario content as JSON
  content JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  tags TEXT[] DEFAULT '{}',
  difficulty VARCHAR(50) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_time INTEGER, -- in minutes

  -- Sync tracking
  yml_path TEXT,
  yml_hash VARCHAR(64),
  last_yml_sync TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  CONSTRAINT scenario_id_unique UNIQUE (scenario_id)
);

-- Create indexes
CREATE INDEX idx_scenarios_editor_mode ON scenarios_editor(mode);
CREATE INDEX idx_scenarios_editor_status ON scenarios_editor(status);
CREATE INDEX idx_scenarios_editor_created_at ON scenarios_editor(created_at DESC);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_scenarios_editor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scenarios_editor_updated_at_trigger
BEFORE UPDATE ON scenarios_editor
FOR EACH ROW
EXECUTE FUNCTION update_scenarios_editor_updated_at();

-- Insert sample data for testing
INSERT INTO scenarios_editor (scenario_id, mode, title, description, content) VALUES
(
  'sample_pbl_scenario',
  'pbl',
  '{"en": "Smart City Challenge", "zh": "智慧城市挑戰"}',
  '{"en": "Design solutions for urban problems", "zh": "設計城市問題的解決方案"}',
  '{
    "tasks": [
      {
        "id": "task1",
        "title": {"en": "Identify Urban Problems", "zh": "識別城市問題"},
        "description": {"en": "Research and identify key urban challenges", "zh": "研究並識別關鍵城市挑戰"},
        "steps": ["Research", "Interview", "Analyze"],
        "estimatedTime": 30
      },
      {
        "id": "task2",
        "title": {"en": "Propose Solutions", "zh": "提出解決方案"},
        "description": {"en": "Design innovative solutions", "zh": "設計創新解決方案"},
        "steps": ["Brainstorm", "Design", "Present"],
        "estimatedTime": 45
      }
    ],
    "targetDomains": ["technology", "sustainability", "urban_planning"]
  }'
),
(
  'sample_discovery_scenario',
  'discovery',
  '{"en": "AI Basics", "zh": "AI 基礎"}',
  '{"en": "Learn the fundamentals of AI", "zh": "學習 AI 的基礎知識"}',
  '{
    "sections": [
      {
        "id": "section1",
        "title": {"en": "What is AI?", "zh": "什麼是 AI？"},
        "content": {"en": "Introduction to artificial intelligence", "zh": "人工智慧簡介"},
        "activities": ["Watch video", "Read article", "Take quiz"]
      }
    ]
  }'
);

-- Create function to export scenario to YML format
CREATE OR REPLACE FUNCTION export_scenario_to_yml(p_scenario_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_scenario RECORD;
  v_yml TEXT;
BEGIN
  SELECT * INTO v_scenario FROM scenarios_editor WHERE id = p_scenario_id;

  -- Build YML structure (simplified for MVP)
  v_yml := 'id: ' || v_scenario.scenario_id || E'\n';
  v_yml := v_yml || 'mode: ' || v_scenario.mode || E'\n';
  v_yml := v_yml || 'title:' || E'\n';
  v_yml := v_yml || '  en: ' || (v_scenario.title->>'en') || E'\n';
  v_yml := v_yml || '  zh: ' || (v_scenario.title->>'zh') || E'\n';
  v_yml := v_yml || 'content: |' || E'\n';
  v_yml := v_yml || '  ' || v_scenario.content::text || E'\n';

  RETURN v_yml;
END;
$$ LANGUAGE plpgsql;