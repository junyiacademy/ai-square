#!/bin/bash

# =================================================================
# Staging Database Rebuild Script
# =================================================================
# This script safely rebuilds the staging database with new schema
# =================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Staging Database Rebuild Script${NC}"
echo -e "${YELLOW}========================================${NC}"

# Configuration
PROJECT_ID="ai-square-463013"
INSTANCE_NAME="ai-square-db-staging"
REGION="asia-east1"
DB_NAME="ai_square_staging"
DB_USER="postgres"

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from frontend directory${NC}"
    exit 1
fi

# Step 1: Confirm action
echo -e "${YELLOW}⚠️  WARNING: This will DROP and RECREATE the staging database!${NC}"
echo -e "${YELLOW}All existing data will be lost.${NC}"
read -p "Type 'REBUILD' to confirm: " confirmation

if [ "$confirmation" != "REBUILD" ]; then
    echo -e "${RED}Cancelled.${NC}"
    exit 1
fi

# Step 2: Set up Cloud SQL Proxy
echo -e "${GREEN}Step 1: Starting Cloud SQL Proxy...${NC}"
cloud_sql_proxy --instances=${PROJECT_ID}:${REGION}:${INSTANCE_NAME}=tcp:5434 &
PROXY_PID=$!
echo "Cloud SQL Proxy PID: $PROXY_PID"

# Wait for proxy to be ready
sleep 5

# Step 3: Drop existing database
echo -e "${GREEN}Step 2: Dropping existing database...${NC}"
PGPASSWORD="${DB_PASSWORD}" psql \
    -h 127.0.0.1 \
    -p 5434 \
    -U ${DB_USER} \
    -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME};"

# Step 4: Create new database
echo -e "${GREEN}Step 3: Creating new database...${NC}"
PGPASSWORD="${DB_PASSWORD}" psql \
    -h 127.0.0.1 \
    -p 5434 \
    -U ${DB_USER} \
    -d postgres \
    -c "CREATE DATABASE ${DB_NAME};"

# Step 5: Run Prisma migrations
echo -e "${GREEN}Step 4: Running Prisma migrations...${NC}"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5434/${DB_NAME}" \
    npx prisma migrate deploy

# Step 6: Generate Prisma client
echo -e "${GREEN}Step 5: Generating Prisma client...${NC}"
npx prisma generate

# Step 7: Seed database with demo data
echo -e "${GREEN}Step 6: Seeding database with demo data...${NC}"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5434/${DB_NAME}" \
    npx tsx scripts/seed-db.ts

# Step 8: Initialize scenarios via API
echo -e "${GREEN}Step 7: Initializing scenarios via API...${NC}"
SERVICE_URL="https://ai-square-staging-m7s4ucbgba-de.a.run.app"

# Initialize PBL scenarios
echo "Initializing PBL scenarios..."
curl -X POST "${SERVICE_URL}/api/admin/init-pbl" \
    -H "Content-Type: application/json" \
    -d '{"force": true}'

# Initialize Assessment scenarios
echo "Initializing Assessment scenarios..."
curl -X POST "${SERVICE_URL}/api/admin/init-assessment" \
    -H "Content-Type: application/json" \
    -d '{"force": true}'

# Initialize Discovery scenarios
echo "Initializing Discovery scenarios..."
curl -X POST "${SERVICE_URL}/api/admin/init-discovery" \
    -H "Content-Type: application/json" \
    -d '{"force": true}'

# Step 9: Clean up
echo -e "${GREEN}Step 8: Cleaning up...${NC}"
kill $PROXY_PID

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Staging database rebuild complete!${NC}"
echo -e "${GREEN}========================================${NC}"

# Step 10: Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
curl -s "${SERVICE_URL}/api/health" | jq '.'

echo -e "${GREEN}Demo accounts:${NC}"
echo "  Email: demo@aisquare.tw"
echo "  Password: demo123456"
echo ""
echo "  Email: admin@aisquare.tw"
echo "  Password: admin123456"
