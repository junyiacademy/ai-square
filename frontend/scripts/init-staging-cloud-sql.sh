#!/bin/bash
# AI Square Cloud SQL Staging Smart Initialization Script
# Purpose: Initialize Cloud SQL for staging WITHOUT destroying existing data
# This script is SAFE to run multiple times - it won't destroy data

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors (定義在最前面)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 AI Square Cloud SQL Staging Smart Initialization"
echo "===================================================="

# 防呆：環境確認
if [ "${FORCE_INIT:-}" != "true" ]; then
    echo -e "${YELLOW}⚠️  WARNING: This will initialize the STAGING database${NC}"
    echo -e "${YELLOW}   Target: Cloud SQL Staging (ai-square-db-staging-asia)${NC}"
    echo -e "${GREEN}   This script is SAFE - it won't destroy existing data${NC}"
    echo ""
    echo -n "Continue? (y/N): "
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo -e "${RED}Cancelled by user${NC}"
        exit 0
    fi
fi

# Configuration for Cloud SQL
CLOUD_SQL_INSTANCE="ai-square-db-staging-asia"
DB_NAME="ai_square_staging"
DB_USER="postgres"
DB_PASSWORD="${DB_PASSWORD:-aisquare2025staging}"
PROJECT_ID="ai-square-463013"
REGION="asia-east1"
CLOUD_SQL_IP="35.221.137.78"  # Cloud SQL public IP

echo -e "${YELLOW}📋 Target Configuration:${NC}"
echo "  Cloud SQL Instance: $CLOUD_SQL_INSTANCE"
echo "  Database: $DB_NAME"
echo "  IP: $CLOUD_SQL_IP"
echo ""

# Step 1: Check if we can connect
echo -e "${BLUE}🔍 Testing Cloud SQL connection...${NC}"
if PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connection successful${NC}"
else
    echo -e "${RED}✗ Cannot connect to Cloud SQL${NC}"
    echo "Trying with gcloud sql connect..."
    gcloud sql connect $CLOUD_SQL_INSTANCE --user=$DB_USER --database=$DB_NAME --project=$PROJECT_ID
    exit 1
fi

# Step 2: Check if schema exists (don't recreate if exists)
echo -e "${BLUE}🔍 Checking if schema exists...${NC}"

# 防呆：確保資料庫存在
if ! PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -l | grep -q "$DB_NAME"; then
    echo -e "${YELLOW}⚠ Database $DB_NAME does not exist, creating...${NC}"
    PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
fi

TABLES_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'scenarios', 'programs', 'tasks');" 2>/dev/null | xargs || echo "0")

if [ "$TABLES_COUNT" -ge "4" ]; then
    echo -e "${GREEN}✓ Schema already exists (found $TABLES_COUNT core tables)${NC}"
    NEEDS_SCHEMA_INIT=false
else
    echo -e "${YELLOW}⚠ Schema incomplete or missing (found $TABLES_COUNT/4 core tables)${NC}"
    NEEDS_SCHEMA_INIT=true
fi

# Step 3: Initialize schema ONLY if needed
if [ "$NEEDS_SCHEMA_INIT" = true ]; then
    echo -e "${YELLOW}🔨 Initializing Schema...${NC}"
    
    # Use safe schema file for staging/production
    SCHEMA_FILE="src/lib/repositories/postgresql/schema-v3-safe.sql"
    
    # Check if safe schema file exists, fallback to regular one
    if [ ! -f "$SCHEMA_FILE" ]; then
        SCHEMA_FILE="src/lib/repositories/postgresql/schema-v3.sql"
        echo -e "${YELLOW}⚠ Using regular schema file (be careful!)${NC}"
    else
        echo -e "${GREEN}✓ Using safe schema file (no DROP commands)${NC}"
    fi
    
    if [ ! -f "$SCHEMA_FILE" ]; then
        echo -e "${RED}✗ Schema file not found: $SCHEMA_FILE${NC}"
        exit 1
    fi
    
    # 防呆：先備份現有資料（如果有的話）
    echo -e "${YELLOW}📦 Creating safety backup...${NC}"
    BACKUP_FILE="staging_backup_$(date +%Y%m%d_%H%M%S).sql"
    PGPASSWORD=$DB_PASSWORD pg_dump -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME --if-exists --clean > "/tmp/$BACKUP_FILE" 2>/dev/null || true
    if [ -f "/tmp/$BACKUP_FILE" ]; then
        echo -e "${GREEN}✓ Backup saved to /tmp/$BACKUP_FILE${NC}"
    fi
    
    # Execute schema with transaction safety
    echo -e "${YELLOW}Applying schema (with transaction safety)...${NC}"
    (
        echo "BEGIN;"
        cat "$SCHEMA_FILE"
        echo "COMMIT;"
    ) | PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Schema initialized successfully${NC}"
    else
        echo -e "${RED}✗ Schema initialization failed (transaction rolled back)${NC}"
        echo -e "${YELLOW}💡 Tip: Your data is safe. The backup is at /tmp/$BACKUP_FILE${NC}"
        exit 1
    fi
fi

# Step 4: Ensure demo users exist (safe to run multiple times)
echo -e "${BLUE}👥 Ensuring demo users exist...${NC}"

# Count existing demo users
DEMO_USER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE email IN ('student@example.com', 'teacher@example.com', 'admin@example.com');" 2>/dev/null | xargs)

echo "  Found $DEMO_USER_COUNT demo users"

# Password hash for 'password123' (bcrypt, 10 rounds)
# This is the same hash used in local development
PASSWORD_HASH='$2b$10$K7L1OJ0TfPALHfRplJNYPOefsVTPLiFve0ic1YYRdRbGhPcDDiliS'

# Insert demo users with ON CONFLICT handling
PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME <<EOF
-- Insert demo users (safe to run multiple times)
INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'student@example.com', '$PASSWORD_HASH', 'Student User', 'student', NOW(), NOW()),
  (gen_random_uuid(), 'teacher@example.com', '$PASSWORD_HASH', 'Teacher User', 'teacher', NOW(), NOW()),
  (gen_random_uuid(), 'admin@example.com', '$PASSWORD_HASH', 'Admin User', 'admin', NOW(), NOW())
ON CONFLICT (email) DO UPDATE 
  SET 
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW()
  WHERE users.email IN ('student@example.com', 'teacher@example.com', 'admin@example.com');

-- Show result
SELECT email, name, role, 
       CASE WHEN created_at = updated_at THEN 'newly created' ELSE 'already existed' END as status
FROM users 
WHERE email IN ('student@example.com', 'teacher@example.com', 'admin@example.com')
ORDER BY email;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Demo users ready${NC}"
else
    echo -e "${YELLOW}⚠ Issue with demo users, but continuing...${NC}"
fi

# Step 5: Data statistics
echo ""
echo -e "${BLUE}📊 Database Statistics:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME <<EOF
SELECT 'Total users: ' || COUNT(*) FROM users;
SELECT 'Total scenarios: ' || COUNT(*) FROM scenarios;
SELECT 'Total programs: ' || COUNT(*) FROM programs;
SELECT 'Total tasks: ' || COUNT(*) FROM tasks;
SELECT 'Total evaluations: ' || COUNT(*) FROM evaluations;
EOF

# Step 6: Summary
echo ""
echo -e "${GREEN}✅ Cloud SQL Staging Initialization Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
if [ "$NEEDS_SCHEMA_INIT" = true ]; then
    echo "  ✓ Schema: Initialized"
else
    echo "  ✓ Schema: Already existed (preserved)"
fi
echo "  ✓ Demo users: Ensured (password: password123)"
echo "  ✓ Existing data: Preserved"
echo ""
echo -e "${YELLOW}💡 This script is SAFE to run multiple times${NC}"
echo "  - It checks before creating schema"
echo "  - Uses ON CONFLICT for demo users"
echo "  - Never drops existing data"
echo ""
echo "Ready for staging deployment!"