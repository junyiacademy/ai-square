-- Schema V3 Example Queries
-- These queries demonstrate the benefits of mode propagation

-- ============================================
-- 1. Direct Mode Queries (No JOINs needed!)
-- ============================================

-- Get all PBL programs for a user
SELECT * FROM programs 
WHERE user_id = '...' AND mode = 'pbl'
ORDER BY last_activity_at DESC;

-- Get all Discovery tasks
SELECT * FROM tasks 
WHERE mode = 'discovery'
ORDER BY created_at DESC;

-- Get Assessment evaluations with high scores
SELECT * FROM evaluations 
WHERE mode = 'assessment' AND score >= 90
ORDER BY created_at DESC;

-- Count tasks by mode and type
SELECT mode, type, COUNT(*) as count
FROM tasks
GROUP BY mode, type
ORDER BY mode, type;

-- ============================================
-- 2. Performance Comparison
-- ============================================

-- OLD WAY: Get PBL evaluations (4 table JOIN)
SELECT e.* 
FROM evaluations e
JOIN tasks t ON e.task_id = t.id
JOIN programs p ON t.program_id = p.id
JOIN scenarios s ON p.scenario_id = s.id
WHERE s.mode = 'pbl';

-- NEW WAY: Get PBL evaluations (Direct query)
SELECT * FROM evaluations WHERE mode = 'pbl';

-- ============================================
-- 3. Complex Queries Simplified
-- ============================================

-- Get user's progress by mode
SELECT 
    mode,
    COUNT(DISTINCT CASE WHEN status = 'completed' THEN id END) as completed,
    COUNT(DISTINCT id) as total,
    AVG(total_score) as avg_score
FROM programs
WHERE user_id = '...'
GROUP BY mode;

-- Get evaluation statistics by mode
SELECT 
    mode,
    evaluation_type,
    COUNT(*) as count,
    AVG(score) as avg_score,
    MIN(score) as min_score,
    MAX(score) as max_score
FROM evaluations
GROUP BY mode, evaluation_type
ORDER BY mode, evaluation_type;

-- Find users who have completed all three modes
SELECT user_id, COUNT(DISTINCT mode) as modes_completed
FROM programs
WHERE status = 'completed'
GROUP BY user_id
HAVING COUNT(DISTINCT mode) = 3;

-- ============================================
-- 4. Mode-Specific Analytics
-- ============================================

-- PBL: Average chat interactions per task
SELECT 
    AVG(jsonb_array_length(interactions)) as avg_interactions
FROM tasks
WHERE mode = 'pbl' AND type = 'chat';

-- Discovery: Career exploration paths
SELECT 
    discovery_data->>'careerType' as career,
    COUNT(*) as explorations
FROM programs p
JOIN scenarios s ON p.scenario_id = s.id
WHERE p.mode = 'discovery'
GROUP BY discovery_data->>'careerType';

-- Assessment: Pass rates by difficulty
SELECT 
    s.difficulty,
    COUNT(CASE WHEN e.score >= 70 THEN 1 END)::float / COUNT(*) as pass_rate
FROM evaluations e
JOIN programs p ON e.program_id = p.id
JOIN scenarios s ON p.scenario_id = s.id
WHERE e.mode = 'assessment' AND e.evaluation_type = 'program'
GROUP BY s.difficulty;

-- ============================================
-- 5. Helper Function Usage
-- ============================================

-- Get user's PBL programs
SELECT * FROM get_user_programs_by_mode('user-uuid', 'pbl');

-- Get all Discovery exploration tasks
SELECT * FROM get_tasks_by_mode_and_type('discovery', 'exploration');

-- ============================================
-- 6. Mode Validation Queries
-- ============================================

-- Verify mode consistency (should return 0 rows)
SELECT p.id, p.mode as program_mode, s.mode as scenario_mode
FROM programs p
JOIN scenarios s ON p.scenario_id = s.id
WHERE p.mode != s.mode;

-- Check task mode consistency (should return 0 rows)
SELECT t.id, t.mode as task_mode, p.mode as program_mode
FROM tasks t
JOIN programs p ON t.program_id = p.id
WHERE t.mode != p.mode;