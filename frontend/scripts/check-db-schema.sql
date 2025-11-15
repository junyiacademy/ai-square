-- AI Square Schema Validation Script
-- Purpose: Verify all three modes (PBL, Discovery, Assessment) are correctly configured
-- Run this after schema initialization to ensure everything is ready for staging

-- ============================================
-- 1. Check Extensions
-- ============================================
SELECT 'Checking Extensions...' as step;
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- ============================================
-- 2. Check Custom Types
-- ============================================
SELECT 'Checking Custom Types...' as step;
SELECT typname, typtype
FROM pg_type
WHERE typname IN ('learning_mode', 'scenario_status', 'program_status', 'task_status', 'task_type', 'difficulty_level', 'source_type')
ORDER BY typname;

-- Check learning_mode values
SELECT 'Checking learning_mode enum values...' as step;
SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'learning_mode'
ORDER BY enumsortorder;

-- ============================================
-- 3. Check Core Tables Structure
-- ============================================
SELECT 'Checking Core Tables...' as step;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('users', 'scenarios', 'programs', 'tasks', 'evaluations', 'domains', 'achievements')
ORDER BY table_name;

-- ============================================
-- 4. Check Multilingual Fields (JSONB)
-- ============================================
SELECT 'Checking Multilingual JSONB Fields...' as step;
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'jsonb'
  AND column_name IN ('title', 'description', 'name', 'objectives')
ORDER BY table_name, column_name;

-- ============================================
-- 5. Check Mode-Specific Data Fields
-- ============================================
SELECT 'Checking Mode-Specific Data Fields...' as step;
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('pbl_data', 'discovery_data', 'assessment_data')
ORDER BY table_name, column_name;

-- ============================================
-- 6. Check Mode Propagation Triggers
-- ============================================
SELECT 'Checking Mode Propagation Triggers...' as step;
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('set_program_mode_trigger', 'set_task_mode_trigger', 'set_evaluation_mode_trigger')
ORDER BY trigger_name;

-- ============================================
-- 7. Check Indexes for Performance
-- ============================================
SELECT 'Checking Key Indexes...' as step;
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_scenarios_mode',
    'idx_programs_mode',
    'idx_tasks_mode',
    'idx_evaluations_mode',
    'idx_scenarios_title_en',
    'idx_tasks_title_en'
  )
ORDER BY tablename, indexname;

-- ============================================
-- 8. Check Views
-- ============================================
SELECT 'Checking Views...' as step;
SELECT viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'pbl_scenarios_view',
    'discovery_scenarios_view',
    'assessment_scenarios_view',
    'user_progress_overview',
    'scenario_statistics'
  )
ORDER BY viewname;

-- ============================================
-- 9. Check Functions
-- ============================================
SELECT 'Checking Functions...' as step;
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name IN (
    'propagate_mode_to_program',
    'propagate_mode_to_task',
    'set_evaluation_mode',
    'validate_scenario_data',
    'get_user_programs_by_mode',
    'get_tasks_by_mode_and_type'
  )
ORDER BY routine_name;

-- ============================================
-- 10. Check Initial Data
-- ============================================
SELECT 'Checking Initial Domains...' as step;
SELECT id, name->>'en' as name_en, name->>'zh' as name_zh
FROM domains
ORDER BY display_order;

SELECT 'Checking Initial Achievements...' as step;
SELECT code, name->>'en' as name_en, category, xp_reward
FROM achievements
ORDER BY code;

-- ============================================
-- 11. Test Mode Propagation
-- ============================================
SELECT 'Testing Mode Propagation...' as step;
-- This would be done with actual test data

-- ============================================
-- Summary
-- ============================================
SELECT 'Schema Validation Complete!' as result;
