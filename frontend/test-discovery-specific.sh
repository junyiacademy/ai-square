#!/bin/bash

# Test Discovery interaction with specific IDs
BASE_URL="http://localhost:3000"
SCENARIO_ID="393f567e-9cc2-46bf-9384-74e91b0d0785"
PROGRAM_ID="b1940bdd-5540-48fe-a684-b8a953985b9b"
TASK_ID="f1eae2cc-7c00-4450-a355-68d5d363cfdd"

# 1. Login
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"student123"}')

SESSION_TOKEN=$(grep sessionToken cookies.txt | awk '{print $7}')
echo "Session token obtained: ${SESSION_TOKEN:0:20}..."

# 2. Get task details
echo -e "\n2. Getting task details..."
TASK_RESPONSE=$(curl -s -X GET "$BASE_URL/api/discovery/scenarios/$SCENARIO_ID/programs/$PROGRAM_ID/tasks/$TASK_ID?lang=zh" \
  -H "x-session-token: $SESSION_TOKEN")

echo "Task title: $(echo $TASK_RESPONSE | jq -r '.title' 2>/dev/null || echo 'N/A')"
echo "Current interactions: $(echo $TASK_RESPONSE | jq '.interactions | length' 2>/dev/null || echo '0')"

# 3. Submit answer
echo -e "\n3. Submitting answer..."
SUBMIT_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/discovery/scenarios/$SCENARIO_ID/programs/$PROGRAM_ID/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "x-session-token: $SESSION_TOKEN" \
  -d '{
    "action": "submit",
    "content": {
      "response": "我計劃創作一個關於科技改變生活的影片系列，每集探討一個新技術如何影響我們的日常生活。",
      "timeSpent": 120
    }
  }')

echo "Submit status: $(echo $SUBMIT_RESPONSE | jq -r '.status' 2>/dev/null || echo 'error')"
echo "AI feedback received: $(echo $SUBMIT_RESPONSE | jq -r '.feedback' 2>/dev/null | head -c 100)..."

# 4. Verify saved interactions
echo -e "\n4. Verifying saved interactions..."
VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/discovery/scenarios/$SCENARIO_ID/programs/$PROGRAM_ID/tasks/$TASK_ID?lang=zh" \
  -H "x-session-token: $SESSION_TOKEN")

INTERACTION_COUNT=$(echo $VERIFY_RESPONSE | jq '.interactions | length' 2>/dev/null || echo '0')
echo "Updated interactions count: $INTERACTION_COUNT"

if [ "$INTERACTION_COUNT" -gt 0 ]; then
  echo -e "\nLatest interactions:"
  echo $VERIFY_RESPONSE | jq '.interactions[-2:]' 2>/dev/null
fi

rm -f cookies.txt