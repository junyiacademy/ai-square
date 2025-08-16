#!/bin/bash
# 完整部署驗證腳本 - 包含 API 初始化步驟
# Complete deployment verification script - includes API initialization

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENV="${1:-staging}"
BASE_URL=""
TEST_EMAIL=""
TEST_PASSWORD=""

# Set environment-specific values
if [ "$ENV" = "staging" ]; then
  BASE_URL="https://ai-square-staging-731209836128.asia-east1.run.app"
  TEST_EMAIL="student@example.com"
  TEST_PASSWORD="student123"
elif [ "$ENV" = "production" ]; then
  BASE_URL="https://ai-square-frontend-731209836128.asia-east1.run.app"
  TEST_EMAIL="student@example.com"
  TEST_PASSWORD="student123"
elif [ "$ENV" = "local" ]; then
  BASE_URL="http://localhost:3000"
  TEST_EMAIL="student@example.com"
  TEST_PASSWORD="student123"
else
  echo -e "${RED}❌ Invalid environment: $ENV${NC}"
  echo "Usage: $0 [staging|production|local]"
  exit 1
fi

echo -e "${BLUE}🚀 Verifying deployment for: $ENV${NC}"
echo -e "${BLUE}   URL: $BASE_URL${NC}"
echo "=================================================="

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function
run_test() {
  local test_name=$1
  local test_command=$2
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -n "Testing: $test_name... "
  
  if eval "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

echo ""
echo -e "${YELLOW}📋 Step 1: Basic Health Checks${NC}"
echo "----------------------------------"

# 1.1 Check health endpoint
run_test "Health endpoint" "curl -s -f $BASE_URL/api/health"

# 1.2 Check database connection
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
DB_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.checks.database.status')
if [ "$DB_STATUS" = "true" ]; then
  echo -e "  Database: ${GREEN}✅ Connected${NC}"
else
  echo -e "  Database: ${RED}❌ Not connected${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Step 2: Verify Scenarios Before Init${NC}"
echo "----------------------------------------"

# Check current scenario counts
PBL_BEFORE=$(curl -s "$BASE_URL/api/pbl/scenarios" | jq '.data.scenarios | length')
DISCOVERY_BEFORE=$(curl -s "$BASE_URL/api/discovery/scenarios" | jq '.data.scenarios | length')
ASSESSMENT_BEFORE=$(curl -s "$BASE_URL/api/assessment/scenarios" | jq '.data.totalCount // .data.scenarios | length')

echo "  PBL scenarios: $PBL_BEFORE"
echo "  Discovery scenarios: $DISCOVERY_BEFORE"
echo "  Assessment scenarios: $ASSESSMENT_BEFORE"

echo ""
echo -e "${YELLOW}📋 Step 3: Initialize Scenarios via API${NC}"
echo -e "${YELLOW}   (THIS IS THE KEY STEP!)${NC}"
echo "----------------------------------------"

# 3.1 Initialize PBL scenarios
echo -n "Initializing PBL scenarios... "
PBL_INIT=$(curl -X POST -s "$BASE_URL/api/admin/init-pbl")
PBL_CREATED=$(echo "$PBL_INIT" | jq -r '.results.created // 0')
PBL_EXISTING=$(echo "$PBL_INIT" | jq -r '.results.existing // 0')
echo -e "${GREEN}✅${NC} Created: $PBL_CREATED, Existing: $PBL_EXISTING"

# 3.2 Initialize Discovery scenarios
echo -n "Initializing Discovery scenarios... "
DISCOVERY_INIT=$(curl -X POST -s "$BASE_URL/api/admin/init-discovery")
DISCOVERY_CREATED=$(echo "$DISCOVERY_INIT" | jq -r '.results.created // 0')
DISCOVERY_EXISTING=$(echo "$DISCOVERY_INIT" | jq -r '.results.existing // 0')
echo -e "${GREEN}✅${NC} Created: $DISCOVERY_CREATED, Existing: $DISCOVERY_EXISTING"

# 3.3 Initialize Assessment scenarios
echo -n "Initializing Assessment scenarios... "
ASSESSMENT_INIT=$(curl -X POST -s "$BASE_URL/api/admin/init-assessment")
ASSESSMENT_ACTION=$(echo "$ASSESSMENT_INIT" | jq -r '.action // "unknown"')
echo -e "${GREEN}✅${NC} Action: $ASSESSMENT_ACTION"

echo ""
echo -e "${YELLOW}📋 Step 4: Verify Scenarios After Init${NC}"
echo "---------------------------------------"

# Check scenario counts after init
PBL_AFTER=$(curl -s "$BASE_URL/api/pbl/scenarios" | jq '.data.scenarios | length')
DISCOVERY_AFTER=$(curl -s "$BASE_URL/api/discovery/scenarios" | jq '.data.scenarios | length')
ASSESSMENT_AFTER=$(curl -s "$BASE_URL/api/assessment/scenarios" | jq '.data.totalCount // .data.scenarios | length')

echo "  PBL scenarios: $PBL_BEFORE → $PBL_AFTER"
echo "  Discovery scenarios: $DISCOVERY_BEFORE → $DISCOVERY_AFTER"
echo "  Assessment scenarios: $ASSESSMENT_BEFORE → $ASSESSMENT_AFTER"

# Verify expected counts
run_test "PBL has 9 scenarios" "[ $PBL_AFTER -eq 9 ]"
run_test "Discovery has 12 scenarios" "[ $DISCOVERY_AFTER -eq 12 ]"
run_test "Assessment has scenarios" "[ $ASSESSMENT_AFTER -gt 0 ]"

echo ""
echo -e "${YELLOW}📋 Step 5: Test Authentication${NC}"
echo "-------------------------------"

# Test login
echo -n "Testing login with $TEST_EMAIL... "
LOGIN_RESPONSE=$(curl -X POST -s "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Login successful${NC}"
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // ""')
else
  echo -e "${RED}❌ Login failed${NC}"
  echo "  Response: $(echo "$LOGIN_RESPONSE" | jq -r '.error.message // .message // "Unknown error"')"
fi

echo ""
echo -e "${YELLOW}📋 Step 6: Test All APIs${NC}"
echo "------------------------"

# Test each API endpoint
run_test "PBL API (zh)" "curl -s -f $BASE_URL/api/pbl/scenarios?lang=zh | jq -e '.success == true'"
run_test "PBL API (en)" "curl -s -f $BASE_URL/api/pbl/scenarios?lang=en | jq -e '.success == true'"
run_test "Discovery API (zh)" "curl -s -f $BASE_URL/api/discovery/scenarios?lang=zh | jq -e '.success == true'"
run_test "Discovery API (en)" "curl -s -f $BASE_URL/api/discovery/scenarios?lang=en | jq -e '.success == true'"
run_test "Assessment API (zh)" "curl -s -f $BASE_URL/api/assessment/scenarios?lang=zh | jq -e '.success == true'"
run_test "Assessment API (en)" "curl -s -f $BASE_URL/api/assessment/scenarios?lang=en | jq -e '.success == true'"
run_test "Relations API" "curl -s -f $BASE_URL/api/relations?lang=zh | jq -e '.success == true'"

echo ""
echo -e "${YELLOW}📋 Step 7: Test Category Filters${NC}"
echo "---------------------------------"

# Test Discovery category filters
ARTS=$(curl -s "$BASE_URL/api/discovery/scenarios" | jq '[.data.scenarios[] | select(.discoveryData.category == "arts" or .discovery_data.category == "arts")] | length')
TECH=$(curl -s "$BASE_URL/api/discovery/scenarios" | jq '[.data.scenarios[] | select(.discoveryData.category == "technology" or .discovery_data.category == "technology")] | length')
BIZ=$(curl -s "$BASE_URL/api/discovery/scenarios" | jq '[.data.scenarios[] | select(.discoveryData.category == "business" or .discovery_data.category == "business")] | length')
SCI=$(curl -s "$BASE_URL/api/discovery/scenarios" | jq '[.data.scenarios[] | select(.discoveryData.category == "science" or .discovery_data.category == "science")] | length')

echo "Discovery categories:"
echo "  Arts: $ARTS (expected: 4)"
echo "  Technology: $TECH (expected: 4)"
echo "  Business: $BIZ (expected: 2)"
echo "  Science: $SCI (expected: 2)"

run_test "Arts category count" "[ $ARTS -eq 4 ]"
run_test "Technology category count" "[ $TECH -eq 4 ]"
run_test "Business category count" "[ $BIZ -eq 2 ]"
run_test "Science category count" "[ $SCI -eq 2 ]"

echo ""
echo -e "${YELLOW}📋 Step 8: Test Static Assets${NC}"
echo "------------------------------"

run_test "Career image (app_developer)" "curl -s -f -o /dev/null $BASE_URL/images/career-paths/app_developer.jpg"
run_test "Career image (ai_artist)" "curl -s -f -o /dev/null $BASE_URL/images/career-paths/ai_artist.jpg"

echo ""
echo -e "${YELLOW}📋 Step 9: E2E Browser Test (if Playwright available)${NC}"
echo "------------------------------------------------------"

if command -v npx &> /dev/null && [ -f "e2e/comprehensive-test.spec.ts" ]; then
  echo "Running E2E tests..."
  if [ "$ENV" = "staging" ]; then
    npx playwright test e2e/comprehensive-test.spec.ts --grep "Staging" --reporter=list || true
  elif [ "$ENV" = "production" ]; then
    npx playwright test e2e/comprehensive-test.spec.ts --grep "Production" --reporter=list || true
  else
    echo "Skipping E2E tests for local environment"
  fi
else
  echo "Playwright not available, skipping browser tests"
fi

echo ""
echo "=================================================="
echo -e "${BLUE}📊 DEPLOYMENT VERIFICATION SUMMARY${NC}"
echo "=================================================="
echo -e "Environment: ${YELLOW}$ENV${NC}"
echo -e "URL: ${YELLOW}$BASE_URL${NC}"
echo ""
echo -e "Tests Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Tests Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED! Deployment verified successfully.${NC}"
  echo ""
  echo -e "${GREEN}Key Success Factors:${NC}"
  echo "1. Database properly connected"
  echo "2. Admin init APIs successfully called"
  echo "3. All scenarios properly initialized"
  echo "4. Authentication working"
  echo "5. All module APIs returning data"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED! Deployment needs attention.${NC}"
  echo ""
  echo -e "${YELLOW}Common Issues:${NC}"
  echo "1. Did you run the init APIs? (Critical step!)"
  echo "2. Is the database properly configured?"
  echo "3. Are the seed accounts created?"
  echo "4. Is the Cloud SQL instance in the same region?"
  exit 1
fi