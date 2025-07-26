-- Migration: Move qualitativeFeedback from program.metadata.evaluationMetadata to evaluation.metadata
-- Purpose: Establish single source of truth for feedback data in evaluations table

-- Step 1: Copy qualitativeFeedback from programs to evaluations
UPDATE evaluations e
SET metadata = jsonb_set(
    COALESCE(e.metadata, '{}'::jsonb),
    '{qualitativeFeedback}',
    COALESCE(
        p.metadata->'evaluationMetadata'->'qualitativeFeedback',
        '{}'::jsonb
    )
)
FROM programs p
WHERE p.id = e.program_id
AND p.metadata->'evaluationMetadata'->'qualitativeFeedback' IS NOT NULL
AND (
    e.metadata->'qualitativeFeedback' IS NULL 
    OR jsonb_typeof(e.metadata->'qualitativeFeedback') = 'null'
    OR e.metadata->'qualitativeFeedback' = '{}'::jsonb
);

-- Step 2: Copy generatedLanguages from programs to evaluations
UPDATE evaluations e
SET metadata = jsonb_set(
    COALESCE(e.metadata, '{}'::jsonb),
    '{generatedLanguages}',
    COALESCE(
        p.metadata->'evaluationMetadata'->'generatedLanguages',
        '[]'::jsonb
    )
)
FROM programs p
WHERE p.id = e.program_id
AND p.metadata->'evaluationMetadata'->'generatedLanguages' IS NOT NULL
AND (
    e.metadata->'generatedLanguages' IS NULL 
    OR jsonb_typeof(e.metadata->'generatedLanguages') = 'null'
);

-- Step 3: Remove evaluationMetadata.qualitativeFeedback from programs (cleanup)
-- This removes the feedback data from program metadata to avoid confusion
UPDATE programs
SET metadata = metadata #- '{evaluationMetadata,qualitativeFeedback}'
WHERE metadata->'evaluationMetadata'->'qualitativeFeedback' IS NOT NULL;

-- Step 4: Remove evaluationMetadata.generatedLanguages from programs (cleanup)
UPDATE programs
SET metadata = metadata #- '{evaluationMetadata,generatedLanguages}'
WHERE metadata->'evaluationMetadata'->'generatedLanguages' IS NOT NULL;

-- Step 5: Log migration summary
DO $$
DECLARE
    programs_with_feedback INTEGER;
    evaluations_updated INTEGER;
BEGIN
    -- Count programs that had feedback
    SELECT COUNT(*) INTO programs_with_feedback
    FROM programs
    WHERE metadata->'evaluationMetadata' IS NOT NULL;
    
    -- Count evaluations that now have feedback
    SELECT COUNT(*) INTO evaluations_updated
    FROM evaluations
    WHERE metadata->'qualitativeFeedback' IS NOT NULL
    AND jsonb_typeof(metadata->'qualitativeFeedback') != 'null'
    AND metadata->'qualitativeFeedback' != '{}'::jsonb;
    
    RAISE NOTICE 'Migration completed: % programs processed, % evaluations updated with feedback data', 
        programs_with_feedback, evaluations_updated;
END $$;