#!/bin/bash
# ============================================
# AI Square Pre-deployment Checklist (Unified)
# ============================================
# Usage:
#   ./pre-deploy-check.sh staging
#   ./pre-deploy-check.sh production
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get environment
ENVIRONMENT="${1:-staging}"

if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}❌ Error: Invalid environment '$ENVIRONMENT'${NC}"
    echo "Valid environments: staging, production"
    exit 1
fi

echo -e "${BLUE}🔍 AI Square Pre-deployment Checklist - $ENVIRONMENT${NC}"
echo "=============================================="
echo ""

# Load configuration
case "$ENVIRONMENT" in
    staging)
        PROJECT_ID="ai-square-463013"
        CLOUD_SQL_INSTANCE="ai-square-db-staging-asia"
        SERVICE_NAME="ai-square-staging"
        REGION="asia-east1"
        ENV_FILE=".env.staging"
        ;;
    production)
        PROJECT_ID="ai-square-463013"
        CLOUD_SQL_INSTANCE="ai-square-db-production"
        SERVICE_NAME="ai-square-production"
        REGION="asia-east1"
        ENV_FILE=".env.production"
        ;;
esac

PASS_COUNT=0
FAIL_COUNT=0

# Function to check and report
check() {
    local description="$1"
    local command="$2"
    
    echo -n "• $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    else
        echo -e "${RED}✗${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
}

echo "📋 Environment Checks:"
echo "----------------------"
check "GCloud CLI installed" "command -v gcloud"
check "Correct GCP project" "[ \"$(gcloud config get-value project 2>/dev/null)\" = \"$PROJECT_ID\" ]"
check "GCloud authenticated" "gcloud auth list --filter=status:ACTIVE --format=\"value(account)\" | grep -q ."

echo ""
echo "🗄️  Cloud SQL Checks:"
echo "--------------------"
check "Cloud SQL instance exists" "gcloud sql instances describe $CLOUD_SQL_INSTANCE --project=$PROJECT_ID"
check "Cloud SQL is running" "[ \"$(gcloud sql instances describe $CLOUD_SQL_INSTANCE --project=$PROJECT_ID --format='value(state)')\" = \"RUNNABLE\" ]"
check "Cloud SQL in correct region" "gcloud sql instances describe $CLOUD_SQL_INSTANCE --project=$PROJECT_ID --format='value(region)' | grep -q $REGION"

echo ""
echo "🐳 Docker Checks:"
echo "-----------------"
check "Docker installed" "command -v docker"
check "Docker daemon running" "docker info"
check "Docker authenticated to GCR" "docker-credential-gcloud list | grep -q gcr.io"

echo ""
echo "📁 Application Checks:"
echo "----------------------"
check "Dockerfile exists" "[ -f Dockerfile ]"
check "package.json exists" "[ -f package.json ]"
check "Database schema exists" "[ -f src/lib/repositories/postgresql/schema-v4.sql ]"
check "Deploy script exists" "[ -f deploy.sh ]"
check "Deploy script executable" "[ -x deploy.sh ]"
check "Config file exists" "[ -f deploy.config.json ]"

if [ "$ENVIRONMENT" != "production" ] || [ -f "$ENV_FILE" ]; then
    check "$ENV_FILE exists" "[ -f $ENV_FILE ]"
fi

echo ""
echo "🔧 Build Checks:"
echo "----------------"
check "Node modules installed" "[ -d node_modules ]"
check "TypeScript compiles" "npx tsc --noEmit"
check "Next.js build config valid" "[ -f next.config.ts ]"

echo ""
echo "☁️  Cloud Run Checks:"
echo "--------------------"
check "Cloud Run API enabled" "gcloud services list --enabled --project=$PROJECT_ID | grep -q run.googleapis.com"
check "Cloud SQL Admin API enabled" "gcloud services list --enabled --project=$PROJECT_ID | grep -q sqladmin.googleapis.com"
check "Container Registry API enabled" "gcloud services list --enabled --project=$PROJECT_ID | grep -q containerregistry.googleapis.com"

echo ""
echo "🔐 IAM Checks:"
echo "--------------"
check "User has Cloud Run permissions" "gcloud projects get-iam-policy $PROJECT_ID --flatten=\"bindings[].members\" --format=\"table(bindings.role)\" --filter=\"bindings.members:$(gcloud config get-value account 2>/dev/null)\" | grep -E -q '(roles/run|roles/owner|roles/editor)'"
check "User has Cloud SQL permissions" "gcloud projects get-iam-policy $PROJECT_ID --flatten=\"bindings[].members\" --format=\"table(bindings.role)\" --filter=\"bindings.members:$(gcloud config get-value account 2>/dev/null)\" | grep -E -q '(roles/cloudsql|roles/owner|roles/editor)'"

echo ""
echo "📊 Summary:"
echo "-----------"
echo -e "Checks passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Checks failed: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready for deployment to $ENVIRONMENT.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: ./deploy.sh $ENVIRONMENT"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please fix the issues above before deploying.${NC}"
    exit 1
fi