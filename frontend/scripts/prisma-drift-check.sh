#!/bin/bash
# Prisma 官方 Schema Drift 檢查腳本
# 基於 Prisma 官方最佳實踐（2024-2025）

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Prisma Schema Drift Detection (Official Best Practice)${NC}"
echo "=========================================="

# 1. 檢查 Migration Status
echo -e "\n${YELLOW}1️⃣ Checking migration status...${NC}"
npx prisma migrate status

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Migration status check failed${NC}"
    echo -e "${YELLOW}This could mean:${NC}"
    echo "  - Migrations not yet applied"
    echo "  - Schema drift detected"
    echo "  - Database connection issues"
    exit 1
fi

# 2. 使用 migrate diff 檢查 drift
echo -e "\n${YELLOW}2️⃣ Checking for schema drift...${NC}"

# 設定資料庫 URL
DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:postgres@localhost:5433/ai_square_db"}
SHADOW_DATABASE_URL=${SHADOW_DATABASE_URL:-"postgresql://postgres:postgres@localhost:5433/ai_square_shadow"}

# 比較資料庫與 migrations
echo "Comparing database with migration history..."
DIFF_OUTPUT=$(npx prisma migrate diff \
    --from-url "$DATABASE_URL" \
    --to-migrations ./prisma/migrations \
    --shadow-database-url "$SHADOW_DATABASE_URL" \
    2>&1 || true)

if [ -z "$DIFF_OUTPUT" ] || echo "$DIFF_OUTPUT" | grep -q "No difference"; then
    echo -e "${GREEN}✅ No schema drift detected!${NC}"
else
    echo -e "${RED}❌ Schema drift detected!${NC}"
    echo -e "${YELLOW}Differences found:${NC}"
    echo "$DIFF_OUTPUT"

    # 特別檢查 evaluation_subtype 問題
    if echo "$DIFF_OUTPUT" | grep -q "evaluation_subtype"; then
        echo -e "\n${RED}🚨 CRITICAL: evaluation_subtype field mismatch detected!${NC}"
        echo "This is the known issue from commit 24197721"
    fi

    echo -e "\n${YELLOW}How to fix:${NC}"
    echo "1. For development: Run 'npx prisma migrate dev' to create a new migration"
    echo "2. For production: Use 'npx prisma migrate resolve' to mark as applied"
    echo "3. Never run 'migrate reset' in production!"
    exit 1
fi

# 3. 檢查 Prisma Schema 語法
echo -e "\n${YELLOW}3️⃣ Validating Prisma schema syntax...${NC}"
npx prisma validate

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Prisma schema validation failed${NC}"
    exit 1
fi

# 4. 檢查是否有未生成的 Client
echo -e "\n${YELLOW}4️⃣ Checking Prisma Client generation...${NC}"
npx prisma generate

echo -e "\n${GREEN}✅ All Prisma checks passed!${NC}"
echo "=========================================="
echo -e "${BLUE}Best Practices Reminder:${NC}"
echo "• Always use 'prisma migrate dev' in development"
echo "• Use 'prisma migrate deploy' in production"
echo "• Never manually modify the database schema"
echo "• Keep prisma/migrations folder in version control"
