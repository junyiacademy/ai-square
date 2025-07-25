-- Migration: Remove legacy assessment_sessions references
-- Date: 2025-01-25
-- Description: Update user repository to use unified evaluations table instead of assessment_sessions

-- Note: In the unified learning architecture, assessment results are stored in the evaluations table
-- with evaluation_type = 'summative' or 'ai-feedback' for assessment mode

-- This migration doesn't need to create or drop tables, just documents the change
-- The actual fix is in the code (user-repository.ts) to use evaluations table

-- To check assessment results in the new structure:
-- SELECT * FROM evaluations 
-- WHERE user_id = ? 
-- AND task_id IN (SELECT id FROM tasks WHERE mode = 'assessment')
-- ORDER BY created_at DESC;