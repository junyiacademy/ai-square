#!/bin/bash
# Smart Push Script - 智能判斷是否需要完整測試
# ================================================
# 根據變更內容自動決定是否跳過測試

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🤖 Smart Push - 智能推送助手${NC}"
echo "======================================"

# 1. 獲取變更的檔案列表
CHANGED_FILES=$(git diff --cached --name-only 2>/dev/null || git diff origin/main...HEAD --name-only)

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${YELLOW}⚠️  沒有檔案變更${NC}"
    exit 0
fi

# 2. 分析變更類型
NEEDS_FULL_TEST=false
CHANGE_SUMMARY=""
SAFE_CHANGES=0
RISKY_CHANGES=0

# 定義安全的檔案模式（不需要完整測試）
SAFE_PATTERNS=(
    # 文檔類
    "*.md"
    "*.txt"
    "LICENSE"
    "*.yml"  # 大部分 yml 是配置
    "*.yaml"

    # 配置類（但不包括關鍵配置）
    ".gitignore"
    ".prettierrc"
    ".prettierignore"
    ".dockerignore"

    # 腳本和工具（不影響主程式）
    "scripts/*.sh"
    "scripts/*.js"
    "scripts/*.ts"

    # 測試檔案本身
    "*.test.ts"
    "*.test.tsx"
    "*.spec.ts"
    "*.spec.tsx"
    "__tests__/*"

    # 樣式檔案（通常安全）
    "*.css"
    "*.scss"
    "*.less"

    # 靜態資源
    "public/images/*"
    "public/icons/*"
    "public/*.png"
    "public/*.jpg"
    "public/*.svg"

    # 資料檔案
    "*.json"  # 大部分 JSON 是資料
    "public/*_data/*.yaml"
    "public/*_data/*.yml"
)

# 定義高風險的檔案模式（必須完整測試）
RISKY_PATTERNS=(
    # 核心配置
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "next.config.*"
    "tailwind.config.*"
    "jest.config.*"
    ".env*"

    # 資料庫相關
    "**/schema*.sql"
    "**/migration*.sql"
    "**/repositories/**/*.ts"

    # API 路由
    "app/api/**/*.ts"
    "pages/api/**/*.ts"

    # 核心服務
    "lib/services/**/*.ts"
    "lib/abstractions/**/*.ts"
    "lib/core/**/*.ts"

    # 認證相關
    "**/auth/**/*.ts"
    "**/auth/**/*.tsx"

    # Docker 和部署
    "Dockerfile*"
    "docker-compose*.yml"
    "deploy*.sh"

    # CI/CD
    ".github/workflows/*.yml"
)

# 3. 檢查每個變更的檔案
echo -e "${BLUE}📋 分析變更檔案...${NC}"
echo ""

for file in $CHANGED_FILES; do
    IS_SAFE=false
    IS_RISKY=false

    # 檢查是否為安全檔案
    for pattern in "${SAFE_PATTERNS[@]}"; do
        if [[ "$file" == $pattern ]] || [[ "$file" == *"$pattern" ]]; then
            IS_SAFE=true
            break
        fi
    done

    # 檢查是否為高風險檔案
    for pattern in "${RISKY_PATTERNS[@]}"; do
        if [[ "$file" == $pattern ]] || [[ "$file" == *"$pattern" ]]; then
            IS_RISKY=true
            NEEDS_FULL_TEST=true
            break
        fi
    done

    # 顯示檔案分析結果
    if [ "$IS_RISKY" = true ]; then
        echo -e "  ${RED}⚠️  $file ${NC}(需要測試)"
        ((RISKY_CHANGES++))
    elif [ "$IS_SAFE" = true ]; then
        echo -e "  ${GREEN}✓  $file ${NC}(安全)"
        ((SAFE_CHANGES++))
    else
        # 未知檔案類型，保守起見需要測試
        echo -e "  ${YELLOW}?  $file ${NC}(未知，需要測試)"
        NEEDS_FULL_TEST=true
        ((RISKY_CHANGES++))
    fi
done

# 4. 特殊規則檢查
echo ""
echo -e "${BLUE}🔍 檢查特殊規則...${NC}"

# 如果只改了測試檔案，不需要跑測試（因為測試本身就是測試）
if [[ $(echo "$CHANGED_FILES" | grep -v "\.test\." | grep -v "\.spec\." | grep -v "__tests__" | wc -l) -eq 0 ]]; then
    echo -e "${GREEN}✓ 只有測試檔案變更，可以安全推送${NC}"
    NEEDS_FULL_TEST=false
fi

# 如果改了 package.json，一定要測試
if echo "$CHANGED_FILES" | grep -q "package.json"; then
    echo -e "${RED}⚠️  package.json 變更，必須完整測試${NC}"
    NEEDS_FULL_TEST=true
fi

# 如果改了資料庫 schema，一定要測試
if echo "$CHANGED_FILES" | grep -q "schema.*\.sql"; then
    echo -e "${RED}⚠️  資料庫 schema 變更，必須完整測試${NC}"
    NEEDS_FULL_TEST=true
fi

# 5. 顯示分析結果
echo ""
echo "======================================"
echo -e "${CYAN}📊 分析結果：${NC}"
echo -e "  安全變更: ${GREEN}$SAFE_CHANGES${NC} 個檔案"
echo -e "  需測試變更: ${RED}$RISKY_CHANGES${NC} 個檔案"
echo ""

# 6. 決定推送策略
if [ "$NEEDS_FULL_TEST" = true ]; then
    echo -e "${YELLOW}🔨 需要執行完整測試${NC}"
    echo ""
    echo "選項："
    echo "  1) 執行完整測試後推送 (建議)"
    echo "  2) 跳過測試強制推送 (風險自負)"
    echo "  3) 取消推送"
    echo ""
    read -p "請選擇 (1/2/3): " choice

    case $choice in
        1)
            echo -e "${GREEN}執行完整測試...${NC}"
            npm run test:ci
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ 測試通過，推送中...${NC}"
                git push origin main
            else
                echo -e "${RED}❌ 測試失敗，請修復後再推送${NC}"
                exit 1
            fi
            ;;
        2)
            echo -e "${YELLOW}⚠️  跳過測試，強制推送...${NC}"
            git push origin main --no-verify
            ;;
        3)
            echo -e "${BLUE}取消推送${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}無效選擇${NC}"
            exit 1
            ;;
    esac
else
    echo -e "${GREEN}✅ 所有變更都是安全的，可以直接推送${NC}"
    echo ""
    echo "選項："
    echo "  1) 直接推送 (建議)"
    echo "  2) 還是執行測試"
    echo "  3) 取消推送"
    echo ""
    read -p "請選擇 (1/2/3): " choice

    case $choice in
        1)
            echo -e "${GREEN}推送中...${NC}"
            git push origin main --no-verify
            ;;
        2)
            echo -e "${BLUE}執行測試...${NC}"
            npm run test:ci
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ 測試通過，推送中...${NC}"
                git push origin main
            else
                echo -e "${RED}❌ 測試失敗${NC}"
                exit 1
            fi
            ;;
        3)
            echo -e "${BLUE}取消推送${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}無效選擇${NC}"
            exit 1
            ;;
    esac
fi

echo ""
echo -e "${GREEN}✨ 完成！${NC}"
