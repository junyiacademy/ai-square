# AI Square 部署指南

## 📋 目錄
1. [快速開始](#快速開始)
2. [環境設定](#環境設定)
3. [Cloud SQL 設定](#cloud-sql-設定)
4. [部署策略](#部署策略)
5. [安全部署](#安全部署)
6. [故障排除](#故障排除)

## 快速開始

### Staging 環境部署
```bash
# 1. 設定環境變數
cp .env.staging.example .env.staging
# 編輯 .env.staging 填入正確的值

# 2. 建置並部署
make gcloud-build-and-deploy-frontend-staging

# 3. 驗證部署
gcloud run services describe ai-square-frontend-staging --region=asia-east1
```

### Production 環境部署
```bash
# 1. 確認所有測試通過
npm run test:ci
npm run build

# 2. 部署
make gcloud-build-and-deploy-frontend
```

## 環境設定

### 必要的環境變數
```env
# 資料庫連線
DB_HOST=/cloudsql/PROJECT:REGION:INSTANCE  # Cloud SQL Unix socket
DB_PORT=5433                                # PostgreSQL port
DB_NAME=ai_square_db
DB_USER=postgres
DB_PASSWORD=postgres

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

# AI 服務
VERTEX_AI_LOCATION=asia-east1
CLAUDE_API_KEY=your-claude-key
```

## Cloud SQL 設定

### 初始設定
```bash
# 1. 創建 Cloud SQL 實例
gcloud sql instances create ai-square-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-east1

# 2. 創建資料庫
gcloud sql databases create ai_square_db --instance=ai-square-db

# 3. 設定密碼
gcloud sql users set-password postgres \
  --instance=ai-square-db \
  --password=postgres
```

### 連線設定
- **開發環境**：使用 Cloud SQL Proxy
- **Staging/Production**：使用 Unix Socket 連線

### ⚠️ 重要：區域必須匹配
Cloud SQL 和 Cloud Run 必須在同一區域，否則會出現連線問題。

## 部署策略

### 1. 藍綠部署
- 部署新版本到新的 revision
- 逐步切換流量
- 可快速回滾

### 2. 金絲雀部署
```bash
# 部署新版本但不切換流量
gcloud run deploy --no-traffic

# 逐步增加流量
gcloud run services update-traffic --to-revisions=NEW_REVISION=10
```

### 3. 安全檢查清單
- [ ] 所有測試通過
- [ ] 環境變數正確設定
- [ ] 資料庫備份完成
- [ ] 監控設定就緒

## 安全部署

### 敏感資料管理
1. 使用 Secret Manager 管理密碼
2. 不要在程式碼中硬編碼密鑰
3. 定期輪換密碼

### 存取控制
- 使用 IAM 管理權限
- 最小權限原則
- 服務帳號分離

## 故障排除

### 常見問題

#### 1. Cloud SQL 連線失敗
- 檢查區域是否匹配
- 確認 Cloud SQL Admin API 已啟用
- 驗證服務帳號權限

#### 2. 環境變數錯誤
- 使用 `gcloud run services describe` 檢查
- 確認 Secret Manager 整合

#### 3. 部署超時
- 增加 timeout 設定
- 優化 Docker 映像大小

### 日誌查看
```bash
# Cloud Run 日誌
gcloud logging read "resource.type=cloud_run_revision"

# Cloud SQL 日誌
gcloud logging read "resource.type=cloudsql_database"
```

---

更多詳細資訊請參考：
- [Google Cloud Run 文檔](https://cloud.google.com/run/docs)
- [Cloud SQL 文檔](https://cloud.google.com/sql/docs)