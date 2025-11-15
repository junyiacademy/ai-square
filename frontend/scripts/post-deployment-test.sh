#!/bin/bash

# Post-deployment test script
# Usage: ./post-deployment-test.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
FAILED=false

if [ "$ENVIRONMENT" = "staging" ]; then
    BASE_URL="https://ai-square-staging-731209836128.asia-east1.run.app"
elif [ "$ENVIRONMENT" = "production" ]; then
    BASE_URL="https://ai-square-frontend-731209836128.asia-east1.run.app"
else
    echo "Invalid environment: $ENVIRONMENT"
    exit 1
fi

echo "🧪 Running post-deployment tests for $ENVIRONMENT..."
echo "Base URL: $BASE_URL"
echo "================================================"

# Function to test an endpoint
test_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=$3

    echo -n "Testing $description... "

    RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "$expected_status" ]; then
        echo "✅ OK (HTTP $HTTP_CODE)"
        return 0
    else
        echo "❌ FAILED (Expected: $expected_status, Got: $HTTP_CODE)"
        FAILED=true
        return 1
    fi
}

# Function to test JSON response
test_json_endpoint() {
    local endpoint=$1
    local jq_filter=$2
    local expected=$3
    local description=$4

    echo -n "Testing $description... "

    RESPONSE=$(curl -s "$BASE_URL$endpoint")
    ACTUAL=$(echo "$RESPONSE" | jq -r "$jq_filter" 2>/dev/null || echo "PARSE_ERROR")

    if [ "$ACTUAL" = "$expected" ]; then
        echo "✅ OK"
        return 0
    else
        echo "❌ FAILED (Expected: $expected, Got: $ACTUAL)"
        FAILED=true
        return 1
    fi
}

# 1. Health Check
echo "1. Health Check Tests"
echo "--------------------"
test_endpoint "/api/health" 200 "Health endpoint"
test_json_endpoint "/api/health" ".status" "ok" "Health status"

# 2. API Endpoints
echo -e "\n2. API Endpoint Tests"
echo "--------------------"
test_endpoint "/api/relations?lang=en" 200 "Relations API"
test_endpoint "/api/pbl/scenarios?lang=en" 200 "PBL Scenarios API"
test_endpoint "/api/discovery/scenarios?lang=en" 200 "Discovery Scenarios API"
test_endpoint "/api/assessment/scenarios?lang=en" 200 "Assessment Scenarios API"

# 3. Authentication Tests
echo -e "\n3. Authentication Tests"
echo "--------------------"
# Test login with demo account
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"student@example.com","password":"student123"}')

if echo "$LOGIN_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo "✅ Login endpoint working"
else
    echo "❌ Login endpoint failed"
    FAILED=true
fi

# 4. Static Pages
echo -e "\n4. Static Page Tests"
echo "--------------------"
test_endpoint "/" 200 "Home page"
test_endpoint "/login" 200 "Login page"
test_endpoint "/about" 200 "About page"

# 5. Performance Tests
echo -e "\n5. Performance Tests"
echo "--------------------"
echo -n "Testing API response time... "
START_TIME=$(date +%s%N)
curl -s "$BASE_URL/api/health" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$RESPONSE_TIME" -lt 1000 ]; then
    echo "✅ OK (${RESPONSE_TIME}ms)"
else
    echo "⚠️  SLOW (${RESPONSE_TIME}ms)"
fi

# 6. Scenario Data Tests
echo -e "\n6. Scenario Data Tests"
echo "--------------------"
echo -n "Checking PBL scenarios count... "
PBL_COUNT=$(curl -s "$BASE_URL/api/pbl/scenarios?lang=en" | jq '. | length' 2>/dev/null || echo 0)
if [ "$PBL_COUNT" -gt 0 ]; then
    echo "✅ OK ($PBL_COUNT scenarios)"
else
    echo "❌ FAILED (No scenarios found)"
    FAILED=true
fi

echo -n "Checking Discovery scenarios count... "
DISCOVERY_COUNT=$(curl -s "$BASE_URL/api/discovery/scenarios?lang=en" | jq '. | length' 2>/dev/null || echo 0)
if [ "$DISCOVERY_COUNT" -gt 0 ]; then
    echo "✅ OK ($DISCOVERY_COUNT scenarios)"
else
    echo "❌ FAILED (No scenarios found)"
    FAILED=true
fi

# 7. Multi-language Support
echo -e "\n7. Multi-language Tests"
echo "--------------------"
LANGUAGES=("en" "zh" "es" "fr" "ja")
for lang in "${LANGUAGES[@]}"; do
    test_endpoint "/api/pbl/scenarios?lang=$lang" 200 "PBL scenarios ($lang)"
done

# Summary
echo -e "\n================================================"
if [ "$FAILED" = true ]; then
    echo "❌ Post-deployment tests FAILED"
    exit 1
else
    echo "✅ All post-deployment tests PASSED"
    exit 0
fi
