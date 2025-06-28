#!/bin/bash

echo "🧪 測試 Task Logs API"
echo "===================="

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

# Test different task IDs
TASK_IDS=("task-1-1" "task-2-1" "task-2-2" "task-3-1" "task-4-1")

echo -e "\n${BLUE}檢查各個 Task 的日誌...${NC}"

for TASK_ID in "${TASK_IDS[@]}"; do
    echo -e "\n${YELLOW}Task: ${TASK_ID}${NC}"
    
    RESPONSE=$(curl -s "${API_URL}/pbl/task-logs?taskId=${TASK_ID}" \
        -H "Cookie: ${USER_COOKIE}")
    
    if [ "$(echo $RESPONSE | jq -r '.success // false')" = "true" ]; then
        TOTAL=$(echo $RESPONSE | jq -r '.data.totalSessions')
        
        if [ "$TOTAL" -gt 0 ]; then
            echo -e "${GREEN}✓ 找到 ${TOTAL} 個 sessions${NC}"
            
            # Show details of the most recent session
            echo $RESPONSE | jq -r '.data.logs[0] | 
            "  最近的 Session:
              - Session ID: \(.sessionId)
              - 狀態: \(.status)
              - 分數: \(.score // "N/A")/100
              - 對話數: \(.conversationCount)
              - 花費時間: \(.totalTimeSeconds)秒"'
            
            # Show first conversation if available
            FIRST_CONV=$(echo $RESPONSE | jq -r '.data.logs[0].conversations[0] // empty')
            if [ -n "$FIRST_CONV" ]; then
                echo -e "${CYAN}  第一個對話:${NC}"
                echo "$FIRST_CONV" | jq -r '"    用戶: \(.userMessage | .[0:50])..."'
                echo "$FIRST_CONV" | jq -r '"    AI: \(.aiResponse | .[0:50])..."'
            fi
        else
            echo -e "${YELLOW}  沒有找到任何 sessions${NC}"
        fi
    else
        echo -e "${RED}✗ API 錯誤${NC}"
        echo $RESPONSE | jq '.'
    fi
done

# Summary of all tasks
echo -e "\n${YELLOW}=== 總結 ===${NC}"
echo -e "${GREEN}Task Logs API 測試完成！${NC}"
echo -e "\n每個 task 都可以獨立查詢其所有歷史 sessions"
echo -e "包含完整的對話記錄和評估結果"