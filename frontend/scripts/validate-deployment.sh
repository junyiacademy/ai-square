#!/bin/bash

# ============================================
# Deployment Validation Script
# ============================================
# Purpose: Validate all required environment variables and configurations
# before deployment to prevent runtime failures
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ENVIRONMENT="${1:-}"
ERRORS=0
WARNINGS=0

echo "🔍 AI Square Deployment Validation"
echo "==================================="
echo ""

# Validate environment parameter
if [ -z "$ENVIRONMENT" ]; then
    echo -e "${RED}❌ Error: Environment not specified${NC}"
    echo "Usage: ./validate-deployment.sh [staging|production]"
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}❌ Error: Invalid environment '$ENVIRONMENT'${NC}"
    exit 1
fi

echo "Environment: $ENVIRONMENT"
echo ""

# ============================================
# 1. Required Environment Variables Check
# ============================================
echo "📋 Checking Required Environment Variables..."
echo "--------------------------------------------"

REQUIRED_VARS=(
    "DB_HOST"
    "DB_NAME" 
    "DB_USER"
    "DB_PASSWORD"
    "PROJECT_ID"
    "REGION"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}  ❌ $var is not set${NC}"
        ERRORS=$((ERRORS + 1))
    else
        # Mask sensitive values
        if [[ "$var" == *"PASSWORD"* ]] || [[ "$var" == *"KEY"* ]]; then
            echo -e "${GREEN}  ✓ $var is set (***hidden***)${NC}"
        else
            echo -e "${GREEN}  ✓ $var = ${!var}${NC}"
        fi
    fi
done

# ============================================
# 2. Optional But Recommended Variables
# ============================================
echo ""
echo "🔧 Checking Optional Environment Variables..."
echo "--------------------------------------------"

OPTIONAL_VARS=(
    "REDIS_URL"
    "GMAIL_USER"
    "GMAIL_APP_PASSWORD"
    "VERTEX_AI_PROJECT"
    "VERTEX_AI_LOCATION"
)

for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${YELLOW}  ⚠️  $var is not set (optional)${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}  ✓ $var is set${NC}"
    fi
done

# ============================================
# 3. File Dependencies Check
# ============================================
echo ""
echo "📁 Checking Required Files..."
echo "--------------------------------------------"

REQUIRED_FILES=(
    "package.json"
    "next.config.ts"
    "tsconfig.json"
    "Dockerfile"
    "src/lib/repositories/postgresql/schema.sql"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}  ✓ $file exists${NC}"
    else
        echo -e "${RED}  ❌ $file not found${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# ============================================
# 4. Service Account Check
# ============================================
echo ""
echo "🔐 Checking Service Account..."
echo "--------------------------------------------"

if [ "$ENVIRONMENT" = "production" ]; then
    SERVICE_ACCOUNT="ai-square-service@${PROJECT_ID}.iam.gserviceaccount.com"
else
    SERVICE_ACCOUNT="ai-square-service@${PROJECT_ID}.iam.gserviceaccount.com"
fi

# Check if service account exists
if gcloud iam service-accounts describe "$SERVICE_ACCOUNT" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${GREEN}  ✓ Service account exists: $SERVICE_ACCOUNT${NC}"
    
    # Check IAM roles
    REQUIRED_ROLES=(
        "roles/cloudsql.client"
        "roles/secretmanager.secretAccessor"
    )
    
    for role in "${REQUIRED_ROLES[@]}"; do
        if gcloud projects get-iam-policy "$PROJECT_ID" --format=json | jq -e ".bindings[] | select(.role==\"$role\") | .members[] | select(. == \"serviceAccount:$SERVICE_ACCOUNT\")" &>/dev/null; then
            echo -e "${GREEN}    ✓ Has role: $role${NC}"
        else
            echo -e "${RED}    ❌ Missing role: $role${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    done
else
    echo -e "${RED}  ❌ Service account not found: $SERVICE_ACCOUNT${NC}"
    ERRORS=$((ERRORS + 1))
fi

# ============================================
# 5. Cloud SQL Instance Check
# ============================================
echo ""
echo "🗄️ Checking Cloud SQL Instance..."
echo "--------------------------------------------"

if [ "$ENVIRONMENT" = "production" ]; then
    CLOUD_SQL_INSTANCE="ai-square-db-production"
else
    CLOUD_SQL_INSTANCE="ai-square-db-staging-asia"
fi

if gcloud sql instances describe "$CLOUD_SQL_INSTANCE" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${GREEN}  ✓ Cloud SQL instance exists: $CLOUD_SQL_INSTANCE${NC}"
    
    # Check if running
    STATUS=$(gcloud sql instances describe "$CLOUD_SQL_INSTANCE" --project="$PROJECT_ID" --format="value(state)")
    if [ "$STATUS" = "RUNNABLE" ]; then
        echo -e "${GREEN}    ✓ Instance is running${NC}"
    else
        echo -e "${RED}    ❌ Instance is not running (status: $STATUS)${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}  ❌ Cloud SQL instance not found: $CLOUD_SQL_INSTANCE${NC}"
    ERRORS=$((ERRORS + 1))
fi

# ============================================
# 6. Build Configuration Check
# ============================================
echo ""
echo "🏗️ Checking Build Configuration..."
echo "--------------------------------------------"

# Check if TypeScript compiles
echo -n "  Checking TypeScript compilation... "
if npx tsc --noEmit &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}❌ TypeScript compilation errors${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check if Next.js can build
echo -n "  Checking Next.js configuration... "
if npx next build --dry-run &>/dev/null || [ "$?" -eq "0" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠️ Cannot verify (dry-run not supported)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# ============================================
# Summary
# ============================================
echo ""
echo "============================================"
echo "📊 Validation Summary"
echo "============================================"
echo -e "Errors:   ${ERRORS}"
echo -e "Warnings: ${WARNINGS}"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Validation FAILED${NC}"
    echo "Please fix the errors above before deploying."
    exit 1
else
    if [ $WARNINGS -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠️ Validation passed with warnings${NC}"
        echo "Consider addressing the warnings for optimal deployment."
    else
        echo ""
        echo -e "${GREEN}✅ All validation checks passed!${NC}"
    fi
    echo "Ready to deploy to $ENVIRONMENT"
    exit 0
fi