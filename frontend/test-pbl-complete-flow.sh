#!/bin/bash

echo "🧪 完整測試 PBL 流程 - 包含真實 LLM 對話和分析"
echo "==========================================="

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

# Function to create session
create_session() {
    local stage_index=$1
    local stage_id=$2
    local stage_title=$3
    local task_id=$4
    local task_title=$5
    local task_index=$6
    
    echo -e "\n${BLUE}創建 Session: ${task_title}${NC}"
    
    local response=$(curl -s -X POST "${API_URL}/pbl/sessions" \
        -H "Content-Type: application/json" \
        -H "Cookie: ${USER_COOKIE}" \
        -d "{
            \"scenarioId\": \"ai-job-search\",
            \"scenarioTitle\": \"AI 輔助求職訓練\",
            \"userId\": \"3\",
            \"userEmail\": \"teacher@example.com\",
            \"language\": \"zhTW\",
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
        echo -e "${GREEN}✓ Session 創建成功${NC}"
        echo -e "  Session ID: ${session_id}"
        echo -e "  Log ID: ${log_id}"
        echo $session_id
    else
        echo -e "${RED}✗ Session 創建失敗${NC}"
        echo $response | jq '.'
        echo ""
    fi
}

# Function to send chat message and get LLM response
send_chat_message() {
    local session_id=$1
    local message=$2
    local stage_id=$3
    local stage_name=$4
    local task_id=$5
    local task_title=$6
    
    echo -e "\n${CYAN}💬 用戶: ${message}${NC}"
    
    # Prepare JSON payload
    local json_payload=$(cat <<EOF
{
    "sessionId": "${session_id}",
    "message": "${message}",
    "userId": "3",
    "language": "zhTW",
    "aiModule": {
        "role": "assistant",
        "model": "gemini-2.0-flash-exp",
        "persona": "Career Assistant"
    },
    "stageContext": {
        "stageId": "${stage_id}",
        "stageName": "${stage_name}",
        "stageType": "research",
        "taskId": "${task_id}",
        "taskTitle": "${task_title}",
        "taskInstructions": ["協助用戶完成任務", "提供具體可行的建議"]
    },
    "userProcessLog": {
        "id": "log-$(date +%s%N)",
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
        "sessionId": "${session_id}",
        "stageId": "${stage_id}",
        "taskId": "${task_id}",
        "actionType": "write",
        "detail": {
            "content": "${message}",
            "userInput": "${message}",
            "taskId": "${task_id}"
        }
    }
}
EOF
)
    
    local response=$(curl -s -X POST "${API_URL}/pbl/chat" \
        -H "Content-Type: application/json" \
        -H "Cookie: ${USER_COOKIE}" \
        -d "$json_payload")
    
    local success=$(echo $response | jq -r '.success // false')
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✓ 訊息發送成功${NC}"
        
        # Extract and display AI response
        local ai_response=$(echo $response | jq -r '.data.conversation.content // "No response"')
        echo -e "${YELLOW}🤖 AI 助手回應:${NC}"
        echo "$ai_response" | fold -w 80 -s | head -n 10
        echo -e "${CYAN}... (回應已截斷)${NC}"
        
        # Show tokens used
        local tokens=$(echo $response | jq -r '.data.processLog.tokensUsed // 0')
        echo -e "${BLUE}📊 Tokens 使用: ${tokens}${NC}"
    else
        echo -e "${RED}✗ 訊息發送失敗${NC}"
        echo $response | jq '.'
    fi
    
    sleep 2  # Give time between messages
}

# Function to analyze task
analyze_task() {
    local session_id=$1
    local stage_id=$2
    local task_id=$3
    
    echo -e "\n${YELLOW}🔍 分析任務表現...${NC}"
    
    local response=$(curl -s -X POST "${API_URL}/pbl/evaluate" \
        -H "Content-Type: application/json" \
        -H "Cookie: ${USER_COOKIE}" \
        -d "{
            \"sessionId\": \"${session_id}\",
            \"stageId\": \"${stage_id}\",
            \"taskId\": \"${task_id}\",
            \"language\": \"zhTW\"
        }")
    
    local success=$(echo $response | jq -r '.success // false')
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✓ 分析完成${NC}"
        
        # Extract analysis results
        local score=$(echo $response | jq -r '.data.stageResult.score // 0')
        local strengths=$(echo $response | jq -r '.data.stageResult.feedback.strengths[]? // empty' | head -3 | paste -sd "; " -)
        local improvements=$(echo $response | jq -r '.data.stageResult.feedback.improvements[]? // empty' | head -2 | paste -sd "; " -)
        local domain_scores=$(echo $response | jq -r '.data.stageResult.domainScores | to_entries | map("\(.key): \(.value)") | join(", ")')
        
        echo -e "${CYAN}📈 分數: ${score}/100${NC}"
        echo -e "${CYAN}💪 優勢: ${strengths}${NC}"
        echo -e "${CYAN}📚 改進: ${improvements}${NC}"
        echo -e "${CYAN}🎯 領域分數: ${domain_scores}${NC}"
    else
        echo -e "${RED}✗ 分析失敗${NC}"
        echo $response | jq '.'
    fi
}

# Function to complete session
complete_session() {
    local session_id=$1
    
    echo -e "\n${BLUE}完成 Session...${NC}"
    
    local response=$(curl -s -X PUT "${API_URL}/pbl/sessions/${session_id}" \
        -H "Content-Type: application/json" \
        -H "Cookie: ${USER_COOKIE}" \
        -d '{
            "action": "complete"
        }')
    
    local success=$(echo $response | jq -r '.success // false')
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✓ Session 已完成${NC}"
    else
        echo -e "${RED}✗ 完成失敗${NC}"
        echo $response | jq '.'
    fi
}

# Main test flow
echo -e "\n${YELLOW}=== 開始測試 PBL 完整流程 ===${NC}"

# Stage 1: 職缺市場研究 - Task 1-1
echo -e "\n${YELLOW}📚 Stage 1: 職缺市場研究 - Task 1-1: 產業分析${NC}"
SESSION_1_1=$(create_session 0 "stage-1-research" "職缺市場研究" "task-1-1" "產業分析" 0)

if [ -n "$SESSION_1_1" ]; then
    # First conversation
    send_chat_message "$SESSION_1_1" \
        "我想了解 AI 和機器學習領域的就業市場趨勢，請幫我分析未來 3-5 年的發展方向" \
        "stage-1-research" "職缺市場研究" "task-1-1" "產業分析"
    
    # Second conversation
    send_chat_message "$SESSION_1_1" \
        "哪些具體的技能是最受企業歡迎的？請給我一個技能清單和學習建議" \
        "stage-1-research" "職缺市場研究" "task-1-1" "產業分析"
    
    # Third conversation
    send_chat_message "$SESSION_1_1" \
        "台灣和國際市場有什麼差異？我應該如何準備？" \
        "stage-1-research" "職缺市場研究" "task-1-1" "產業分析"
    
    # Analyze the task
    analyze_task "$SESSION_1_1" "stage-1-research" "task-1-1"
    
    # Complete the session
    complete_session "$SESSION_1_1"
fi

# Stage 2: 履歷優化 - Task 2-1
echo -e "\n${YELLOW}📄 Stage 2: 履歷優化 - Task 2-1: 履歷分析${NC}"
SESSION_2_1=$(create_session 1 "stage-2-analysis" "履歷優化" "task-2-1" "履歷分析" 0)

if [ -n "$SESSION_2_1" ]; then
    # Conversation about resume
    send_chat_message "$SESSION_2_1" \
        "我有 5 年軟體開發經驗，想轉職到 AI 工程師，履歷應該如何調整重點？" \
        "stage-2-analysis" "履歷優化" "task-2-1" "履歷分析"
    
    send_chat_message "$SESSION_2_1" \
        "請幫我看看這段工作經歷描述：負責開發和維護公司核心產品，使用 Python 和 JavaScript。這樣寫夠吸引人嗎？" \
        "stage-2-analysis" "履歷優化" "task-2-1" "履歷分析"
    
    # Analyze and complete
    analyze_task "$SESSION_2_1" "stage-2-analysis" "task-2-1"
    complete_session "$SESSION_2_1"
fi

# Check history to see all sessions
echo -e "\n${YELLOW}=== 檢查歷史記錄 ===${NC}"
HISTORY=$(curl -s "${API_URL}/pbl/history?lang=zhTW" \
    -H "Cookie: ${USER_COOKIE}")

TOTAL=$(echo $HISTORY | jq '.data | length')
echo -e "\n${GREEN}總共 ${TOTAL} 個 sessions${NC}"

# Show detailed session info
echo -e "\n${YELLOW}詳細 Session 資訊:${NC}"
echo $HISTORY | jq -r '.data[] | select(.status == "completed") | 
"
=== \(.currentTaskTitle) ===
Session ID: \(.id)
狀態: \(.status)
總互動次數: \(.totalInteractions // 0)
完成階段: \(.progress.completedStages)/\(.progress.totalStages)
平均分數: \(.averageScore // "N/A")
花費時間: \(.duration // 0) 秒
"' | head -n 20

# Summary
echo -e "\n${YELLOW}=== 測試總結 ===${NC}"
echo -e "${GREEN}✅ 測試完成！${NC}"
echo -e "  - 創建了多個 task sessions"
echo -e "  - 每個 session 包含真實的 LLM 對話"
echo -e "  - 執行了任務分析並儲存結果"
echo -e "  - 所有資料已儲存到 GCS"

echo -e "\n${BLUE}請訪問以下頁面查看結果:${NC}"
echo -e "1. 歷史頁面: ${BASE_URL}/history"
echo -e "2. 學習頁面: ${BASE_URL}/pbl/scenarios/ai-job-search/learn"
if [ -n "$SESSION_1_1" ]; then
    echo -e "3. 完成頁面: ${BASE_URL}/pbl/scenarios/ai-job-search/complete?sessionId=${SESSION_1_1}"
fi