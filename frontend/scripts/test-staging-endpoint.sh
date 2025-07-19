#!/bin/bash

# Test staging endpoints
STAGING_URL="https://ai-square-staging-m7s4ucbgba-de.a.run.app"

echo "🧪 Testing AI Square Staging Deployment"
echo "======================================"
echo ""

# Test health endpoint
echo "1. Testing health endpoint..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/api/health")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "   ✅ Health check passed"
else
    echo "   ❌ Health check failed (HTTP $HEALTH_STATUS)"
fi

# Test staging test page
echo ""
echo "2. Testing staging test page..."
TEST_PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/staging-test")
if [ "$TEST_PAGE_STATUS" = "200" ]; then
    echo "   ✅ Staging test page accessible"
else
    echo "   ❌ Staging test page not found (HTTP $TEST_PAGE_STATUS)"
fi

# Test database initialization endpoint
echo ""
echo "3. Testing database init endpoint..."
DB_INIT_RESPONSE=$(curl -s -X POST "$STAGING_URL/api/admin/init-db")
echo "   Response: $DB_INIT_RESPONSE"

# Test main page
echo ""
echo "4. Testing main page..."
MAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/")
if [ "$MAIN_STATUS" = "200" ]; then
    echo "   ✅ Main page accessible"
else
    echo "   ❌ Main page error (HTTP $MAIN_STATUS)"
fi

# Test API endpoints
echo ""
echo "5. Testing PostgreSQL-backed API endpoints..."

# Test scenarios endpoint
echo "   - Testing /api/pbl/scenarios..."
SCENARIOS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/api/pbl/scenarios?language=en")
if [ "$SCENARIOS_STATUS" = "200" ]; then
    echo "     ✅ Scenarios API working"
else
    echo "     ❌ Scenarios API error (HTTP $SCENARIOS_STATUS)"
fi

# Test assessment endpoint
echo "   - Testing /api/assessment/scenarios..."
ASSESSMENT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/api/assessment/scenarios?language=en")
if [ "$ASSESSMENT_STATUS" = "200" ]; then
    echo "     ✅ Assessment API working"
else
    echo "     ❌ Assessment API error (HTTP $ASSESSMENT_STATUS)"
fi

echo ""
echo "======================================"
echo "Staging URL: $STAGING_URL"
echo ""