#!/bin/bash

# Production 部署腳本 - 使用正規流程
set -e

echo "========================================="
echo "AI Square Production 部署"
echo "Date: $(date)"
echo "========================================="

# 1. 檢查環境
echo -e "\n1. 環境檢查..."
if [ ! -f "frontend/.env.local" ]; then
    echo "❌ 錯誤：找不到 frontend/.env.local"
    echo "請先設定環境變數"
    exit 1
fi

# 2. 執行測試
echo -e "\n2. 執行測試..."
cd frontend
npm run typecheck || { echo "❌ TypeScript 檢查失敗"; exit 1; }
npm run lint || { echo "❌ ESLint 檢查失敗"; exit 1; }
npm run test:ci || { echo "❌ 測試失敗"; exit 1; }
cd ..

# 3. 建構 Docker 映像
echo -e "\n3. 建構 Docker 映像..."
gcloud builds submit \
    --tag gcr.io/ai-square-463013/ai-square-production \
    --timeout=10m \
    --project ai-square-463013

# 4. 部署到 Cloud Run
echo -e "\n4. 部署到 Cloud Run..."
gcloud run deploy ai-square-production \
    --image gcr.io/ai-square-463013/ai-square-production:latest \
    --region asia-east1 \
    --platform managed \
    --allow-unauthenticated \
    --timeout=900 \
    --memory=1Gi \
    --max-instances=100 \
    --min-instances=0 \
    --add-cloudsql-instances=ai-square-463013:asia-east1:ai-square-db-production \
    --set-env-vars="NODE_ENV=production,DATABASE_URL=postgresql://postgres:postgres@localhost/ai_square_db?host=/cloudsql/ai-square-463013:asia-east1:ai-square-db-production,JWT_SECRET=my-super-secret-jwt-key-2024"

# 5. 執行資料庫 Migration
echo -e "\n5. 執行資料庫 Migration..."
URL=$(gcloud run services describe ai-square-production --region=asia-east1 --format="value(status.url)")
curl -X POST "$URL/api/admin/migrate" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -s | jq '.'

# 6. 初始化內容
echo -e "\n6. 初始化內容..."
curl -X POST "$URL/api/admin/init-pbl" -s | jq '.summary'
curl -X POST "$URL/api/admin/init-discovery" -s | jq '.summary'
curl -X POST "$URL/api/admin/init-assessment" -s | jq '.summary'

# 7. 健康檢查
echo -e "\n7. 健康檢查..."
HEALTH=$(curl -s "$URL/api/health" | jq -r '.status')
echo "健康狀態: $HEALTH"

echo -e "\n========================================="
echo "部署完成"
echo "URL: $URL"
echo "========================================="
