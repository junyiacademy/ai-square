# Vertex AI 權限與 CI/CD 設置指南

## 🎯 問題與解決方案

### 問題描述
每次部署到 Cloud Run 時，都會遇到 Vertex AI 認證錯誤：
```
VertexAI.GoogleAuthError: Unable to authenticate your request
```

### 根本原因
1. Cloud Run Service Account 缺少 Vertex AI 權限
2. 環境變數配置不完整
3. IAM 角色綁定未正確設置

## 🚀 一次性設置方案

### 方案 1: 使用增強版 GitHub Actions（推薦）

#### 步驟 1: 設置 GitHub Secrets
```bash
# 執行設置腳本
chmod +x scripts/setup-github-secrets.sh
./scripts/setup-github-secrets.sh
```

需要設置的 Secrets：
- `GCP_SA_KEY`: GitHub Actions 的服務帳戶金鑰
- `STAGING_DB_PASSWORD`: Staging 資料庫密碼
- `SLACK_WEBHOOK_URL`: (選擇性) Slack 通知

#### 步驟 2: 使用新的 CI/CD 工作流程
```bash
# 刪除舊的工作流程
rm .github/workflows/deploy-staging-enhanced.yml

# 使用新的工作流程
mv .github/workflows/deploy-staging-vertex-ai.yml \
   .github/workflows/deploy-staging.yml
```

#### 步驟 3: 推送觸發部署
```bash
git add -A
git commit -m "ci: implement Vertex AI permissions in CI/CD"
git push origin main
```

### 方案 2: 手動修復現有部署

如果需要立即修復現有的部署：

```bash
# 執行修復腳本
chmod +x scripts/fix-vertex-ai-permissions.sh
./scripts/fix-vertex-ai-permissions.sh
```

## 📋 CI/CD 工作流程特點

### 自動化權限管理
```yaml
# 工作流程會自動：
1. 創建 Service Account（如果不存在）
2. 授予所有必要的 IAM 角色
3. 配置環境變數
4. 驗證 Vertex AI 連接
```

### 必要的 IAM 角色
- `roles/aiplatform.user` - Vertex AI 使用者
- `roles/aiplatform.serviceAgent` - Vertex AI 服務代理
- `roles/cloudsql.client` - Cloud SQL 客戶端
- `roles/secretmanager.secretAccessor` - Secret Manager 存取
- `roles/storage.objectViewer` - Storage 物件檢視器
- `roles/iam.serviceAccountTokenCreator` - 服務帳戶令牌創建者

### 環境變數配置
```bash
GOOGLE_CLOUD_PROJECT=ai-square-463013
GCP_PROJECT_ID=ai-square-463013
VERTEX_AI_PROJECT=ai-square-463013
VERTEX_AI_LOCATION=asia-east1
```

## 🔍 驗證與測試

### 1. 檢查部署狀態
```bash
# 查看 GitHub Actions 執行狀態
gh run list --limit 5

# 查看最新執行詳情
gh run view
```

### 2. 測試 Vertex AI 連接
```bash
# 取得服務 URL
SERVICE_URL=$(gcloud run services describe ai-square-staging \
  --region=asia-east1 --format='value(status.url)')

# 測試健康檢查
curl "$SERVICE_URL/api/health"

# 測試 Vertex AI（如果有測試端點）
curl "$SERVICE_URL/api/health/vertex-ai"
```

### 3. 查看 Cloud Run 日誌
```bash
gcloud run services logs read ai-square-staging \
  --region=asia-east1 --limit=50
```

## 🛠️ 故障排除

### 如果仍有權限問題

1. **確認 API 已啟用**
```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

2. **檢查服務帳戶權限**
```bash
gcloud projects get-iam-policy ai-square-463013 \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:ai-square-staging@ai-square-463013.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

3. **強制重新部署**
```bash
gcloud run services update ai-square-staging \
  --region=asia-east1 --force
```

4. **檢查配額與計費**
- 訪問: https://console.cloud.google.com/apis/api/aiplatform.googleapis.com/quotas
- 確認專案有啟用計費

## 📝 維護建議

### 定期檢查
1. 每月檢查一次 IAM 權限是否完整
2. 監控 Vertex AI API 使用量
3. 更新 GitHub Actions 工作流程

### 安全最佳實踐
1. 定期輪換服務帳戶金鑰
2. 使用 Workload Identity（進階）
3. 限制服務帳戶權限至最小必要

### 成本優化
1. 設置 Cloud Run 最小實例數為 0（非生產環境）
2. 使用 Gemini Flash 模型（較便宜）
3. 實施請求快取機制

## 🎯 預期結果

設置完成後，每次推送到 main 分支都會：
1. ✅ 自動檢查並修復權限
2. ✅ 建構並部署應用程式
3. ✅ 驗證所有服務連接
4. ✅ 初始化應用程式資料
5. ✅ 發送部署通知（如果設置）

不再需要手動處理 Vertex AI 權限問題！

## 📚 相關文件

- [Google Cloud IAM 文件](https://cloud.google.com/iam/docs)
- [Vertex AI 認證指南](https://cloud.google.com/vertex-ai/docs/authentication)
- [Cloud Run Service Accounts](https://cloud.google.com/run/docs/configuring/service-accounts)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
