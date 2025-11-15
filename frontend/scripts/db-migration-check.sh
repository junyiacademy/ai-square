#!/bin/bash
# Database Migration Check Script
# 確保資料庫結構與程式碼同步

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${CYAN}🔍 Database Migration Check${NC}"
echo "================================"

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-ai_square_db}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# 1. Check database version
echo -e "${BLUE}Checking database version...${NC}"
CURRENT_VERSION=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT value FROM system_config WHERE key = 'schema_version' LIMIT 1;
" 2>/dev/null || echo "unknown")

echo "Current DB version: $CURRENT_VERSION"

# 2. Check expected version from code
EXPECTED_VERSION="v3.1" # Should match schema file version

# 3. Check critical tables and columns
echo -e "${BLUE}Checking critical table structures...${NC}"

check_column() {
    local table=$1
    local column=$2
    local exists=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = '$table' AND column_name = '$column';
    " 2>/dev/null || echo "0")

    if [ "$exists" = "1" ]; then
        echo -e "  ${GREEN}✓${NC} $table.$column exists"
        return 0
    else
        echo -e "  ${RED}✗${NC} $table.$column missing"
        return 1
    fi
}

# Check users table structure
echo "Checking users table..."
check_column "users" "id"
check_column "users" "email"
check_column "users" "name"
check_column "users" "password_hash"  # v2 field
check_column "users" "role"           # v2 field
check_column "users" "preferred_language" # v3 field
check_column "users" "metadata"       # v3 field

# 4. Check for schema inconsistencies
echo -e "${BLUE}Checking for inconsistencies...${NC}"

# Count demo users
DEMO_USERS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM users WHERE email LIKE '%example.com';
" 2>/dev/null || echo "0")

echo "Demo users found: $DEMO_USERS"

# Check if demo users have passwords
USERS_WITH_PASSWORDS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM users
    WHERE email LIKE '%example.com'
    AND password_hash IS NOT NULL;
" 2>/dev/null || echo "0")

echo "Demo users with passwords: $USERS_WITH_PASSWORDS"

# 5. Generate report
echo ""
echo -e "${CYAN}📊 Migration Status Report${NC}"
echo "================================"

if [ "$CURRENT_VERSION" != "$EXPECTED_VERSION" ]; then
    echo -e "${YELLOW}⚠️  Database version mismatch${NC}"
    echo "  Current: $CURRENT_VERSION"
    echo "  Expected: $EXPECTED_VERSION"
    echo ""
    echo "Recommended actions:"
    echo "  1. Run migration script: npm run db:migrate"
    echo "  2. Or reset database: npm run db:reset (WARNING: data loss)"
else
    echo -e "${GREEN}✓ Database version matches${NC}"
fi

if [ "$DEMO_USERS" = "0" ]; then
    echo -e "${YELLOW}⚠️  No demo users found${NC}"
    echo "  Run: npm run db:seed-demo"
elif [ "$USERS_WITH_PASSWORDS" = "0" ]; then
    echo -e "${YELLOW}⚠️  Demo users exist but have no passwords${NC}"
    echo "  Run: npm run db:fix-demo-passwords"
else
    echo -e "${GREEN}✓ Demo users configured correctly${NC}"
fi
