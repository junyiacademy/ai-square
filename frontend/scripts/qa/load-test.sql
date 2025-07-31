-- ============================================
-- Load Testing Script for AI Square Database
-- Purpose: Simulate production-level load
-- ============================================

\timing on
\set ON_ERROR_STOP on

\echo '=============================='
\echo 'LOAD TESTING SUITE'
\echo '=============================='

-- Configuration
\set num_users 1000
\set num_scenarios_per_mode 50
\set num_programs_per_user 5
\set num_tasks_per_program 10

-- ============================================
-- Phase 1: Create Test Data at Scale
-- ============================================

\echo ''
\echo 'Phase 1: Creating large-scale test data...'
\echo 'Target: 1000 users, 150 scenarios, 5000 programs, 50000 tasks'

-- Create test users
\echo 'Creating test users...'
INSERT INTO users (email, name, preferred_language)
SELECT 
    'loadtest_' || i || '@example.com',
    'Load Test User ' || i,
    CASE 
        WHEN i % 14 = 0 THEN 'en'
        WHEN i % 14 = 1 THEN 'zhTW'
        WHEN i % 14 = 2 THEN 'zhCN'
        WHEN i % 14 = 3 THEN 'pt'
        WHEN i % 14 = 4 THEN 'ar'
        WHEN i % 14 = 5 THEN 'id'
        WHEN i % 14 = 6 THEN 'th'
        WHEN i % 14 = 7 THEN 'es'
        WHEN i % 14 = 8 THEN 'ja'
        WHEN i % 14 = 9 THEN 'ko'
        WHEN i % 14 = 10 THEN 'fr'
        WHEN i % 14 = 11 THEN 'de'
        WHEN i % 14 = 12 THEN 'ru'
        ELSE 'it'
    END
FROM generate_series(1, :num_users) i
ON CONFLICT (email) DO NOTHING;

-- Create scenarios for each mode
\echo 'Creating scenarios for all modes...'

DO $$
DECLARE
    v_modes learning_mode[] := ARRAY['pbl', 'discovery', 'assessment'];
    v_mode learning_mode;
    v_languages TEXT[] := ARRAY['en', 'zh', 'es', 'fr', 'ja'];
    v_task_types task_type[] := ARRAY['chat', 'question', 'exploration', 'creation'];
BEGIN
    FOREACH v_mode IN ARRAY v_modes
    LOOP
        FOR i IN 1..50 LOOP -- 50 scenarios per mode = 150 total
            INSERT INTO scenarios (
                mode, status, source_type,
                title, description,
                difficulty, estimated_minutes,
                task_templates,
                pbl_data,
                discovery_data,
                assessment_data
            ) VALUES (
                v_mode,
                'active',
                'api',
                jsonb_build_object(
                    'en', 'Load Test ' || v_mode || ' Scenario ' || i,
                    'zh', '負載測試 ' || v_mode || ' 場景 ' || i,
                    'es', 'Prueba de Carga ' || v_mode || ' Escenario ' || i
                ),
                jsonb_build_object(
                    'en', 'Load test scenario for ' || v_mode || ' mode',
                    'zh', v_mode || ' 模式的負載測試場景',
                    'es', 'Escenario de prueba de carga para modo ' || v_mode
                ),
                CASE 
                    WHEN i % 4 = 0 THEN 'beginner'
                    WHEN i % 4 = 1 THEN 'intermediate'
                    WHEN i % 4 = 2 THEN 'advanced'
                    ELSE 'expert'
                END::difficulty_level,
                30 + (i % 6) * 10,
                jsonb_build_array(
                    jsonb_build_object(
                        'id', 'task_1',
                        'type', v_task_types[1 + (i % array_length(v_task_types, 1))],
                        'title', jsonb_build_object('en', 'Task 1')
                    ),
                    jsonb_build_object(
                        'id', 'task_2',
                        'type', v_task_types[1 + ((i+1) % array_length(v_task_types, 1))],
                        'title', jsonb_build_object('en', 'Task 2')
                    )
                ),
                CASE WHEN v_mode = 'pbl' THEN 
                    jsonb_build_object('ksaMapping', jsonb_build_object('K1', ARRAY['AI Understanding']))
                ELSE '{}'::jsonb END,
                CASE WHEN v_mode = 'discovery' THEN 
                    jsonb_build_object('careerType', 'tech_career_' || i)
                ELSE '{}'::jsonb END,
                CASE WHEN v_mode = 'assessment' THEN 
                    jsonb_build_object('questionCount', 10 + i)
                ELSE '{}'::jsonb END
            );
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- Phase 2: Simulate Concurrent User Activity
-- ============================================

\echo ''
\echo 'Phase 2: Simulating concurrent user activity...'

-- Create programs for users
\echo 'Creating programs (this may take a while)...'

INSERT INTO programs (user_id, scenario_id, total_task_count, status)
SELECT 
    u.id,
    s.id,
    :num_tasks_per_program,
    CASE 
        WHEN random() < 0.3 THEN 'completed'::program_status
        WHEN random() < 0.6 THEN 'active'::program_status
        ELSE 'pending'::program_status
    END
FROM (
    SELECT id, row_number() OVER (ORDER BY random()) as rn 
    FROM users 
    WHERE email LIKE 'loadtest_%'
    LIMIT 100  -- Test with 100 users first
) u
CROSS JOIN LATERAL (
    SELECT id 
    FROM scenarios 
    WHERE status = 'active'
    ORDER BY random() 
    LIMIT :num_programs_per_user
) s;

-- Create tasks for programs
\echo 'Creating tasks for programs...'

INSERT INTO tasks (program_id, task_index, type, title, status)
SELECT 
    p.id,
    task_num - 1,
    CASE p.mode
        WHEN 'pbl' THEN 'chat'::task_type
        WHEN 'discovery' THEN 'exploration'::task_type
        WHEN 'assessment' THEN 'question'::task_type
    END,
    jsonb_build_object(
        'en', 'Task ' || task_num,
        'zh', '任務 ' || task_num
    ),
    CASE 
        WHEN task_num <= p.completed_task_count THEN 'completed'::task_status
        WHEN task_num = p.completed_task_count + 1 THEN 'active'::task_status
        ELSE 'pending'::task_status
    END
FROM programs p
CROSS JOIN generate_series(1, :num_tasks_per_program) as task_num
WHERE p.user_id IN (
    SELECT id FROM users WHERE email LIKE 'loadtest_%' LIMIT 100
);

-- ============================================
-- Phase 3: Performance Benchmarks
-- ============================================

\echo ''
\echo 'Phase 3: Running performance benchmarks...'

-- Benchmark 1: Mode-based queries
\echo 'Benchmark 1: Mode-based query performance'

EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT COUNT(*) 
FROM programs 
WHERE mode = 'pbl' 
  AND status = 'active';

-- Benchmark 2: User progress queries
\echo 'Benchmark 2: User progress query performance'

EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT 
    u.id,
    u.name,
    COUNT(DISTINCT p.id) as total_programs,
    COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_programs,
    AVG(p.total_score) as avg_score
FROM users u
LEFT JOIN programs p ON u.id = p.user_id
WHERE u.email LIKE 'loadtest_%'
GROUP BY u.id, u.name
LIMIT 10;

-- Benchmark 3: Multilingual query performance
\echo 'Benchmark 3: Multilingual query performance'

EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT 
    s.id,
    s.title->>'en' as title_en,
    s.title->>'zh' as title_zh,
    s.title->>'es' as title_es,
    COUNT(p.id) as program_count
FROM scenarios s
LEFT JOIN programs p ON s.id = p.scenario_id
WHERE s.mode = 'discovery'
GROUP BY s.id
ORDER BY program_count DESC
LIMIT 20;

-- Benchmark 4: Complex join performance
\echo 'Benchmark 4: Complex join query performance'

EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT 
    s.mode,
    COUNT(DISTINCT p.id) as programs,
    COUNT(DISTINCT t.id) as tasks,
    AVG(t.score) as avg_score
FROM scenarios s
JOIN programs p ON s.id = p.scenario_id
JOIN tasks t ON p.id = t.program_id
WHERE p.created_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY s.mode;

-- ============================================
-- Phase 4: Stress Tests
-- ============================================

\echo ''
\echo 'Phase 4: Running stress tests...'

-- Stress Test 1: Rapid concurrent inserts
\echo 'Stress Test 1: Rapid concurrent inserts'

DO $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_duration INTERVAL;
    v_user_id UUID;
    v_scenario_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM users WHERE email LIKE 'loadtest_%' LIMIT 1;
    SELECT id INTO v_scenario_id FROM scenarios WHERE mode = 'pbl' LIMIT 1;
    
    v_start_time := clock_timestamp();
    
    -- Simulate 1000 rapid program creations
    FOR i IN 1..1000 LOOP
        INSERT INTO programs (user_id, scenario_id, total_task_count)
        VALUES (v_user_id, v_scenario_id, 5);
    END LOOP;
    
    v_end_time := clock_timestamp();
    v_duration := v_end_time - v_start_time;
    
    RAISE NOTICE 'Created 1000 programs in %', v_duration;
    
    IF v_duration > interval '5 seconds' THEN
        RAISE WARNING 'Insert performance is slow: %', v_duration;
    END IF;
END $$;

-- Stress Test 2: Large batch updates
\echo 'Stress Test 2: Large batch updates'

DO $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_updated INTEGER;
BEGIN
    v_start_time := clock_timestamp();
    
    UPDATE programs 
    SET status = 'active',
        last_activity_at = CURRENT_TIMESTAMP
    WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE 'loadtest_%' LIMIT 100
    )
    AND status = 'pending';
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    v_end_time := clock_timestamp();
    
    RAISE NOTICE 'Updated % programs in %', v_updated, v_end_time - v_start_time;
END $$;

-- ============================================
-- Phase 5: Resource Usage Analysis
-- ============================================

\echo ''
\echo 'Phase 5: Analyzing resource usage...'

-- Table sizes
\echo 'Table sizes:'
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'scenarios', 'programs', 'tasks', 'evaluations')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
\echo 'Index usage statistics:'
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 10;

-- ============================================
-- Phase 6: Cleanup (Optional)
-- ============================================

\echo ''
\echo 'Phase 6: Cleanup test data (commented out by default)'
\echo 'Uncomment the following to clean up:'

/*
DELETE FROM users WHERE email LIKE 'loadtest_%';
DELETE FROM scenarios WHERE title->>'en' LIKE 'Load Test%';
VACUUM ANALYZE;
*/

-- ============================================
-- Final Report
-- ============================================

\echo ''
\echo '=============================='
\echo 'LOAD TEST SUMMARY REPORT'
\echo '=============================='

WITH stats AS (
    SELECT 
        'Total Users' as metric,
        COUNT(*) as count
    FROM users
    WHERE email LIKE 'loadtest_%'
    
    UNION ALL
    SELECT 'Total Scenarios', COUNT(*)
    FROM scenarios
    WHERE title->>'en' LIKE 'Load Test%'
    
    UNION ALL
    SELECT 'Total Programs', COUNT(*)
    FROM programs p
    JOIN users u ON p.user_id = u.id
    WHERE u.email LIKE 'loadtest_%'
    
    UNION ALL
    SELECT 'Total Tasks', COUNT(*)
    FROM tasks t
    JOIN programs p ON t.program_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE u.email LIKE 'loadtest_%'
)
SELECT * FROM stats;

\echo ''
\echo '✅ Load testing completed!'
\echo 'Review performance metrics above for bottlenecks.'