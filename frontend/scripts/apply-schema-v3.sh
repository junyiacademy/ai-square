#!/bin/bash

# Apply Schema V3 to Local PostgreSQL
# This script will DROP and recreate all tables according to schema-v3

# Database connection settings
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-ai_square_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

echo "🔧 Applying Schema V3 to PostgreSQL..."
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Database: $DB_NAME"
echo ""

# Confirm before proceeding
echo "⚠️  WARNING: This will DROP all existing tables and recreate them!"
echo "   All existing data will be lost!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -n 3 -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]
then
    echo "❌ Operation cancelled"
    exit 1
fi

echo ""
echo "📝 Applying schema-v3.sql..."

# Apply the schema
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME \
    -f src/lib/repositories/postgresql/schema-v3.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema V3 applied successfully!"
    
    # Show created tables
    echo ""
    echo "📊 Created tables:"
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\dt" | grep -E "public \|"
    
    # Show created types
    echo ""
    echo "📊 Created types:"
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\dT+" | grep -E "public \|"
    
else
    echo "❌ Failed to apply schema"
    exit 1
fi

echo ""
echo "🎉 Schema V3 setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: npm run scripts:load-scenarios-v2"
echo "2. Test the application with demo users"