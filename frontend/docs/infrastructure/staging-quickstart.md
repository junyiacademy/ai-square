# AI Square Staging 快速部署指南

## 🚀 一鍵部署 Staging 環境

### 前提條件
1. **Google Cloud CLI** 已安裝並認證
2. **Docker** 已安裝
3. **專案權限** - Cloud Run, Cloud SQL, Container Registry

### 快速部署 (3 步驟)

#### 1️⃣ 設定專案 ID
```bash
# 替換為你的專案 ID
export GOOGLE_CLOUD_PROJECT="your-project-id"
gcloud config set project $GOOGLE_CLOUD_PROJECT
```

#### 2️⃣ 一鍵部署
```bash
# 部署整個 staging 環境
npm run staging:deploy
```

這個指令會自動：
- ✅ 創建 Cloud SQL 實例
- ✅ 構建 Docker 映像
- ✅ 部署到 Cloud Run
- ✅ 設定環境變數
- ✅ 連接資料庫

#### 3️⃣ 初始化資料庫
```bash
# 創建資料庫結構
npm run staging:migrate
```

---

## 🎯 部署完成後

### 獲取 Staging URL
```bash
# 部署完成後會顯示，或手動獲取
gcloud run services describe ai-square-staging \
  --region us-central1 \
  --format 'value(status.url)'
```

### 測試 Staging 環境
1. **健康檢查**: `{STAGING_URL}/api/health`
2. **測試登入**: 使用 `staging-test@ai-square.com`
3. **API 測試**: 所有 `/api/*` 端點

### 監控和除錯
```bash
# 查看即時日誌
npm run staging:logs

# 連接資料庫
npm run staging:connect

# 檢查服務狀態
gcloud run services describe ai-square-staging --region us-central1
```

---

## 🔧 常用操作

### 更新 Staging
```bash
# 重新部署最新版本
npm run staging:deploy
```

### 清理資源
```bash
# ⚠️ 刪除所有 staging 資源
npm run staging:cleanup
```

### 手動除錯
```bash
# 1. 檢查 Cloud Run 日誌
gcloud logs tail --project=$GOOGLE_CLOUD_PROJECT

# 2. 檢查 Cloud SQL 連線
gcloud sql instances describe ai-square-db-staging

# 3. 測試資料庫連線
gcloud sql connect ai-square-db-staging --user=postgres
```

---

## 📊 Staging vs Production

| 功能 | Staging | Production |
|------|---------|------------|
| 資料庫 | Cloud SQL (micro) | GCS (現有) |
| URL | `*-staging-*.run.app` | `ai-square.com` |
| 資料 | 測試資料 | 真實用戶資料 |
| 風險 | 零風險 | 需要謹慎 |

---

## ❓ 故障排除

### 部署失敗
```bash
# 檢查權限
gcloud auth list
gcloud projects get-iam-policy $GOOGLE_CLOUD_PROJECT

# 檢查服務是否啟用
gcloud services list --enabled
```

### 資料庫連線問題
```bash
# 檢查 Cloud SQL 實例狀態
gcloud sql instances list

# 重置密碼
gcloud sql users set-password postgres \
  --instance=ai-square-db-staging \
  --password=NEW_PASSWORD
```

### Cloud Run 無法啟動
```bash
# 檢查映像
gcloud container images list --repository=gcr.io/$GOOGLE_CLOUD_PROJECT

# 檢查環境變數
gcloud run services describe ai-square-staging \
  --region us-central1 \
  --format 'value(spec.template.spec.template.spec.containers[0].env[].name,spec.template.spec.template.spec.containers[0].env[].value)'
```

---

## 🎉 成功指標

部署成功後，你應該能夠：
- ✅ 訪問 staging URL
- ✅ API 健康檢查通過
- ✅ 資料庫查詢正常
- ✅ 所有 PostgreSQL API 端點工作
- ✅ 不影響 production 環境

現在你可以安全地測試新的 PostgreSQL 架構！

---

最後更新: 2025-01-19