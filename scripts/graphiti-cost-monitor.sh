#!/bin/bash

# Graphiti 成本監控腳本
# 使用方式：./scripts/graphiti-cost-monitor.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}📊 Graphiti 成本監控報告$(NC)"
echo -e "${GREEN}===========================$(NC)"
echo ""

# 檢查 MCP Server 狀態
if ps aux | grep "graphiti_mcp_server.py" | grep -v grep > /dev/null; then
    echo -e "${GREEN}✅ MCP Server 運行中${NC}"
else
    echo -e "${RED}❌ MCP Server 未運行${NC}"
    exit 1
fi

# 檢查 Neo4j 數據統計
echo -e "${YELLOW}📈 知識圖譜統計：$(NC)"
echo "查詢 Neo4j..."

# 檢查日誌檔案
LOG_FILE="/tmp/graphiti.log"
if [ -f "$LOG_FILE" ]; then
    echo ""
    echo -e "${YELLOW}📝 今日 API 調用次數：$(NC)"
    TODAY=$(date +%Y-%m-%d)
    API_CALLS=$(grep "$TODAY" "$LOG_FILE" | grep -c "API" || echo "0")
    echo "  API 調用: $API_CALLS 次"
    
    echo ""
    echo -e "${YELLOW}🔍 最近 5 次 API 調用：$(NC)"
    tail -20 "$LOG_FILE" | grep "API" | tail -5 || echo "  沒有找到 API 調用記錄"
else
    echo -e "${RED}❌ 找不到日誌檔案: $LOG_FILE$(NC)"
fi

echo ""
echo -e "${GREEN}💡 成本估算：$(NC)"
echo "  GPT-4.1-mini: \$0.15/1M input tokens, \$0.60/1M output tokens"
echo "  平均每次對話: ~1000 tokens ≈ \$0.0006-0.0015"
echo "  每日 50 次對話: ≈ \$0.03-0.075"
echo ""

echo -e "${YELLOW}🎯 優化建議：$(NC)"
echo "  1. 重要對話才存入 Graphiti"
echo "  2. 一般問答使用 Claude 原生記憶"
echo "  3. 定期清理舊的 Episodic 記錄"
echo "  4. 監控每日 API 使用量"