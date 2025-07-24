-- Initialize local database with demo users and data
-- Usage: psql -U postgres -h localhost -d ai_square_db -f src/scripts/init-local-db.sql

-- Create demo users if they don't exist
INSERT INTO users (id, email, name, role, status, metadata, created_at, updated_at)
VALUES 
  -- Student user
  ('11111111-1111-1111-1111-111111111111', 'student@example.com', 'Demo Student', 'student', 'active', 
   '{"password_hash": "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", "preferred_language": "en"}', 
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Teacher user
  ('22222222-2222-2222-2222-222222222222', 'teacher@example.com', 'Demo Teacher', 'teacher', 'active',
   '{"password_hash": "1b4f0e9851971998e732078544c96b36c3d01cedf7caa332359d6f1d83567014", "preferred_language": "en"}',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Admin user
  ('33333333-3333-3333-3333-333333333333', 'admin@example.com', 'Demo Admin', 'admin', 'active',
   '{"password_hash": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", "preferred_language": "en"}',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  -- Test users for different languages
  ('44444444-4444-4444-4444-444444444444', 'test-zh@example.com', '測試用戶', 'student', 'active',
   '{"password_hash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3", "preferred_language": "zhTW"}',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  
  ('55555555-5555-5555-5555-555555555555', 'test-es@example.com', 'Usuario Prueba', 'student', 'active',
   '{"password_hash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3", "preferred_language": "es"}',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  metadata = EXCLUDED.metadata,
  updated_at = CURRENT_TIMESTAMP;

-- Display created users
SELECT id, email, name, role, metadata->>'preferred_language' as language 
FROM users 
WHERE email LIKE '%@example.com' 
ORDER BY created_at;

-- Count scenarios
SELECT 
  mode,
  COUNT(*) as count,
  array_agg(title->>'en' ORDER BY created_at) as titles
FROM scenarios 
GROUP BY mode;

-- Count programs by user
SELECT 
  u.email,
  COUNT(p.id) as program_count,
  COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_count
FROM users u
LEFT JOIN programs p ON u.id = p.user_id
WHERE u.email LIKE '%@example.com'
GROUP BY u.email
ORDER BY u.email;

-- Summary
SELECT 
  (SELECT COUNT(*) FROM users WHERE email LIKE '%@example.com') as demo_users,
  (SELECT COUNT(*) FROM scenarios) as total_scenarios,
  (SELECT COUNT(*) FROM programs) as total_programs,
  (SELECT COUNT(*) FROM tasks) as total_tasks;

-- Demo user credentials info
SELECT E'\n=== Demo User Credentials ===\n' ||
       E'student@example.com : student123\n' ||
       E'teacher@example.com : teacher123\n' ||
       E'admin@example.com   : admin123\n' ||
       E'test-zh@example.com : 123\n' ||
       E'test-es@example.com : 123\n' as credentials;