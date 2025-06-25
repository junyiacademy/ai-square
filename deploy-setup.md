# AI Square 部署設定指南

## 前置準備

### 1. 設定 Project ID
```bash
# 方法 1: 使用 gcloud 設定（推薦）
gcloud config set project YOUR_PROJECT_ID

# 方法 2: 使用環境變數
export PROJECT_ID=YOUR_PROJECT_ID
```

### 2. 創建 Service Account
```bash
# 使用 Makefile 中的 PROJECT_ID
gcloud iam service-accounts create ai-square-frontend \
    --display-name="AI Square Frontend Service Account"
```

### 3. 設定 Secret Manager
```bash
# 創建 secret
echo -n "your-bucket-name" | gcloud secrets create gcs-bucket-name --data-file=-

# 授權 service account
gcloud secrets add-iam-policy-binding gcs-bucket-name \
    --member="serviceAccount:ai-square-frontend@$(gcloud config get-value project).iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## 部署

```bash
# 確認 PROJECT_ID 已設定
make deploy-gcp
```

## 安全檢查清單

- [ ] 沒有硬編碼的 project ID
- [ ] 沒有硬編碼的 bucket 名稱
- [ ] 沒有 API keys 或 credentials
- [ ] 使用 Secret Manager 管理敏感資訊
- [ ] Service Account 權限最小化