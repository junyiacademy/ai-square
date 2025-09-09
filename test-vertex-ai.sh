#!/bin/bash

# Vertex AI Quick Test Script
# Usage: ./test-vertex-ai.sh [local|staging]

ENV=${1:-local}

if [ "$ENV" = "local" ]; then
    BASE_URL="http://localhost:3004"
    echo "🔍 Testing LOCAL environment..."
elif [ "$ENV" = "staging" ]; then
    BASE_URL="https://ai-square-staging-m7s4ucbgba-de.a.run.app"
    echo "🔍 Testing STAGING environment..."
else
    echo "❌ Invalid environment. Use 'local' or 'staging'"
    exit 1
fi

echo ""
echo "1️⃣ GET Test - Full diagnostic:"
echo "================================"
curl -s "$BASE_URL/api/debug/vertex-ai" | jq '.'

echo ""
echo "2️⃣ POST Test - Simple initialization:"
echo "======================================="
curl -s -X POST "$BASE_URL/api/debug/vertex-ai" \
  -H "Content-Type: application/json" \
  -d '{"test": "simple"}' | jq '.'

echo ""
echo "3️⃣ POST Test - Full generation:"
echo "================================="
curl -s -X POST "$BASE_URL/api/debug/vertex-ai" \
  -H "Content-Type: application/json" \
  -d '{"test": "full"}' | jq '.'

echo ""
echo "✅ Test complete!"