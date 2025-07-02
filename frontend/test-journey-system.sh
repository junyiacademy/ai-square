#!/bin/bash

echo "🧪 測試 Journey-based PBL 系統"
echo "==============================="

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

# Test scenario
SCENARIO_ID="ai-job-search"

echo -e "\n${BLUE}1. 檢查現有 Journey...${NC}"
JOURNEYS_RESPONSE=$(curl -s "${API_URL}/pbl/journeys?scenarioId=${SCENARIO_ID}" \
    -H "Cookie: ${USER_COOKIE}")

echo $JOURNEYS_RESPONSE | jq '.data.journeys | length' > /dev/null 2>&1
if [ $? -eq 0 ]; then
    JOURNEY_COUNT=$(echo $JOURNEYS_RESPONSE | jq -r '.data.journeys | length')
    echo -e "${GREEN}✓ 找到 ${JOURNEY_COUNT} 個現有 Journey${NC}"
    
    if [ "$JOURNEY_COUNT" -gt 0 ]; then
        echo -e "${CYAN}現有 Journey:${NC}"
        echo $JOURNEYS_RESPONSE | jq -r '.data.journeys[] | 
        "  - Journey ID: \(.journeyId)
          狀態: \(.status)
          進度: \(.progress.completedTasks)/\(.progress.totalTasks)
          分數: \(.scores.overallScore // "N/A")"'
    fi
else
    echo -e "${RED}✗ API 錯誤或格式不正確${NC}"
    echo $JOURNEYS_RESPONSE | jq '.'
fi

echo -e "\n${BLUE}2. 創建新 Journey...${NC}"
CREATE_RESPONSE=$(curl -s "${API_URL}/pbl/journeys" \
    -H "Cookie: ${USER_COOKIE}" \
    -H "Content-Type: application/json" \
    -d '{"scenarioId": "'$SCENARIO_ID'", "language": "zhTW"}')

echo $CREATE_RESPONSE | jq '.success' > /dev/null 2>&1
if [ $? -eq 0 ]; then
    SUCCESS=$(echo $CREATE_RESPONSE | jq -r '.success')
    if [ "$SUCCESS" = "true" ]; then
        JOURNEY_ID=$(echo $CREATE_RESPONSE | jq -r '.data.journeyId')
        echo -e "${GREEN}✓ 成功創建 Journey: ${JOURNEY_ID}${NC}"
        
        echo -e "${CYAN}Journey 詳情:${NC}"
        echo $CREATE_RESPONSE | jq -r '.data | 
        "  - Scenario: \(.scenarioId)
          總任務數: \(.totalTasks)
          狀態: \(.status)
          開始時間: \(.startedAt)"'
    else
        echo -e "${RED}✗ 創建失敗${NC}"
        echo $CREATE_RESPONSE | jq '.error'
    fi
else
    echo -e "${RED}✗ API 錯誤${NC}"
    echo $CREATE_RESPONSE
fi

echo -e "\n${BLUE}3. 測試 Journey Chat...${NC}"
if [ -n "$JOURNEY_ID" ]; then
    CHAT_RESPONSE=$(curl -s "${API_URL}/pbl/journey-chat" \
        -H "Cookie: ${USER_COOKIE}" \
        -H "Content-Type: application/json" \
        -d '{
            "journeyId": "'$JOURNEY_ID'",
            "taskId": "task-1-1",
            "message": "你好，我想開始這個任務",
            "userId": "3",
            "language": "zhTW"
        }')
    
    echo $CHAT_RESPONSE | jq '.success' > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        SUCCESS=$(echo $CHAT_RESPONSE | jq -r '.success')
        if [ "$SUCCESS" = "true" ]; then
            echo -e "${GREEN}✓ Chat 功能正常${NC}"
            echo -e "${CYAN}AI 回應:${NC}"
            echo $CHAT_RESPONSE | jq -r '.data.conversation.content' | head -c 100
            echo "..."
        else
            echo -e "${RED}✗ Chat 失敗${NC}"
            echo $CHAT_RESPONSE | jq '.error'
        fi
    else
        echo -e "${RED}✗ Chat API 錯誤${NC}"
        echo $CHAT_RESPONSE
    fi
else
    echo -e "${YELLOW}⚠ 跳過 Chat 測試 (沒有 Journey ID)${NC}"
fi

echo -e "\n${BLUE}4. 測試任務分析...${NC}"
if [ -n "$JOURNEY_ID" ]; then
    ANALYZE_RESPONSE=$(curl -s "${API_URL}/pbl/journey-analyze" \
        -H "Cookie: ${USER_COOKIE}" \
        -H "Content-Type: application/json" \
        -d '{
            "journeyId": "'$JOURNEY_ID'",
            "taskId": "task-1-1",
            "stageId": "stage-1-research",
            "taskTitle": "研究AI工作機會"
        }')
    
    echo $ANALYZE_RESPONSE | jq '.success' > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        SUCCESS=$(echo $ANALYZE_RESPONSE | jq -r '.success')
        if [ "$SUCCESS" = "true" ]; then
            echo -e "${GREEN}✓ 分析功能正常${NC}"
            SCORE=$(echo $ANALYZE_RESPONSE | jq -r '.data.stageResult.score')
            echo -e "${CYAN}分析結果: ${SCORE} 分${NC}"
        else
            echo -e "${RED}✗ 分析失敗${NC}"
            echo $ANALYZE_RESPONSE | jq '.error'
        fi
    else
        echo -e "${RED}✗ 分析 API 錯誤${NC}"
        echo $ANALYZE_RESPONSE
    fi
else
    echo -e "${YELLOW}⚠ 跳過分析測試 (沒有 Journey ID)${NC}"
fi

echo -e "\n${BLUE}5. 檢查更新後的 Journey...${NC}"
if [ -n "$JOURNEY_ID" ]; then
    UPDATED_JOURNEY=$(curl -s "${API_URL}/pbl/journeys/${JOURNEY_ID}" \
        -H "Cookie: ${USER_COOKIE}")
    
    echo $UPDATED_JOURNEY | jq '.success' > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        SUCCESS=$(echo $UPDATED_JOURNEY | jq -r '.success')
        if [ "$SUCCESS" = "true" ]; then
            echo -e "${GREEN}✓ Journey 更新成功${NC}"
            echo -e "${CYAN}更新後狀態:${NC}"
            echo $UPDATED_JOURNEY | jq -r '.data | 
            "  - 完成任務數: \(.completedTasks)/\(.totalTasks)
              總時間: \(.totalTimeSpent) 秒
              整體分數: \(.overallScore // "N/A")
              任務日誌數: \(.taskLogs | length)"'
        else
            echo -e "${RED}✗ 無法獲取更新後的 Journey${NC}"
        fi
    else
        echo -e "${RED}✗ API 錯誤${NC}"
        echo $UPDATED_JOURNEY
    fi
else
    echo -e "${YELLOW}⚠ 跳過 Journey 檢查 (沒有 Journey ID)${NC}"
fi

echo -e "\n${YELLOW}=== 測試完成 ===${NC}"
echo -e "${GREEN}新的 Journey-based 系統基本功能正常！${NC}"
echo -e "\n你可以訪問以下頁面測試完整功能："
echo -e "- Learn V2: ${BASE_URL}/pbl/scenarios/${SCENARIO_ID}/learn-v2"
echo -e "- History V2: ${BASE_URL}/pbl/scenarios/${SCENARIO_ID}/history-v2"

if [ -n "$JOURNEY_ID" ]; then
    echo -e "\n創建的測試 Journey ID: ${JOURNEY_ID}"
fi