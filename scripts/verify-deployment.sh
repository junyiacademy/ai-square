#!/bin/bash

# Deployment verification script
# Usage: ./verify-deployment.sh [staging|production]

ENVIRONMENT=${1:-staging}
BASE_URL=""

if [ "$ENVIRONMENT" == "staging" ]; then
    BASE_URL="https://ai-square-staging-m7s4ucbgba-de.a.run.app"
elif [ "$ENVIRONMENT" == "production" ]; then
    BASE_URL="https://ai-square-production-m7s4ucbgba-de.a.run.app"
else
    echo "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

echo "========================================="
echo "Verifying $ENVIRONMENT deployment"
echo "Base URL: $BASE_URL"
echo "========================================="

# 1. Health check
echo -e "\n1. Health Check:"
HEALTH_RESPONSE=$(curl -s -w "\nStatus: %{http_code}" "$BASE_URL/api/health")
echo "$HEALTH_RESPONSE"

# 2. Test login with demo account
echo -e "\n2. Testing Login:"
LOGIN_RESPONSE=$(curl -s -w "\nStatus: %{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"student@example.com","password":"student123"}')
echo "$LOGIN_RESPONSE"

# 3. Check if scenarios are initialized
echo -e "\n3. Checking PBL Scenarios:"
PBL_RESPONSE=$(curl -s -w "\nStatus: %{http_code}" "$BASE_URL/api/pbl/scenarios?lang=en")
echo "$PBL_RESPONSE" | jq '.scenarios | length' 2>/dev/null || echo "Failed to get scenarios"

# 4. Database connection (if admin endpoint exists)
echo -e "\n4. Database Connection:"
DB_RESPONSE=$(curl -s -w "\nStatus: %{http_code}" "$BASE_URL/api/admin/db-check")
echo "$DB_RESPONSE"

echo -e "\n========================================="
echo "Deployment verification complete"
echo "========================================="