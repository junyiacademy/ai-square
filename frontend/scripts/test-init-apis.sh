#!/bin/bash
# Test Init APIs - Verify clean, create, and query functionality for all modes

set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"
echo "🧪 Testing Init APIs at $BASE_URL"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to check test result
check_result() {
    local expected=$1
    local actual=$2
    local test_name=$3

    if [ "$actual" = "$expected" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name (expected: $expected, got: $actual)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name (expected: $expected, got: $actual)"
        ((TESTS_FAILED++))
    fi
}

echo ""
echo "📝 Step 1: Test Clean Functionality"
echo "-----------------------------------"

# Clean all scenarios
echo "Cleaning Assessment scenarios..."
curl -X POST "$BASE_URL/api/admin/init-assessment" \
    -H "Content-Type: application/json" \
    -d '{"clean": true}' \
    -s -o /dev/null

# Note: PBL and Discovery don't have clean flag yet, but we can test they handle existing data

echo ""
echo "📝 Step 2: Verify All Scenarios Are Initialized"
echo "-----------------------------------------------"

# Check initial state
PBL_COUNT_BEFORE=$(curl -s "$BASE_URL/api/pbl/scenarios" | jq '.data.scenarios | length')
ASSESSMENT_COUNT_BEFORE=$(curl -s "$BASE_URL/api/assessment/scenarios" | jq '.data.totalCount')
DISCOVERY_COUNT_BEFORE=$(curl -s "$BASE_URL/api/discovery/scenarios" | jq '.data.scenarios | length')

echo "Initial counts:"
echo "  PBL: $PBL_COUNT_BEFORE"
echo "  Assessment: $ASSESSMENT_COUNT_BEFORE"
echo "  Discovery: $DISCOVERY_COUNT_BEFORE"

echo ""
echo "📝 Step 3: Test Create Functionality"
echo "------------------------------------"

# Initialize all scenarios
echo "Initializing PBL scenarios..."
PBL_RESULT=$(curl -X POST "$BASE_URL/api/admin/init-pbl" -s)
PBL_CREATED=$(echo "$PBL_RESULT" | jq -r '.results.created')
PBL_EXISTING=$(echo "$PBL_RESULT" | jq -r '.results.existing')
echo "  Created: $PBL_CREATED, Existing: $PBL_EXISTING"

echo "Initializing Assessment scenarios..."
ASSESSMENT_RESULT=$(curl -X POST "$BASE_URL/api/admin/init-assessment" -s)
ASSESSMENT_ACTION=$(echo "$ASSESSMENT_RESULT" | jq -r '.action')
echo "  Action: $ASSESSMENT_ACTION"

echo "Initializing Discovery scenarios..."
DISCOVERY_RESULT=$(curl -X POST "$BASE_URL/api/admin/init-discovery" -s)
DISCOVERY_CREATED=$(echo "$DISCOVERY_RESULT" | jq -r '.results.created')
DISCOVERY_EXISTING=$(echo "$DISCOVERY_RESULT" | jq -r '.results.existing')
echo "  Created: $DISCOVERY_CREATED, Existing: $DISCOVERY_EXISTING"

echo ""
echo "📝 Step 4: Test Query Functionality"
echo "-----------------------------------"

# Query all scenarios
PBL_COUNT=$(curl -s "$BASE_URL/api/pbl/scenarios" | jq '.data.scenarios | length')
ASSESSMENT_COUNT=$(curl -s "$BASE_URL/api/assessment/scenarios" | jq '.data.totalCount')
DISCOVERY_COUNT=$(curl -s "$BASE_URL/api/discovery/scenarios" | jq '.data.scenarios | length')

echo "Final counts:"
echo "  PBL: $PBL_COUNT"
echo "  Assessment: $ASSESSMENT_COUNT"
echo "  Discovery: $DISCOVERY_COUNT"

echo ""
echo "📝 Step 5: Run Tests"
echo "--------------------"

# Test PBL scenarios
check_result "9" "$PBL_COUNT" "PBL scenarios count"

# Test Assessment scenarios
check_result "1" "$ASSESSMENT_COUNT" "Assessment scenarios count"

# Test Discovery scenarios
check_result "12" "$DISCOVERY_COUNT" "Discovery scenarios count"

echo ""
echo "📝 Step 6: Test Idempotency (Running Init Again)"
echo "-------------------------------------------------"

# Run init again and check nothing changes
echo "Re-initializing all scenarios..."
PBL_RESULT2=$(curl -X POST "$BASE_URL/api/admin/init-pbl" -s)
PBL_CREATED2=$(echo "$PBL_RESULT2" | jq -r '.results.created')
check_result "0" "$PBL_CREATED2" "PBL idempotency (no new creates)"

ASSESSMENT_RESULT2=$(curl -X POST "$BASE_URL/api/admin/init-assessment" -s)
ASSESSMENT_ACTION2=$(echo "$ASSESSMENT_RESULT2" | jq -r '.action')
check_result "updated" "$ASSESSMENT_ACTION2" "Assessment idempotency (updates existing)"

DISCOVERY_RESULT2=$(curl -X POST "$BASE_URL/api/admin/init-discovery" -s)
DISCOVERY_CREATED2=$(echo "$DISCOVERY_RESULT2" | jq -r '.results.created')
check_result "0" "$DISCOVERY_CREATED2" "Discovery idempotency (no new creates)"

echo ""
echo "📝 Step 7: Test Language Support"
echo "--------------------------------"

# Test different languages
PBL_EN=$(curl -s "$BASE_URL/api/pbl/scenarios?lang=en" | jq '.data.scenarios | length')
PBL_ZH=$(curl -s "$BASE_URL/api/pbl/scenarios?lang=zh" | jq '.data.scenarios | length')
check_result "$PBL_EN" "$PBL_ZH" "PBL language consistency"

ASSESSMENT_EN=$(curl -s "$BASE_URL/api/assessment/scenarios?lang=en" | jq '.data.totalCount')
ASSESSMENT_ZH=$(curl -s "$BASE_URL/api/assessment/scenarios?lang=zh" | jq '.data.totalCount')
check_result "$ASSESSMENT_EN" "$ASSESSMENT_ZH" "Assessment language consistency"

DISCOVERY_EN=$(curl -s "$BASE_URL/api/discovery/scenarios?lang=en" | jq '.data.scenarios | length')
DISCOVERY_ZH=$(curl -s "$BASE_URL/api/discovery/scenarios?lang=zh" | jq '.data.scenarios | length')
check_result "$DISCOVERY_EN" "$DISCOVERY_ZH" "Discovery language consistency"

echo ""
echo "📝 Step 8: Test Data Integrity"
echo "------------------------------"

# Check that scenarios have required fields
PBL_FIRST=$(curl -s "$BASE_URL/api/pbl/scenarios" | jq '.data.scenarios[0]')
HAS_PBL_ID=$(echo "$PBL_FIRST" | jq -r 'has("id")')
HAS_PBL_TITLE=$(echo "$PBL_FIRST" | jq -r 'has("title")')
check_result "true" "$HAS_PBL_ID" "PBL scenario has ID"
check_result "true" "$HAS_PBL_TITLE" "PBL scenario has title"

ASSESSMENT_FIRST=$(curl -s "$BASE_URL/api/assessment/scenarios" | jq '.data.scenarios[0]')
HAS_ASSESSMENT_ID=$(echo "$ASSESSMENT_FIRST" | jq -r 'has("id")')
HAS_ASSESSMENT_CONFIG=$(echo "$ASSESSMENT_FIRST" | jq -r 'has("config")')
check_result "true" "$HAS_ASSESSMENT_ID" "Assessment scenario has ID"
check_result "true" "$HAS_ASSESSMENT_CONFIG" "Assessment scenario has config"

DISCOVERY_FIRST=$(curl -s "$BASE_URL/api/discovery/scenarios" | jq '.data.scenarios[0]')
HAS_DISCOVERY_ID=$(echo "$DISCOVERY_FIRST" | jq -r 'has("id")')
HAS_DISCOVERY_TITLE=$(echo "$DISCOVERY_FIRST" | jq -r 'has("title")')
check_result "true" "$HAS_DISCOVERY_ID" "Discovery scenario has ID"
check_result "true" "$HAS_DISCOVERY_TITLE" "Discovery scenario has title"

echo ""
echo "================================"
echo "📊 Test Results Summary"
echo "================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
fi
