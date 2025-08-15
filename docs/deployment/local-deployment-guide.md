# Local Deployment Guide - Claude Code to Staging/Production

本指南說明如何從本地 Claude Code 環境直接部署到 Staging 或 Production。

## 🚀 快速部署命令

### Staging 部署
```bash
# 最簡單的方式 - 使用 Makefile
make deploy-staging

# 或完整部署（含資料庫初始化）
make deploy-staging-full
```

### Production 部署
```bash
# 檢查前置條件
make production-check

# 部署到 Production（跳過 DB 初始化）
make deploy-production

# 完整部署（含資料庫初始化）
make deploy-production-full
```

## 📋 前置準備

### 1. 安裝必要工具

```bash
# 檢查 gcloud CLI
gcloud version

# 如未安裝，請先安裝 Google Cloud SDK
# macOS:
brew install google-cloud-sdk

# 或從官網下載：https://cloud.google.com/sdk/docs/install
```

### 2. 設定 Google Cloud 認證

```bash
# 登入 Google Cloud
gcloud auth login

# 設定專案
gcloud config set project ai-square-463013

# 設定預設區域
gcloud config set run/region asia-east1

# 設定 Docker 認證
gcloud auth configure-docker gcr.io
```

### 3. 檢查環境變數

```bash
# 檢查本地環境變數設定
cat frontend/.env.local

# 確保有以下基本設定
DB_NAME=ai_square_db
DB_USER=postgres
DB_PASSWORD=postgres
```

## 🎯 Staging 部署詳細步驟

### Step 1: 準備部署

```bash
# 切換到前端目錄
cd frontend

# 確保程式碼是最新的
git pull origin main

# 執行測試確保程式碼品質
npm run typecheck
npm run lint
npm run test:ci
```

### Step 2: 建置 Docker 映像

```bash
# 建置 staging 映像
docker build -t ai-square-frontend-staging:latest -f Dockerfile .

# 標記映像準備上傳
docker tag ai-square-frontend-staging:latest \
  gcr.io/ai-square-463013/ai-square-frontend-staging:latest
```

### Step 3: 推送映像到 GCR

```bash
# 推送到 Google Container Registry
docker push gcr.io/ai-square-463013/ai-square-frontend-staging:latest
```

### Step 4: 部署到 Cloud Run

```bash
# 使用部署腳本（推薦）
./deploy-staging.sh

# 或手動執行 gcloud 命令
gcloud run deploy ai-square-frontend-staging \
  --image gcr.io/ai-square-463013/ai-square-frontend-staging:latest \
  --platform managed \
  --region asia-east1 \
  --port 3000 \
  --allow-unauthenticated \
  --add-cloudsql-instances=ai-square-463013:asia-east1:ai-square-db-staging-asia \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DB_HOST="/cloudsql/ai-square-463013:asia-east1:ai-square-db-staging-asia" \
  --set-env-vars DB_PORT=5432 \
  --set-env-vars DB_NAME=ai_square_db \
  --set-env-vars DB_USER=postgres \
  --set-env-vars DB_PASSWORD=postgres \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5
```

### Step 5: 初始化資料庫（如需要）

```bash
# 獲取服務 URL
SERVICE_URL=$(gcloud run services describe ai-square-frontend-staging \
  --region asia-east1 --format 'value(status.url)')

# 初始化 schema
curl -X POST "${SERVICE_URL}/api/admin/init-schema" \
  -H "x-admin-key: schema-init-2025" \
  -H "Content-Type: application/json"

# 初始化 scenarios
make staging-scenarios-init
```

### Step 6: 驗證部署

```bash
# 健康檢查
curl "${SERVICE_URL}/api/health"

# 檢查首頁
open "${SERVICE_URL}"

# 查看日誌
gcloud run logs read --service ai-square-frontend-staging --region asia-east1
```

## 🚨 Production 部署詳細步驟

### ⚠️ Production 前置檢查

```bash
# 1. 確認 Production Cloud SQL 存在
gcloud sql instances describe ai-square-db-production \
  --project=ai-square-463013 || echo "❌ Production DB 不存在"

# 2. 確認 Production Secrets 已設定
gcloud secrets list --filter="name:production" --project=ai-square-463013

# 3. 如果缺少基礎設施，先執行設定
cd scripts
./setup-production-secrets.sh
```

### Step 1: 準備 Production 部署

```bash
# 確保在正確的分支
git checkout main  # 或 production 分支

# 確保程式碼品質
cd frontend
npm run build  # 確保 build 成功
```

### Step 2: 建置 Production 映像

```bash
# 使用 Production Dockerfile
docker build -t ai-square-frontend:latest -f Dockerfile.production .

# 標記映像
docker tag ai-square-frontend:latest \
  gcr.io/ai-square-463013/ai-square-frontend:latest
```

### Step 3: 推送到 GCR

```bash
docker push gcr.io/ai-square-463013/ai-square-frontend:latest
```

### Step 4: 部署到 Production

```bash
# 使用部署腳本（會提示確認）
./deploy-production.sh

# 或使用 Makefile（更安全）
make deploy-production
```

### Step 5: 驗證 Production

```bash
# 獲取 Production URL
SERVICE_URL="https://ai-square-frontend-731209836128.asia-east1.run.app"

# 健康檢查
curl "${SERVICE_URL}/api/health"

# 檢查服務
open "${SERVICE_URL}"

# 監控日誌
make production-logs
```

## 🛠️ 常用 Makefile 命令

### Staging 命令
```bash
make staging-check          # 檢查前置條件
make deploy-staging         # 部署到 staging
make deploy-staging-full    # 完整部署（含 DB）
make staging-logs          # 查看日誌
make staging-health        # 健康檢查
make staging-db-init       # 初始化資料庫
make staging-scenarios-init # 初始化 scenarios
```

### Production 命令
```bash
make production-check       # 檢查前置條件
make production-secrets     # 設定 secrets
make deploy-production      # 部署到 production
make deploy-production-full # 完整部署（含 DB）
make production-logs       # 查看日誌
make production-health     # 健康檢查
make production-rollback   # 回滾到上一版本
```

## 🔧 故障排除

### 1. Docker 建置失敗
```bash
# 清理 Docker 快取
docker system prune -a

# 重新建置
docker build --no-cache -t ai-square-frontend:latest .
```

### 2. 部署失敗 - 權限問題
```bash
# 檢查認證
gcloud auth list

# 重新認證
gcloud auth login

# 檢查專案
gcloud config get-value project
```

### 3. Cloud SQL 連線失敗
```bash
# 檢查 Cloud SQL 實例狀態
gcloud sql instances describe ai-square-db-staging-asia \
  --region asia-east1

# 確保 Cloud Run 和 Cloud SQL 在同一區域
```

### 4. Secrets 錯誤
```bash
# 列出所有 secrets
gcloud secrets list --project=ai-square-463013

# 檢查特定 secret
gcloud secrets versions access latest \
  --secret="db-password-staging" \
  --project=ai-square-463013
```

## 📊 部署後監控

### 查看即時日誌
```bash
# Staging
gcloud run logs tail --service ai-square-frontend-staging --region asia-east1

# Production
gcloud run logs tail --service ai-square-frontend --region asia-east1
```

### 查看指標
```bash
# CPU 和記憶體使用
gcloud monitoring metrics-descriptors list \
  --filter="metric.type:run.googleapis.com"

# 錯誤率
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
  --limit 50 \
  --format json
```

## 🔄 回滾程序

### Staging 回滾
```bash
# 列出所有版本
gcloud run revisions list --service ai-square-frontend-staging --region asia-east1

# 回滾到特定版本
gcloud run services update-traffic ai-square-frontend-staging \
  --to-revisions=REVISION_NAME=100 \
  --region asia-east1
```

### Production 回滾
```bash
# 使用 Makefile（更安全）
make production-rollback

# 或手動指定版本
gcloud run services update-traffic ai-square-frontend \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region asia-east1
```

## ✅ 部署檢查清單

### Staging 部署前
- [ ] 程式碼已 pull 最新版本
- [ ] TypeScript 無錯誤 (`npm run typecheck`)
- [ ] ESLint 無錯誤 (`npm run lint`)
- [ ] 測試通過 (`npm run test:ci`)
- [ ] Build 成功 (`npm run build`)

### Production 部署前
- [ ] Staging 已測試完成
- [ ] Production DB 已建立
- [ ] Production Secrets 已設定
- [ ] 有回滾計畫
- [ ] 已通知相關人員
- [ ] 備份重要資料

### 部署後驗證
- [ ] 健康檢查通過
- [ ] 首頁可正常訪問
- [ ] API 端點正常回應
- [ ] 資料庫連線正常
- [ ] 無異常錯誤日誌

## 🎯 最佳實踐

1. **永遠先部署到 Staging**
   - 測試新功能
   - 驗證資料庫遷移
   - 確認性能

2. **使用 Makefile 命令**
   - 內建安全檢查
   - 統一的部署流程
   - 減少人為錯誤

3. **監控部署過程**
   - 查看即時日誌
   - 檢查錯誤率
   - 驗證功能

4. **保持環境隔離**
   - 不要共用資料庫
   - 使用不同的 Secrets
   - 分離 Service Account

5. **定期備份**
   - Production 資料庫自動備份
   - 重要部署前手動備份
   - 測試恢復程序

## 📝 快速參考

```bash
# Staging 一鍵部署
make deploy-staging-full

# Production 安全部署
make production-check && make deploy-production

# 查看所有可用命令
make help

# 緊急回滾
make production-rollback
```

---

最後更新：2025-01-15