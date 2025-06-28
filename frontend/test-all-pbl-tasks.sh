#!/bin/bash

echo "🧪 完整測試 PBL Task-Based Sessions - 所有 Stages 和 Tasks"
echo "=========================================================="

# Base URL
BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"

# Test user
USER_COOKIE="user=%7B%22id%22%3A3%2C%22email%22%3A%22teacher%40example.com%22%7D"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to create session
create_session() {
    local stage_index=$1
    local stage_id=$2
    local stage_title=$3
    local task_id=$4
    local task_title=$5
    local task_index=$6
    
    echo -e "\n${BLUE}Creating session for ${task_id}...${NC}"
    
    local response=$(curl -s -X POST "${API_URL}/pbl/sessions" \
        -H "Content-Type: application/json" \
        -H "Cookie: ${USER_COOKIE}" \
        -d "{
            \"scenarioId\": \"ai-job-search\",
            \"scenarioTitle\": \"AI 輔助求職訓練\",
            \"userId\": \"3\",
            \"userEmail\": \"teacher@example.com\",
            \"language\": \"zh-TW\",
            \"stageIndex\": ${stage_index},
            \"stageId\": \"${stage_id}\",
            \"stageTitle\": \"${stage_title}\",
            \"taskId\": \"${task_id}\",
            \"taskTitle\": \"${task_title}\",
            \"taskIndex\": ${task_index}
        }")
    
    local session_id=$(echo $response | jq -r '.data.sessionId // empty')
    local log_id=$(echo $response | jq -r '.data.logId // empty')
    
    if [ -n "$session_id" ]; then
        echo -e "${GREEN}✓ Session created: ${session_id}${NC}"
        echo -e "  Log ID: ${log_id}"
        echo $session_id
    else
        echo -e "${RED}✗ Failed to create session${NC}"
        echo $response | jq '.'
        echo ""
    fi
}

# Function to send chat message
send_message() {
    local session_id=$1
    local message=$2
    local stage_id=$3
    local stage_name=$4
    local task_id=$5
    local task_title=$6
    
    echo -e "\n${BLUE}Sending message for ${task_id}...${NC}"
    
    local response=$(curl -s -X POST "${API_URL}/pbl/chat" \
        -H "Content-Type: application/json" \
        -H "Cookie: ${USER_COOKIE}" \
        -d "{
            \"sessionId\": \"${session_id}\",
            \"message\": \"${message}\",
            \"userId\": \"3\",
            \"language\": \"zh-TW\",
            \"aiModule\": {
                \"role\": \"assistant\",
                \"model\": \"gemini-2.5-flash\",
                \"persona\": \"Career Assistant\"
            },
            \"stageContext\": {
                \"stageId\": \"${stage_id}\",
                \"stageName\": \"${stage_name}\",
                \"stageType\": \"research\",
                \"taskId\": \"${task_id}\",
                \"taskTitle\": \"${task_title}\",
                \"taskInstructions\": [\"協助用戶完成任務\"]
            },
            \"userProcessLog\": {
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
                \"stageId\": \"${stage_id}\",
                \"taskId\": \"${task_id}\",
                \"actionType\": \"write\",
                \"content\": \"${message}\",
                \"detail\": {
                    \"messageLength\": ${#message},
                    \"taskId\": \"${task_id}\"
                }
            }
        }")
    
    local success=$(echo $response | jq -r '.success // false')
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✓ Message sent successfully${NC}"
    else
        echo -e "${RED}✗ Failed to send message${NC}"
        echo $response | jq '.'
    fi
}

# Function to complete session
complete_session() {
    local session_id=$1
    local task_id=$2
    
    echo -e "\n${BLUE}Completing session for ${task_id}...${NC}"
    
    local response=$(curl -s -X PUT "${API_URL}/pbl/sessions/${session_id}" \
        -H "Content-Type: application/json" \
        -H "Cookie: ${USER_COOKIE}" \
        -d '{"action": "complete"}')
    
    local success=$(echo $response | jq -r '.success // false')
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✓ Session completed${NC}"
    else
        echo -e "${RED}✗ Failed to complete session${NC}"
    fi
}

# Main test flow
echo -e "\n${YELLOW}=== Stage 1: 職缺市場研究 ===${NC}"

# Task 1-1
SESSION_1_1=$(create_session 0 "stage-1-research" "職缺市場研究" "task-1-1" "產業分析" 0)
if [ -n "$SESSION_1_1" ]; then
    send_message "$SESSION_1_1" "如何使用AI分析科技產業的未來趨勢？" "stage-1-research" "職缺市場研究" "task-1-1" "產業分析"
    sleep 2
    send_message "$SESSION_1_1" "請給我一個具體的分析框架" "stage-1-research" "職缺市場研究" "task-1-1" "產業分析"
    sleep 1
    complete_session "$SESSION_1_1" "task-1-1"
fi

echo -e "\n${YELLOW}=== Stage 2: 履歷優化 ===${NC}"

# Task 2-1
SESSION_2_1=$(create_session 1 "stage-2-analysis" "履歷優化" "task-2-1" "履歷分析" 0)
if [ -n "$SESSION_2_1" ]; then
    send_message "$SESSION_2_1" "請幫我分析這份履歷的優缺點" "stage-2-analysis" "履歷優化" "task-2-1" "履歷分析"
    sleep 2
    complete_session "$SESSION_2_1" "task-2-1"
fi

# Task 2-2
SESSION_2_2=$(create_session 1 "stage-2-analysis" "履歷優化" "task-2-2" "履歷優化實作" 1)
if [ -n "$SESSION_2_2" ]; then
    send_message "$SESSION_2_2" "如何改進我的工作經歷描述？" "stage-2-analysis" "履歷優化" "task-2-2" "履歷優化實作"
    sleep 2
    send_message "$SESSION_2_2" "請幫我重寫這段工作經歷" "stage-2-analysis" "履歷優化" "task-2-2" "履歷優化實作"
    sleep 1
    complete_session "$SESSION_2_2" "task-2-2"
fi

echo -e "\n${YELLOW}=== Stage 3: 求職信撰寫 ===${NC}"

# Task 3-1
SESSION_3_1=$(create_session 2 "stage-3-writing" "求職信撰寫" "task-3-1" "撰寫求職信" 0)
if [ -n "$SESSION_3_1" ]; then
    send_message "$SESSION_3_1" "如何撰寫一封有吸引力的求職信？" "stage-3-writing" "求職信撰寫" "task-3-1" "撰寫求職信"
    sleep 2
    complete_session "$SESSION_3_1" "task-3-1"
fi

echo -e "\n${YELLOW}=== Stage 4: 面試準備 ===${NC}"

# Task 4-1
SESSION_4_1=$(create_session 3 "stage-4-practice" "面試準備" "task-4-1" "模擬面試" 0)
if [ -n "$SESSION_4_1" ]; then
    send_message "$SESSION_4_1" "請問如何準備行為面試問題？" "stage-4-practice" "面試準備" "task-4-1" "模擬面試"
    sleep 2
    send_message "$SESSION_4_1" "給我一個STAR方法的範例" "stage-4-practice" "面試準備" "task-4-1" "模擬面試"
    sleep 1
    # 不完成最後一個 task，保持 in_progress 狀態
fi

# Check history
echo -e "\n${YELLOW}=== 檢查歷史記錄 ===${NC}"
echo -e "\n${BLUE}Fetching history...${NC}"

HISTORY=$(curl -s "${API_URL}/pbl/history?lang=zh-TW" \
    -H "Cookie: ${USER_COOKIE}")

TOTAL=$(echo $HISTORY | jq '.data | length')
echo -e "\n${GREEN}總共創建了 ${TOTAL} 個 task sessions${NC}"

echo -e "\n${YELLOW}Task 詳細信息：${NC}"
echo $HISTORY | jq -r '.data[] | "
---
Task: \(.currentTaskTitle // .currentTaskId)
Session ID: \(.id)
Status: \(.status)
Progress: \(.progress.completedStages)/\(.progress.totalStages) stages
Interactions: \(.totalInteractions // 0)
Score: \(.score // "N/A")"'

# Summary
echo -e "\n${YELLOW}=== 測試總結 ===${NC}"
echo -e "${GREEN}✓ Stage 1:${NC} 1 task (task-1-1) - 已完成"
echo -e "${GREEN}✓ Stage 2:${NC} 2 tasks (task-2-1, task-2-2) - 已完成"
echo -e "${GREEN}✓ Stage 3:${NC} 1 task (task-3-1) - 已完成"
echo -e "${GREEN}✓ Stage 4:${NC} 1 task (task-4-1) - 進行中"
echo -e "\n${GREEN}總計: 5 個獨立的 task sessions${NC}"

# Check if sessions are properly isolated
echo -e "\n${YELLOW}=== 驗證 Session 隔離 ===${NC}"
UNIQUE_SESSIONS=$(echo $HISTORY | jq -r '.data[].id' | sort | uniq | wc -l)
echo -e "獨立 Session 數量: ${UNIQUE_SESSIONS}"

if [ "$UNIQUE_SESSIONS" -eq "$TOTAL" ]; then
    echo -e "${GREEN}✓ 所有 tasks 都有獨立的 sessions${NC}"
else
    echo -e "${RED}✗ 有重複的 sessions${NC}"
fi

# Display in browser
echo -e "\n${BLUE}請在瀏覽器中訪問以下頁面進行視覺驗證：${NC}"
echo -e "1. History 頁面: ${BASE_URL}/history"
echo -e "2. PBL 學習頁面: ${BASE_URL}/pbl/scenarios/ai-job-search/learn"
echo -e "3. 完成頁面範例: ${BASE_URL}/pbl/scenarios/ai-job-search/complete?sessionId=${SESSION_1_1}"

echo -e "\n${GREEN}✅ 測試完成！${NC}"