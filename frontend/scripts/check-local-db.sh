#!/bin/bash

# Check local database status and show summary

DB_NAME="${DB_NAME:-ai_square_db}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"

echo "🔍 AI Square Local Database Status"
echo "=================================="
echo ""
echo "📊 Database: $DB_NAME"
echo "🔌 Connection: $DB_USER@$DB_HOST:$DB_PORT"
echo ""

# Check connection
if ! psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "SELECT 1" >/dev/null 2>&1; then
    echo "❌ Cannot connect to database"
    exit 1
fi

echo "✅ Database connection OK"
echo ""

# Users summary
echo "👥 Demo Users:"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c "
SELECT '  - ' || email || ' (password: ' || 
  CASE 
    WHEN email = 'student@example.com' THEN 'student123'
    WHEN email = 'teacher@example.com' THEN 'teacher123'
    WHEN email = 'admin@example.com' THEN 'admin123'
    ELSE '123'
  END || ')' 
FROM users 
WHERE email LIKE '%@example.com'
ORDER BY email;"

echo ""

# Scenarios summary
echo "📚 Scenarios:"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c "
SELECT '  - ' || COALESCE(title->>'en', 'Untitled') || ' (' || mode || ')'
FROM scenarios
ORDER BY created_at;"

echo ""

# Stats
echo "📈 Statistics:"
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c "
SELECT 
  '  Total Users: ' || (SELECT COUNT(*) FROM users) || E'\n' ||
  '  Total Scenarios: ' || (SELECT COUNT(*) FROM scenarios) || E'\n' ||
  '  Total Programs: ' || (SELECT COUNT(*) FROM programs) || E'\n' ||
  '  Total Tasks: ' || (SELECT COUNT(*) FROM tasks);"

echo ""
echo "✅ Local database is ready for development!"
echo ""
echo "🚀 Start the development server with:"
echo "   cd frontend && npm run dev"