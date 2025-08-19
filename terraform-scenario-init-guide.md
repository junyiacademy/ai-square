# Terraform 場景初始化指南

## 回答：是的，Terraform 可以且應該處理場景初始化！

### 現有 Terraform 配置

Terraform 已經在 `post-deploy.tf` 中包含了完整的場景初始化邏輯：

```hcl
# 位於 terraform/post-deploy.tf 第 289-367 行
resource "null_resource" "init_scenarios" {
  depends_on = [null_resource.init_database_schema]
  
  provisioner "local-exec" {
    command = <<-EOT
      # 初始化 Assessment
      curl -X POST "${SERVICE_URL}/api/admin/init-assessment"
      
      # 初始化 PBL  
      curl -X POST "${SERVICE_URL}/api/admin/init-pbl"
      
      # 初始化 Discovery
      curl -X POST "${SERVICE_URL}/api/admin/init-discovery"
    EOT
  }
}
```

### 為什麼初始化失敗？

1. **密碼問題（已修復）**
   - 原密碼包含 `#` 字符
   - 已更改為 `AiSquare2025DbSecure`

2. **資料格式問題（剛修復）**
   - PostgreSQL array literal 格式錯誤
   - prerequisites 欄位沒有正確從 YAML 解析
   - 已修正程式碼來處理 prerequisites 陣列

3. **Terraform 語法錯誤**
   - `modules/blue-green/main.tf` 有條件表達式錯誤
   - 阻止了 Terraform 執行

### 建議的解決方案

#### 方案 1：修復 Terraform 語法錯誤（推薦）
```bash
# 修復 blue-green module 的語法錯誤
# 然後執行
terraform apply -target=null_resource.init_scenarios
```

#### 方案 2：使用 Terraform 管理的腳本
```bash
# 創建一個獨立的初始化腳本
cat > terraform/scripts/init-scenarios.sh << 'EOF'
#!/bin/bash
SERVICE_URL=$1

echo "Initializing scenarios..."

# 重試邏輯
for module in assessment pbl discovery; do
  for i in {1..3}; do
    if curl -X POST "${SERVICE_URL}/api/admin/init-${module}" \
         -H "Content-Type: application/json" \
         -d '{"force": true}' | grep -q '"success":true'; then
      echo "✅ ${module} initialized"
      break
    fi
    sleep 5
  done
done
EOF

# 在 Terraform 中使用
resource "null_resource" "init_scenarios_script" {
  provisioner "local-exec" {
    command = "bash ${path.module}/scripts/init-scenarios.sh ${google_cloud_run_service.ai_square.status[0].url}"
  }
}
```

### 最佳實踐

1. **Infrastructure as Code**
   - 所有部署步驟都應該在 Terraform 中
   - 包括資料初始化

2. **冪等性**
   - 初始化應該可以安全地重複執行
   - 使用 `force: true` 參數

3. **驗證**
   - Terraform 應該驗證初始化成功
   - 檢查資料庫中的記錄數

4. **錯誤處理**
   - 重試機制
   - 清晰的錯誤訊息

### 立即行動

目前新的 Docker image 正在建置中（修復了 prerequisites 問題）。完成後：

1. 部署新 image
2. 執行場景初始化
3. 驗證所有場景都正確載入

```bash
# 部署新 image
gcloud run deploy ai-square-staging \
  --image gcr.io/ai-square-463013/ai-square-frontend:staging-20250819-133004 \
  --region=asia-east1

# 初始化場景
curl -X POST "https://ai-square-staging-731209836128.asia-east1.run.app/api/admin/init-pbl"
curl -X POST "https://ai-square-staging-731209836128.asia-east1.run.app/api/admin/init-discovery"  
curl -X POST "https://ai-square-staging-731209836128.asia-east1.run.app/api/admin/init-assessment"
```

### 結論

是的，Terraform 絕對應該處理場景初始化！這是 Infrastructure as Code 的最佳實踐。目前的問題主要是：
1. Terraform 模組語法錯誤需要修復
2. 應用程式碼的資料格式問題（已修復）

一旦這些問題解決，Terraform 就能完全自動化整個部署流程，包括場景初始化。