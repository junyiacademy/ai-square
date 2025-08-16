#!/bin/bash

# ============================================
# Post-Deployment Automated Testing Suite
# ============================================
# Purpose: Automatically test all critical functionalities
# after deployment to ensure system integrity
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-staging}"
TIMEOUT=10
RETRY_COUNT=3
RETRY_DELAY=5

# Set URL based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    BASE_URL="https://ai-square-frontend-731209836128.asia-east1.run.app"
else
    BASE_URL="https://ai-square-staging-731209836128.asia-east1.run.app"
fi

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
TEST_RESULTS=()

echo -e "${BLUE}🧪 AI Square Post-Deployment Testing${NC}"
echo "======================================"
echo "Environment: $ENVIRONMENT"
echo "URL: $BASE_URL"
echo ""

# ============================================
# Helper Functions
# ============================================

# Function to test an endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_field="$3"
    local method="${4:-GET}"
    local data="${5:-}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing $name... "
    
    local success=false
    local attempt=1
    
    while [ $attempt -le $RETRY_COUNT ]; do
        if [ "$method" = "POST" ]; then
            response=$(curl -X POST "$url" \
                -H "Content-Type: application/json" \
                -d "$data" \
                -s -w "\n%{http_code}" \
                --connect-timeout $TIMEOUT \
                2>/dev/null || echo "000")
        else
            response=$(curl -s -w "\n%{http_code}" \
                --connect-timeout $TIMEOUT \
                "$url" 2>/dev/null || echo "000")
        fi
        
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | head -n-1)
        
        if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
            if [ -n "$expected_field" ]; then
                if echo "$body" | jq -e "$expected_field" &>/dev/null; then
                    success=true
                    break
                fi
            else
                success=true
                break
            fi
        fi
        
        if [ $attempt -lt $RETRY_COUNT ]; then
            sleep $RETRY_DELAY
        fi
        attempt=$((attempt + 1))
    done
    
    if $success; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS+=("✅ $name: PASSED")
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $http_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("❌ $name: FAILED (HTTP $http_code)")
    fi
}

# Function to test database query
test_database() {
    local name="$1"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing $name... "
    
    response=$(curl -s "$BASE_URL/api/health")
    db_status=$(echo "$response" | jq -r '.checks.database.status' 2>/dev/null)
    
    if [ "$db_status" = "true" ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS+=("✅ $name: PASSED")
    else
        echo -e "${RED}❌ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("❌ $name: FAILED")
    fi
}

# ============================================
# Test Suite
# ============================================

echo "🔍 Running Core System Tests"
echo "--------------------------------------------"

# 1. Health Check
test_endpoint "Health Check" \
    "$BASE_URL/api/health" \
    '.status == "healthy"'

# 2. Database Connection
test_database "Database Connection"

# 3. Simple Health (Fallback)
test_endpoint "Simple Health Check" \
    "$BASE_URL/api/simple-health" \
    '.status == "ok"'

echo ""
echo "📚 Testing Learning Modules"
echo "--------------------------------------------"

# 4. PBL Scenarios
test_endpoint "PBL Scenarios API" \
    "$BASE_URL/api/pbl/scenarios?language=en" \
    '.success == true'

# 5. Discovery Scenarios
test_endpoint "Discovery Scenarios API" \
    "$BASE_URL/api/discovery/scenarios?language=en" \
    '.success == true'

# 6. Assessment Scenarios
test_endpoint "Assessment Scenarios API" \
    "$BASE_URL/api/assessment/scenarios?language=en" \
    '.success == true'

echo ""
echo "🔐 Testing Authentication"
echo "--------------------------------------------"

# 7. Student Login
test_endpoint "Student Login" \
    "$BASE_URL/api/auth/login" \
    '.success == true' \
    "POST" \
    '{"email":"student@example.com","password":"student123"}'

# 8. Teacher Login
test_endpoint "Teacher Login" \
    "$BASE_URL/api/auth/login" \
    '.success == true' \
    "POST" \
    '{"email":"teacher@example.com","password":"teacher123"}'

# 9. Admin Login
test_endpoint "Admin Login" \
    "$BASE_URL/api/auth/login" \
    '.success == true' \
    "POST" \
    '{"email":"admin@example.com","password":"admin123"}'

echo ""
echo "📊 Testing Data APIs"
echo "--------------------------------------------"

# 10. Relations API
test_endpoint "Relations API" \
    "$BASE_URL/api/relations?language=en" \
    '.domains | length > 0'

# 11. KSA API
test_endpoint "KSA Codes API" \
    "$BASE_URL/api/ksa?language=en" \
    '.ksaCodes != null'

# 12. Monitoring Status
test_endpoint "Monitoring Status" \
    "$BASE_URL/api/monitoring/status" \
    '.status != null'

# ============================================
# Performance Tests
# ============================================

echo ""
echo "⚡ Running Performance Tests"
echo "--------------------------------------------"

# Test response times
echo -n "Testing API response time... "
start_time=$(date +%s%N)
curl -s "$BASE_URL/api/health" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))

if [ $response_time -lt 1000 ]; then
    echo -e "${GREEN}✅ Fast ($response_time ms)${NC}"
    TEST_RESULTS+=("✅ Response Time: Fast ($response_time ms)")
elif [ $response_time -lt 3000 ]; then
    echo -e "${YELLOW}⚠️ Acceptable ($response_time ms)${NC}"
    TEST_RESULTS+=("⚠️ Response Time: Acceptable ($response_time ms)")
else
    echo -e "${RED}❌ Slow ($response_time ms)${NC}"
    TEST_RESULTS+=("❌ Response Time: Slow ($response_time ms)")
fi

# ============================================
# Generate Test Report
# ============================================

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPORT_FILE="/tmp/deployment-test-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).json"

cat > "$REPORT_FILE" << EOF
{
  "environment": "$ENVIRONMENT",
  "url": "$BASE_URL",
  "timestamp": "$TIMESTAMP",
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "successRate": $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
  },
  "tests": [
EOF

first=true
for result in "${TEST_RESULTS[@]}"; do
    if [ "$first" = true ]; then
        first=false
    else
        echo "," >> "$REPORT_FILE"
    fi
    echo -n "    \"$result\"" >> "$REPORT_FILE"
done

cat >> "$REPORT_FILE" << EOF

  ]
}
EOF

# ============================================
# Summary
# ============================================

echo ""
echo "============================================"
echo "📊 Test Summary"
echo "============================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "Success Rate: $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo ""
echo "Report saved to: $REPORT_FILE"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}❌ DEPLOYMENT VERIFICATION FAILED${NC}"
    echo "Critical issues detected. Please investigate immediately!"
    
    # Send alert (placeholder for actual alerting)
    echo ""
    echo "🚨 Alert should be sent to team!"
    exit 1
else
    echo -e "${GREEN}✅ DEPLOYMENT VERIFICATION PASSED${NC}"
    echo "All systems operational!"
    exit 0
fi