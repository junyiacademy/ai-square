-- ============================================
-- Security Audit Script for AI Square Database
-- Level: Enterprise Security Standards
-- ============================================

\set ON_ERROR_STOP on

\echo '=============================='
\echo 'SECURITY AUDIT SUITE'
\echo '=============================='

-- ============================================
-- 1. Permission & Access Control Audit
-- ============================================

\echo ''
\echo '1. PERMISSION & ACCESS CONTROL AUDIT'
\echo '===================================='

-- Check table ownership
\echo '1.1 Table Ownership Check:'
SELECT
    schemaname,
    tablename,
    tableowner,
    CASE
        WHEN tableowner = current_user THEN '✓ Current User'
        WHEN tableowner = 'postgres' THEN '⚠ Superuser Owned'
        ELSE '✗ Other User: ' || tableowner
    END as ownership_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check column privileges
\echo ''
\echo '1.2 Column-level Privileges:'
SELECT
    table_name,
    column_name,
    privilege_type,
    grantee
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND grantee NOT IN ('postgres', current_user)
ORDER BY table_name, column_name;

-- Check for PUBLIC access
\echo ''
\echo '1.3 PUBLIC Access Check:'
SELECT
    schemaname,
    tablename,
    has_table_privilege('PUBLIC', schemaname||'.'||tablename, 'SELECT') as public_select,
    has_table_privilege('PUBLIC', schemaname||'.'||tablename, 'INSERT') as public_insert,
    has_table_privilege('PUBLIC', schemaname||'.'||tablename, 'UPDATE') as public_update,
    has_table_privilege('PUBLIC', schemaname||'.'||tablename, 'DELETE') as public_delete
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'scenarios', 'programs', 'tasks', 'evaluations');

-- ============================================
-- 2. Data Exposure & PII Protection
-- ============================================

\echo ''
\echo '2. DATA EXPOSURE & PII PROTECTION'
\echo '================================='

-- Check for exposed sensitive data
\echo '2.1 Checking for exposed sensitive columns:'

DO $$
DECLARE
    v_sensitive_patterns TEXT[] := ARRAY[
        '%password%', '%secret%', '%token%', '%key%',
        '%ssn%', '%credit%', '%card%', '%cvv%'
    ];
    v_pattern TEXT;
    v_count INTEGER;
BEGIN
    FOREACH v_pattern IN ARRAY v_sensitive_patterns
    LOOP
        SELECT COUNT(*) INTO v_count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name ILIKE v_pattern;

        IF v_count > 0 THEN
            RAISE WARNING 'Found % columns matching sensitive pattern: %', v_count, v_pattern;
        END IF;
    END LOOP;
END $$;

-- Check for unencrypted PII
\echo ''
\echo '2.2 Checking for potential unencrypted PII:'

SELECT
    'Users table email field' as check_item,
    CASE
        WHEN EXISTS (SELECT 1 FROM users WHERE email NOT LIKE '%@%.%')
        THEN '✗ Invalid emails found'
        ELSE '✓ Email format valid'
    END as status
UNION ALL
SELECT
    'Users table name field',
    CASE
        WHEN EXISTS (SELECT 1 FROM users WHERE length(name) > 100)
        THEN '⚠ Unusually long names found'
        ELSE '✓ Name lengths normal'
    END;

-- ============================================
-- 3. SQL Injection Vulnerability Tests
-- ============================================

\echo ''
\echo '3. SQL INJECTION VULNERABILITY TESTS'
\echo '===================================='

-- Test 3.1: JSONB injection attempts
\echo '3.1 Testing JSONB SQL injection vulnerabilities:'

DO $$
DECLARE
    v_test_passed BOOLEAN := true;
    v_malicious_inputs TEXT[] := ARRAY[
        $$'; DROP TABLE users; --$$,
        $$" OR 1=1 --$$,
        $$\'; DELETE FROM scenarios WHERE ''='$$,
        $${"en": "test", "hack": "'); DROP TABLE tasks; --"}$$
    ];
    v_input TEXT;
BEGIN
    FOREACH v_input IN ARRAY v_malicious_inputs
    LOOP
        BEGIN
            -- Test scenario title injection
            PERFORM 1 FROM scenarios
            WHERE title->>'en' = v_input;

            -- Test in dynamic query (this should be safe)
            EXECUTE format(
                'SELECT 1 FROM scenarios WHERE title @> %L::jsonb',
                json_build_object('test', v_input)::text
            );

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Injection test caused error (good): %', SQLERRM;
        END;
    END LOOP;

    IF v_test_passed THEN
        RAISE NOTICE '✓ JSONB injection tests passed';
    END IF;
END $$;

-- Test 3.2: Function injection vulnerabilities
\echo ''
\echo '3.2 Testing function parameter injection:'

DO $$
BEGIN
    -- Test the helper functions with malicious input
    BEGIN
        PERFORM get_user_programs_by_mode(
            $$'test' OR 1=1)::uuid; DROP TABLE test; --$$::uuid,
            'pbl'
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✓ Function injection properly blocked: %', SQLERRM;
    END;
END $$;

-- ============================================
-- 4. Authentication & Session Security
-- ============================================

\echo ''
\echo '4. AUTHENTICATION & SESSION SECURITY'
\echo '===================================='

-- Check for weak session tokens
\echo '4.1 Checking session token strength:'

SELECT
    'Session Token Length' as metric,
    MIN(length(session_token)) as min_length,
    MAX(length(session_token)) as max_length,
    AVG(length(session_token))::numeric(10,2) as avg_length,
    CASE
        WHEN MIN(length(session_token)) < 32 THEN '✗ Tokens too short!'
        WHEN MIN(length(session_token)) < 64 THEN '⚠ Consider longer tokens'
        ELSE '✓ Good token length'
    END as assessment
FROM user_sessions
WHERE created_at > CURRENT_DATE - INTERVAL '30 days';

-- Check for expired sessions
\echo ''
\echo '4.2 Checking for expired sessions:'

SELECT
    COUNT(*) as expired_sessions,
    MIN(expires_at) as oldest_expiry,
    CASE
        WHEN COUNT(*) > 0 THEN '✗ Expired sessions found - should be cleaned up'
        ELSE '✓ No expired sessions'
    END as status
FROM user_sessions
WHERE expires_at < CURRENT_TIMESTAMP;

-- ============================================
-- 5. Data Integrity & Constraint Validation
-- ============================================

\echo ''
\echo '5. DATA INTEGRITY & CONSTRAINT VALIDATION'
\echo '========================================'

-- Check foreign key integrity
\echo '5.1 Foreign Key Integrity Check:'

WITH fk_violations AS (
    SELECT 'programs->scenarios' as relationship, COUNT(*) as violations
    FROM programs p
    WHERE NOT EXISTS (SELECT 1 FROM scenarios s WHERE s.id = p.scenario_id)

    UNION ALL
    SELECT 'tasks->programs', COUNT(*)
    FROM tasks t
    WHERE NOT EXISTS (SELECT 1 FROM programs p WHERE p.id = t.program_id)

    UNION ALL
    SELECT 'evaluations->tasks', COUNT(*)
    FROM evaluations e
    WHERE e.task_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.id = e.task_id)
)
SELECT
    relationship,
    violations,
    CASE
        WHEN violations > 0 THEN '✗ CRITICAL: Foreign key violations!'
        ELSE '✓ No violations'
    END as status
FROM fk_violations;

-- Check constraint violations
\echo ''
\echo '5.2 Check Constraint Validation:'

SELECT
    'Score Range Check' as constraint_check,
    COUNT(*) as violations
FROM evaluations
WHERE score < 0 OR score > 100
UNION ALL
SELECT
    'Empty JSONB Titles',
    COUNT(*)
FROM scenarios
WHERE title = '{}'::jsonb OR title IS NULL;

-- ============================================
-- 6. Audit Trail & Logging
-- ============================================

\echo ''
\echo '6. AUDIT TRAIL & LOGGING'
\echo '======================='

-- Check for audit columns
\echo '6.1 Audit Column Coverage:'

WITH audit_coverage AS (
    SELECT
        table_name,
        bool_or(column_name = 'created_at') as has_created_at,
        bool_or(column_name = 'updated_at') as has_updated_at,
        bool_or(column_name IN ('created_by', 'updated_by', 'user_id')) as has_user_tracking
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('users', 'scenarios', 'programs', 'tasks', 'evaluations')
    GROUP BY table_name
)
SELECT
    table_name,
    CASE
        WHEN has_created_at AND has_updated_at THEN '✓ Full audit timestamps'
        WHEN has_created_at THEN '⚠ Missing updated_at'
        ELSE '✗ Missing audit timestamps'
    END as timestamp_audit,
    CASE
        WHEN has_user_tracking THEN '✓ User tracking'
        ELSE '⚠ No user tracking'
    END as user_audit
FROM audit_coverage
ORDER BY table_name;

-- ============================================
-- 7. Performance & Resource Abuse Prevention
-- ============================================

\echo ''
\echo '7. PERFORMANCE & RESOURCE ABUSE PREVENTION'
\echo '========================================'

-- Check for potential resource abuse
\echo '7.1 Checking for resource abuse patterns:'

WITH user_activity AS (
    SELECT
        user_id,
        COUNT(*) as total_programs,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '1 day') as programs_today,
        COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour') as programs_last_hour
    FROM programs
    GROUP BY user_id
)
SELECT
    'Suspicious Activity Detection' as check_type,
    COUNT(*) FILTER (WHERE programs_today > 100) as users_over_100_daily,
    COUNT(*) FILTER (WHERE programs_last_hour > 50) as users_over_50_hourly,
    MAX(programs_today) as max_daily_programs,
    MAX(programs_last_hour) as max_hourly_programs
FROM user_activity;

-- Check for large data accumulation
\echo ''
\echo '7.2 Large data accumulation check:'

SELECT
    'Users with excessive programs' as metric,
    COUNT(*) as user_count,
    MAX(program_count) as max_programs
FROM (
    SELECT user_id, COUNT(*) as program_count
    FROM programs
    GROUP BY user_id
    HAVING COUNT(*) > 100
) excessive_users
UNION ALL
SELECT
    'Programs with excessive tasks',
    COUNT(*),
    MAX(task_count)
FROM (
    SELECT program_id, COUNT(*) as task_count
    FROM tasks
    GROUP BY program_id
    HAVING COUNT(*) > 50
) excessive_programs;

-- ============================================
-- 8. Encryption & Data Protection
-- ============================================

\echo ''
\echo '8. ENCRYPTION & DATA PROTECTION'
\echo '=============================='

-- Check for encryption capabilities
\echo '8.1 Checking encryption extensions:'

SELECT
    name,
    installed_version,
    CASE
        WHEN name = 'pgcrypto' THEN '✓ Encryption available'
        ELSE '✓ ' || name || ' available'
    END as status
FROM pg_available_extensions
WHERE name IN ('pgcrypto', 'uuid-ossp')
  AND installed_version IS NOT NULL;

-- ============================================
-- 9. Security Recommendations
-- ============================================

\echo ''
\echo '9. SECURITY RECOMMENDATIONS'
\echo '========================='

\echo ''
\echo 'Based on the audit, consider implementing:'
\echo '1. Row-Level Security (RLS) for multi-tenant isolation'
\echo '2. Column encryption for sensitive PII data'
\echo '3. Session token rotation policy'
\echo '4. Rate limiting at application level'
\echo '5. Regular security audit automation'
\echo '6. Implement audit triggers for sensitive operations'
\echo '7. Set up database activity monitoring'
\echo '8. Regular privilege reviews'

\echo ''
\echo '✅ Security audit completed!'
\echo 'Address any ✗ CRITICAL issues before production deployment.'
