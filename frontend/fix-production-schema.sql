-- Fix Schema V4 column name issue
-- Check if column exists before altering
DO $$ 
BEGIN
    -- If last_active_at exists, rename it to last_active_date
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' 
               AND column_name = 'last_active_at') THEN
        ALTER TABLE users RENAME COLUMN last_active_at TO last_active_date;
        ALTER TABLE users ALTER COLUMN last_active_date TYPE DATE USING last_active_date::DATE;
    END IF;
    
    -- If neither exists, create last_active_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'last_active_date') THEN
        ALTER TABLE users ADD COLUMN last_active_date DATE;
    END IF;
END $$;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE '%last_active%';
