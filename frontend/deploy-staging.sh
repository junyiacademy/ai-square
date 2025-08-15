#!/bin/bash
# AI Square Staging Deployment Script
# ====================================

set -e

echo "🚀 Starting AI Square Staging Deployment..."

# Configuration
PROJECT_ID="ai-square-463013"
REGION="asia-east1"
SERVICE_NAME="ai-square-staging"
IMAGE_TAG="$(git rev-parse --short HEAD)"
CLOUD_SQL_INSTANCE="ai-square-463013:asia-east1:ai-square-db-staging-asia"

echo "📦 Project: $PROJECT_ID"
echo "📍 Region: $REGION"
echo "🏷️  Image Tag: $IMAGE_TAG"

# Step 0: Cloud SQL Smart Initialization (safe to run multiple times)
echo ""
echo "🗄️  Ensuring Cloud SQL is properly initialized..."

# Auto-detect CI/CD environment
if [ "${CI:-}" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ] || [ "${GITLAB_CI:-}" = "true" ]; then
    echo "🤖 CI/CD environment detected"
    export CI=true
    export FORCE_INIT=true
fi

if [ -z "$SKIP_DB_INIT" ]; then
    echo "Running database initialization with Schema V4 (includes CASCADE DELETE)..."
    chmod +x scripts/init-staging-cloud-sql.sh
    CI="${CI:-false}" FORCE_INIT="${FORCE_INIT:-false}" ./scripts/init-staging-cloud-sql.sh
    echo ""
else
    echo "Skipping database initialization (SKIP_DB_INIT is set)"
fi

# Step 1: Build and Push Image
echo ""
echo "🚀 選擇建置方式："
echo "1) Cloud Build（推薦，~7分鐘，自動處理平台問題）"
echo "2) Local Docker Build（~30分鐘，需要 Docker Desktop）"
read -p "請選擇 (1 或 2，預設 1): " BUILD_CHOICE
BUILD_CHOICE=${BUILD_CHOICE:-1}

if [ "$BUILD_CHOICE" = "1" ]; then
    echo ""
    echo "☁️  使用 Cloud Build 建置和推送..."
    echo "⏱️  預計需要 6-8 分鐘..."
    
    # 使用 Cloud Build（自動處理平台問題）
    gcloud builds submit \
        --tag gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG \
        --timeout=30m \
        --project=$PROJECT_ID \
        .
    
    if [ $? -eq 0 ]; then
        echo "✅ Cloud Build 成功完成！"
    else
        echo "❌ Cloud Build 失敗，請檢查錯誤訊息"
        exit 1
    fi
else
    echo ""
    echo "🔨 使用本地 Docker 建置..."
    echo "⏱️  預計需要 20-30 分鐘..."
    
    # 檢查 Docker 是否安裝
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker not found. Please install Docker Desktop first."
        exit 1
    fi
    
    # 本地建置（確保指定平台）
    docker build --platform linux/amd64 -f Dockerfile.staging -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG .
    
    # Step 2: Push to Google Container Registry
    echo ""
    echo "📤 Pushing image to GCR..."
    docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG
fi

# Step 3: Deploy to Cloud Run
echo ""
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG \
  --region $REGION \
  --platform managed \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --add-cloudsql-instances $CLOUD_SQL_INSTANCE \
  --set-env-vars NODE_ENV=production,ENVIRONMENT=staging \
  --set-env-vars DB_HOST="/cloudsql/$CLOUD_SQL_INSTANCE" \
  --set-env-vars DB_PORT=5432 \
  --set-env-vars DB_NAME=ai_square_db \
  --set-env-vars DB_USER=postgres \
  --set-env-vars DB_PASSWORD=postgres \
  --set-env-vars DATABASE_URL="postgresql://postgres:postgres@/ai_square_db?host=/cloudsql/$CLOUD_SQL_INSTANCE" \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID \
  --set-env-vars GOOGLE_CLOUD_REGION=$REGION \
  --set-env-vars VERTEX_AI_LOCATION=$REGION \
  --set-env-vars VERTEX_AI_MODEL=gemini-2.5-flash \
  --set-env-vars GCS_BUCKET_NAME=ai-square-db-v2 \
  --set-env-vars NEXTAUTH_URL="https://ai-square-staging-731209836128.asia-east1.run.app" \
  --set-env-vars NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-staging-secret-2025-change-this-in-production}" \
  --set-env-vars JWT_SECRET="${JWT_SECRET:-staging-jwt-secret-2025-change-this}" \
  --set-env-vars ENABLE_REDIS=false \
  --set-env-vars ENABLE_MONITORING=false \
  --allow-unauthenticated

# Step 4: Get the service URL
echo ""
echo "🔍 Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

# Step 5: Initialize database with scenario data
echo ""
echo "🗄️  Initializing database with scenario data..."

# Wait for service to be ready
echo "Waiting for service to be ready..."
sleep 10

# Call init APIs to populate database
echo "📚 Initializing Assessment scenarios..."
curl -s -X POST "$SERVICE_URL/api/admin/init-assessment" \
  -H "Content-Type: application/json" \
  -d '{"force": false}' || echo "Assessment init failed (this is OK if scenarios already exist)"

echo "🎯 Initializing PBL scenarios..."
curl -s -X POST "$SERVICE_URL/api/admin/init-pbl" \
  -H "Content-Type: application/json" \
  -d '{"force": false}' || echo "PBL init failed (this is OK if scenarios already exist)"

echo "🧭 Initializing Discovery scenarios..."
curl -s -X POST "$SERVICE_URL/api/admin/init-discovery" \
  -H "Content-Type: application/json" \
  -d '{"force": false}' || echo "Discovery init failed (this is OK if scenarios already exist)"

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "📋 Next steps:"
echo "1. Update NEXTAUTH_URL in Cloud Run environment variables to: $SERVICE_URL"
echo "2. Set secrets in Secret Manager for sensitive values"
echo "3. Test the deployment at: $SERVICE_URL"
echo "4. Monitor logs: gcloud run logs read --service $SERVICE_NAME --region $REGION"