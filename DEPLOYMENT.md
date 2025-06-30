# AI Square 部署指南

## 🚀 Cloud Run 部署流程

### 前置準備

1. **設定 Google Cloud Project**
   ```bash
   # 設定專案 ID
   export PROJECT_ID=your-project-id
   gcloud config set project $PROJECT_ID
   
   # 啟用必要的 APIs
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   gcloud services enable aiplatform.googleapis.com
   ```

2. **準備 GitHub Token**
   ```bash
   # 設定 GitHub Personal Access Token (需要 repo 權限)
   export GITHUB_TOKEN=your_github_token
   ```

3. **準備 Google Cloud Service Account Key**
   ```bash
   # 下載 Service Account key 到專案根目錄
   # 檔案名稱必須是: ai-square-key.json
   ```

### 部署步驟

#### 1. 設定 Secret Manager 和 Service Accounts
```bash
# 一次設定所有必要的 secrets 和 service accounts
make setup-secrets

# 或分別設定
make setup-service-accounts
make setup-secrets-frontend  
make setup-secrets-cms
```

#### 2. 部署前端 (SaaS Learning Platform)
```bash
# 完整部署前端
make deploy-gcp

# 或分步驟
make build-frontend
make gcp-build-and-push
make gcp-deploy-frontend
```

#### 3. 部署 CMS (Content Management System)
```bash
# 完整部署 CMS
make deploy-cms-gcp

# 或分步驟
make build-cms-image
make cms-build-and-push  
make gcp-deploy-cms
```

### Secret Manager 配置

系統會自動創建以下 secrets：

#### 前端 Secrets
- `gcs-bucket-name`: GCS bucket 名稱

#### CMS Secrets  
- `github-token`: GitHub Personal Access Token
- `google-cloud-key`: Google Cloud Service Account JSON
- `github-owner`: GitHub 組織名稱 (junyiacademy)
- `github-repo`: GitHub 倉庫名稱 (ai-square)
- `google-cloud-project-id`: Google Cloud 專案 ID
- `google-cloud-location`: Google Cloud 地區 (us-central1)

### Service Account 權限

#### Frontend Service Account
- `roles/storage.objectViewer`: 讀取 GCS 內容
- `roles/secretmanager.secretAccessor`: 讀取 secrets

#### CMS Service Account  
- `roles/aiplatform.user`: 使用 Vertex AI
- `roles/storage.objectAdmin`: 管理 GCS 內容
- `roles/secretmanager.secretAccessor`: 讀取 secrets

### 環境變數配置

部署時會自動配置以下環境變數：

#### Frontend
- `GOOGLE_CLOUD_PROJECT`: 從 PROJECT_ID 設定
- `GCS_BUCKET_NAME`: 從 Secret Manager 讀取

#### CMS
- `GITHUB_TOKEN`: 從 Secret Manager 讀取
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`: 從 Secret Manager 讀取 
- `GITHUB_OWNER`: 從 Secret Manager 讀取
- `GITHUB_REPO`: 從 Secret Manager 讀取
- `GOOGLE_CLOUD_PROJECT_ID`: 從 Secret Manager 讀取
- `GOOGLE_CLOUD_LOCATION`: 從 Secret Manager 讀取

### 部署配置

#### Frontend Cloud Run 設定
- **Region**: asia-east1
- **Port**: 3000  
- **Memory**: 預設
- **CPU**: 預設
- **Authentication**: 允許未認證請求

#### CMS Cloud Run 設定
- **Region**: asia-east1
- **Port**: 3000
- **Memory**: 1Gi
- **CPU**: 1
- **Concurrency**: 10
- **Max Instances**: 5
- **Authentication**: 允許未認證請求

### 故障排除

#### 1. Secret Manager 錯誤
```bash
# 檢查 secrets 是否存在
gcloud secrets list --project=$PROJECT_ID

# 檢查 service account 權限
gcloud projects get-iam-policy $PROJECT_ID
```

#### 2. Vertex AI 認證錯誤
```bash
# 確認 Service Account 有正確權限
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:ai-square-cms@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

#### 3. GitHub API 錯誤
```bash
# 檢查 GitHub token 權限
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/junyiacademy/ai-square
```

#### 4. Cloud Build 錯誤
```bash
# 檢查建置大小
make check-deploy-size

# 檢視建置日誌
gcloud builds list --project=$PROJECT_ID
```

### 本地開發

本地開發時，使用 `.env.local` 檔案：

#### CMS 本地環境變數
```bash
# cms/.env.local
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=junyiacademy
GITHUB_REPO=ai-square
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=../ai-square-key.json
```

### 維護指令

```bash
# 檢查部署狀態
gcloud run services list --region=asia-east1

# 檢視日誌
gcloud run services logs read ai-square-cms --region=asia-east1

# 更新部署
make deploy-cms-gcp

# 清理建置快取  
make clean-all
```

## 🔧 Docker 本地測試

測試 CMS Docker 映像：
```bash
# 建置映像
cd cms && docker build -t ai-square-cms .

# 本地執行（需要環境變數）
docker run -p 3000:3000 \
  -e GITHUB_TOKEN=$GITHUB_TOKEN \
  -e GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID \
  ai-square-cms
```

## 📋 檢查清單

部署前檢查：
- [ ] Google Cloud Project 已設定
- [ ] 必要的 APIs 已啟用
- [ ] GitHub Token 已準備
- [ ] Service Account Key 已下載到 `ai-square-key.json`
- [ ] `make setup-secrets` 已執行成功
- [ ] 本地測試通過

部署後檢查：
- [ ] 前端服務正常運行
- [ ] CMS 服務正常運行
- [ ] GitHub API 連接正常
- [ ] Vertex AI 功能正常
- [ ] Secret Manager 權限正確