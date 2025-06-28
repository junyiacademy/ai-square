#!/bin/bash

echo "🧪 簡單測試 PBL Chat 功能"
echo "========================"

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
CYAN='\033[0;36m'
NC='\033[0m'

# Step 1: Create session
echo -e "\n${BLUE}1. 創建 Session...${NC}"

SESSION_RESPONSE=$(curl -s -X POST "${API_URL}/pbl/sessions" \
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

SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.data.sessionId // empty')
LOG_ID=$(echo $SESSION_RESPONSE | jq -r '.data.logId // empty')

if [ -n "$SESSION_ID" ]; then
    echo -e "${GREEN}✓ Session 創建成功${NC}"
    echo -e "  Session ID: ${SESSION_ID}"
    echo -e "  Log ID: ${LOG_ID}"
else
    echo -e "${RED}✗ Session 創建失敗${NC}"
    echo $SESSION_RESPONSE | jq '.'
    exit 1
fi

# Step 2: Send chat messages
echo -e "\n${BLUE}2. 發送聊天訊息...${NC}"

# Message 1
echo -e "\n${CYAN}💬 發送第一個訊息...${NC}"
CHAT1=$(curl -s -X POST "${API_URL}/pbl/chat" \
    -H "Content-Type: application/json" \
    -H "Cookie: ${USER_COOKIE}" \
    -d '{
        "sessionId": "'"${SESSION_ID}"'",
        "message": "請問 AI 領域有哪些主要的職缺類型？",
        "userId": "3",
        "language": "zh-TW",
        "aiModule": {
            "role": "assistant",
            "model": "gemini-2.0-flash-exp",
            "persona": "Career Assistant"
        },
        "stageContext": {
            "stageId": "stage-1-research",
            "stageName": "職缺市場研究",
            "stageType": "research",
            "taskId": "task-1-1",
            "taskTitle": "產業分析",
            "taskInstructions": ["協助用戶完成任務"]
        }
    }')

if [ "$(echo $CHAT1 | jq -r '.success // false')" = "true" ]; then
    echo -e "${GREEN}✓ 訊息發送成功${NC}"
    AI_RESPONSE=$(echo $CHAT1 | jq -r '.data.conversation.content' | head -c 200)
    echo -e "${YELLOW}🤖 AI 回應: ${AI_RESPONSE}...${NC}"
else
    echo -e "${RED}✗ 訊息發送失敗${NC}"
    echo $CHAT1 | jq '.'
fi

sleep 2

# Message 2
echo -e "\n${CYAN}💬 發送第二個訊息...${NC}"
CHAT2=$(curl -s -X POST "${API_URL}/pbl/chat" \
    -H "Content-Type: application/json" \
    -H "Cookie: ${USER_COOKIE}" \
    -d '{
        "sessionId": "'"${SESSION_ID}"'",
        "message": "機器學習工程師需要哪些技能？",
        "userId": "3",
        "language": "zh-TW",
        "aiModule": {
            "role": "assistant",
            "model": "gemini-2.0-flash-exp",
            "persona": "Career Assistant"
        },
        "stageContext": {
            "stageId": "stage-1-research",
            "stageName": "職缺市場研究",
            "stageType": "research",
            "taskId": "task-1-1",
            "taskTitle": "產業分析",
            "taskInstructions": ["協助用戶完成任務"]
        }
    }')

if [ "$(echo $CHAT2 | jq -r '.success // false')" = "true" ]; then
    echo -e "${GREEN}✓ 訊息發送成功${NC}"
    AI_RESPONSE=$(echo $CHAT2 | jq -r '.data.conversation.content' | head -c 200)
    echo -e "${YELLOW}🤖 AI 回應: ${AI_RESPONSE}...${NC}"
else
    echo -e "${RED}✗ 訊息發送失敗${NC}"
    echo $CHAT2 | jq '.'
fi

sleep 2

# Step 3: Evaluate the task
echo -e "\n${BLUE}3. 評估任務表現...${NC}"

EVAL_RESPONSE=$(curl -s -X POST "${API_URL}/pbl/evaluate" \
    -H "Content-Type: application/json" \
    -H "Cookie: ${USER_COOKIE}" \
    -d '{
        "sessionId": "'"${SESSION_ID}"'",
        "stageId": "stage-1-research",
        "taskId": "task-1-1",
        "language": "zh-TW"
    }')

if [ "$(echo $EVAL_RESPONSE | jq -r '.success // false')" = "true" ]; then
    echo -e "${GREEN}✓ 評估完成${NC}"
    
    SCORE=$(echo $EVAL_RESPONSE | jq -r '.data.stageResult.score // 0')
    STRENGTHS=$(echo $EVAL_RESPONSE | jq -r '.data.stageResult.feedback.strengths[0] // "無"')
    IMPROVEMENTS=$(echo $EVAL_RESPONSE | jq -r '.data.stageResult.feedback.improvements[0] // "無"')
    
    echo -e "${CYAN}📈 分數: ${SCORE}/100${NC}"
    echo -e "${CYAN}💪 優勢: ${STRENGTHS}${NC}"
    echo -e "${CYAN}📚 改進: ${IMPROVEMENTS}${NC}"
else
    echo -e "${RED}✗ 評估失敗${NC}"
    echo $EVAL_RESPONSE | jq '.'
fi

# Step 4: Complete session
echo -e "\n${BLUE}4. 完成 Session...${NC}"

COMPLETE_RESPONSE=$(curl -s -X PUT "${API_URL}/pbl/sessions/${SESSION_ID}" \
    -H "Content-Type: application/json" \
    -H "Cookie: ${USER_COOKIE}" \
    -d '{"action": "complete"}')

if [ "$(echo $COMPLETE_RESPONSE | jq -r '.success // false')" = "true" ]; then
    echo -e "${GREEN}✓ Session 已完成${NC}"
else
    echo -e "${RED}✗ 完成失敗${NC}"
    echo $COMPLETE_RESPONSE | jq '.'
fi

# Step 5: Check history
echo -e "\n${BLUE}5. 檢查歷史記錄...${NC}"

HISTORY=$(curl -s "${API_URL}/pbl/history?lang=zh-TW" \
    -H "Cookie: ${USER_COOKIE}")

LATEST=$(echo $HISTORY | jq -r '.data[0] | {
    taskTitle: .currentTaskTitle,
    status: .status,
    score: .score,
    interactions: .totalInteractions
}')

echo -e "${GREEN}最新記錄:${NC}"
echo "$LATEST" | jq '.'

echo -e "\n${GREEN}✅ 測試完成！${NC}"
echo -e "\n訪問完成頁面: ${BASE_URL}/pbl/scenarios/ai-job-search/complete?sessionId=${SESSION_ID}"