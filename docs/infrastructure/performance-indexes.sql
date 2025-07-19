-- AI Square Performance Optimization Indexes
-- Version: 1.0.0
-- Date: 2025-01-19
-- Description: High-performance indexes based on query patterns

-- ========================================
-- Core Query Pattern Indexes
-- ========================================

-- User-centric queries (最常用)
CREATE INDEX idx_programs_user_status_active 
    ON programs(user_id, status) 
    WHERE status IN ('active', 'pending');

CREATE INDEX idx_programs_user_completed 
    ON programs(user_id, end_time DESC) 
    WHERE status = 'completed';

-- Task execution queries
CREATE INDEX idx_tasks_program_status_active 
    ON tasks(program_id, status, task_index) 
    WHERE status IN ('pending', 'active');

CREATE INDEX idx_interactions_task_recent 
    ON interactions(task_id, created_at DESC);

-- Learning progress queries
CREATE INDEX idx_evaluations_user_recent 
    ON evaluations(user_id, created_at DESC);

CREATE INDEX idx_user_achievements_recent 
    ON user_achievements(user_id, earned_at DESC);

-- ========================================
-- High-Traffic Table Indexes
-- ========================================

-- AI Usage tracking (for cost control)
-- Skip if already exists in schema
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date 
    ON ai_usage(user_id, created_at DESC);

CREATE INDEX idx_ai_usage_feature_cost 
    ON ai_usage(feature, created_at DESC) 
    INCLUDE (total_tokens, estimated_cost_usd);

-- Interactions (prevent full scan)
-- Use created_at directly for date queries
CREATE INDEX IF NOT EXISTS idx_interactions_created 
    ON interactions(created_at DESC);

CREATE INDEX idx_interactions_task_type 
    ON interactions(task_id, type) 
    WHERE type IN ('user_input', 'ai_response');

-- ========================================
-- JSONB Performance Indexes
-- ========================================

-- User preferences queries
CREATE INDEX idx_users_learning_prefs_gin 
    ON users USING GIN(learning_preferences);

-- Scenario tasks queries
CREATE INDEX idx_scenarios_tasks_gin 
    ON scenarios USING GIN(tasks);

-- Program metadata queries
CREATE INDEX idx_programs_metadata_gin 
    ON programs USING GIN(metadata) 
    WHERE metadata IS NOT NULL;

-- Task context queries
CREATE INDEX idx_tasks_context_gin 
    ON tasks USING GIN(context) 
    WHERE context IS NOT NULL;

-- ========================================
-- Translation System Indexes
-- ========================================

-- Optimize translation lookups
CREATE INDEX idx_translations_entity_lookup 
    ON translations(entity_type, entity_id, language_code) 
    WHERE status = 'approved';

-- Translation content search
CREATE INDEX idx_translation_content_trigram 
    ON translations USING GIN(content gin_trgm_ops) 
    WHERE language_code = 'en';

-- ========================================
-- Question Bank Indexes (if implemented)
-- ========================================

-- Question reuse queries
CREATE INDEX IF EXISTS idx_task_questions_question_usage 
    ON task_questions(question_id, created_at DESC);

-- Question performance tracking
CREATE INDEX IF EXISTS idx_question_performance_recent 
    ON question_performance(question_id, period_start DESC);

-- ========================================
-- Composite Indexes for Complex Queries
-- ========================================

-- User dashboard query
CREATE INDEX idx_user_dashboard 
    ON programs(user_id, status, last_activity_at DESC) 
    INCLUDE (scenario_id, total_score, completed_tasks);

-- Scenario selection query  
CREATE INDEX idx_scenario_selection 
    ON scenarios(type, status, difficulty_level) 
    WHERE status = 'active';

-- Learning analytics query
CREATE INDEX idx_learning_analytics 
    ON tasks(program_id, updated_at) 
    INCLUDE (score, time_spent_seconds) 
    WHERE status = 'completed';

-- ========================================
-- Partial Indexes for Specific Queries
-- ========================================

-- Active users only
CREATE INDEX idx_users_active_only 
    ON users(last_active_at DESC) 
    WHERE onboarding_completed = true;

-- Recent programs only (last 30 days)
CREATE INDEX idx_programs_recent_30d 
    ON programs(created_at DESC) 
    WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days';

-- High scorers
CREATE INDEX idx_programs_high_scores 
    ON programs(total_score DESC) 
    WHERE total_score >= 90;

-- ========================================
-- Foreign Key Indexes (if not auto-created)
-- ========================================

-- Ensure all FKs have indexes
CREATE INDEX IF NOT EXISTS idx_programs_scenario_id ON programs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_tasks_program_id ON tasks(program_id);
CREATE INDEX IF NOT EXISTS idx_interactions_task_id ON interactions(task_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_task_id ON evaluations(task_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_program_id ON evaluations(program_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_scenario_domains_domain ON scenario_domains(domain);
CREATE INDEX IF NOT EXISTS idx_task_ksa_mappings_ksa_code ON task_ksa_mappings(ksa_code);

-- ========================================
-- Maintenance Commands
-- ========================================

-- Analyze tables for query planner
ANALYZE users;
ANALYZE programs;
ANALYZE tasks;
ANALYZE interactions;
ANALYZE evaluations;
ANALYZE scenarios;

-- Update table statistics
SELECT schemaname, tablename, last_analyze, last_autoanalyze 
FROM pg_stat_user_tables 
ORDER BY last_analyze NULLS FIRST;

-- ========================================
-- Index Usage Monitoring
-- ========================================

-- Create view for monitoring index usage
CREATE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'RARELY USED'
        WHEN idx_scan < 1000 THEN 'OCCASIONALLY USED'
        ELSE 'FREQUENTLY USED'
    END as usage_category
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Create view for identifying missing indexes
CREATE VIEW v_missing_indexes AS
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100
AND correlation < 0.1
AND attname NOT IN (
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid
    WHERE a.attnum = ANY(i.indkey)
);

-- ========================================
-- Performance Testing Queries
-- ========================================

-- Test user dashboard performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    u.id, u.name, u.level, u.total_xp,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') as active_programs,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'completed') as completed_programs,
    MAX(p.last_activity_at) as last_activity
FROM users u
LEFT JOIN programs p ON u.id = p.user_id
WHERE u.onboarding_completed = true
GROUP BY u.id
ORDER BY u.last_active_at DESC
LIMIT 20;

-- Test learning progress query
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    p.id,
    s.type as scenario_type,
    COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
    AVG(t.score) FILTER (WHERE t.status = 'completed') as avg_score,
    SUM(t.time_spent_seconds) as total_time
FROM programs p
JOIN scenarios s ON p.scenario_id = s.id
LEFT JOIN tasks t ON p.id = t.program_id
WHERE p.user_id = 'USER_ID_HERE'
AND p.status = 'active'
GROUP BY p.id, s.type;

-- ========================================
-- Index Maintenance Schedule
-- ========================================

-- Create function for regular index maintenance
CREATE OR REPLACE FUNCTION maintain_indexes() RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    -- Reindex tables with high write activity
    FOR r IN 
        SELECT tablename 
        FROM pg_stat_user_tables 
        WHERE n_tup_upd + n_tup_del > 10000
        AND last_autovacuum < CURRENT_TIMESTAMP - INTERVAL '7 days'
    LOOP
        EXECUTE 'REINDEX TABLE ' || r.tablename;
        RAISE NOTICE 'Reindexed table: %', r.tablename;
    END LOOP;
    
    -- Update statistics
    ANALYZE;
END;
$$ LANGUAGE plpgsql;

-- Schedule maintenance (use pg_cron or external scheduler)
-- SELECT cron.schedule('index-maintenance', '0 3 * * 0', 'SELECT maintain_indexes()');

-- ========================================
-- Success Message
-- ========================================
DO $$
BEGIN
    RAISE NOTICE 'Performance indexes created successfully!';
    RAISE NOTICE 'Remember to monitor index usage and adjust based on actual query patterns.';
    RAISE NOTICE 'Run ANALYZE after bulk data loads.';
END $$;