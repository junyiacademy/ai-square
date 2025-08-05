-- Add password_hash column to users table for secure authentication
-- Migration: 20250204-add-password-column

-- Add password_hash column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add role column for user permissions
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student';

-- Add email verification columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

-- Add index for email lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- Add index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Update metadata to ensure it's JSONB (should already be)
ALTER TABLE users 
ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for user authentication';
COMMENT ON COLUMN users.role IS 'User role: student, teacher, admin, etc.';
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN users.email_verified_at IS 'Timestamp when email was verified';

-- Create verification_tokens table for email verification
CREATE TABLE IF NOT EXISTS verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(50) NOT NULL DEFAULT 'email_verification',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for verification_tokens
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON verification_tokens(expires_at);

COMMENT ON TABLE verification_tokens IS 'Stores temporary tokens for email verification and password reset';

-- Create sessions table for better session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

COMMENT ON TABLE user_sessions IS 'Manages user login sessions with tokens';

-- Grant necessary permissions (adjust based on your database user)
-- GRANT ALL ON verification_tokens TO your_app_user;
-- GRANT ALL ON user_sessions TO your_app_user;