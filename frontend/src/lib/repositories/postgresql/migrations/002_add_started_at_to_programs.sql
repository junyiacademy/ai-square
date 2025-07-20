-- Migration: Add started_at field to programs table
-- This field tracks when a program actually starts (transitions from pending to active)
-- Different from created_at which is when the record was created

ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- Update existing active/completed programs to use start_time as started_at
UPDATE programs 
SET started_at = start_time 
WHERE status IN ('active', 'completed') AND started_at IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_programs_started_at ON programs(started_at);

-- Add comment for clarity
COMMENT ON COLUMN programs.started_at IS 'Timestamp when the program actually starts (status changes to active)';
COMMENT ON COLUMN programs.created_at IS 'Timestamp when the program record was created';
COMMENT ON COLUMN programs.start_time IS 'DEPRECATED: Use created_at for record creation and started_at for actual start';