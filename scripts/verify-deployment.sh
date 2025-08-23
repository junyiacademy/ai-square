#!/bin/bash

# ============================================
# AI Square Deployment Verification Script
# ============================================
# Comprehensive verification after deployment
# Usage: ./verify-deployment.sh [staging|production]
# ============================================

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
BASE_URL=""
ADMIN_KEY="${ADMIN_API_KEY:-}"

# Set base URL based on environment
if [ "$ENVIRONMENT" == "staging" ]; then
    BASE_URL="https://ai-square-staging-m7s4ucbgba-de.a.run.app"
elif [ "$ENVIRONMENT" == "production" ]; then
    BASE_URL="https://ai-square-frontend-m7s4ucbgba-de.a.run.app"
else
    echo -e "${RED}Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

echo "========================================="
echo -e "${YELLOW}Verifying $ENVIRONMENT deployment${NC}"
echo "Base URL: $BASE_URL"
echo "========================================="

# Track overall status
FAILED_TESTS=0

# Function to check HTTP status
check_status() {
    local status=$1
    local test_name=$2
    
    if [ "$status" == "200" ]; then
        echo -e "${GREEN}✅ $test_name passed${NC}"
    else
        echo -e "${RED}❌ $test_name failed (HTTP $status)${NC}"
        ((FAILED_TESTS++))
    fi
}

# 1. Health check
echo -e "\n1. Health Check:"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
check_status "$HEALTH_STATUS" "Health check"

# 2. Test login with demo account
echo -e "\n2. Testing Login:"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"student@example.com","password":"student123"}')
LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | jq -r '.success // false' 2>/dev/null)

if [ "$LOGIN_STATUS" == "true" ]; then
    echo -e "${GREEN}✅ Login test passed${NC}"
else
    echo -e "${RED}❌ Login test failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    ((FAILED_TESTS++))
fi

# 3. Check scenarios initialization
echo -e "\n3. Checking Scenarios:"

# PBL Scenarios
PBL_COUNT=$(curl -s "$BASE_URL/api/pbl/scenarios?lang=en" | jq '.scenarios | length' 2>/dev/null || echo "0")
echo "PBL Scenarios: $PBL_COUNT"

# Assessment Scenarios
ASSESSMENT_COUNT=$(curl -s "$BASE_URL/api/assessment/scenarios?lang=en" | jq '.scenarios | length' 2>/dev/null || echo "0")
echo "Assessment Scenarios: $ASSESSMENT_COUNT"

# Discovery Scenarios
DISCOVERY_COUNT=$(curl -s "$BASE_URL/api/discovery/scenarios?lang=en" | jq '.scenarios | length' 2>/dev/null || echo "0")
echo "Discovery Scenarios: $DISCOVERY_COUNT"

TOTAL_SCENARIOS=$((PBL_COUNT + ASSESSMENT_COUNT + DISCOVERY_COUNT))
if [ "$TOTAL_SCENARIOS" -gt 0 ]; then
    echo -e "${GREEN}✅ Scenarios initialized (Total: $TOTAL_SCENARIOS)${NC}"
else
    echo -e "${RED}❌ No scenarios found${NC}"
    ((FAILED_TESTS++))
fi

# 4. Check database stats (if admin key provided)
if [ -n "$ADMIN_KEY" ]; then
    echo -e "\n4. Database Statistics:"
    DB_STATS=$(curl -s -H "X-Admin-Key: $ADMIN_KEY" "$BASE_URL/api/admin/stats")
    
    if echo "$DB_STATS" | jq -e '.success' >/dev/null 2>&1; then
        echo "Users: $(echo "$DB_STATS" | jq -r '.users.total')"
        echo "Programs: $(echo "$DB_STATS" | jq -r '.programs')"
        echo "Tasks: $(echo "$DB_STATS" | jq -r '.tasks')"
        echo -e "${GREEN}✅ Database connection verified${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not get database stats (admin key required)${NC}"
    fi
else
    echo -e "\n4. Database Statistics:"
    echo -e "${YELLOW}⚠️  Skipping (no admin key provided)${NC}"
fi

# 5. Performance check
echo -e "\n5. Performance Check:"
START_TIME=$(date +%s%N)
curl -s -o /dev/null "$BASE_URL/api/health"
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$RESPONSE_TIME" -lt 1000 ]; then
    echo -e "${GREEN}✅ Response time: ${RESPONSE_TIME}ms${NC}"
else
    echo -e "${YELLOW}⚠️  Slow response time: ${RESPONSE_TIME}ms${NC}"
fi

# Summary
echo -e "\n========================================="
if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment verification PASSED${NC}"
    echo -e "${GREEN}All tests completed successfully!${NC}"
else
    echo -e "${RED}❌ Deployment verification FAILED${NC}"
    echo -e "${RED}$FAILED_TESTS tests failed${NC}"
fi
echo "========================================="

# Exit with appropriate code
exit $FAILED_TESTS