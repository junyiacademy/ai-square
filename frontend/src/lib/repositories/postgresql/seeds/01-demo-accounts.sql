-- ============================================
-- Demo Accounts Seed Data
-- ============================================
-- This file creates demo accounts for testing
-- Password for all demo accounts: {role}123
-- e.g., student@example.com: student123
-- ============================================

-- Create demo accounts only if they don't exist
-- Using gen_random_uuid() from pgcrypto extension

-- Student Account
INSERT INTO users (
    id, email, name, password_hash, role,
    email_verified, email_verified_at,
    preferred_language, level, total_xp,
    onboarding_completed, metadata,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'student@example.com',
    'Student User',
    '$2b$10$GSLI4.ooV/jrN5RZMOAyf.SftBwwRsbmC.SMRDeDRLH1uCnIapR5e', -- student123
    'student',
    true,
    CURRENT_TIMESTAMP,
    'en',
    1,
    0,
    false,
    '{"description": "Demo student account", "seeded": true}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Teacher Account
INSERT INTO users (
    id, email, name, password_hash, role,
    email_verified, email_verified_at,
    preferred_language, level, total_xp,
    onboarding_completed, metadata,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'teacher@example.com',
    'Teacher User',
    '$2b$10$xkTFHLjtA4BvhZrW8Pm6NOV/zJn5SX7gxZB9MSUcaptGrZrMPJJ5e', -- teacher123
    'teacher',
    true,
    CURRENT_TIMESTAMP,
    'en',
    1,
    0,
    false,
    '{"description": "Demo teacher account", "seeded": true}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Admin Account
INSERT INTO users (
    id, email, name, password_hash, role,
    email_verified, email_verified_at,
    preferred_language, level, total_xp,
    onboarding_completed, metadata,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'admin@example.com',
    'Admin User',
    '$2b$10$9nEfXi5LULvFjV/LKp8WFuglp9Y5jttH9O4Ix0AwpVg4OZdvtTbiS', -- admin123
    'admin',
    true,
    CURRENT_TIMESTAMP,
    'en',
    1,
    0,
    false,
    '{"description": "Demo admin account", "seeded": true}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Parent Account
INSERT INTO users (
    id, email, name, password_hash, role,
    email_verified, email_verified_at,
    preferred_language, level, total_xp,
    onboarding_completed, metadata,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'parent@example.com',
    'Parent User',
    '$2b$10$KxjBKURfCyW8rZH5g0BQy.8tGkL8AT6DxUphQyJ.EJHKxR1vAXWJi', -- parent123
    'parent',
    true,
    CURRENT_TIMESTAMP,
    'en',
    1,
    0,
    false,
    '{"description": "Demo parent account", "seeded": true}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Guest Account
INSERT INTO users (
    id, email, name, password_hash, role,
    email_verified, email_verified_at,
    preferred_language, level, total_xp,
    onboarding_completed, metadata,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'guest@example.com',
    'Guest User',
    '$2b$10$T6Fb/LwXk/3M6vL6M8Jg6OGXvQJFYJ8Hc3JZnUKG5YvdPnFZzwxqC', -- guest123
    'guest',
    true,
    CURRENT_TIMESTAMP,
    'en',
    1,
    0,
    false,
    '{"description": "Demo guest account", "seeded": true}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Test Account (for automated testing)
INSERT INTO users (
    id, email, name, password_hash, role,
    email_verified, email_verified_at,
    preferred_language, level, total_xp,
    onboarding_completed, metadata,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'test@example.com',
    'Test User',
    '$2b$10$eUJFf2Vs0qm6L3g5.VO3MOD4xVVZwM8dVPKj5l0Gwe/eQoH9kBGBa', -- password123
    'student',
    true,
    CURRENT_TIMESTAMP,
    'en',
    1,
    0,
    false,
    '{"description": "Test account for automated testing", "seeded": true}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Verify seed data
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count 
    FROM users 
    WHERE email LIKE '%@example.com';
    
    RAISE NOTICE 'Demo accounts seeded: % users', user_count;
END $$;