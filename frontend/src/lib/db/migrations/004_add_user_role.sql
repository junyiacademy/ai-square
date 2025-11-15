-- Migration: Add role column to users table
-- Version: 004
-- Description: Add role column for user authorization

-- Add role column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Update any existing users without a role
UPDATE users SET role = 'user' WHERE role IS NULL;
