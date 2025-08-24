-- Migration: Rename dimension_scores to domain_scores
-- Date: 2025-01-26
-- Purpose: Update column name to follow DDD principles

-- Step 1: Rename the column (only if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluations' 
        AND column_name = 'dimension_scores'
    ) THEN
        ALTER TABLE evaluations 
        RENAME COLUMN dimension_scores TO domain_scores;
    END IF;
END $$;

-- Step 2: Also rename in programs table if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'programs' 
        AND column_name = 'dimension_scores'
    ) THEN
        ALTER TABLE programs 
        RENAME COLUMN dimension_scores TO domain_scores;
    END IF;
END $$;

-- Step 3: Update any existing data that might have the old field name in JSON
-- This is safe to run even if no data exists
UPDATE evaluations
SET metadata = 
    CASE 
        WHEN metadata ? 'dimension_scores' THEN
            (metadata - 'dimension_scores') || jsonb_build_object('domain_scores', metadata->'dimension_scores')
        ELSE metadata
    END
WHERE metadata ? 'dimension_scores';

-- Step 4: Update pbl_data if it exists and contains dimension_scores
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluations' 
        AND column_name = 'pbl_data'
    ) THEN
        UPDATE evaluations
        SET pbl_data = 
            CASE 
                WHEN pbl_data ? 'dimension_scores' THEN
                    (pbl_data - 'dimension_scores') || jsonb_build_object('domain_scores', pbl_data->'dimension_scores')
                ELSE pbl_data
            END
        WHERE pbl_data ? 'dimension_scores';
    END IF;
END $$;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN evaluations.domain_scores IS 'Domain-specific scores (e.g., engaging_with_ai, creating_with_ai)';
COMMENT ON COLUMN programs.domain_scores IS 'Aggregated domain scores across all tasks';