#!/bin/bash

# Initialize local database for AI Square
# This script sets up demo users and loads scenarios from YAML

set -e

echo "🚀 Initializing AI Square Local Database"
echo "======================================="

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on localhost:5432"
    echo "Please start PostgreSQL first"
    exit 1
fi

# Database configuration
DB_NAME="${DB_NAME:-ai_square_db}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo ""
echo "📊 Database Configuration:"
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  User: $DB_USER"

# Check if database exists
if ! psql -U $DB_USER -h $DB_HOST -p $DB_PORT -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo ""
    echo "❌ Database '$DB_NAME' does not exist"
    echo "Please create it first with: createdb -U $DB_USER -h $DB_HOST $DB_NAME"
    exit 1
fi

# Run schema creation if needed
echo ""
echo "📝 Checking database schema..."
TABLE_COUNT=$(psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")

if [ $TABLE_COUNT -eq 0 ]; then
    echo "  Creating database schema..."
    psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f src/lib/repositories/postgresql/schema-v4.sql
    echo "  ✅ Schema created"
else
    echo "  ✅ Schema already exists ($TABLE_COUNT tables)"
fi

# Initialize demo users
echo ""
echo "👥 Creating demo users..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f src/scripts/init-local-db.sql

# Load scenarios from YAML
echo ""
echo "📚 Loading scenarios from YAML files..."
cd frontend 2>/dev/null || true
npx tsx src/scripts/populate-local-scenarios.ts

echo ""
echo "✅ Database initialization complete!"
echo ""
echo "=== Demo User Credentials ==="
echo "student@example.com : student123"
echo "teacher@example.com : teacher123"
echo "admin@example.com   : admin123"
echo "test-zh@example.com : 123"
echo "test-es@example.com : 123"
echo ""
echo "🎯 You can now start the development server with: npm run dev"