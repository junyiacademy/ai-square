#!/bin/bash

# Comprehensive Staging Test Script
# Tests all critical functionality after deployment

set -e

# Configuration
SERVICE_URL="${1:-https://ai-square-staging-731209836128.asia-east1.run.app}"
TEST_EMAIL="student@example.com"
TEST_PASSWORD="student123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== AI Square Staging Comprehensive Test ===${NC}"
echo "Service URL: $SERVICE_URL"
echo "Test Time: $(date)"
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ OK (HTTP $response)${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL (HTTP $response, expected $expected_status)${NC}"
        return 1
    fi
}

# Function to test API and get JSON response
test_api_json() {
    local name=$1
    local url=$2
    
    echo -e "\n${YELLOW}Testing $name API:${NC}"
    
    local response=$(curl -s "$url")
    local status=$(echo "$response" | jq -r '.success // false' 2>/dev/null || echo "false")
    
    if [ "$status" = "true" ]; then
        local count=$(echo "$response" | jq -r '.data.scenarios // [] | length' 2>/dev/null || echo "0")
        echo -e "${GREEN}✓ Success - Found $count items${NC}"
        
        # Show first item if available
        if [ "$count" -gt 0 ]; then
            echo "  First item:"
            echo "$response" | jq -r '.data.scenarios[0] | "  - ID: \(.id // .yamlId // "unknown")"'
            echo "$response" | jq -r '.data.scenarios[0] | "  - Title: \(.title // "untitled")"'
        fi
    else
        echo -e "${RED}✗ Failed${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    fi
}

# Function to test login
test_login() {
    echo -e "\n${YELLOW}Testing Authentication:${NC}"
    
    local response=$(curl -s -X POST "$SERVICE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    local success=$(echo "$response" | jq -r '.success // false')
    
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✓ Login successful${NC}"
        echo "  - User: $(echo "$response" | jq -r '.user.email')"
        echo "  - Role: $(echo "$response" | jq -r '.user.role')"
        return 0
    else
        echo -e "${RED}✗ Login failed${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 1
    fi
}

# 1. Test Health Check
echo -e "${BLUE}1. Infrastructure Tests${NC}"
test_endpoint "Health Check" "$SERVICE_URL/api/health" 200

# Get health details
echo -n "  Database Connection: "
db_status=$(curl -s "$SERVICE_URL/api/health" | jq -r '.checks.database.status // false')
if [ "$db_status" = "true" ]; then
    echo -e "${GREEN}Connected${NC}"
else
    echo -e "${RED}Disconnected${NC}"
fi

# 2. Test Authentication
test_login

# 3. Test Basic Pages
echo -e "\n${BLUE}2. Page Access Tests${NC}"
test_endpoint "Homepage" "$SERVICE_URL" 200
test_endpoint "Relations Page" "$SERVICE_URL/relations" 200
test_endpoint "Login Page" "$SERVICE_URL/login" 200

# Test scenario pages (may redirect if not logged in)
test_endpoint "PBL Scenarios" "$SERVICE_URL/pbl/scenarios" 307
test_endpoint "Discovery Scenarios" "$SERVICE_URL/discovery/scenarios" 307
test_endpoint "Assessment Scenarios" "$SERVICE_URL/assessment/scenarios" 307

# 4. Test API Endpoints
echo -e "\n${BLUE}3. API Endpoint Tests${NC}"
test_api_json "PBL Scenarios" "$SERVICE_URL/api/pbl/scenarios?lang=en"
test_api_json "Discovery Scenarios" "$SERVICE_URL/api/discovery/scenarios?lang=en"
test_api_json "Assessment Scenarios" "$SERVICE_URL/api/assessment/scenarios?lang=en"

# Test Relations API
echo -e "\n${YELLOW}Testing Relations API:${NC}"
relations_response=$(curl -s "$SERVICE_URL/api/relations?lang=en")
domain_count=$(echo "$relations_response" | jq -r '.domains // [] | length' 2>/dev/null || echo "0")
if [ "$domain_count" -gt 0 ]; then
    echo -e "${GREEN}✓ Success - Found $domain_count domains${NC}"
else
    echo -e "${RED}✗ Failed to load domains${NC}"
fi

# 5. Initialize Scenarios (if needed)
echo -e "\n${BLUE}4. Scenario Initialization Check${NC}"

# Check PBL scenario count
pbl_count=$(curl -s "$SERVICE_URL/api/pbl/scenarios?lang=en" | jq -r '.data.scenarios // [] | length' 2>/dev/null || echo "0")
echo "PBL Scenarios in system: $pbl_count"

if [ "$pbl_count" -lt 9 ]; then
    echo -e "${YELLOW}⚠ Expected 9 PBL scenarios, found $pbl_count${NC}"
    echo "Consider running initialization:"
    echo "  curl -X POST $SERVICE_URL/api/admin/init-pbl"
fi

# 6. Performance Check
echo -e "\n${BLUE}5. Performance Test${NC}"
echo -n "Homepage load time: "
time_total=$(curl -s -o /dev/null -w "%{time_total}" "$SERVICE_URL")
echo "${time_total}s"

# Summary
echo -e "\n${BLUE}=== Test Summary ===${NC}"
echo "Service URL: $SERVICE_URL"
echo "Test completed at: $(date)"

# Calculate pass/fail
if [ "$pbl_count" -ge 2 ] && [ "$db_status" = "true" ]; then
    echo -e "\n${GREEN}✓ STAGING ENVIRONMENT IS OPERATIONAL${NC}"
    echo "  - Infrastructure: Working"
    echo "  - Database: Connected"
    echo "  - APIs: Responding"
    echo "  - Scenarios: $pbl_count loaded"
    
    if [ "$pbl_count" -lt 9 ]; then
        echo -e "\n${YELLOW}⚠ Note: Only $pbl_count/9 PBL scenarios loaded${NC}"
        echo "  This may indicate incomplete initialization"
    fi
else
    echo -e "\n${RED}✗ STAGING ENVIRONMENT HAS ISSUES${NC}"
    [ "$db_status" != "true" ] && echo "  - Database connection failed"
    [ "$pbl_count" -lt 2 ] && echo "  - Insufficient scenarios loaded"
fi

echo -e "\n${BLUE}=== End of Test ===${NC}"