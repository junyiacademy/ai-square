#!/bin/bash

# =================================================================
# Staging Database Rebuild Script (Using gcloud)
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

# Step 2: Get password from Secret Manager
echo -e "${GREEN}Step 1: Getting database password from Secret Manager...${NC}"
DB_PASSWORD=$(gcloud secrets versions access latest --secret="staging-db-password" --project=${PROJECT_ID})

# Step 3: Delete existing database via gcloud
echo -e "${GREEN}Step 2: Deleting existing database (if exists)...${NC}"
gcloud sql databases delete ${DB_NAME} \
    --instance=${INSTANCE_NAME} \
    --project=${PROJECT_ID} \
    --quiet || echo "Database doesn't exist or already deleted"

# Step 4: Create new database via gcloud
echo -e "${GREEN}Step 3: Creating new database...${NC}"
gcloud sql databases create ${DB_NAME} \
    --instance=${INSTANCE_NAME} \
    --project=${PROJECT_ID}

# Step 5: Get service URL
SERVICE_URL="https://ai-square-staging-m7s4ucbgba-de.a.run.app"

# Step 6: Reset database via API
echo -e "${GREEN}Step 4: Resetting database via API...${NC}"
echo "Calling reset-db API endpoint..."
RESET_RESPONSE=$(curl -X POST "${SERVICE_URL}/api/admin/reset-db" \
    -H "Content-Type: application/json" \
    -H "X-Admin-Key: ${ADMIN_KEY:-admin-secret-key}" \
    -d '{"confirmReset": true, "seedData": true}' \
    -s)

echo "Reset response: $RESET_RESPONSE"

# Step 7: Initialize scenarios via API
echo -e "${GREEN}Step 5: Initializing scenarios via API...${NC}"

# Initialize PBL scenarios
echo "Initializing PBL scenarios..."
curl -X POST "${SERVICE_URL}/api/admin/init-pbl" \
    -H "Content-Type: application/json" \
    -d '{"force": true}' \
    -s | jq '.' || echo "PBL initialized"

sleep 2

# Initialize Assessment scenarios
echo "Initializing Assessment scenarios..."
curl -X POST "${SERVICE_URL}/api/admin/init-assessment" \
    -H "Content-Type: application/json" \
    -d '{"force": true}' \
    -s | jq '.' || echo "Assessment initialized"

sleep 2

# Initialize Discovery scenarios
echo "Initializing Discovery scenarios..."
curl -X POST "${SERVICE_URL}/api/admin/init-discovery" \
    -H "Content-Type: application/json" \
    -d '{"force": true}' \
    -s | jq '.' || echo "Discovery initialized"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Staging database rebuild complete!${NC}"
echo -e "${GREEN}========================================${NC}"

# Step 8: Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
curl -s "${SERVICE_URL}/api/health" | jq '.'

echo -e "${GREEN}Demo accounts:${NC}"
echo "  Email: demo@aisquare.tw"
echo "  Password: demo123456"
echo ""
echo "  Email: admin@aisquare.tw"
echo "  Password: admin123456"

echo -e "${YELLOW}You can now redeploy the application to apply migrations:${NC}"
echo "  gh workflow run 'Deploy to Staging' --ref main"