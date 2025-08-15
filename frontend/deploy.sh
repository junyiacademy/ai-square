#!/bin/bash

# ============================================
# AI Square Unified Deployment Script
# ============================================
# Usage:
#   ./deploy.sh staging     # Deploy to staging
#   ./deploy.sh production  # Deploy to production
#   ./deploy.sh local      # Test locally
# ============================================

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# CONFIGURATION
# ============================================

# Get environment from command line
ENVIRONMENT="${1:-}"

if [ -z "$ENVIRONMENT" ]; then
    echo -e "${RED}❌ Error: Environment not specified${NC}"
    echo "Usage: ./deploy.sh [staging|production|local]"
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production|local)$ ]]; then
    echo -e "${RED}❌ Error: Invalid environment '$ENVIRONMENT'${NC}"
    echo "Valid environments: staging, production, local"
    exit 1
fi

echo -e "${BLUE}🚀 AI Square Unified Deployment${NC}"
echo -e "${BLUE}   Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo ""

# ============================================
# ENVIRONMENT-SPECIFIC CONFIGURATION
# ============================================

case "$ENVIRONMENT" in
    staging)
        PROJECT_ID="ai-square-463013"
        REGION="asia-east1"
        SERVICE_NAME="ai-square-staging"
        CLOUD_SQL_INSTANCE="ai-square-db-staging-asia"
        # Dynamically get Cloud SQL IP
        CLOUD_SQL_IP=$(gcloud sql instances describe $CLOUD_SQL_INSTANCE --project=$PROJECT_ID --format="value(ipAddresses[0].ipAddress)" 2>/dev/null || echo "35.221.240.46")
        echo "  📍 Cloud SQL IP: $CLOUD_SQL_IP"
        DB_NAME="ai_square_db"
        DB_USER="postgres"
        DB_PASSWORD="${DB_PASSWORD:-postgres}"
        ENV_FILE=".env.staging"
        DOCKERFILE="Dockerfile.staging"
        ;;
    
    production)
        PROJECT_ID="ai-square-463013"
        REGION="asia-east1"
        SERVICE_NAME="ai-square-production"
        CLOUD_SQL_INSTANCE="ai-square-db-production"
        CLOUD_SQL_IP="${PROD_SQL_IP:-35.236.132.52}"  # Update with actual production IP
        DB_NAME="ai_square_db"
        DB_USER="postgres"
        DB_PASSWORD="${DB_PASSWORD:-postgres}"
        ENV_FILE=".env.production"
        DOCKERFILE="Dockerfile.production"
        ;;
    
    local)
        DB_HOST="127.0.0.1"
        DB_PORT="5433"
        DB_NAME="ai_square_db"
        DB_USER="postgres"
        DB_PASSWORD="postgres"
        echo -e "${GREEN}✅ Local configuration loaded${NC}"
        ;;
esac

# ============================================
# SHARED FUNCTIONS
# ============================================

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Run the unified pre-deploy check script
    if [ -f "scripts/pre-deploy-check.sh" ]; then
        bash scripts/pre-deploy-check.sh "$ENVIRONMENT"
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Pre-deployment checks failed${NC}"
            exit 1
        fi
    else
        # Fallback to basic checks
        if ! command -v gcloud &> /dev/null; then
            echo -e "${RED}❌ gcloud CLI not installed${NC}"
            exit 1
        fi
        
        CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
        if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
            echo -e "${YELLOW}⚠️  Switching to project $PROJECT_ID${NC}"
            gcloud config set project $PROJECT_ID
        fi
        
        if ! docker info &> /dev/null; then
            echo -e "${RED}❌ Docker not running${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Initialize Cloud SQL database
init_cloud_sql() {
    echo -e "${BLUE}🗄️  Initializing Cloud SQL...${NC}"
    
    # Get current IP
    MY_IP=$(curl -s https://ipinfo.io/ip)
    echo "  Adding IP $MY_IP to authorized networks..."
    
    # Add IP to authorized networks
    gcloud sql instances patch $CLOUD_SQL_INSTANCE \
        --authorized-networks=$MY_IP \
        --project=$PROJECT_ID \
        --quiet
    
    # Test connection
    echo "  Testing connection..."
    if PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d postgres -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Connection successful${NC}"
    else
        echo -e "${RED}  ✗ Cannot connect to Cloud SQL${NC}"
        exit 1
    fi
    
    # Check if database exists
    if ! PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -l | grep -q "$DB_NAME"; then
        echo "  Creating database $DB_NAME..."
        PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    fi
    
    # Check if schema exists
    TABLES_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'scenarios', 'programs', 'tasks');" 2>/dev/null | xargs || echo "0")
    
    if [ "$TABLES_COUNT" -lt "4" ]; then
        echo "  Initializing schema..."
        PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME < src/lib/repositories/postgresql/schema-v4.sql
    else
        echo -e "${GREEN}  ✓ Schema already exists${NC}"
    fi
    
    # Ensure demo accounts exist (with correct passwords)
    echo "  Ensuring demo accounts..."
    PGPASSWORD=$DB_PASSWORD psql -h $CLOUD_SQL_IP -p 5432 -U $DB_USER -d $DB_NAME <<EOF
-- Demo account passwords: {role}123
INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'student@example.com', '\$2b\$10\$GSLI4.ooV/jrN5RZMOAyf.SftBwwRsbmC.SMRDeDRLH1uCnIapR5e', 'Student User', 'student', NOW(), NOW()),
  (gen_random_uuid(), 'teacher@example.com', '\$2b\$10\$xkTFHLjtA4BvhZrW8Pm6NOV/zJn5SX7gxZB9MSUcaptGrZrMPJJ5e', 'Teacher User', 'teacher', NOW(), NOW()),
  (gen_random_uuid(), 'admin@example.com', '\$2b\$10\$9nEfXi5LULvFjV/LKp8WFuglp9Y5jttH9O4Ix0AwpVg4OZdvtTbiS', 'Admin User', 'admin', NOW(), NOW())
ON CONFLICT (email) DO UPDATE 
  SET password_hash = EXCLUDED.password_hash,
      updated_at = NOW();
EOF
    
    echo -e "${GREEN}✅ Cloud SQL initialization complete${NC}"
}

# Build and deploy to Cloud Run
deploy_cloud_run() {
    echo -e "${BLUE}🚀 Deploying to Cloud Run...${NC}"
    
    # Generate unique tag
    IMAGE_TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
    IMAGE_URL="gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG"
    
    echo "  Building image: $IMAGE_URL"
    
    # Check if Dockerfile exists, if not use default
    if [ ! -f "$DOCKERFILE" ]; then
        echo -e "${YELLOW}  ⚠️  $DOCKERFILE not found, using Dockerfile${NC}"
        DOCKERFILE="Dockerfile"
    fi
    
    # Build with Cloud Build
    echo "  Using Cloud Build..."
    gcloud builds submit \
        --tag $IMAGE_URL \
        --project $PROJECT_ID \
        --timeout=20m \
        . || {
            echo -e "${RED}❌ Build failed${NC}"
            exit 1
        }
    
    # Deploy to Cloud Run
    echo "  Deploying to Cloud Run..."
    gcloud run deploy $SERVICE_NAME \
        --image $IMAGE_URL \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated \
        --set-env-vars="NODE_ENV=production,DB_HOST=/cloudsql/$PROJECT_ID:$REGION:$CLOUD_SQL_INSTANCE,DB_NAME=$DB_NAME,DB_USER=$DB_USER" \
        --add-cloudsql-instances=$PROJECT_ID:$REGION:$CLOUD_SQL_INSTANCE \
        --service-account=ai-square-service@$PROJECT_ID.iam.gserviceaccount.com \
        --memory=512Mi \
        --cpu=1 \
        --timeout=60 \
        --concurrency=100 \
        --project=$PROJECT_ID || {
            echo -e "${RED}❌ Deployment failed${NC}"
            exit 1
        }
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
        --region $REGION \
        --project $PROJECT_ID \
        --format 'value(status.url)')
    
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo -e "${GREEN}🌐 Service URL: $SERVICE_URL${NC}"
}

# Initialize scenarios
init_scenarios() {
    echo -e "${BLUE}📚 Initializing scenarios...${NC}"
    
    # Initialize Assessment
    echo "  Initializing Assessment scenarios..."
    curl -X POST "$SERVICE_URL/api/admin/init-assessment" -s | jq '.'
    
    # Initialize PBL
    echo "  Initializing PBL scenarios..."
    curl -X POST "$SERVICE_URL/api/admin/init-pbl" -s | jq '.'
    
    # Initialize Discovery
    echo "  Initializing Discovery scenarios..."
    curl -X POST "$SERVICE_URL/api/admin/init-discovery" -s | jq '.'
    
    echo -e "${GREEN}✅ Scenarios initialized${NC}"
}

# Run E2E tests
run_e2e_tests() {
    echo -e "${BLUE}🧪 Running E2E tests...${NC}"
    
    # Test health
    echo "  Testing health endpoint..."
    HEALTH=$(curl -s "$SERVICE_URL/api/health" | jq -r '.status')
    if [ "$HEALTH" = "healthy" ]; then
        echo -e "${GREEN}    ✅ Health check passed${NC}"
    else
        echo -e "${RED}    ❌ Health check failed${NC}"
    fi
    
    # Test login for all demo accounts
    for ACCOUNT in "student:student123" "teacher:teacher123" "admin:admin123"; do
        EMAIL=$(echo $ACCOUNT | cut -d: -f1)"@example.com"
        PASS=$(echo $ACCOUNT | cut -d: -f2)
        
        echo "  Testing login for $EMAIL..."
        LOGIN=$(curl -X POST "$SERVICE_URL/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
            -s | jq -r '.success')
        
        if [ "$LOGIN" = "true" ]; then
            echo -e "${GREEN}    ✅ Login successful${NC}"
        else
            echo -e "${RED}    ❌ Login failed${NC}"
        fi
    done
    
    echo -e "${GREEN}✅ E2E tests complete${NC}"
}

# ============================================
# MAIN EXECUTION
# ============================================

main() {
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}   Deploying to $ENVIRONMENT${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo ""
    
    if [ "$ENVIRONMENT" = "local" ]; then
        echo -e "${GREEN}✅ Local environment - no deployment needed${NC}"
        echo "   Run 'npm run dev' to start local server"
        exit 0
    fi
    
    # Run deployment steps
    check_prerequisites
    init_cloud_sql
    deploy_cloud_run
    
    # Wait for service to be ready
    echo "  Waiting for service to be ready..."
    sleep 10
    
    init_scenarios
    run_e2e_tests
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✅ Deployment to $ENVIRONMENT complete!${NC}"
    echo -e "${GREEN}   🌐 URL: $SERVICE_URL${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}"
}

# Run main function
main