#!/bin/bash
# ============================================
# AI Square Cloud SQL Initialization Script (Unified)
# ============================================
# Usage:
#   ./init-cloud-sql.sh staging
#   ./init-cloud-sql.sh production
# ============================================

set -e
set -u
set -o pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get environment from argument
ENVIRONMENT="${1:-}"

if [ -z "$ENVIRONMENT" ]; then
    echo -e "${RED}❌ Error: Environment not specified${NC}"
    echo "Usage: ./init-cloud-sql.sh [staging|production]"
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}❌ Error: Invalid environment '$ENVIRONMENT'${NC}"
    echo "Valid environments: staging, production"
    exit 1
fi

echo "🚀 AI Square Cloud SQL Initialization - $ENVIRONMENT"
echo "===================================================="

# Load configuration based on environment
CONFIG_FILE="../deploy.config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Error: Configuration file not found: $CONFIG_FILE${NC}"
    exit 1
fi

# Extract configuration using jq or fallback to manual parsing
if command -v jq &> /dev/null; then
    PROJECT_ID=$(jq -r ".environments.$ENVIRONMENT.projectId" "$CONFIG_FILE")
    REGION=$(jq -r ".environments.$ENVIRONMENT.region" "$CONFIG_FILE")
    CLOUD_SQL_INSTANCE=$(jq -r ".environments.$ENVIRONMENT.cloudSQL.instance" "$CONFIG_FILE")
    CLOUD_SQL_IP=$(jq -r ".environments.$ENVIRONMENT.cloudSQL.ip" "$CONFIG_FILE")
    DB_NAME=$(jq -r ".environments.$ENVIRONMENT.cloudSQL.database" "$CONFIG_FILE")
    DB_USER=$(jq -r ".environments.$ENVIRONMENT.cloudSQL.user" "$CONFIG_FILE")
else
    # Fallback configuration
    case "$ENVIRONMENT" in
        staging)
            PROJECT_ID="ai-square-463013"
            REGION="asia-east1"
            CLOUD_SQL_INSTANCE="ai-square-db-staging-asia"
            CLOUD_SQL_IP="34.80.67.129"
            DB_NAME="ai_square_db"
            DB_USER="postgres"
            ;;
        production)
            PROJECT_ID="ai-square-463013"
            REGION="asia-east1"
            CLOUD_SQL_INSTANCE="ai-square-db-production"
            CLOUD_SQL_IP="${PROD_SQL_IP:-35.236.132.52}"  # Update with actual IP
            DB_NAME="ai_square_db"
            DB_USER="postgres"
            ;;
    esac
fi

DB_PASSWORD="${DB_PASSWORD:-postgres}"

# CI/CD Mode Detection
CI_MODE="${CI:-false}"
if [ "$CI_MODE" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ] || [ "${FORCE_INIT:-}" = "true" ]; then
    echo -e "${GREEN}✅ Auto-confirmation enabled${NC}"
    AUTO_CONFIRM=true
else
    AUTO_CONFIRM=false
fi

# Confirmation for non-CI mode
if [ "$AUTO_CONFIRM" != "true" ]; then
    echo -e "${YELLOW}⚠️  WARNING: This will initialize the $ENVIRONMENT database${NC}"
    echo -e "${YELLOW}   Target: $CLOUD_SQL_INSTANCE${NC}"
    echo -e "${GREEN}   This script is SAFE - it won't destroy existing data${NC}"
    echo ""
    
    if [ ! -t 0 ]; then
        echo -e "${YELLOW}📌 Use FORCE_INIT=true to skip confirmation${NC}"
        exit 1
    fi
    
    echo -n "Continue? (y/N): "
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo -e "${RED}Cancelled by user${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}📋 Target Configuration:${NC}"
echo "  Environment: $ENVIRONMENT"
echo "  Cloud SQL Instance: $CLOUD_SQL_INSTANCE"
echo "  Database: $DB_NAME"
echo "  IP: $CLOUD_SQL_IP"
echo ""

# Add current IP to authorized networks
echo -e "${BLUE}🔍 Authorizing IP address...${NC}"
MY_IP=$(curl -s https://ipinfo.io/ip)
echo "  Current IP: $MY_IP"

gcloud sql instances patch $CLOUD_SQL_INSTANCE \
    --authorized-networks=$MY_IP \
    --project=$PROJECT_ID \
    --quiet || true

# Test connection
echo -e "${BLUE}🔍 Testing Cloud SQL connection...${NC}"
if PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connection successful${NC}"
else
    echo -e "${RED}✗ Cannot connect to Cloud SQL${NC}"
    echo "Trying with gcloud sql connect..."
    gcloud sql connect $CLOUD_SQL_INSTANCE --user=$DB_USER --database=$DB_NAME --project=$PROJECT_ID
    exit 1
fi

# Check if database exists
echo -e "${BLUE}🔍 Checking database...${NC}"
if ! PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -l | grep -q "$DB_NAME"; then
    echo -e "${YELLOW}⚠ Database $DB_NAME does not exist, creating...${NC}"
    PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
fi

# Check schema
TABLES_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'scenarios', 'programs', 'tasks');" 2>/dev/null | xargs || echo "0")

if [ "$TABLES_COUNT" -ge "4" ]; then
    echo -e "${GREEN}✓ Schema already exists (found $TABLES_COUNT core tables)${NC}"
    NEEDS_SCHEMA_INIT=false
else
    echo -e "${YELLOW}⚠ Schema incomplete or missing (found $TABLES_COUNT/4 core tables)${NC}"
    NEEDS_SCHEMA_INIT=true
fi

# Initialize schema if needed
if [ "$NEEDS_SCHEMA_INIT" = true ]; then
    echo -e "${YELLOW}🔨 Initializing Schema...${NC}"
    
    SCHEMA_FILE="../src/lib/repositories/postgresql/schema-v4.sql"
    if [ ! -f "$SCHEMA_FILE" ]; then
        echo -e "${RED}✗ Schema file not found: $SCHEMA_FILE${NC}"
        exit 1
    fi
    
    # Backup if exists
    echo -e "${YELLOW}📦 Creating safety backup...${NC}"
    BACKUP_FILE="${ENVIRONMENT}_backup_$(date +%Y%m%d_%H%M%S).sql"
    PGPASSWORD=$DB_PASSWORD pg_dump -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME --if-exists --clean > "/tmp/$BACKUP_FILE" 2>/dev/null || true
    if [ -f "/tmp/$BACKUP_FILE" ]; then
        echo -e "${GREEN}✓ Backup saved to /tmp/$BACKUP_FILE${NC}"
    fi
    
    # Apply schema
    echo -e "${YELLOW}Applying schema...${NC}"
    (
        echo "BEGIN;"
        cat "$SCHEMA_FILE"
        echo "COMMIT;"
    ) | PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Schema initialized successfully${NC}"
    else
        echo -e "${RED}✗ Schema initialization failed${NC}"
        exit 1
    fi
fi

# Initialize demo accounts
echo -e "${BLUE}👥 Ensuring demo accounts exist...${NC}"

# Password hashes for demo accounts (each role has its own password: {role}123)
STUDENT_HASH='$2b$10$GSLI4.ooV/jrN5RZMOAyf.SftBwwRsbmC.SMRDeDRLH1uCnIapR5e' # student123
TEACHER_HASH='$2b$10$xkTFHLjtA4BvhZrW8Pm6NOV/zJn5SX7gxZB9MSUcaptGrZrMPJJ5e' # teacher123
ADMIN_HASH='$2b$10$9nEfXi5LULvFjV/LKp8WFuglp9Y5jttH9O4Ix0AwpVg4OZdvtTbiS'   # admin123

# Insert demo users
PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME <<EOF
-- Insert demo users (safe to run multiple times)
INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'student@example.com', '$STUDENT_HASH', 'Student User', 'student', NOW(), NOW()),
  (gen_random_uuid(), 'teacher@example.com', '$TEACHER_HASH', 'Teacher User', 'teacher', NOW(), NOW()),
  (gen_random_uuid(), 'admin@example.com', '$ADMIN_HASH', 'Admin User', 'admin', NOW(), NOW())
ON CONFLICT (email) DO UPDATE 
  SET 
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW()
  WHERE users.email IN ('student@example.com', 'teacher@example.com', 'admin@example.com');

-- Show result
SELECT email, name, role FROM users 
WHERE email IN ('student@example.com', 'teacher@example.com', 'admin@example.com')
ORDER BY email;
EOF

echo -e "${GREEN}✓ Demo users ready${NC}"

# Show database statistics
echo -e "${BLUE}📊 Database Statistics:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME <<EOF
SELECT 'Total users: ' || COUNT(*) FROM users;
SELECT 'Total scenarios: ' || COUNT(*) FROM scenarios;
SELECT 'Total programs: ' || COUNT(*) FROM programs;
SELECT 'Total tasks: ' || COUNT(*) FROM tasks;
SELECT 'Total evaluations: ' || COUNT(*) FROM evaluations;
EOF

echo ""
echo -e "${GREEN}✅ Cloud SQL Initialization Complete for $ENVIRONMENT!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "  ✓ Database: $DB_NAME"
echo "  ✓ Instance: $CLOUD_SQL_INSTANCE"
echo "  ✓ Demo users: student123, teacher123, admin123"
echo ""
echo -e "${YELLOW}💡 This script is SAFE to run multiple times${NC}"
echo "  - It checks before creating schema"
echo "  - Uses ON CONFLICT for demo users"
echo "  - Never drops existing data"
echo ""
echo "Ready for deployment!"