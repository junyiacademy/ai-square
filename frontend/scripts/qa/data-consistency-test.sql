-- ============================================
-- Data Consistency Test Suite
-- Purpose: Ensure data integrity across all modes
-- ============================================

\set ON_ERROR_STOP on
\timing on

\echo '=============================='
\echo 'DATA CONSISTENCY TEST SUITE'
\echo '=============================='

-- ============================================
-- 1. Cross-Table Consistency Checks
-- ============================================

\echo ''
\echo '1. CROSS-TABLE CONSISTENCY CHECKS'
\echo '================================'

-- Check 1.1: Program counts match task counts
\echo '1.1 Verifying program task counts...'

WITH consistency_check AS (
    SELECT
        p.id as program_id,
        p.total_task_count as declared_count,
        COUNT(t.id) as actual_count,
        p.total_task_count - COUNT(t.id) as difference
    FROM programs p
    LEFT JOIN tasks t ON p.id = t.program_id
    GROUP BY p.id, p.total_task_count
    HAVING p.total_task_count != COUNT(t.id)
)
SELECT
    COUNT(*) as inconsistent_programs,
    SUM(ABS(difference)) as total_task_mismatch,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ All program task counts are consistent'
        ELSE '✗ CRITICAL: Program task count mismatches found!'
    END as status
FROM consistency_check;

-- Check 1.2: Completed task counts
\echo ''
\echo '1.2 Verifying completed task counts...'

WITH completion_check AS (
    SELECT
        p.id,
        p.completed_task_count as declared_completed,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') as actual_completed
    FROM programs p
    LEFT JOIN tasks t ON p.id = t.program_id
    GROUP BY p.id, p.completed_task_count
    HAVING p.completed_task_count != COUNT(t.id) FILTER (WHERE t.status = 'completed')
)
SELECT
    COUNT(*) as inconsistent_programs,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ Completed task counts are consistent'
        ELSE '✗ Completed task count mismatches found!'
    END as status
FROM completion_check;

-- Check 1.3: Task index sequence
\echo ''
\echo '1.3 Checking task index sequences...'

WITH index_gaps AS (
    SELECT
        program_id,
        array_agg(task_index ORDER BY task_index) as indices,
        COUNT(*) as task_count,
        MAX(task_index) as max_index
    FROM tasks
    GROUP BY program_id
    HAVING MAX(task_index) >= COUNT(*) -- Should be 0-indexed
        OR COUNT(DISTINCT task_index) != COUNT(*)
)
SELECT
    COUNT(*) as programs_with_gaps,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ All task indices are sequential'
        ELSE '✗ Task index gaps or duplicates found!'
    END as status
FROM index_gaps;

-- ============================================
-- 2. Mode Consistency Validation
-- ============================================

\echo ''
\echo '2. MODE CONSISTENCY VALIDATION'
\echo '============================='

-- Check 2.1: Mode propagation chain
\echo '2.1 Validating mode propagation chain...'

WITH mode_chain AS (
    SELECT
        s.id as scenario_id,
        s.mode as scenario_mode,
        p.id as program_id,
        p.mode as program_mode,
        t.id as task_id,
        t.mode as task_mode,
        e.id as evaluation_id,
        e.mode as evaluation_mode
    FROM scenarios s
    LEFT JOIN programs p ON s.id = p.scenario_id
    LEFT JOIN tasks t ON p.id = t.program_id
    LEFT JOIN evaluations e ON t.id = e.task_id
    WHERE p.id IS NOT NULL
)
SELECT
    COUNT(*) FILTER (WHERE scenario_mode != program_mode) as scenario_program_mismatches,
    COUNT(*) FILTER (WHERE program_mode != task_mode AND task_id IS NOT NULL) as program_task_mismatches,
    COUNT(*) FILTER (WHERE task_mode != evaluation_mode AND evaluation_id IS NOT NULL) as task_evaluation_mismatches,
    CASE
        WHEN COUNT(*) FILTER (WHERE
            scenario_mode != program_mode OR
            (program_mode != task_mode AND task_id IS NOT NULL) OR
            (task_mode != evaluation_mode AND evaluation_id IS NOT NULL)
        ) = 0
        THEN '✓ Mode propagation is consistent'
        ELSE '✗ CRITICAL: Mode propagation failures detected!'
    END as status
FROM mode_chain;

-- Check 2.2: Mode-specific data presence
\echo ''
\echo '2.2 Checking mode-specific data requirements...'

SELECT
    mode,
    COUNT(*) as total_scenarios,
    COUNT(*) FILTER (WHERE
        (mode = 'pbl' AND (pbl_data IS NULL OR pbl_data = '{}'::jsonb)) OR
        (mode = 'discovery' AND (discovery_data IS NULL OR discovery_data = '{}'::jsonb)) OR
        (mode = 'assessment' AND (assessment_data IS NULL OR assessment_data = '{}'::jsonb))
    ) as missing_mode_data,
    CASE
        WHEN COUNT(*) FILTER (WHERE
            (mode = 'pbl' AND (pbl_data IS NULL OR pbl_data = '{}'::jsonb)) OR
            (mode = 'discovery' AND (discovery_data IS NULL OR discovery_data = '{}'::jsonb)) OR
            (mode = 'assessment' AND (assessment_data IS NULL OR assessment_data = '{}'::jsonb))
        ) = 0
        THEN '✓ All mode-specific data present'
        ELSE '✗ Missing required mode-specific data!'
    END as status
FROM scenarios
GROUP BY mode
ORDER BY mode;

-- ============================================
-- 3. Multilingual Data Consistency
-- ============================================

\echo ''
\echo '3. MULTILINGUAL DATA CONSISTENCY'
\echo '==============================='

-- Check 3.1: Language coverage consistency
\echo '3.1 Checking language coverage consistency...'

WITH language_stats AS (
    SELECT
        'scenarios' as table_name,
        COUNT(DISTINCT key) as unique_languages
    FROM scenarios, jsonb_object_keys(title) as key
    WHERE title IS NOT NULL AND title != '{}'::jsonb

    UNION ALL

    SELECT
        'tasks',
        COUNT(DISTINCT key)
    FROM tasks, jsonb_object_keys(title) as key
    WHERE title IS NOT NULL AND title != '{}'::jsonb
)
SELECT
    table_name,
    unique_languages,
    CASE
        WHEN unique_languages >= 2 THEN '✓ Multiple languages supported'
        WHEN unique_languages = 1 THEN '⚠ Only one language found'
        ELSE '✗ No languages found!'
    END as status
FROM language_stats;

-- Check 3.2: Required language presence
\echo ''
\echo '3.2 Checking required language (en) presence...'

SELECT
    'Scenarios missing English' as check_item,
    COUNT(*) as count
FROM scenarios
WHERE title IS NOT NULL
  AND title != '{}'::jsonb
  AND NOT (title ? 'en')
UNION ALL
SELECT
    'Tasks missing English',
    COUNT(*)
FROM tasks
WHERE title IS NOT NULL
  AND title != '{}'::jsonb
  AND NOT (title ? 'en');

-- ============================================
-- 4. Temporal Data Consistency
-- ============================================

\echo ''
\echo '4. TEMPORAL DATA CONSISTENCY'
\echo '==========================='

-- Check 4.1: Timestamp logic
\echo '4.1 Checking timestamp logical consistency...'

SELECT
    'Programs started before created' as anomaly,
    COUNT(*) as count
FROM programs
WHERE started_at < created_at
UNION ALL
SELECT
    'Programs completed before started',
    COUNT(*)
FROM programs
WHERE completed_at < started_at
UNION ALL
SELECT
    'Tasks completed before started',
    COUNT(*)
FROM tasks
WHERE completed_at < started_at
UNION ALL
SELECT
    'Updated_at before created_at',
    COUNT(*)
FROM scenarios
WHERE updated_at < created_at;

-- Check 4.2: Future timestamps
\echo ''
\echo '4.2 Checking for future timestamps...'

SELECT
    'Future created_at' as check_type,
    COUNT(*) as count
FROM (
    SELECT id FROM users WHERE created_at > CURRENT_TIMESTAMP
    UNION ALL
    SELECT id FROM scenarios WHERE created_at > CURRENT_TIMESTAMP
    UNION ALL
    SELECT id FROM programs WHERE created_at > CURRENT_TIMESTAMP
) future_records
UNION ALL
SELECT
    'Future completed_at',
    COUNT(*)
FROM (
    SELECT id FROM programs WHERE completed_at > CURRENT_TIMESTAMP
    UNION ALL
    SELECT id FROM tasks WHERE completed_at > CURRENT_TIMESTAMP
) future_completions;

-- ============================================
-- 5. Score and Progress Consistency
-- ============================================

\echo ''
\echo '5. SCORE AND PROGRESS CONSISTENCY'
\echo '================================'

-- Check 5.1: Score boundaries
\echo '5.1 Checking score boundaries...'

SELECT
    'Programs with invalid scores' as check_item,
    COUNT(*) as count,
    MIN(total_score) as min_score,
    MAX(total_score) as max_score
FROM programs
WHERE total_score < 0 OR total_score > 100
UNION ALL
SELECT
    'Tasks with invalid scores',
    COUNT(*),
    MIN(score),
    MAX(score)
FROM tasks
WHERE score < 0 OR score > 100
UNION ALL
SELECT
    'Evaluations with invalid scores',
    COUNT(*),
    MIN(score),
    MAX(score)
FROM evaluations
WHERE score < 0 OR score > 100;

-- Check 5.2: Progress state consistency
\echo ''
\echo '5.2 Checking progress state consistency...'

WITH state_checks AS (
    -- Completed programs should have all tasks done
    SELECT
        'Completed programs with pending tasks' as issue,
        COUNT(DISTINCT p.id) as count
    FROM programs p
    JOIN tasks t ON p.id = t.program_id
    WHERE p.status = 'completed'
      AND t.status != 'completed'

    UNION ALL

    -- Active programs should have at least one active or completed task
    SELECT
        'Active programs with no progress',
        COUNT(DISTINCT p.id)
    FROM programs p
    WHERE p.status = 'active'
      AND NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.program_id = p.id
            AND t.status IN ('active', 'completed')
      )
)
SELECT * FROM state_checks;

-- ============================================
-- 6. Referential Integrity Deep Check
-- ============================================

\echo ''
\echo '6. REFERENTIAL INTEGRITY DEEP CHECK'
\echo '=================================='

-- Check 6.1: Cascade delete implications
\echo '6.1 Analyzing cascade delete implications...'

WITH cascade_analysis AS (
    SELECT
        'Users' as entity,
        COUNT(DISTINCT u.id) as total,
        COUNT(DISTINCT p.user_id) as referenced,
        COUNT(DISTINCT u.id) - COUNT(DISTINCT p.user_id) as unreferenced
    FROM users u
    LEFT JOIN programs p ON u.id = p.user_id

    UNION ALL

    SELECT
        'Scenarios',
        COUNT(DISTINCT s.id),
        COUNT(DISTINCT p.scenario_id),
        COUNT(DISTINCT s.id) - COUNT(DISTINCT p.scenario_id)
    FROM scenarios s
    LEFT JOIN programs p ON s.id = p.scenario_id
)
SELECT
    entity,
    total,
    referenced,
    unreferenced,
    ROUND(100.0 * unreferenced / NULLIF(total, 0), 2) as unreferenced_pct
FROM cascade_analysis;

-- ============================================
-- 7. Business Logic Consistency
-- ============================================

\echo ''
\echo '7. BUSINESS LOGIC CONSISTENCY'
\echo '============================'

-- Check 7.1: XP and level consistency
\echo '7.1 Checking XP and level consistency...'

WITH xp_checks AS (
    SELECT
        id,
        email,
        level,
        total_xp,
        -- Assuming 100 XP per level
        total_xp / 100 as calculated_level,
        level - (total_xp / 100) as level_difference
    FROM users
    WHERE total_xp > 0
)
SELECT
    COUNT(*) FILTER (WHERE ABS(level_difference) > 1) as inconsistent_users,
    MIN(level_difference) as min_diff,
    MAX(level_difference) as max_diff,
    CASE
        WHEN COUNT(*) FILTER (WHERE ABS(level_difference) > 1) = 0
        THEN '✓ XP and levels are consistent'
        ELSE '⚠ Some users have inconsistent XP/level ratios'
    END as status
FROM xp_checks;

-- ============================================
-- 8. Data Completeness Check
-- ============================================

\echo ''
\echo '8. DATA COMPLETENESS CHECK'
\echo '========================='

-- Check 8.1: Required fields completeness
\echo '8.1 Checking required fields completeness...'

SELECT
    'Scenarios' as entity,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE title IS NULL OR title = '{}'::jsonb) as missing_title,
    COUNT(*) FILTER (WHERE description IS NULL OR description = '{}'::jsonb) as missing_description,
    COUNT(*) FILTER (WHERE task_templates IS NULL OR jsonb_array_length(task_templates) = 0) as missing_tasks
FROM scenarios
UNION ALL
SELECT
    'Programs',
    COUNT(*),
    COUNT(*) FILTER (WHERE user_id IS NULL),
    COUNT(*) FILTER (WHERE scenario_id IS NULL),
    COUNT(*) FILTER (WHERE total_task_count = 0)
FROM programs;

-- ============================================
-- Final Summary
-- ============================================

\echo ''
\echo '=============================='
\echo 'DATA CONSISTENCY TEST SUMMARY'
\echo '=============================='

\echo ''
\echo 'Critical Issues to Address:'
\echo '1. Any ✗ CRITICAL markers indicate immediate attention needed'
\echo '2. ⚠ WARNING markers should be investigated'
\echo '3. Review all count mismatches and anomalies'
\echo '4. Ensure mode propagation is working correctly'
\echo '5. Validate multilingual data completeness'

\echo ''
\echo '✅ Data consistency test completed!'
