#!/bin/bash
set -e  # 任何錯誤就停止

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENV=${1:-staging}
echo -e "${YELLOW}🚀 部署到 $ENV 環境${NC}"

# Step 1: Build
echo -e "${YELLOW}📦 Building...${NC}"
npm run build || {
    echo -e "${RED}❌ Build 失敗${NC}"
    exit 1
}

# Step 2: Deploy
echo -e "${YELLOW}🚢 Deploying...${NC}"
./deploy.sh $ENV || {
    echo -e "${RED}❌ 部署失敗${NC}"
    exit 1
}

# Step 3: 等待部署完成
echo -e "${YELLOW}⏳ 等待 30 秒讓服務啟動...${NC}"
sleep 30

# Step 4: 執行 E2E 測試
echo -e "${YELLOW}🧪 執行 E2E 驗證測試...${NC}"

if [ "$ENV" = "staging" ]; then
    URL="https://ai-square-staging-m7s4ucbgba-de.a.run.app"
else
    URL="https://ai-square-frontend-m7s4ucbgba-de.a.run.app"
fi

# 執行必要的 E2E 測試
DEPLOYMENT_URL=$URL npx playwright test e2e/deployment-validation.spec.ts --reporter=list || {
    echo -e "${RED}❌ E2E 測試失敗！部署無效！${NC}"
    echo -e "${RED}請修復問題後重新部署${NC}"
    exit 1
}

echo -e "${GREEN}✅ 部署成功且通過所有測試！${NC}"
echo -e "${GREEN}URL: $URL${NC}"