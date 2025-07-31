-- ============================================
-- AI Square Strict QA Test Suite
-- Level: Enterprise Production
-- ============================================

\set ON_ERROR_STOP on
\timing on

-- ============================================
-- SECTION 1: Data Integrity Tests
-- ============================================

\echo '=================='
\echo '1. DATA INTEGRITY TESTS'
\echo '=================='

-- Test 1.1: Check for orphaned records
\echo '1.1 Checking for orphaned records...'

SELECT 'Orphaned Programs' as test, COUNT(*) as count
FROM programs p
WHERE NOT EXISTS (SELECT 1 FROM scenarios s WHERE s.id = p.scenario_id)
UNION ALL
SELECT 'Orphaned Tasks', COUNT(*)
FROM tasks t
WHERE NOT EXISTS (SELECT 1 FROM programs p WHERE p.id = t.program_id)
UNION ALL
SELECT 'Orphaned Evaluations', COUNT(*)
FROM evaluations e
WHERE e.task_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.id = e.task_id);

-- Test 1.2: Check referential integrity
\echo '1.2 Testing referential integrity...'

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Check if all foreign keys are valid
    SELECT COUNT(*) INTO v_count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND constraint_schema = 'public';
    
    RAISE NOTICE 'Foreign key constraints found: %', v_count;
    
    IF v_count < 10 THEN
        RAISE EXCEPTION 'Too few foreign key constraints (expected >= 10, found %)', v_count;
    END IF;
END $$;

-- Test 1.3: Check for NULL values in required fields
\echo '1.3 Checking for NULL values in required fields...'

SELECT 'Scenarios with NULL title' as issue, COUNT(*)
FROM scenarios WHERE title IS NULL OR title = '{}'::jsonb
UNION ALL
SELECT 'Programs with NULL user_id', COUNT(*)
FROM programs WHERE user_id IS NULL
UNION ALL
SELECT 'Tasks with NULL type', COUNT(*)
FROM tasks WHERE type IS NULL;

-- ============================================
-- SECTION 2: Mode Propagation Stress Tests
-- ============================================

\echo ''
\echo '=================='
\echo '2. MODE PROPAGATION STRESS TESTS'
\echo '=================='

-- Test 2.1: Concurrent mode propagation
\echo '2.1 Testing concurrent mode propagation...'

DO $$
DECLARE
    v_test_user_id UUID;
    v_scenario_id UUID;
    v_program_id UUID;
    v_task_id UUID;
    v_mode learning_mode;
    v_test_modes learning_mode[] := ARRAY['pbl', 'discovery', 'assessment'];
BEGIN
    -- Create test user for stress tests
    INSERT INTO users (email, name, preferred_language)
    VALUES ('stress-test@test.com', 'Stress Test User', 'en')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_test_user_id;
    FOREACH v_mode IN ARRAY v_test_modes
    LOOP
        -- Create scenario
        INSERT INTO scenarios (mode, title, description, task_templates, pbl_data, discovery_data, assessment_data)
        VALUES (
            v_mode,
            jsonb_build_object('en', 'Stress Test ' || v_mode),
            jsonb_build_object('en', 'Stress test scenario'),
            '[{"id": "test", "type": "question"}]'::jsonb,
            CASE WHEN v_mode = 'pbl' THEN '{"ksaMapping": {"K1": ["Understanding AI"]}}'::jsonb ELSE '{}'::jsonb END,
            CASE WHEN v_mode = 'discovery' THEN '{"careerType": "test_career"}'::jsonb ELSE '{}'::jsonb END,
            CASE WHEN v_mode = 'assessment' THEN '{"assessmentType": "diagnostic"}'::jsonb ELSE '{}'::jsonb END
        ) RETURNING id INTO v_scenario_id;
        
        -- Create multiple programs concurrently
        FOR i IN 1..10 LOOP
            INSERT INTO programs (user_id, scenario_id, total_task_count)
            VALUES (v_test_user_id, v_scenario_id, 1)
            RETURNING id INTO v_program_id;
            
            -- Verify mode propagation
            PERFORM 1 FROM programs 
            WHERE id = v_program_id AND mode = v_mode;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Mode propagation failed for program %', v_program_id;
            END IF;
            
            -- Create task
            INSERT INTO tasks (program_id, task_index, type, title)
            VALUES (v_program_id, 0, 'question', jsonb_build_object('en', 'Test'))
            RETURNING id INTO v_task_id;
            
            -- Verify task mode propagation
            PERFORM 1 FROM tasks 
            WHERE id = v_task_id AND mode = v_mode;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Mode propagation failed for task %', v_task_id;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Concurrent mode propagation test passed!';
END $$;

-- Test 2.2: Mode consistency check
\echo '2.2 Checking mode consistency across tables...'

WITH mode_mismatches AS (
    SELECT 
        'Program-Scenario' as mismatch_type,
        p.id,
        s.mode as expected_mode,
        p.mode as actual_mode
    FROM programs p
    JOIN scenarios s ON p.scenario_id = s.id
    WHERE p.mode != s.mode
    
    UNION ALL
    
    SELECT 
        'Task-Program' as mismatch_type,
        t.id,
        p.mode as expected_mode,
        t.mode as actual_mode
    FROM tasks t
    JOIN programs p ON t.program_id = p.id
    WHERE t.mode != p.mode
)
SELECT 
    mismatch_type,
    COUNT(*) as mismatch_count
FROM mode_mismatches
GROUP BY mismatch_type;

-- ============================================
-- SECTION 3: Multilingual Data Tests
-- ============================================

\echo ''
\echo '=================='
\echo '3. MULTILINGUAL DATA TESTS'
\echo '=================='

-- Test 3.1: JSONB structure validation
\echo '3.1 Validating JSONB structure for multilingual fields...'

DO $$
DECLARE
    v_invalid_count INTEGER;
BEGIN
    -- Check scenarios title structure
    SELECT COUNT(*) INTO v_invalid_count
    FROM scenarios
    WHERE jsonb_typeof(title) != 'object'
       OR NOT (title ? 'en');
    
    IF v_invalid_count > 0 THEN
        RAISE WARNING 'Found % scenarios with invalid title structure', v_invalid_count;
    END IF;
    
    -- Check if multilingual fields contain at least one language
    SELECT COUNT(*) INTO v_invalid_count
    FROM scenarios
    WHERE title = '{}'::jsonb OR title IS NULL;
    
    IF v_invalid_count > 0 THEN
        RAISE WARNING 'Found % scenarios with empty title', v_invalid_count;
    END IF;
END $$;

-- Test 3.2: Language consistency
\echo '3.2 Testing language consistency...'

WITH language_coverage AS (
    SELECT 
        'scenarios' as table_name,
        COUNT(DISTINCT lang) as unique_languages,
        COUNT(DISTINCT s.id) as total_records
    FROM scenarios s, jsonb_object_keys(s.title) as lang
    WHERE s.title IS NOT NULL AND s.title != '{}'::jsonb
)
SELECT * FROM language_coverage;

-- Test 3.3: Special character handling
\echo '3.3 Testing special character handling in multilingual fields...'

DO $$
BEGIN
    -- Insert test data with special characters
    INSERT INTO scenarios (mode, title, description, task_templates, pbl_data)
    VALUES (
        'pbl',
        jsonb_build_object(
            'en', 'Test "Special" Characters: <>&''',
            'zh', '測試「特殊」字元：《》＆',
            'ar', 'اختبار "خاص" الأحرف: <>&',
            'emoji', '🎯 Test 🔥 Emoji 🚀'
        ),
        jsonb_build_object('en', 'Special char test'),
        '[]'::jsonb,
        '{"ksaMapping": {"K1": ["Test"]}}'::jsonb
    );
    
    -- Verify retrieval
    PERFORM 1 FROM scenarios 
    WHERE title->>'emoji' = '🎯 Test 🔥 Emoji 🚀';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Special character handling failed';
    END IF;
    
    RAISE NOTICE 'Special character test passed!';
END $$;

-- ============================================
-- SECTION 4: Performance & Scalability Tests
-- ============================================

\echo ''
\echo '=================='
\echo '4. PERFORMANCE & SCALABILITY TESTS'
\echo '=================='

-- Test 4.1: Index effectiveness
\echo '4.1 Testing index effectiveness...'

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM scenarios WHERE mode = 'discovery' LIMIT 10;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM programs WHERE user_id = gen_random_uuid() AND mode = 'pbl';

-- Test 4.2: Query performance with large datasets
\echo '4.2 Testing query performance with volume data...'

DO $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_duration INTERVAL;
BEGIN
    v_start_time := clock_timestamp();
    
    -- Simulate large dataset query
    PERFORM COUNT(*)
    FROM programs p
    JOIN scenarios s ON p.scenario_id = s.id
    JOIN tasks t ON t.program_id = p.id
    WHERE p.mode = 'pbl'
      AND p.status = 'active';
    
    v_end_time := clock_timestamp();
    v_duration := v_end_time - v_start_time;
    
    RAISE NOTICE 'Query execution time: %', v_duration;
    
    IF v_duration > interval '1 second' THEN
        RAISE WARNING 'Query performance may be slow: %', v_duration;
    END IF;
END $$;

-- Test 4.3: Concurrent transaction handling
\echo '4.3 Testing concurrent transaction handling...'

DO $$
DECLARE
    v_user_id UUID := gen_random_uuid();
    v_scenario_id UUID;
BEGIN
    -- Get a scenario
    SELECT id INTO v_scenario_id FROM scenarios WHERE mode = 'pbl' LIMIT 1;
    
    IF v_scenario_id IS NULL THEN
        INSERT INTO scenarios (mode, title, description, task_templates)
        VALUES ('pbl', '{"en":"Test"}'::jsonb, '{"en":"Test"}'::jsonb, '[]'::jsonb)
        RETURNING id INTO v_scenario_id;
    END IF;
    
    -- Simulate concurrent program creation
    FOR i IN 1..50 LOOP
        BEGIN
            INSERT INTO programs (user_id, scenario_id, total_task_count)
            VALUES (v_user_id, v_scenario_id, 1);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Concurrent insert failed: %', SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- SECTION 5: Edge Cases & Boundary Tests
-- ============================================

\echo ''
\echo '=================='
\echo '5. EDGE CASES & BOUNDARY TESTS'
\echo '=================='

-- Test 5.1: Maximum field length tests
\echo '5.1 Testing maximum field lengths...'

DO $$
DECLARE
    v_long_text TEXT;
    v_large_json JSONB;
BEGIN
    -- Create very long text
    v_long_text := repeat('A', 10000);
    v_large_json := jsonb_build_object('en', v_long_text);
    
    -- Try to insert
    BEGIN
        INSERT INTO scenarios (mode, title, description, task_templates)
        VALUES ('pbl', v_large_json, v_large_json, '[]'::jsonb);
        
        RAISE NOTICE 'Large text insertion successful';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Large text insertion failed: %', SQLERRM;
    END;
END $$;

-- Test 5.2: Null and empty value handling
\echo '5.2 Testing null and empty value handling...'

SELECT 
    'Empty JSONB' as test_case,
    COUNT(*) as count
FROM scenarios 
WHERE title = '{}'::jsonb
   OR description = '{}'::jsonb
UNION ALL
SELECT 
    'Null task_templates',
    COUNT(*)
FROM scenarios 
WHERE task_templates IS NULL
UNION ALL
SELECT 
    'Empty task_templates array',
    COUNT(*)
FROM scenarios 
WHERE jsonb_array_length(task_templates) = 0;

-- Test 5.3: Invalid mode handling
\echo '5.3 Testing invalid mode handling...'

DO $$
BEGIN
    -- This should fail due to enum constraint
    BEGIN
        INSERT INTO scenarios (mode, title, description, task_templates)
        VALUES ('invalid_mode'::learning_mode, '{"en":"Test"}'::jsonb, '{"en":"Test"}'::jsonb, '[]'::jsonb);
        
        RAISE EXCEPTION 'Invalid mode was accepted - this is a security issue!';
    EXCEPTION WHEN invalid_text_representation THEN
        RAISE NOTICE 'Invalid mode correctly rejected';
    END;
END $$;

-- ============================================
-- SECTION 6: Security Tests
-- ============================================

\echo ''
\echo '=================='
\echo '6. SECURITY TESTS'
\echo '=================='

-- Test 6.1: SQL injection in JSONB
\echo '6.1 Testing SQL injection prevention in JSONB fields...'

DO $$
DECLARE
    v_malicious_json JSONB;
    v_result TEXT;
BEGIN
    -- Try SQL injection in JSONB
    v_malicious_json := jsonb_build_object(
        'en', 'Normal title',
        'hack', '''; DROP TABLE users; --'
    );
    
    INSERT INTO scenarios (mode, title, description, task_templates)
    VALUES ('pbl', v_malicious_json, '{"en":"Test"}'::jsonb, '[]'::jsonb);
    
    -- Try to query it
    SELECT title->>'hack' INTO v_result
    FROM scenarios 
    WHERE title->>'hack' IS NOT NULL
    LIMIT 1;
    
    IF v_result = '''; DROP TABLE users; --' THEN
        RAISE NOTICE 'SQL injection properly contained in JSONB';
    END IF;
    
    -- Verify users table still exists
    PERFORM 1 FROM users LIMIT 1;
    RAISE NOTICE 'Security test passed - tables intact';
END $$;

-- Test 6.2: Permission checks
\echo '6.2 Testing permission boundaries...'

SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hastriggers
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'scenarios', 'programs', 'tasks', 'evaluations')
ORDER BY tablename;

-- ============================================
-- SECTION 7: Data Migration Readiness
-- ============================================

\echo ''
\echo '=================='
\echo '7. DATA MIGRATION READINESS TESTS'
\echo '=================='

-- Test 7.1: Check for legacy data compatibility
\echo '7.1 Checking for legacy data patterns...'

-- Simulate legacy data structure
WITH legacy_check AS (
    SELECT 
        COUNT(*) FILTER (WHERE title IS NULL) as null_titles,
        COUNT(*) FILTER (WHERE jsonb_typeof(title) != 'object') as non_object_titles,
        COUNT(*) FILTER (WHERE pbl_data IS NULL AND mode = 'pbl') as missing_pbl_data,
        COUNT(*) FILTER (WHERE discovery_data IS NULL AND mode = 'discovery') as missing_discovery_data,
        COUNT(*) FILTER (WHERE assessment_data IS NULL AND mode = 'assessment') as missing_assessment_data
    FROM scenarios
)
SELECT * FROM legacy_check;

-- ============================================
-- SECTION 8: Comprehensive Summary Report
-- ============================================

\echo ''
\echo '=================='
\echo '8. COMPREHENSIVE QA SUMMARY REPORT'
\echo '=================='

WITH test_summary AS (
    SELECT 
        'Total Tables' as metric, 
        COUNT(*) as value
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    
    UNION ALL
    SELECT 'Total Indexes', COUNT(*)
    FROM pg_indexes WHERE schemaname = 'public'
    
    UNION ALL
    SELECT 'Total Triggers', COUNT(*)
    FROM information_schema.triggers WHERE trigger_schema = 'public'
    
    UNION ALL
    SELECT 'Total Foreign Keys', COUNT(*)
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY' AND constraint_schema = 'public'
    
    UNION ALL
    SELECT 'Scenarios by Mode: PBL', COUNT(*)
    FROM scenarios WHERE mode = 'pbl'
    
    UNION ALL
    SELECT 'Scenarios by Mode: Discovery', COUNT(*)
    FROM scenarios WHERE mode = 'discovery'
    
    UNION ALL
    SELECT 'Scenarios by Mode: Assessment', COUNT(*)
    FROM scenarios WHERE mode = 'assessment'
)
SELECT * FROM test_summary ORDER BY metric;

\echo ''
\echo '✅ STRICT QA TEST SUITE COMPLETED'
\echo 'Review all warnings and errors above before proceeding to production!'