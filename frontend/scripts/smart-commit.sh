#!/bin/bash
# Smart Commit Script - 智能判斷是否需要 pre-commit 檢查
# ========================================================
# 根據變更內容自動決定是否跳過檢查

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${CYAN}🤖 Smart Commit - 智能提交助手${NC}"
echo "======================================"

# 1. 獲取變更的檔案列表
STAGED_FILES=$(git diff --cached --name-only)
UNSTAGED_FILES=$(git diff --name-only)

if [ -z "$STAGED_FILES" ]; then
    echo -e "${YELLOW}⚠️  沒有檔案在暫存區${NC}"

    if [ -n "$UNSTAGED_FILES" ]; then
        echo -e "${BLUE}發現未暫存的變更：${NC}"
        echo "$UNSTAGED_FILES" | head -10
        echo ""
        read -p "要先 git add -A 嗎？(y/n): " add_all
        if [ "$add_all" = "y" ]; then
            git add -A
            STAGED_FILES=$(git diff --cached --name-only)
        else
            exit 0
        fi
    else
        exit 0
    fi
fi

# 2. 分析變更類型
NEEDS_LINT=false
NEEDS_TYPECHECK=false
NEEDS_TEST=false
SAFE_CHANGES=0
CODE_CHANGES=0
CONFIG_CHANGES=0

# 定義不需要任何檢查的檔案（完全安全）
NO_CHECK_PATTERNS=(
    # 純文檔
    "*.md"
    "*.txt"
    "LICENSE"
    "README*"
    "CHANGELOG*"
    "TODO*"

    # 純資料檔案
    "*.json"  # 資料 JSON（非配置）
    "public/*_data/*.yaml"
    "public/*_data/*.yml"
    "public/*_data/*.json"

    # 靜態資源
    "public/images/*"
    "public/icons/*"
    "public/*.png"
    "public/*.jpg"
    "public/*.svg"
    "public/*.ico"

    # Git 相關
    ".gitignore"
    ".gitattributes"

    # 其他工具配置
    ".prettierignore"
    ".dockerignore"
    ".eslintignore"
)

# 定義只需要 lint 的檔案（樣式、簡單程式碼）
LINT_ONLY_PATTERNS=(
    # 樣式檔案
    "*.css"
    "*.scss"
    "*.less"

    # 簡單元件
    "components/ui/*.tsx"
    "components/ui/*.ts"

    # 工具腳本
    "scripts/*.js"
    "scripts/*.sh"
)

# 定義需要 typecheck 的檔案（TypeScript）
TYPECHECK_PATTERNS=(
    # 所有 TypeScript 檔案
    "*.ts"
    "*.tsx"

    # 排除測試檔案可選擇性檢查
    "!*.test.ts"
    "!*.test.tsx"
    "!*.spec.ts"
    "!*.spec.tsx"
)

# 定義需要完整測試的檔案（高風險）
TEST_REQUIRED_PATTERNS=(
    # 核心配置
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "next.config.*"
    "jest.config.*"

    # 資料庫
    "**/schema*.sql"
    "**/migration*.sql"
    "**/repositories/**/*.ts"

    # API 和服務
    "app/api/**/*.ts"
    "pages/api/**/*.ts"
    "lib/services/**/*.ts"
    "lib/core/**/*.ts"

    # 認證
    "**/auth/**/*"

    # 部署相關
    "Dockerfile*"
    "docker-compose*.yml"
)

# 3. 分析每個檔案
echo -e "${BLUE}📋 分析變更檔案...${NC}"
echo ""

for file in $STAGED_FILES; do
    IS_SAFE=false
    IS_CODE=false
    IS_CONFIG=false
    FILE_STATUS=""

    # 檢查是否為完全安全檔案
    for pattern in "${NO_CHECK_PATTERNS[@]}"; do
        if [[ "$file" == $pattern ]] || [[ "$file" == *"$pattern" ]]; then
            IS_SAFE=true
            FILE_STATUS="${GREEN}✓ 安全${NC}"
            ((SAFE_CHANGES++))
            break
        fi
    done

    if [ "$IS_SAFE" = false ]; then
        # 檢查是否為 TypeScript/JavaScript 檔案
        if [[ "$file" == *.ts ]] || [[ "$file" == *.tsx ]] || [[ "$file" == *.js ]] || [[ "$file" == *.jsx ]]; then
            IS_CODE=true
            NEEDS_LINT=true
            NEEDS_TYPECHECK=true
            FILE_STATUS="${YELLOW}⚡ 程式碼${NC}"
            ((CODE_CHANGES++))

            # 檢查是否為測試檔案
            if [[ "$file" == *.test.* ]] || [[ "$file" == *.spec.* ]]; then
                FILE_STATUS="${BLUE}🧪 測試${NC}"
                # 測試檔案本身不需要跑測試
            fi
        fi

        # 檢查是否需要測試
        for pattern in "${TEST_REQUIRED_PATTERNS[@]}"; do
            if [[ "$file" == $pattern ]] || [[ "$file" == *"$pattern" ]]; then
                NEEDS_TEST=true
                FILE_STATUS="${RED}⚠️  高風險${NC}"
                ((CONFIG_CHANGES++))
                break
            fi
        done

        # 如果還沒有狀態，設為未知
        if [ -z "$FILE_STATUS" ]; then
            FILE_STATUS="${MAGENTA}? 未知${NC}"
            NEEDS_LINT=true  # 保守起見
        fi
    fi

    # 顯示檔案狀態
    printf "  %-50s %s\n" "$file" "$FILE_STATUS"
done

# 4. 決定檢查策略
echo ""
echo "======================================"
echo -e "${CYAN}📊 分析結果：${NC}"
echo -e "  安全檔案: ${GREEN}$SAFE_CHANGES${NC} 個"
echo -e "  程式碼檔案: ${YELLOW}$CODE_CHANGES${NC} 個"
echo -e "  配置檔案: ${RED}$CONFIG_CHANGES${NC} 個"
echo ""

# 建立檢查建議
CHECKS_NEEDED=""
ESTIMATED_TIME=0

if [ "$NEEDS_LINT" = true ]; then
    CHECKS_NEEDED="${CHECKS_NEEDED}  • ESLint 檢查 (~5秒)\n"
    ((ESTIMATED_TIME+=5))
fi

if [ "$NEEDS_TYPECHECK" = true ]; then
    CHECKS_NEEDED="${CHECKS_NEEDED}  • TypeScript 檢查 (~10秒)\n"
    ((ESTIMATED_TIME+=10))
fi

if [ "$NEEDS_TEST" = true ]; then
    CHECKS_NEEDED="${CHECKS_NEEDED}  • 單元測試 (~30秒)\n"
    ((ESTIMATED_TIME+=30))
fi

# 5. 提供選項
if [ -n "$CHECKS_NEEDED" ]; then
    echo -e "${YELLOW}建議執行的檢查：${NC}"
    echo -e "$CHECKS_NEEDED"
    echo -e "預估時間: ${CYAN}${ESTIMATED_TIME}秒${NC}"
    echo ""
    echo "選項："
    echo "  1) 執行建議的檢查 (推薦)"
    echo "  2) 執行完整檢查 (最安全)"
    echo "  3) 只執行 lint"
    echo "  4) 跳過所有檢查 (風險自負)"
    echo "  5) 取消提交"
    echo ""
    read -p "請選擇 (1-5): " choice
else
    echo -e "${GREEN}✅ 所有變更都是安全的，不需要檢查${NC}"
    echo ""
    echo "選項："
    echo "  1) 直接提交 (推薦)"
    echo "  2) 還是執行檢查"
    echo "  3) 取消提交"
    echo ""
    read -p "請選擇 (1-3): " choice

    # 調整選項對應
    if [ "$choice" = "1" ]; then
        choice="4"  # 對應到跳過檢查
    elif [ "$choice" = "2" ]; then
        choice="2"  # 對應到完整檢查
    elif [ "$choice" = "3" ]; then
        choice="5"  # 對應到取消
    fi
fi

# 6. 執行選擇的操作
case $choice in
    1)
        echo -e "${GREEN}執行建議的檢查...${NC}"

        if [ "$NEEDS_LINT" = true ]; then
            echo -e "${BLUE}Running ESLint...${NC}"
            npm run lint || { echo -e "${RED}❌ Lint 失敗${NC}"; exit 1; }
        fi

        if [ "$NEEDS_TYPECHECK" = true ]; then
            echo -e "${BLUE}Running TypeScript check...${NC}"
            npm run typecheck || { echo -e "${RED}❌ TypeScript 檢查失敗${NC}"; exit 1; }
        fi

        if [ "$NEEDS_TEST" = true ]; then
            echo -e "${BLUE}Running tests...${NC}"
            npm run test:ci || { echo -e "${RED}❌ 測試失敗${NC}"; exit 1; }
        fi

        echo -e "${GREEN}✅ 所有檢查通過${NC}"
        ;;

    2)
        echo -e "${BLUE}執行完整檢查...${NC}"
        npm run lint || { echo -e "${RED}❌ Lint 失敗${NC}"; exit 1; }
        npm run typecheck || { echo -e "${RED}❌ TypeScript 檢查失敗${NC}"; exit 1; }
        npm run test:ci || { echo -e "${RED}❌ 測試失敗${NC}"; exit 1; }
        echo -e "${GREEN}✅ 所有檢查通過${NC}"
        ;;

    3)
        echo -e "${BLUE}只執行 ESLint...${NC}"
        npm run lint || { echo -e "${RED}❌ Lint 失敗${NC}"; exit 1; }
        echo -e "${GREEN}✅ Lint 通過${NC}"
        ;;

    4)
        echo -e "${YELLOW}⚠️  跳過所有檢查${NC}"
        ;;

    5)
        echo -e "${BLUE}取消提交${NC}"
        exit 0
        ;;

    *)
        echo -e "${RED}無效選擇${NC}"
        exit 1
        ;;
esac

# 7. 執行提交
echo ""
echo -e "${CYAN}📝 輸入提交訊息：${NC}"
echo "格式: <type>: <description>"
echo "類型: feat|fix|docs|style|refactor|test|chore"
echo ""

# 顯示最近的提交訊息作為參考
echo -e "${BLUE}最近的提交：${NC}"
git log --oneline -3
echo ""

read -p "提交訊息: " commit_msg

if [ -z "$commit_msg" ]; then
    echo -e "${RED}提交訊息不能為空${NC}"
    exit 1
fi

# 根據之前的選擇決定是否跳過 hooks
if [ "$choice" = "4" ]; then
    echo -e "${YELLOW}執行提交 (跳過 hooks)...${NC}"
    git commit --no-verify -m "$commit_msg"
else
    echo -e "${GREEN}執行提交...${NC}"
    git commit -m "$commit_msg"
fi

echo ""
echo -e "${GREEN}✨ 提交成功！${NC}"
echo ""
echo "下一步："
echo "  • git push - 推送到遠端"
echo "  • ./scripts/smart-push.sh - 使用智能推送"
echo "  • git push --no-verify - 強制推送"
