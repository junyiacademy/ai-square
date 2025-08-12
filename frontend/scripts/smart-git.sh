#!/bin/bash
# Smart Git - 智能 Commit + Push 一體化系統
# ============================================
# 一個命令完成 add, commit, push 並智能判斷檢查需求

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ASCII Art
echo -e "${CYAN}"
echo "╔════════════════════════════════════╗"
echo "║   🤖 Smart Git - 智能提交系統      ║"
echo "╚════════════════════════════════════╝"
echo -e "${NC}"

# ========================================
# 1. 檢查狀態
# ========================================
echo -e "${BLUE}📊 檢查 Git 狀態...${NC}"

# 檢查是否在 git repo 中
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo -e "${RED}❌ 不在 Git repository 中${NC}"
    exit 1
fi

# 獲取當前分支
CURRENT_BRANCH=$(git branch --show-current)
echo -e "  分支: ${MAGENTA}$CURRENT_BRANCH${NC}"

# 檢查變更
UNSTAGED=$(git diff --name-only | wc -l | xargs)
STAGED=$(git diff --cached --name-only | wc -l | xargs)
UNTRACKED=$(git ls-files --others --exclude-standard | wc -l | xargs)

echo -e "  未暫存: ${YELLOW}$UNSTAGED${NC} 個檔案"
echo -e "  已暫存: ${GREEN}$STAGED${NC} 個檔案"
echo -e "  未追蹤: ${CYAN}$UNTRACKED${NC} 個檔案"

# 如果沒有任何變更
if [ "$UNSTAGED" -eq 0 ] && [ "$STAGED" -eq 0 ] && [ "$UNTRACKED" -eq 0 ]; then
    echo -e "${GREEN}✨ 工作區是乾淨的，沒有需要提交的變更${NC}"
    exit 0
fi

# ========================================
# 2. 處理檔案暫存
# ========================================
echo ""
if [ "$UNSTAGED" -gt 0 ] || [ "$UNTRACKED" -gt 0 ]; then
    echo -e "${YELLOW}📝 有未暫存的變更：${NC}"
    
    # 顯示變更摘要
    if [ "$UNSTAGED" -gt 0 ]; then
        echo -e "${BLUE}修改的檔案：${NC}"
        git diff --name-only | head -5 | sed 's/^/  • /'
        if [ "$UNSTAGED" -gt 5 ]; then
            echo "  ... 還有 $((UNSTAGED - 5)) 個檔案"
        fi
    fi
    
    if [ "$UNTRACKED" -gt 0 ]; then
        echo -e "${CYAN}新檔案：${NC}"
        git ls-files --others --exclude-standard | head -5 | sed 's/^/  • /'
        if [ "$UNTRACKED" -gt 5 ]; then
            echo "  ... 還有 $((UNTRACKED - 5)) 個檔案"
        fi
    fi
    
    echo ""
    echo "要如何處理？"
    echo "  a) 加入所有檔案 (git add -A)"
    echo "  i) 互動式選擇 (git add -i)"
    echo "  s) 跳過，只提交已暫存的"
    echo "  q) 退出"
    echo ""
    read -p "選擇 (a/i/s/q): " add_choice
    
    case $add_choice in
        a)
            echo -e "${GREEN}加入所有檔案...${NC}"
            git add -A
            STAGED=$(git diff --cached --name-only | wc -l | xargs)
            ;;
        i)
            echo -e "${BLUE}開啟互動式選擇...${NC}"
            git add -i
            STAGED=$(git diff --cached --name-only | wc -l | xargs)
            ;;
        s)
            if [ "$STAGED" -eq 0 ]; then
                echo -e "${RED}沒有已暫存的檔案${NC}"
                exit 1
            fi
            ;;
        q)
            echo -e "${BLUE}退出${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}無效選擇${NC}"
            exit 1
            ;;
    esac
fi

# ========================================
# 3. 分析變更內容
# ========================================
echo ""
echo -e "${BLUE}🔍 分析變更內容...${NC}"

STAGED_FILES=$(git diff --cached --name-only)
SAFE_COUNT=0
CODE_COUNT=0
CONFIG_COUNT=0
RISK_LEVEL="LOW"
NEEDS_CHECK=""

# 分析每個檔案
for file in $STAGED_FILES; do
    # 檢查檔案類型
    if [[ "$file" =~ \.(md|txt|LICENSE|gitignore)$ ]]; then
        ((SAFE_COUNT++))
    elif [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
        ((CODE_COUNT++))
        RISK_LEVEL="MEDIUM"
        NEEDS_CHECK="lint typecheck"
    elif [[ "$file" =~ (package\.json|schema.*\.sql|Dockerfile) ]]; then
        ((CONFIG_COUNT++))
        RISK_LEVEL="HIGH"
        NEEDS_CHECK="lint typecheck test"
    fi
done

# 顯示分析結果
echo -e "  📁 總共 ${BOLD}$STAGED${NC} 個檔案"
echo -e "  ${GREEN}✓${NC} 安全檔案: $SAFE_COUNT"
echo -e "  ${YELLOW}⚡${NC} 程式碼: $CODE_COUNT"
echo -e "  ${RED}⚠️${NC} 配置檔案: $CONFIG_COUNT"

# 風險評估
echo ""
if [ "$RISK_LEVEL" = "LOW" ]; then
    echo -e "  風險等級: ${GREEN}低風險 ✅${NC}"
elif [ "$RISK_LEVEL" = "MEDIUM" ]; then
    echo -e "  風險等級: ${YELLOW}中風險 ⚡${NC}"
else
    echo -e "  風險等級: ${RED}高風險 ⚠️${NC}"
fi

# ========================================
# 4. 決定檢查策略
# ========================================
echo ""
echo -e "${CYAN}🎯 執行策略：${NC}"

if [ "$RISK_LEVEL" = "LOW" ]; then
    echo -e "  ${GREEN}✓ 可以直接提交和推送${NC}"
    DEFAULT_ACTION="1"
    
    echo ""
    echo "  1) 快速提交+推送 (無檢查) ⚡ [預設]"
    echo "  2) 安全提交+推送 (基本檢查)"
    echo "  3) 完整檢查後提交+推送"
    echo "  4) 只提交，不推送"
    echo "  5) 取消"
    
elif [ "$RISK_LEVEL" = "MEDIUM" ]; then
    echo -e "  ${YELLOW}建議執行基本檢查 (約15秒)${NC}"
    DEFAULT_ACTION="2"
    
    echo ""
    echo "  1) 快速提交+推送 (無檢查)"
    echo "  2) 安全提交+推送 (lint+type) ⚡ [預設]"
    echo "  3) 完整檢查後提交+推送"
    echo "  4) 只提交，不推送"
    echo "  5) 取消"
    
else
    echo -e "  ${RED}強烈建議完整檢查 (約45秒)${NC}"
    DEFAULT_ACTION="3"
    
    echo ""
    echo "  1) 快速提交+推送 (風險自負) ⚠️"
    echo "  2) 安全提交+推送 (基本檢查)"
    echo "  3) 完整檢查後提交+推送 ✓ [預設]"
    echo "  4) 只提交，不推送"
    echo "  5) 取消"
fi

echo ""
read -p "選擇 (1-5，Enter=$DEFAULT_ACTION): " action
action=${action:-$DEFAULT_ACTION}

# ========================================
# 5. 獲取提交訊息
# ========================================
if [ "$action" != "5" ]; then
    echo ""
    echo -e "${CYAN}📝 提交訊息：${NC}"
    
    # 顯示最近提交作為參考
    echo -e "${BLUE}最近的提交：${NC}"
    git log --oneline -3 | sed 's/^/  /'
    echo ""
    
    # 智能建議提交類型
    if [ "$CONFIG_COUNT" -gt 0 ]; then
        SUGGESTED_TYPE="chore"
    elif [ "$CODE_COUNT" -gt 0 ]; then
        if git diff --cached | grep -q "fix\|bug\|error"; then
            SUGGESTED_TYPE="fix"
        else
            SUGGESTED_TYPE="feat"
        fi
    else
        SUGGESTED_TYPE="docs"
    fi
    
    echo -e "建議類型: ${YELLOW}$SUGGESTED_TYPE${NC}"
    echo "格式: <type>: <description>"
    echo "類型: feat|fix|docs|style|refactor|test|chore"
    echo ""
    
    read -p "提交訊息: " commit_msg
    
    if [ -z "$commit_msg" ]; then
        # 提供預設訊息
        if [ "$SAFE_COUNT" -eq "$STAGED" ]; then
            commit_msg="docs: update documentation"
        elif [ "$CONFIG_COUNT" -gt 0 ]; then
            commit_msg="chore: update configuration"
        else
            commit_msg="$SUGGESTED_TYPE: update code"
        fi
        echo -e "使用預設訊息: ${YELLOW}$commit_msg${NC}"
    fi
fi

# ========================================
# 6. 執行操作
# ========================================
case $action in
    1)
        # 快速提交+推送
        echo ""
        echo -e "${YELLOW}⚡ 快速模式 - 跳過所有檢查${NC}"
        
        echo -e "${BLUE}提交中...${NC}"
        git commit --no-verify -m "$commit_msg"
        
        echo -e "${BLUE}推送中...${NC}"
        git push origin $CURRENT_BRANCH --no-verify
        
        echo -e "${GREEN}✅ 完成！${NC}"
        ;;
        
    2)
        # 安全提交+推送
        echo ""
        echo -e "${BLUE}🛡️ 安全模式 - 執行基本檢查${NC}"
        
        echo -e "${BLUE}執行 ESLint...${NC}"
        npm run lint || { echo -e "${RED}❌ Lint 失敗${NC}"; exit 1; }
        
        echo -e "${BLUE}執行 TypeScript 檢查...${NC}"
        npm run typecheck || { echo -e "${RED}❌ TypeScript 檢查失敗${NC}"; exit 1; }
        
        echo -e "${GREEN}✓ 檢查通過${NC}"
        
        echo -e "${BLUE}提交中...${NC}"
        git commit -m "$commit_msg"
        
        echo -e "${BLUE}推送中...${NC}"
        git push origin $CURRENT_BRANCH
        
        echo -e "${GREEN}✅ 完成！${NC}"
        ;;
        
    3)
        # 完整檢查
        echo ""
        echo -e "${BLUE}🔒 完整模式 - 執行所有檢查${NC}"
        
        echo -e "${BLUE}執行 ESLint...${NC}"
        npm run lint || { echo -e "${RED}❌ Lint 失敗${NC}"; exit 1; }
        
        echo -e "${BLUE}執行 TypeScript 檢查...${NC}"
        npm run typecheck || { echo -e "${RED}❌ TypeScript 檢查失敗${NC}"; exit 1; }
        
        echo -e "${BLUE}執行測試...${NC}"
        npm run test:ci || { echo -e "${RED}❌ 測試失敗${NC}"; exit 1; }
        
        echo -e "${GREEN}✓ 所有檢查通過${NC}"
        
        echo -e "${BLUE}提交中...${NC}"
        git commit -m "$commit_msg"
        
        echo -e "${BLUE}推送中...${NC}"
        git push origin $CURRENT_BRANCH
        
        echo -e "${GREEN}✅ 完成！${NC}"
        ;;
        
    4)
        # 只提交
        echo ""
        echo -e "${BLUE}📝 只提交，不推送${NC}"
        
        echo -e "${BLUE}提交中...${NC}"
        git commit --no-verify -m "$commit_msg"
        
        echo -e "${GREEN}✅ 提交完成！${NC}"
        echo -e "${YELLOW}記得稍後執行 git push${NC}"
        ;;
        
    5)
        echo -e "${BLUE}👋 取消操作${NC}"
        exit 0
        ;;
        
    *)
        echo -e "${RED}無效選擇${NC}"
        exit 1
        ;;
esac

# ========================================
# 7. 顯示結果
# ========================================
echo ""
echo -e "${CYAN}╔════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         ✨ 操作完成！              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════╝${NC}"

# 顯示當前狀態
echo ""
git log --oneline -1
echo ""
git status -s

# 提供下一步建議
echo ""
echo -e "${BLUE}下一步：${NC}"
if [ "$action" = "4" ]; then
    echo "  • git push - 推送到遠端"
    echo "  • npm run push - 使用智能推送"
else
    echo "  • 查看線上: https://github.com/your-repo"
    echo "  • 部署: npm run deploy"
fi