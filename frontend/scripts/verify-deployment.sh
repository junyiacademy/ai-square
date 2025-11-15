#!/bin/bash

# Verify deployment script
# Usage: ./scripts/verify-deployment.sh [staging|production]

ENV=${1:-staging}
echo "🔍 Verifying $ENV deployment..."

if [ "$ENV" = "staging" ]; then
  BASE_URL="https://ai-square-staging-731209836128.asia-east1.run.app"
elif [ "$ENV" = "production" ]; then
  BASE_URL="https://ai-square-production.asia-east1.run.app"
else
  echo "❌ Unknown environment: $ENV"
  exit 1
fi

echo "📍 Target: $BASE_URL"

# 1. Health check
echo -e "\n1️⃣ Health Check:"
HEALTH=$(curl -s "$BASE_URL/api/health" | jq)
echo "$HEALTH" | jq '.'

# Check database status
DB_STATUS=$(echo "$HEALTH" | jq -r '.checks.database.status')
if [ "$DB_STATUS" = "true" ]; then
  echo "✅ Database connected"
else
  echo "❌ Database not connected!"
  echo "$HEALTH" | jq '.checks.database'
fi

# 2. Test login with demo account
echo -e "\n2️⃣ Testing login with demo account:"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"student123"}')

echo "$LOGIN_RESPONSE" | jq '.'

if echo "$LOGIN_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
fi

# 3. Check scenarios
echo -e "\n3️⃣ Checking scenarios:"
echo "PBL Scenarios:"
curl -s "$BASE_URL/api/pbl/scenarios?lang=en" | jq '.total'

echo "Assessment Scenarios:"
curl -s "$BASE_URL/api/assessment/scenarios?lang=en" | jq '.total'

echo "Discovery Scenarios:"
curl -s "$BASE_URL/api/discovery/scenarios?lang=en" | jq '.total'

# 4. Recent logs
echo -e "\n4️⃣ Recent error logs:"
gcloud run services logs read "ai-square-$ENV" \
  --region=asia-east1 \
  --limit=20 \
  --format="value(text)" | grep -i "error" | tail -5 || echo "No recent errors"

echo -e "\n✅ Verification complete!"
