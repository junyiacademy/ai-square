-- Initialize staging data for AI Square

-- Create test user
INSERT INTO users (email, name, preferred_language) 
VALUES ('staging-test@ai-square.com', 'Staging Test User', 'en')
ON CONFLICT (email) DO NOTHING;

-- Create PBL scenarios
INSERT INTO scenarios (id, mode, status, version, source_type, title, description, difficulty, estimated_minutes, pbl_data) VALUES
(uuid_generate_v4(), 'pbl', 'active', '1.0', 'api',
 '{"en": "Marketing Crisis Management", "zh": "行銷危機管理"}',
 '{"en": "Learn to handle marketing crises using AI tools", "zh": "學習使用 AI 工具處理行銷危機"}',
 'intermediate', 45,
 '{"ksaMapping": {"knowledge": ["K1.1", "K2.3"], "skills": ["S1.2", "S3.1"], "attitudes": ["A1.1", "A2.2"]}}'),
 
(uuid_generate_v4(), 'pbl', 'active', '1.0', 'api',
 '{"en": "Social Media Strategy", "zh": "社群媒體策略"}',
 '{"en": "Develop social media strategies with AI assistance", "zh": "使用 AI 協助開發社群媒體策略"}',
 'beginner', 30,
 '{"ksaMapping": {"knowledge": ["K1.2", "K2.1"], "skills": ["S2.1", "S3.2"], "attitudes": ["A1.2", "A2.1"]}}');

-- Create Assessment scenario
INSERT INTO scenarios (id, mode, status, version, source_type, title, description, difficulty, estimated_minutes, assessment_data) VALUES
(uuid_generate_v4(), 'assessment', 'active', '1.0', 'api',
 '{"en": "AI Literacy Assessment", "zh": "AI 素養評估"}',
 '{"en": "Test your AI literacy knowledge", "zh": "測試你的 AI 素養知識"}',
 'intermediate', 30,
 '{"totalQuestions": 15, "timeLimit": 30, "passingScore": 70, "domains": ["engaging_with_ai", "managing_ai"]}');

-- Create Discovery scenario
INSERT INTO scenarios (id, mode, status, version, source_type, title, description, difficulty, estimated_minutes, discovery_data, xp_rewards) VALUES
(uuid_generate_v4(), 'discovery', 'active', '1.0', 'api',
 '{"en": "Game Developer Journey", "zh": "遊戲開發者之旅"}',
 '{"en": "Explore game development career with AI", "zh": "探索 AI 輔助的遊戲開發職業"}',
 'beginner', 60,
 '{"careerType": "game_developer", "category": "creator", "skillTree": {"core": ["programming", "game_design"], "ai": ["procedural_generation", "npc_behavior"]}}',
 '{"completion": 200}');

-- Verify data
SELECT mode, COUNT(*) as count FROM scenarios GROUP BY mode;