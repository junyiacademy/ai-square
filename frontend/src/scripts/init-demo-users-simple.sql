-- Initialize demo users for local development
-- Works with the current database schema

-- Create demo users if they don't exist
INSERT INTO users (id, email, name, metadata)
VALUES 
  -- Student user (password: student123)
  ('11111111-1111-1111-1111-111111111111', 'student@example.com', 'Demo Student', 
   '{"password_hash": "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", "role": "student"}'),
  
  -- Teacher user (password: teacher123)
  ('22222222-2222-2222-2222-222222222222', 'teacher@example.com', 'Demo Teacher',
   '{"password_hash": "1b4f0e9851971998e732078544c96b36c3d01cedf7caa332359d6f1d83567014", "role": "teacher"}'),
  
  -- Admin user (password: admin123)
  ('33333333-3333-3333-3333-333333333333', 'admin@example.com', 'Demo Admin',
   '{"password_hash": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", "role": "admin"}')
ON CONFLICT (id) DO UPDATE SET
  metadata = EXCLUDED.metadata,
  updated_at = CURRENT_TIMESTAMP;

-- Display created users
SELECT id, email, name, metadata->>'role' as role, preferred_language 
FROM users 
WHERE email LIKE '%@example.com' 
ORDER BY created_at;

-- Summary
SELECT 
  (SELECT COUNT(*) FROM users WHERE email LIKE '%@example.com') as demo_users,
  (SELECT COUNT(*) FROM scenarios) as total_scenarios,
  (SELECT COUNT(*) FROM programs) as total_programs;

-- Demo user credentials info
SELECT E'\n=== Demo User Credentials ===\n' ||
       E'student@example.com : student123\n' ||
       E'teacher@example.com : teacher123\n' ||
       E'admin@example.com   : admin123\n' as credentials;