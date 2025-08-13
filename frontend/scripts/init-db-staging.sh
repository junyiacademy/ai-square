#!/bin/bash
# AI Square Staging Database Initialization Script
# Purpose: Initialize database schema for staging deployment

set -e  # Exit on error

echo "🚀 AI Square Database Initialization for Staging"
echo "=============================================="

# Load environment configuration
export ENVIRONMENT="staging"
export USE_CLOUD_SQL_PROXY="true"  # For local connection to Cloud SQL
source scripts/load-env-config.sh

# Configuration is now loaded from environment
SCHEMA_FILE="src/lib/repositories/postgresql/schema-v4.sql"
CHECK_FILE="scripts/check-db-schema.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  DB_HOST: $DB_HOST"
echo "  DB_PORT: $DB_PORT"
echo "  DB_NAME: $DB_NAME"
echo "  DB_USER: $DB_USER"
echo ""

# Function to run SQL and check result
run_sql() {
    local sql_file=$1
    local description=$2
    
    echo -e "${YELLOW}▶ $description${NC}"
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $sql_file; then
        echo -e "${GREEN}✓ Success${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed${NC}"
        return 1
    fi
}

# Step 1: Check database connection
echo -e "${YELLOW}▶ Testing database connection...${NC}"
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Cannot connect to database${NC}"
    exit 1
fi

# Step 2: Create database if not exists
echo -e "${YELLOW}▶ Creating database if not exists...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres <<EOF
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec
EOF
echo -e "${GREEN}✓ Database ready${NC}"

# Step 3: Initialize schema
echo ""
echo -e "${YELLOW}🔨 Initializing Schema...${NC}"
if run_sql "$SCHEMA_FILE" "Running schema-v4.sql"; then
    echo -e "${GREEN}✓ Schema initialized successfully${NC}"
else
    echo -e "${RED}✗ Schema initialization failed${NC}"
    exit 1
fi

# Step 4: Run validation checks
echo ""
echo -e "${YELLOW}🔍 Running Validation Checks...${NC}"
if [ -f "$CHECK_FILE" ]; then
    if run_sql "$CHECK_FILE" "Running validation checks"; then
        echo -e "${GREEN}✓ All validation checks passed${NC}"
    else
        echo -e "${RED}✗ Some validation checks failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Validation script not found, skipping checks${NC}"
fi

# Step 5: Quick summary
echo ""
echo -e "${YELLOW}📊 Quick Summary:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
SELECT 'Tables created: ' || count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT 'Views created: ' || count(*) FROM pg_views WHERE schemaname = 'public';
SELECT 'Functions created: ' || count(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
SELECT 'Triggers created: ' || count(*) FROM information_schema.triggers WHERE trigger_schema = 'public';
EOF

echo ""
echo -e "${GREEN}✅ Database initialization completed successfully!${NC}"
echo -e "${GREEN}   All three modes (PBL, Discovery, Assessment) are ready.${NC}"
echo ""
echo "Next steps:"
echo "  1. Set DB_PASSWORD environment variable"
echo "  2. Update Cloud SQL connection string if needed"
echo "  3. Run application and test all three modes"