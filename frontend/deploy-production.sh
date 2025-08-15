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
# Note: You need to create a production Cloud SQL instance first
# For now, this uses the staging instance (NOT recommended for production)
CLOUD_SQL_INSTANCE="ai-square-463013:asia-east1:ai-square-db-staging-asia"
# TODO: Replace with production instance: ai-square-463013:asia-east1:ai-square-db-production

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

# Step 2: Build Docker image
echo ""
echo "🔨 Building Docker image..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -f ${DOCKERFILE} .

# Step 3: Tag for GCR
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${GCR_IMAGE}

# Step 4: Push to GCR
echo ""
echo "📤 Pushing image to GCR..."
docker push ${GCR_IMAGE}

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
  --set-secrets NEXTAUTH_SECRET="nextauth-secret-production:latest" \
  --set-secrets JWT_SECRET="jwt-secret-production:latest" \
  --set-secrets DB_PASSWORD="db-password-production:latest" \
  --set-secrets CLAUDE_API_KEY="claude-api-key-production:latest" \
  --set-secrets GOOGLE_APPLICATION_CREDENTIALS="google-credentials-production:latest" \
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