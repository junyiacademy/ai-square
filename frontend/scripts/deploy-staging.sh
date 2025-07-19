#!/bin/bash

# AI Square Staging Deployment Script
# 安全部署到 staging 環境，不影響 production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - 與 production 保持一致但隔離
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"ai-square-463013"}
REGION="asia-east1"  # 與 production 相同 region
SERVICE_NAME="ai-square-staging"  # 不同的服務名稱
DB_INSTANCE_NAME="ai-square-db-staging"
IMAGE_NAME="ai-square-staging"  # 不同的映像名稱
GCR_IMAGE="gcr.io/${PROJECT_ID}/${IMAGE_NAME}"
IMAGE_TAG="staging-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}🚀 Starting AI Square Staging Deployment${NC}"
echo -e "${YELLOW}Project: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}Service: ${SERVICE_NAME}${NC}"
echo ""

# Step 1: Validate prerequisites
echo -e "${BLUE}📋 Step 1: Validating prerequisites...${NC}"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}❌ No active gcloud authentication found${NC}"
    echo -e "${YELLOW}Please run: gcloud auth login${NC}"
    exit 1
fi

# Verify project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  Current project: $CURRENT_PROJECT${NC}"
    echo -e "${YELLOW}Setting project to: $PROJECT_ID${NC}"
    gcloud config set project $PROJECT_ID
fi

echo -e "${GREEN}✅ Prerequisites validated${NC}"
echo ""

# Step 2: Create Cloud SQL instance (if not exists)
echo -e "${BLUE}🗄️  Step 2: Setting up Cloud SQL instance...${NC}"

if gcloud sql instances describe $DB_INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✅ Cloud SQL instance $DB_INSTANCE_NAME already exists${NC}"
else
    echo -e "${YELLOW}Creating Cloud SQL instance: $DB_INSTANCE_NAME${NC}"
    gcloud sql instances create $DB_INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --storage-type=SSD \
        --storage-size=20GB \
        --storage-auto-increase \
        --backup-start-time=02:00 \
        --maintenance-release-channel=production \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=03 \
        --deletion-protection \
        --project=$PROJECT_ID
    
    echo -e "${GREEN}✅ Cloud SQL instance created${NC}"
fi

# Create database if not exists
echo -e "${YELLOW}Creating staging database...${NC}"
gcloud sql databases create ai_square_staging \
    --instance=$DB_INSTANCE_NAME \
    --project=$PROJECT_ID 2>/dev/null || echo "Database already exists"

echo ""

# Step 3: Build and push Docker image
echo -e "${BLUE}🐳 Step 3: Building Docker image...${NC}"

# Create Dockerfile for staging if not exists
if [ ! -f "Dockerfile.staging" ]; then
    cat > Dockerfile.staging << 'EOF'
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV ENVIRONMENT=staging

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
EOF
fi

# Build and push image using Cloud Build config (like production)
echo -e "${YELLOW}Building Docker image...${NC}"
gcloud builds submit \
    --config cloudbuild.staging.yaml \
    --substitutions="_IMAGE_TAG=${IMAGE_TAG}" \
    --project=$PROJECT_ID

echo -e "${GREEN}✅ Docker image built and pushed${NC}"
echo ""

# Step 4: Deploy to Cloud Run
echo -e "${BLUE}🌐 Step 4: Deploying to Cloud Run...${NC}"

# Deploy service (similar to production but with staging configs)
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$IMAGE_NAME:$IMAGE_TAG \
    --platform managed \
    --region $REGION \
    --port 3000 \
    --allow-unauthenticated \
    --set-env-vars="USE_POSTGRES=true,ENVIRONMENT=staging,NODE_ENV=production,GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
    --set-env-vars="DB_HOST=/cloudsql/$PROJECT_ID:$REGION:$DB_INSTANCE_NAME" \
    --set-env-vars="DB_NAME=ai_square_staging,DB_USER=postgres" \
    --set-cloudsql-instances $PROJECT_ID:$REGION:$DB_INSTANCE_NAME \
    --memory="1Gi" \
    --cpu="1" \
    --timeout="300" \
    --concurrency="100" \
    --max-instances="5" \
    --project=$PROJECT_ID

echo -e "${GREEN}✅ Cloud Run service deployed${NC}"
echo ""

# Step 5: Get service URL
echo -e "${BLUE}🔗 Step 5: Getting service information...${NC}"

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --format 'value(status.url)' \
    --project=$PROJECT_ID)

echo -e "${GREEN}✅ Staging environment deployed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo -e "${YELLOW}Service URL: ${SERVICE_URL}${NC}"
echo -e "${YELLOW}Cloud SQL: ${DB_INSTANCE_NAME}${NC}"
echo -e "${YELLOW}Image: gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG${NC}"
echo ""

# Step 6: Run database migration
echo -e "${BLUE}🔄 Step 6: Running database migration...${NC}"
echo -e "${YELLOW}You can run migration manually with:${NC}"
echo -e "${YELLOW}npm run migrate:complete${NC}"
echo ""

# Step 7: Health check
echo -e "${BLUE}🏥 Step 7: Running health check...${NC}"
echo -e "${YELLOW}Waiting for service to be ready...${NC}"
sleep 10

if curl -f -s "${SERVICE_URL}/api/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check endpoint not available yet${NC}"
    echo -e "${YELLOW}Service might still be starting up${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Staging deployment completed!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Set up database schema: Connect to Cloud SQL and run migration"
echo -e "2. Test all functionality: ${SERVICE_URL}"
echo -e "3. Monitor logs: gcloud logs tail --project=$PROJECT_ID"
echo -e "4. Access Cloud SQL: gcloud sql connect $DB_INSTANCE_NAME --user=postgres --project=$PROJECT_ID"
echo ""
echo -e "${YELLOW}To update staging:${NC}"
echo -e "bash scripts/deploy-staging.sh"
echo ""
echo -e "${YELLOW}To clean up staging:${NC}"
echo -e "bash scripts/cleanup-staging.sh"