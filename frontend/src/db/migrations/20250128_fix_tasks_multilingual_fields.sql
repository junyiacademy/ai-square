-- Migration: Fix tasks table multilingual fields
-- Convert title and description from VARCHAR/TEXT to JSONB for proper multilingual support

-- Step 1: Add new JSONB columns
ALTER TABLE tasks 
ADD COLUMN title_new JSONB,
ADD COLUMN description_new JSONB;

-- Step 2: Migrate existing data
-- Parse JSON strings to proper JSONB objects
UPDATE tasks 
SET 
  title_new = CASE 
    WHEN title IS NULL THEN NULL
    WHEN title::text LIKE '{%' THEN title::jsonb
    ELSE jsonb_build_object('en', title)
  END,
  description_new = CASE 
    WHEN description IS NULL THEN NULL
    WHEN description::text LIKE '{%' THEN description::jsonb
    ELSE jsonb_build_object('en', description)
  END;

-- Step 3: Drop old columns and rename new ones
ALTER TABLE tasks 
DROP COLUMN title,
DROP COLUMN description;

ALTER TABLE tasks 
RENAME COLUMN title_new TO title;

ALTER TABLE tasks 
RENAME COLUMN description_new TO description;

-- Step 4: Add indexes for better query performance
CREATE INDEX idx_tasks_title_en ON tasks ((title->>'en'));
CREATE INDEX idx_tasks_title_zhTW ON tasks ((title->>'zhTW'));

-- Step 5: Add comments for documentation
COMMENT ON COLUMN tasks.title IS 'Multilingual task title stored as JSONB object with language codes as keys';
COMMENT ON COLUMN tasks.description IS 'Multilingual task description stored as JSONB object with language codes as keys';

-- Verify the migration
SELECT 
  id,
  title,
  jsonb_typeof(title) as title_type,
  description,
  jsonb_typeof(description) as desc_type
FROM tasks 
LIMIT 5;