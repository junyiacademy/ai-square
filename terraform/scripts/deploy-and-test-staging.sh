#!/bin/bash

# Complete Staging Deployment and Test Script
# This script ensures proper deployment with scenario initialization

set -e

# Configuration
PROJECT_ID="ai-square-463013"
SERVICE_NAME="ai-square-staging"
REGION="asia-east1"
IMAGE_TAG="${1:-latest}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== AI Square Staging Deployment ===${NC}"
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo "Image Tag: $IMAGE_TAG"
echo ""

# Function to wait for service
wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    echo -n "Waiting for service to be ready"
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url/api/health" | grep -q "healthy"; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    echo -e " ${RED}✗${NC}"
    return 1
}

# Function to initialize scenarios
init_scenarios() {
    local service_url=$1
    local module=$2
    
    echo -e "\n${YELLOW}Initializing $module scenarios...${NC}"
    
    local response=$(curl -s -X POST "$service_url/api/admin/init-$module" \
        -H "Content-Type: application/json" \
        -d '{"forceUpdate": true}')
    
    local success=$(echo "$response" | jq -r '.success // false')
    
    if [ "$success" = "true" ]; then
        local created=$(echo "$response" | jq -r '.summary.created // 0')
        local updated=$(echo "$response" | jq -r '.summary.updated // 0')
        local total=$(echo "$response" | jq -r '.summary.total // 0')
        echo -e "${GREEN}✓ Success${NC} - Total: $total, Created: $created, Updated: $updated"
        return 0
    else
        echo -e "${RED}✗ Failed${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 1
    fi
}

# Step 1: Deploy the service
echo -e "${BLUE}Step 1: Deploying to Cloud Run${NC}"

if [ "$IMAGE_TAG" = "latest" ]; then
    # Build and deploy new image
    echo "Building new image..."
    gcloud builds submit \
        --tag "gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG" \
        --project "$PROJECT_ID" \
        frontend/
else
    # Deploy existing image
    echo "Using existing image with tag: $IMAGE_TAG"
fi

echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
    --image "gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG" \
    --platform managed \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --allow-unauthenticated \
    --max-instances 10 \
    --min-instances 1

# Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --platform managed \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --format 'value(status.url)')

echo -e "${GREEN}✓ Deployed to: $SERVICE_URL${NC}"

# Step 2: Wait for service to be ready
echo -e "\n${BLUE}Step 2: Waiting for Service${NC}"
if ! wait_for_service "$SERVICE_URL"; then
    echo -e "${RED}Service failed to become ready${NC}"
    exit 1
fi

# Step 3: Check database connection
echo -e "\n${BLUE}Step 3: Checking Database${NC}"
db_status=$(curl -s "$SERVICE_URL/api/health" | jq -r '.checks.database.status // false')
if [ "$db_status" = "true" ]; then
    echo -e "${GREEN}✓ Database connected${NC}"
else
    echo -e "${RED}✗ Database not connected${NC}"
    exit 1
fi

# Step 4: Check current scenario count
echo -e "\n${BLUE}Step 4: Checking Current Scenarios${NC}"
pbl_count=$(curl -s "$SERVICE_URL/api/pbl/scenarios?lang=en" | jq -r '.data.scenarios // [] | length')
discovery_count=$(curl -s "$SERVICE_URL/api/discovery/scenarios?lang=en" | jq -r '.data.scenarios // [] | length')
assessment_count=$(curl -s "$SERVICE_URL/api/assessment/scenarios?lang=en" | jq -r '.data.scenarios // [] | length')

echo "Current scenario counts:"
echo "  - PBL: $pbl_count (expected: 9)"
echo "  - Discovery: $discovery_count (expected: 12)"
echo "  - Assessment: $assessment_count (expected: 1)"

# Step 5: Initialize scenarios if needed
echo -e "\n${BLUE}Step 5: Scenario Initialization${NC}"

if [ "$pbl_count" -lt 9 ] || [ "$discovery_count" -lt 12 ] || [ "$assessment_count" -lt 1 ]; then
    echo "Scenarios need initialization..."
    
    # Initialize all modules
    init_scenarios "$SERVICE_URL" "pbl"
    init_scenarios "$SERVICE_URL" "discovery"
    init_scenarios "$SERVICE_URL" "assessment"
    
    # Wait for initialization to propagate
    echo -e "\n${YELLOW}Waiting for initialization to complete...${NC}"
    sleep 5
    
    # Re-check counts
    pbl_count=$(curl -s "$SERVICE_URL/api/pbl/scenarios?lang=en" | jq -r '.data.scenarios // [] | length')
    discovery_count=$(curl -s "$SERVICE_URL/api/discovery/scenarios?lang=en" | jq -r '.data.scenarios // [] | length')
    assessment_count=$(curl -s "$SERVICE_URL/api/assessment/scenarios?lang=en" | jq -r '.data.scenarios // [] | length')
    
    echo -e "\nScenario counts after initialization:"
    echo "  - PBL: $pbl_count"
    echo "  - Discovery: $discovery_count"
    echo "  - Assessment: $assessment_count"
else
    echo -e "${GREEN}✓ All scenarios already initialized${NC}"
fi

# Step 6: Run comprehensive tests
echo -e "\n${BLUE}Step 6: Running Tests${NC}"
./terraform/scripts/test-staging-comprehensive.sh "$SERVICE_URL"

# Step 7: Final validation
echo -e "\n${BLUE}Step 7: Final Validation${NC}"

if [ "$pbl_count" -ge 9 ] && [ "$discovery_count" -ge 12 ] && [ "$assessment_count" -ge 1 ]; then
    echo -e "${GREEN}✓ DEPLOYMENT SUCCESSFUL${NC}"
    echo "  - Service URL: $SERVICE_URL"
    echo "  - All scenarios loaded correctly"
    echo "  - Database connected"
    echo "  - APIs responding"
    exit 0
else
    echo -e "${RED}✗ DEPLOYMENT INCOMPLETE${NC}"
    echo "  - Some scenarios failed to initialize"
    echo "  - Manual intervention may be required"
    exit 1
fi