#!/bin/bash
# Staging Pre-deployment Checklist
# =================================

set -e

echo "🔍 AI Square Staging Pre-deployment Checklist"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="ai-square-463013"
REGION="asia-east1"
CLOUD_SQL_INSTANCE="ai-square-db-staging-asia"
CLOUD_SQL_CONNECTION="ai-square-463013:asia-east1:ai-square-db-staging-asia"

# Results tracking
CHECKS_PASSED=0
CHECKS_FAILED=0

check() {
    local description=$1
    local command=$2
    
    echo -n "• $description... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

echo "📋 Environment Checks:"
echo "----------------------"

# 1. GCloud Configuration
check "GCloud CLI installed" "which gcloud"
check "Correct GCP project" "[[ $(gcloud config get-value project) == '$PROJECT_ID' ]]"
check "GCloud authenticated" "gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q ."

echo ""
echo "🗄️  Cloud SQL Checks:"
echo "--------------------"

# 2. Cloud SQL
check "Cloud SQL instance exists" "gcloud sql instances describe $CLOUD_SQL_INSTANCE --format='value(name)'"
check "Cloud SQL is running" "[[ $(gcloud sql instances describe $CLOUD_SQL_INSTANCE --format='value(state)') == 'RUNNABLE' ]]"
check "Cloud SQL in correct region" "[[ $(gcloud sql instances describe $CLOUD_SQL_INSTANCE --format='value(region)') == '$REGION' ]]"

echo ""
echo "🐳 Docker Checks:"
echo "-----------------"

# 3. Docker
check "Docker installed" "which docker"
check "Docker daemon running" "docker info"
check "Docker authenticated to GCR" "docker pull gcr.io/google.com/cloudsdktool/cloud-sdk:alpine > /dev/null 2>&1 && echo 'true'"

echo ""
echo "📁 Application Checks:"
echo "----------------------"

# 4. Application Files
check "Dockerfile.staging exists" "[[ -f Dockerfile.staging ]]"
check "package.json exists" "[[ -f package.json ]]"
check "Database schema exists" "[[ -f src/lib/repositories/postgresql/schema-v3.sql ]]"
check ".env.staging exists" "[[ -f .env.staging ]]"
check "Deploy script exists" "[[ -f deploy-staging.sh ]]"
check "Deploy script executable" "[[ -x deploy-staging.sh ]]"

echo ""
echo "🔧 Build Checks:"
echo "----------------"

# 5. Build Requirements
check "Node modules installed" "[[ -d node_modules ]]"
check "TypeScript compiles" "npx tsc --noEmit"
check "Next.js build config valid" "npm run build --dry-run > /dev/null 2>&1"

echo ""
echo "☁️  Cloud Run Checks:"
echo "--------------------"

# 6. Cloud Run
check "Cloud Run API enabled" "gcloud services list --enabled --filter='name:run.googleapis.com' --format='value(name)' | grep -q run"
check "Cloud SQL Admin API enabled" "gcloud services list --enabled --filter='name:sqladmin.googleapis.com' --format='value(name)' | grep -q sqladmin"
check "Container Registry API enabled" "gcloud services list --enabled --filter='name:containerregistry.googleapis.com' --format='value(name)' | grep -q containerregistry"

echo ""
echo "🔐 IAM Checks:"
echo "--------------"

# 7. IAM Permissions
CURRENT_USER=$(gcloud config get-value account)
check "User has Cloud Run permissions" "gcloud projects get-iam-policy $PROJECT_ID --flatten='bindings[].members' --filter=\"bindings.members:$CURRENT_USER\" --format='value(bindings.role)' | grep -qE '(run.admin|run.developer|editor|owner)'"
check "User has Cloud SQL permissions" "gcloud projects get-iam-policy $PROJECT_ID --flatten='bindings[].members' --filter=\"bindings.members:$CURRENT_USER\" --format='value(bindings.role)' | grep -qE '(cloudsql.client|cloudsql.admin|editor|owner)'"

echo ""
echo "📊 Summary:"
echo "-----------"
echo -e "Checks passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Checks failed: ${RED}$CHECKS_FAILED${NC}"

if [ $CHECKS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All checks passed! Ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review .env.staging for correct values"
    echo "2. Run: ./deploy-staging.sh"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  Some checks failed. Please fix the issues above before deploying.${NC}"
    echo ""
    echo "Common fixes:"
    echo "• GCloud auth: gcloud auth login"
    echo "• Set project: gcloud config set project $PROJECT_ID"
    echo "• Enable APIs: gcloud services enable run.googleapis.com sqladmin.googleapis.com"
    echo "• Install deps: npm install"
    echo "• Fix TypeScript: npm run typecheck"
    exit 1
fi