#!/bin/bash

echo "🧪 Testing PBL Task-Based Sessions with Authentication"
echo "=================================================="

# Base URL
BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"

# Test credentials
EMAIL="teacher@example.com"
PASSWORD="password123"

echo -e "\n1️⃣ Logging in..."
# Login and capture cookies
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

echo "Login response: ${LOGIN_RESPONSE}"

# Extract user data from response
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.id // empty')
if [ -z "$USER_ID" ]; then
  echo "❌ Login failed!"
  exit 1
fi

echo "✅ Logged in as user ID: ${USER_ID}"

# Create session for Task 1-1
echo -e "\n2️⃣ Creating session for Task 1-1..."
SESSION1_RESPONSE=$(curl -s -b cookies.txt -X POST "${API_URL}/pbl/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "scenarioId": "ai-job-search",
    "scenarioTitle": "AI 輔助求職訓練",
    "userId": "'${USER_ID}'",
    "userEmail": "'${EMAIL}'",
    "language": "zh-TW",
    "stageIndex": 0,
    "stageId": "stage-1-research",
    "stageTitle": "職缺市場研究",
    "taskId": "task-1-1",
    "taskTitle": "產業分析",
    "taskIndex": 0
  }')

SESSION1_ID=$(echo $SESSION1_RESPONSE | jq -r '.data.sessionId // empty')
LOG1_ID=$(echo $SESSION1_RESPONSE | jq -r '.data.logId // empty')

echo "Session 1 created: ${SESSION1_ID}"
echo "Log 1 ID: ${LOG1_ID}"

# Simulate chat for Task 1-1
echo -e "\n3️⃣ Sending message for Task 1-1..."
CHAT1_RESPONSE=$(curl -s -b cookies.txt -X POST "${API_URL}/pbl/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'${SESSION1_ID}'",
    "message": "如何使用AI進行產業分析？",
    "userId": "'${USER_ID}'",
    "language": "zh-TW",
    "stageContext": {
      "stageId": "stage-1-research",
      "stageName": "職缺市場研究",
      "taskId": "task-1-1",
      "taskTitle": "產業分析"
    }
  }')

echo "Chat response received"

# Complete Task 1-1
echo -e "\n4️⃣ Completing Task 1-1..."
COMPLETE1_RESPONSE=$(curl -s -b cookies.txt -X PUT "${API_URL}/pbl/sessions/${SESSION1_ID}" \
  -H "Content-Type: application/json" \
  -d '{"action": "complete"}')

echo "Task 1-1 completed"

# Create session for Task 1-2
echo -e "\n5️⃣ Creating session for Task 1-2..."
SESSION2_RESPONSE=$(curl -s -b cookies.txt -X POST "${API_URL}/pbl/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "scenarioId": "ai-job-search",
    "scenarioTitle": "AI 輔助求職訓練",
    "userId": "'${USER_ID}'",
    "userEmail": "'${EMAIL}'",
    "language": "zh-TW",
    "stageIndex": 0,
    "stageId": "stage-1-research",
    "stageTitle": "職缺市場研究",
    "taskId": "task-1-2",
    "taskTitle": "公司研究",
    "taskIndex": 1
  }')

SESSION2_ID=$(echo $SESSION2_RESPONSE | jq -r '.data.sessionId // empty')
LOG2_ID=$(echo $SESSION2_RESPONSE | jq -r '.data.logId // empty')

echo "Session 2 created: ${SESSION2_ID}"
echo "Log 2 ID: ${LOG2_ID}"

# Check history
echo -e "\n6️⃣ Checking history..."
HISTORY_RESPONSE=$(curl -s -b cookies.txt "${API_URL}/pbl/history?lang=zh-TW")

echo -e "\n📋 History Response:"
echo $HISTORY_RESPONSE | jq '.'

# Count task cards
TASK_COUNT=$(echo $HISTORY_RESPONSE | jq '.data | length')
echo -e "\n✨ Total task cards: ${TASK_COUNT}"

# Display task details
echo -e "\n📝 Task Details:"
echo $HISTORY_RESPONSE | jq -r '.data[] | "
Task: \(.currentTaskTitle // "N/A")
ID: \(.id)
Status: \(.status)
Progress: \(.progress.completedStages)/\(.progress.totalStages) stages
Score: \(.score // "N/A")
---"'

# Navigate to history page in browser
echo -e "\n7️⃣ Opening history page in browser..."
echo "Visit: ${BASE_URL}/history"

# Clean up
rm -f cookies.txt

echo -e "\n✅ Test completed!"