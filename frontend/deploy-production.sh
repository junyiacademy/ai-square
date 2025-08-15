#!/bin/bash
# AI Square Production Deployment Script
# Purpose: Deploy AI Square to Google Cloud Run (Production)

set -e

# Configuration
PROJECT_ID="ai-square-463013"
REGION="asia-east1"
SERVICE_NAME="ai-square-frontend"
IMAGE_NAME="ai-square-frontend"
IMAGE_TAG=${IMAGE_TAG:-$(git rev-parse --short HEAD)}

# Cloud SQL Configuration (Production)
CLOUD_SQL_INSTANCE="ai-square-463013:asia-east1:ai-square-db-production"

# Build Configuration
DOCKERFILE="Dockerfile.production"
GCR_IMAGE="gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "🚀 Starting AI Square Production Deployment..."
echo "📦 Project: ${PROJECT_ID}"
echo "📍 Region: ${REGION}"
echo "🏷️  Image Tag: ${IMAGE_TAG}"
echo ""
echo "⚠️  WARNING: This will deploy to PRODUCTION environment"
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

# Step 1: Ensure Cloud SQL is properly initialized
echo ""
echo "🗄️  Ensuring Cloud SQL is properly initialized..."
if [ "${SKIP_DB_INIT}" != "true" ]; then
    echo "⚠️  Please ensure production database is initialized separately"
    echo "   Use secure methods for production database initialization"
else
    echo "Skipping database initialization (SKIP_DB_INIT is set)"
fi

# Step 2: Build and Push Image
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
        --tag ${GCR_IMAGE} \
        --timeout=30m \
        --project=${PROJECT_ID} \
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
    docker build --platform linux/amd64 -t ${IMAGE_NAME}:${IMAGE_TAG} -f ${DOCKERFILE} .
    
    # Step 3: Tag for GCR
    docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${GCR_IMAGE}
    
    # Step 4: Push to GCR
    echo ""
    echo "📤 Pushing image to GCR..."
    docker push ${GCR_IMAGE}
fi

# Step 5: Deploy to Cloud Run
echo ""
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${GCR_IMAGE} \
  --platform managed \
  --region ${REGION} \
  --port 3000 \
  --allow-unauthenticated \
  --add-cloudsql-instances=${CLOUD_SQL_INSTANCE} \
  --set-env-vars DB_HOST="/cloudsql/${CLOUD_SQL_INSTANCE}" \
  --set-env-vars DB_PORT="5432" \
  --set-env-vars DB_NAME="ai_square_db" \
  --set-env-vars DB_USER="postgres" \
  --set-env-vars NODE_ENV="production" \
  --set-env-vars DATABASE_URL="postgresql://postgres:${DB_PASSWORD:-postgres}@/ai_square_db?host=/cloudsql/${CLOUD_SQL_INSTANCE}" \
  --set-env-vars NEXTAUTH_URL="https://ai-square-production-${PROJECT_ID}.${REGION}.run.app" \
  --set-env-vars NEXTAUTH_SECRET="production-secret-2025" \
  --set-env-vars JWT_SECRET="production-jwt-2025" \
  --set-env-vars DB_PASSWORD="postgres" \
  --set-env-vars GOOGLE_CLOUD_PROJECT="ai-square-463013" \
  --set-env-vars GOOGLE_CLOUD_REGION="asia-east1" \
  --set-env-vars VERTEX_AI_LOCATION="asia-east1" \
  --set-env-vars VERTEX_AI_MODEL="gemini-2.5-flash" \
  --set-env-vars GCS_BUCKET_NAME="ai-square-db-v2" \
  --set-env-vars ENABLE_REDIS="false" \
  --set-env-vars ENABLE_MONITORING="false" \
  --memory 1Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --timeout 300 \
  --project ${PROJECT_ID}

# Step 6: Get service URL
echo ""
echo "🔍 Getting service URL..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

# Step 7: Initialize database if needed (using API endpoint)
echo ""
echo "🗄️  Initializing database with schema (if needed)..."
echo "Waiting for service to be ready..."
sleep 10

# Check if schema exists
SCHEMA_STATUS=$(curl -s "${SERVICE_URL}/api/admin/init-schema" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('success', False))" 2>/dev/null || echo "false")

if [ "$SCHEMA_STATUS" = "false" ]; then
    echo "📝 Initializing database schema..."
    curl -X POST "${SERVICE_URL}/api/admin/init-schema" \
      -H "x-admin-key: ${ADMIN_INIT_KEY:-schema-init-2025-secure}" \
      -H "Content-Type: application/json" || echo "⚠️  Schema initialization failed - may need manual intervention"
else
    echo "✅ Database schema already initialized"
fi

# Step 8: Initialize scenarios (only if force flag is set)
if [ "${INIT_SCENARIOS}" = "true" ]; then
    echo ""
    echo "📚 Initializing scenarios..."
    
    echo "📚 Initializing Assessment scenarios..."
    curl -X POST "${SERVICE_URL}/api/admin/init-assessment" \
      -H "Content-Type: application/json" \
      -d '{"force": false}' || echo "⚠️  Assessment initialization failed"
    
    echo "🎯 Initializing PBL scenarios..."
    curl -X POST "${SERVICE_URL}/api/admin/init-pbl" \
      -H "Content-Type: application/json" \
      -d '{"force": false}' || echo "⚠️  PBL initialization failed"
    
    echo "🧭 Initializing Discovery scenarios..."
    curl -X POST "${SERVICE_URL}/api/admin/init-discovery" \
      -H "Content-Type: application/json" \
      -d '{"force": false}' || echo "⚠️  Discovery initialization failed"
else
    echo "Skipping scenario initialization (set INIT_SCENARIOS=true to enable)"
fi

# Step 9: Health check
echo ""
echo "🏥 Running health check..."
HEALTH_STATUS=$(curl -s "${SERVICE_URL}/api/health" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('status', 'unknown'))" 2>/dev/null || echo "error")

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo "✅ Health check passed!"
else
    echo "⚠️  Health check status: $HEALTH_STATUS"
fi

# Summary
echo ""
echo "✅ Production deployment complete!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo ""
echo "📋 Next steps:"
echo "1. Verify the deployment at: ${SERVICE_URL}"
echo "2. Run smoke tests"
echo "3. Monitor logs: gcloud run logs read --service ${SERVICE_NAME} --region ${REGION}"
echo "4. Set up monitoring and alerts"
echo ""
echo "⚠️  Important:"
echo "- Ensure all secrets are properly configured in Secret Manager"
echo "- Update DNS records if needed"
echo "- Monitor performance and costs"
echo "- Set up backup procedures"