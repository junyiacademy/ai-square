#!/bin/bash

echo "🧪 測試簡化的 PBL Log 結構"
echo "========================="

# Base URL
BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"

# Test user
USER_COOKIE="user=%7B%22id%22%3A3%2C%22email%22%3A%22teacher%40example.com%22%7D"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create a test session
echo -e "\n${BLUE}Creating test session...${NC}"

RESPONSE=$(curl -s -X POST "${API_URL}/pbl/sessions" \
    -H "Content-Type: application/json" \
    -H "Cookie: ${USER_COOKIE}" \
    -d '{
        "scenarioId": "ai-job-search",
        "scenarioTitle": "AI 輔助求職訓練",
        "userId": "3",
        "userEmail": "teacher@example.com",
        "language": "zh-TW",
        "stageIndex": 0,
        "stageId": "stage-1-research",
        "stageTitle": "職缺市場研究",
        "taskId": "task-1-1",
        "taskTitle": "產業分析",
        "taskIndex": 0
    }')

SESSION_ID=$(echo $RESPONSE | jq -r '.data.sessionId // empty')
LOG_ID=$(echo $RESPONSE | jq -r '.data.logId // empty')

if [ -n "$SESSION_ID" ]; then
    echo -e "${GREEN}✓ Session created: ${SESSION_ID}${NC}"
    echo -e "  Log ID: ${LOG_ID}"
else
    echo -e "${RED}✗ Failed to create session${NC}"
    echo $RESPONSE | jq '.'
    exit 1
fi

# Send a test message
echo -e "\n${BLUE}Sending test message...${NC}"

CHAT_RESPONSE=$(curl -s -X POST "${API_URL}/pbl/chat" \
    -H "Content-Type: application/json" \
    -H "Cookie: ${USER_COOKIE}" \
    -d "{
        \"sessionId\": \"${SESSION_ID}\",
        \"message\": \"請問如何分析科技產業的未來趨勢？\",
        \"userId\": \"3\",
        \"language\": \"zh-TW\",
        \"aiModule\": {
            \"role\": \"assistant\",
            \"model\": \"gemini-2.5-flash\",
            \"persona\": \"Career Assistant\"
        },
        \"stageContext\": {
            \"stageId\": \"stage-1-research\",
            \"stageName\": \"職缺市場研究\",
            \"stageType\": \"research\",
            \"taskId\": \"task-1-1\",
            \"taskTitle\": \"產業分析\",
            \"taskInstructions\": [\"協助用戶完成任務\"]
        },
        \"userProcessLog\": {
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
            \"stageId\": \"stage-1-research\",
            \"taskId\": \"task-1-1\",
            \"actionType\": \"write\",
            \"content\": \"請問如何分析科技產業的未來趨勢？\",
            \"detail\": {
                \"messageLength\": 18,
                \"taskId\": \"task-1-1\"
            }
        }
    }")

CHAT_SUCCESS=$(echo $CHAT_RESPONSE | jq -r '.success // false')
if [ "$CHAT_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ Message sent successfully${NC}"
else
    echo -e "${RED}✗ Failed to send message${NC}"
    echo $CHAT_RESPONSE | jq '.'
fi

# Check history
echo -e "\n${BLUE}Checking history...${NC}"

sleep 2  # Give time for the log to be saved

HISTORY=$(curl -s "${API_URL}/pbl/history?lang=zh-TW" \
    -H "Cookie: ${USER_COOKIE}")

TOTAL=$(echo $HISTORY | jq '.data | length')
echo -e "\n${GREEN}Found ${TOTAL} sessions in history${NC}"

# Show the latest session details
echo -e "\n${YELLOW}Latest session details:${NC}"
echo $HISTORY | jq -r '.data[0] | {
    taskTitle: .currentTaskTitle,
    sessionId: .id,
    status: .status,
    conversationCount: .progress.conversationCount,
    totalInteractions: .totalInteractions
}'

echo -e "\n${GREEN}✅ Test completed!${NC}"
echo -e "\n${BLUE}Visit these pages to verify:${NC}"
echo -e "1. History: ${BASE_URL}/history"
echo -e "2. Learn: ${BASE_URL}/pbl/scenarios/ai-job-search/learn"