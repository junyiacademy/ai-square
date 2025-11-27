-- Migration: Backfill last_login_at from sessions table
-- This migration populates the last_login_at field for existing users based on their session history

-- Step 1: Update last_login_at for users with sessions
UPDATE users u
SET last_login_at = s.max_session_created,
    updated_at = CURRENT_TIMESTAMP
FROM (
  SELECT user_id, MAX(created_at) as max_session_created
  FROM sessions
  GROUP BY user_id
) s
WHERE u.id = s.user_id
  AND u.last_login_at IS NULL;

-- Step 2: For users without sessions, use their created_at as a fallback
-- (This assumes they logged in at least once when creating the account)
UPDATE users
SET last_login_at = created_at,
    updated_at = CURRENT_TIMESTAMP
WHERE last_login_at IS NULL;

-- Step 3: Verify the migration
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN last_login_at IS NULL THEN 1 END) as null_last_login,
  COUNT(CASE WHEN last_login_at IS NOT NULL THEN 1 END) as has_last_login,
  MIN(last_login_at) as earliest_login,
  MAX(last_login_at) as latest_login
FROM users;

-- Step 4: Show sample of updated records
SELECT
  id,
  email,
  created_at,
  last_login_at,
  EXTRACT(EPOCH FROM (last_login_at - created_at)) / 86400 as days_since_creation
FROM users
ORDER BY last_login_at DESC
LIMIT 10;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN users.last_login_at IS 'Last login timestamp, backfilled from sessions.created_at or users.created_at';
