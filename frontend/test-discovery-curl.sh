#!/bin/bash

# Test Discovery interaction saving

BASE_URL="http://localhost:3000"
EMAIL="student@example.com"
PASSWORD="student123"

# 1. Login and get session token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "Login response: $LOGIN_RESPONSE"

# Extract session token from cookies
SESSION_TOKEN=$(grep sessionToken cookies.txt | awk '{print $7}')
echo "Session token: ${SESSION_TOKEN:0:20}..."

# 2. Get current tasks to find active program
echo -e "\n2. Finding active program..."
SCENARIO_ID="393f567e-9cc2-46bf-9384-74e91b0d0785"

# Get programs for this scenario
PROGRAMS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/discovery/scenarios/$SCENARIO_ID/programs?lang=zh" \
  -H "x-session-token: $SESSION_TOKEN")

echo "Programs response: $PROGRAMS_RESPONSE"

# Extract the first program ID (you may need to parse this better)
PROGRAM_ID=$(echo $PROGRAMS_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Found program ID: $PROGRAM_ID"

# 3. Get tasks for the program
echo -e "\n3. Getting tasks..."
TASKS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/discovery/scenarios/$SCENARIO_ID/programs/$PROGRAM_ID?lang=zh" \
  -H "x-session-token: $SESSION_TOKEN")

# Extract the first task ID
TASK_ID=$(echo $TASKS_RESPONSE | grep -o '"tasks":\[.*\]' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Found task ID: $TASK_ID"

# 4. Submit answer to task
echo -e "\n4. Submitting answer to task..."
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

echo "Submit response: $SUBMIT_RESPONSE"

# 5. Get task to check interactions
echo -e "\n5. Checking saved interactions..."
TASK_RESPONSE=$(curl -s -X GET "$BASE_URL/api/discovery/scenarios/$SCENARIO_ID/programs/$PROGRAM_ID/tasks/$TASK_ID?lang=zh" \
  -H "x-session-token: $SESSION_TOKEN")

# Count interactions
INTERACTION_COUNT=$(echo $TASK_RESPONSE | grep -o '"interactions":\[' | wc -l)
echo "Task response has interactions: $INTERACTION_COUNT"

# Show interactions
echo -e "\nInteractions:"
echo $TASK_RESPONSE | jq '.interactions' 2>/dev/null || echo "Could not parse interactions"

# Clean up
rm -f cookies.txt