# CI/CD Deployment and Database Guide

## 🔧 Google Cloud Account Configuration

### Prerequisites
AI Square 專案需要使用正確的 Google Cloud 帳號和專案設定。

**專案資訊：**
- Project ID: `ai-square-463013`
- Account: `youngtsai@junyiacademy.org`
- Region: `asia-east1`

### Setting Up gcloud Configuration

1. **建立 AI Square 專屬配置**
```bash
# 建立配置
gcloud config configurations create ai-square

# 設定帳號和專案
gcloud config set account youngtsai@junyiacademy.org
gcloud config set project ai-square-463013
gcloud config set compute/region asia-east1
```

2. **切換到 AI Square 配置**
```bash
# 啟用配置
gcloud config configurations activate ai-square

# 確認當前配置
gcloud config list
```

3. **多專案開發設定**
如果你同時開發多個專案（例如 Duotopia），可以使用環境變數：
```bash
# Terminal 1 - AI Square
export CLOUDSDK_ACTIVE_CONFIG_NAME=ai-square

# Terminal 2 - 其他專案
export CLOUDSDK_ACTIVE_CONFIG_NAME=other-project
```

## 📊 Database Configuration

### Cloud SQL 實例
- **Staging**: `ai-square-db-staging-asia`
- **Production**: `ai-square-db-production`
- **Database Name**: `ai_square_db`

### 本地開發環境
```bash
# .env.local
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=ai_square_db
DB_USER=postgres
DB_PASSWORD=postgres
```

### Cloud Run 環境變數
部署時會自動設定以下環境變數：
- `DB_HOST`: Cloud SQL 連接路徑
- `DB_NAME`: 資料庫名稱
- `DB_USER`: 資料庫使用者
- `DB_PASSWORD`: 從 Secret Manager 取得

## 🚀 Deployment Commands

### 部署前檢查
```bash
# 1. 確認在正確的 gcloud 配置
gcloud config get-value project
# 應該顯示: ai-square-463013

# 2. 確認已登入正確帳號
gcloud auth list
# 應該顯示: youngtsai@junyiacademy.org 為 ACTIVE

# 3. 如果需要重新認證
gcloud auth login
```

### 手動部署到 Staging
```bash
# 切換到 AI Square 配置
gcloud config configurations activate ai-square

# 部署
gcloud run deploy ai-square-staging \
  --image gcr.io/ai-square-463013/ai-square-staging:latest \
  --region asia-east1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,DB_HOST=/cloudsql/ai-square-463013:asia-east1:ai-square-db-staging-asia,DB_NAME=ai_square_db,DB_USER=postgres" \
  --set-secrets="DB_PASSWORD=db-password-staging:latest" \
  --add-cloudsql-instances=ai-square-463013:asia-east1:ai-square-db-staging-asia \
  --service-account=ai-square-staging@ai-square-463013.iam.gserviceaccount.com
```

### 手動部署到 Production
```bash
gcloud run deploy ai-square-frontend \
  --image gcr.io/ai-square-463013/ai-square-frontend:latest \
  --region asia-east1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,DB_HOST=/cloudsql/ai-square-463013:asia-east1:ai-square-db-production,DB_NAME=ai_square_db,DB_USER=postgres" \
  --set-secrets="DB_PASSWORD=db-password-production:latest" \
  --add-cloudsql-instances=ai-square-463013:asia-east1:ai-square-db-production \
  --service-account=ai-square-frontend@ai-square-463013.iam.gserviceaccount.com
```

## 🔄 CI/CD Pipeline

### GitHub Actions 自動部署
部署會在以下情況自動觸發：
- Push 到 `staging` 分支 → 部署到 Staging
- Push 到 `main` 分支 → 部署到 Production

### 部署流程
1. **Pre-checks**: TypeScript 編譯、Build 測試
2. **Build Docker Image**: 建立並推送到 GCR
3. **Deploy to Cloud Run**: 部署新版本
4. **Initialize Database**: 初始化場景資料
5. **Health Check**: 驗證部署成功

## 🧪 驗證部署

### 檢查服務狀態
```bash
# 列出所有服務
gcloud run services list --region=asia-east1

# 檢查特定服務
gcloud run services describe ai-square-staging --region=asia-east1
```

### 檢查健康狀態
```bash
# Staging
curl https://ai-square-staging-731209836128.asia-east1.run.app/api/health

# Production
curl https://ai-square-frontend-731209836128.asia-east1.run.app/api/health
```

### 初始化內容（部署後必須執行）
```bash
# Staging
BASE_URL="https://ai-square-staging-731209836128.asia-east1.run.app"
curl -X POST "$BASE_URL/api/admin/init-pbl"
curl -X POST "$BASE_URL/api/admin/init-discovery"
curl -X POST "$BASE_URL/api/admin/init-assessment"

# Production
BASE_URL="https://ai-square-frontend-731209836128.asia-east1.run.app"
curl -X POST "$BASE_URL/api/admin/init-pbl"
curl -X POST "$BASE_URL/api/admin/init-discovery"
curl -X POST "$BASE_URL/api/admin/init-assessment"
```

## ⚠️ 常見問題

### 1. "database does not exist" 錯誤
- 確認環境變數設定正確
- 檢查 Cloud SQL 連接字串
- 確認 Service Account 有正確權限

### 2. 認證錯誤
```bash
# 重新認證
gcloud auth login
gcloud auth application-default login
```

### 3. 權限錯誤
```bash
# 授予 Service Account 權限
gcloud projects add-iam-policy-binding ai-square-463013 \
  --member="serviceAccount:ai-square-staging@ai-square-463013.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

### 4. 部署到錯誤專案
**永遠在部署前確認：**
```bash
gcloud config get-value project
# 必須顯示: ai-square-463013
```

## 📝 Best Practices

1. **使用專屬配置**：永遠使用 `ai-square` configuration
2. **部署前確認**：檢查 project 和 account
3. **測試後部署**：確保 build 成功
4. **監控日誌**：使用 `gcloud run services logs read`
5. **版本控制**：使用 Git SHA 作為 image tag

## 🔐 Security Notes

- 密碼存在 Secret Manager，不要硬編碼
- Service Account 遵循最小權限原則
- 定期更新認證和密鑰
- 不要將認證資訊提交到 Git