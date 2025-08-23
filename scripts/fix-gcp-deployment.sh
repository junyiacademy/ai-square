#!/bin/bash

# 修復 GCP 部署認證問題
# Usage: ./scripts/fix-gcp-deployment.sh

set -e

PROJECT_ID="ai-square-463013"
SERVICE_ACCOUNT_NAME="github-actions-deploy"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🔧 修復 GCP 部署認證設定"
echo "================================"

echo "1. 檢查 service account 是否存在..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "✅ Service account 已存在: $SERVICE_ACCOUNT_EMAIL"
else
    echo "❌ Service account 不存在，正在創建..."
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="GitHub Actions Deployment" \
        --description="Service account for GitHub Actions deployment pipeline" \
        --project=$PROJECT_ID
    echo "✅ Service account 已創建"
fi

echo ""
echo "2. 設定必要的 IAM 權限..."

# 必要的權限列表
REQUIRED_ROLES=(
    "roles/cloudsql.client"
    "roles/run.admin"
    "roles/storage.admin"
    "roles/artifactregistry.writer"
    "roles/iam.serviceAccountUser"
    "roles/container.admin"
    "roles/cloudbuild.builds.editor"
)

for role in "${REQUIRED_ROLES[@]}"; do
    echo "設定權限: $role"
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$role" \
        --quiet
done

echo ""
echo "3. 檢查 Container Registry 和 Artifact Registry 狀態..."

# 檢查是否啟用了必要的 API
REQUIRED_APIS=(
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "containerregistry.googleapis.com"
    "artifactregistry.googleapis.com"
    "sqladmin.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    if gcloud services list --enabled --filter="name:$api" --format="value(name)" --project=$PROJECT_ID | grep -q "$api"; then
        echo "✅ API 已啟用: $api"
    else
        echo "❌ 啟用 API: $api"
        gcloud services enable $api --project=$PROJECT_ID
    fi
done

echo ""
echo "4. 生成新的 service account key..."
KEY_FILE="/tmp/gcp-sa-key.json"
gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SERVICE_ACCOUNT_EMAIL \
    --project=$PROJECT_ID

echo ""
echo "✅ 設定完成！"
echo ""
echo "📋 下一步操作："
echo "1. 將生成的 key 添加到 GitHub Secrets:"
echo "   - 複製 key 內容: cat $KEY_FILE"
echo "   - 到 GitHub repo > Settings > Secrets and variables > Actions"
echo "   - 更新或創建 secret: GCP_SA_KEY"
echo ""
echo "2. 清理臨時文件:"
echo "   rm $KEY_FILE"
echo ""
echo "3. 重新運行部署:"
echo "   git push origin staging"