-- Test Script for All Three Modes
-- Purpose: Insert test data and verify mode propagation works correctly

-- ============================================
-- 1. Insert Test Scenarios for Each Mode
-- ============================================
\echo 'Creating test scenarios for all three modes...'

-- PBL Test Scenario
INSERT INTO scenarios (
    id, mode, status, source_type, source_path,
    title, description, difficulty, estimated_minutes,
    pbl_data, task_templates
) VALUES (
    gen_random_uuid(),
    'pbl',
    'active',
    'yaml',
    'test/pbl_test.yaml',
    '{"en": "PBL Test Scenario", "zh": "PBL 測試情境"}'::jsonb,
    '{"en": "Test PBL scenario for validation", "zh": "用於驗證的 PBL 測試情境"}'::jsonb,
    'intermediate',
    30,
    '{"ksaMapping": {"K1": ["Understanding AI"], "S1": ["Using AI tools"]}}'::jsonb,
    '[{"id": "task1", "type": "chat", "title": {"en": "Test Task"}}]'::jsonb
) ON CONFLICT DO NOTHING;

-- Discovery Test Scenario
INSERT INTO scenarios (
    id, mode, status, source_type, source_path,
    title, description, difficulty, estimated_minutes,
    discovery_data, task_templates
) VALUES (
    gen_random_uuid(),
    'discovery',
    'active',
    'yaml',
    'test/discovery_test.yaml',
    '{"en": "Discovery Test Path", "zh": "探索測試路徑"}'::jsonb,
    '{"en": "Test Discovery path for validation", "zh": "用於驗證的探索測試路徑"}'::jsonb,
    'beginner',
    60,
    '{"careerType": "game_designer", "careerInfo": {"avgSalary": "$70k-$120k"}}'::jsonb,
    '[{"id": "explore1", "type": "exploration", "title": {"en": "Explore Game Design"}}]'::jsonb
) ON CONFLICT DO NOTHING;

-- Assessment Test Scenario
INSERT INTO scenarios (
    id, mode, status, source_type, source_path,
    title, description, difficulty, estimated_minutes,
    assessment_data, task_templates
) VALUES (
    gen_random_uuid(),
    'assessment',
    'active',
    'yaml',
    'test/assessment_test.yaml',
    '{"en": "Assessment Test", "zh": "評估測試"}'::jsonb,
    '{"en": "Test Assessment for validation", "zh": "用於驗證的評估測試"}'::jsonb,
    'intermediate',
    20,
    '{"assessmentType": "diagnostic", "questionBank": [{"id": "q1", "question": "What is AI?"}]}'::jsonb,
    '[{"id": "assess1", "type": "question", "title": {"en": "AI Knowledge Test"}}]'::jsonb
) ON CONFLICT DO NOTHING;

-- ============================================
-- 2. Create Test User
-- ============================================
\echo 'Creating test user...'

INSERT INTO users (
    id, email, name, preferred_language
) VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'test@staging.com',
    'Test User',
    'en'
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 3. Create Programs for Each Mode
-- ============================================
\echo 'Creating programs for each mode...'

-- Create PBL Program
INSERT INTO programs (
    user_id, scenario_id, total_task_count
)
SELECT 
    '11111111-1111-1111-1111-111111111111'::uuid,
    id,
    1
FROM scenarios 
WHERE mode = 'pbl' AND source_path = 'test/pbl_test.yaml'
LIMIT 1;

-- Create Discovery Program
INSERT INTO programs (
    user_id, scenario_id, total_task_count
)
SELECT 
    '11111111-1111-1111-1111-111111111111'::uuid,
    id,
    1
FROM scenarios 
WHERE mode = 'discovery' AND source_path = 'test/discovery_test.yaml'
LIMIT 1;

-- Create Assessment Program
INSERT INTO programs (
    user_id, scenario_id, total_task_count
)
SELECT 
    '11111111-1111-1111-1111-111111111111'::uuid,
    id,
    1
FROM scenarios 
WHERE mode = 'assessment' AND source_path = 'test/assessment_test.yaml'
LIMIT 1;

-- ============================================
-- 4. Verify Mode Propagation
-- ============================================
\echo ''
\echo '✅ Verifying mode propagation to programs...'

SELECT 
    s.mode as scenario_mode,
    p.mode as program_mode,
    CASE WHEN s.mode = p.mode THEN '✓ PASS' ELSE '✗ FAIL' END as propagation_status
FROM programs p
JOIN scenarios s ON p.scenario_id = s.id
WHERE p.user_id = '11111111-1111-1111-1111-111111111111'::uuid
ORDER BY s.mode;

-- ============================================
-- 5. Create Tasks and Verify Mode Propagation
-- ============================================
\echo ''
\echo 'Creating tasks for each program...'

-- Create tasks for each program
INSERT INTO tasks (
    program_id, task_index, title, type
)
SELECT 
    p.id,
    0,
    jsonb_build_object('en', 'Test Task for ' || s.mode),
    CASE 
        WHEN s.mode = 'pbl' THEN 'chat'::task_type
        WHEN s.mode = 'discovery' THEN 'exploration'::task_type
        WHEN s.mode = 'assessment' THEN 'question'::task_type
    END
FROM programs p
JOIN scenarios s ON p.scenario_id = s.id
WHERE p.user_id = '11111111-1111-1111-1111-111111111111'::uuid;

\echo ''
\echo '✅ Verifying mode propagation to tasks...'

SELECT 
    s.mode as scenario_mode,
    p.mode as program_mode,
    t.mode as task_mode,
    t.type as task_type,
    CASE 
        WHEN s.mode = p.mode AND p.mode = t.mode THEN '✓ PASS' 
        ELSE '✗ FAIL' 
    END as propagation_status
FROM tasks t
JOIN programs p ON t.program_id = p.id
JOIN scenarios s ON p.scenario_id = s.id
WHERE p.user_id = '11111111-1111-1111-1111-111111111111'::uuid
ORDER BY s.mode;

-- ============================================
-- 6. Test Mode-Specific Views
-- ============================================
\echo ''
\echo '✅ Testing mode-specific views...'

\echo 'PBL Scenarios View:'
SELECT COUNT(*) as pbl_count FROM pbl_scenarios_view;

\echo 'Discovery Scenarios View:'
SELECT COUNT(*) as discovery_count FROM discovery_scenarios_view;

\echo 'Assessment Scenarios View:'
SELECT COUNT(*) as assessment_count FROM assessment_scenarios_view;

-- ============================================
-- 7. Test Helper Functions
-- ============================================
\echo ''
\echo '✅ Testing helper functions...'

-- Test get_user_programs_by_mode
SELECT 
    mode,
    COUNT(*) as program_count
FROM (
    SELECT * FROM get_user_programs_by_mode('11111111-1111-1111-1111-111111111111'::uuid, 'pbl')
    UNION ALL
    SELECT * FROM get_user_programs_by_mode('11111111-1111-1111-1111-111111111111'::uuid, 'discovery')
    UNION ALL
    SELECT * FROM get_user_programs_by_mode('11111111-1111-1111-1111-111111111111'::uuid, 'assessment')
) programs
JOIN scenarios s ON programs.scenario_id = s.id
GROUP BY mode
ORDER BY mode;

-- ============================================
-- 8. Summary Report
-- ============================================
\echo ''
\echo '📊 Test Summary Report'
\echo '===================='

SELECT 
    'Scenarios' as entity,
    COUNT(*) FILTER (WHERE mode = 'pbl') as pbl_count,
    COUNT(*) FILTER (WHERE mode = 'discovery') as discovery_count,
    COUNT(*) FILTER (WHERE mode = 'assessment') as assessment_count,
    COUNT(*) as total
FROM scenarios
WHERE source_path LIKE 'test/%'

UNION ALL

SELECT 
    'Programs' as entity,
    COUNT(*) FILTER (WHERE mode = 'pbl') as pbl_count,
    COUNT(*) FILTER (WHERE mode = 'discovery') as discovery_count,
    COUNT(*) FILTER (WHERE mode = 'assessment') as assessment_count,
    COUNT(*) as total
FROM programs
WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid

UNION ALL

SELECT 
    'Tasks' as entity,
    COUNT(*) FILTER (WHERE t.mode = 'pbl') as pbl_count,
    COUNT(*) FILTER (WHERE t.mode = 'discovery') as discovery_count,
    COUNT(*) FILTER (WHERE t.mode = 'assessment') as assessment_count,
    COUNT(*) as total
FROM tasks t
JOIN programs p ON t.program_id = p.id
WHERE p.user_id = '11111111-1111-1111-1111-111111111111'::uuid;

-- ============================================
-- 9. Cleanup (Optional)
-- ============================================
-- Uncomment to clean up test data after verification
/*
\echo ''
\echo 'Cleaning up test data...'

DELETE FROM users WHERE email = 'test@staging.com';
DELETE FROM scenarios WHERE source_path LIKE 'test/%';
*/

\echo ''
\echo '✅ All three modes validation complete!'