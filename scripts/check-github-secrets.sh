#!/bin/bash

# ============================================
# GitHub Secrets Diagnostic Script
# ============================================
# Checks all required secrets and validates their format
# ============================================

set -e

echo "🔍 GitHub Secrets Diagnostic Check"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a secret exists and has valid format
check_secret() {
    local SECRET_NAME=$1
    local REQUIRED=$2
    local EXPECTED_FORMAT=$3

    # Check if secret exists
    if gh secret list --repo junyiacademy/ai-square | grep -q "^${SECRET_NAME}"; then
        echo -e "${GREEN}✅ ${SECRET_NAME}${NC} - Set"

        # For DB_HOST, check if it might contain problematic characters
        if [[ "$SECRET_NAME" == *"DB_HOST"* ]]; then
            echo "   ⚠️  Warning: Make sure this doesn't contain 'PRIVATE:' or other shell metacharacters"
            echo "   Expected format: /cloudsql/PROJECT:REGION:INSTANCE"
        fi
    else
        if [[ "$REQUIRED" == "true" ]]; then
            echo -e "${RED}❌ ${SECRET_NAME}${NC} - MISSING (REQUIRED)"
        else
            echo -e "${YELLOW}⚠️  ${SECRET_NAME}${NC} - Not set (optional)"
        fi

        if [[ -n "$EXPECTED_FORMAT" ]]; then
            echo "   Expected: $EXPECTED_FORMAT"
        fi
    fi
}

echo "📋 Required Secrets for CI/CD:"
echo "-----------------------------------"

# Critical secrets (deployment will fail without these)
check_secret "GCP_SA_KEY" "true" "Service Account JSON key"
check_secret "STAGING_DB_PASSWORD" "true" "Database password for staging"
check_secret "PROD_DB_PASSWORD" "true" "Database password for production"
check_secret "NEXTAUTH_SECRET" "true" "NextAuth session secret"

echo ""
echo "📋 Optional Secrets (will use defaults if not set):"
echo "-----------------------------------"

# Optional secrets (have defaults in CI/CD)
check_secret "STAGING_DB_USER" "false" "postgres (default)"
check_secret "STAGING_DB_NAME" "false" "ai_square_db (default)"
check_secret "STAGING_DB_HOST" "false" "/cloudsql/ai-square-463013:asia-east1:ai-square-db-staging-asia"
check_secret "PROD_DB_USER" "false" "postgres (default)"
check_secret "PROD_DB_NAME" "false" "ai_square_db (default)"
check_secret "PROD_DB_HOST" "false" "/cloudsql/ai-square-463013:asia-east1:ai-square-db-production"
check_secret "VERTEX_AI_KEY" "false" "Vertex AI API key"

echo ""
echo "📋 Additional Secrets:"
echo "-----------------------------------"

# Other secrets
check_secret "STAGING_DATABASE_URL" "false" "Full PostgreSQL connection string"
check_secret "PROD_DATABASE_URL" "false" "Full PostgreSQL connection string"
check_secret "ADMIN_API_KEY" "false" "Admin API key"
check_secret "SLACK_WEBHOOK" "false" "Slack webhook URL"

echo ""
echo "============================================"
echo "🔧 Recommended Actions:"
echo ""

# Check for potential issues
MISSING_REQUIRED=false

if ! gh secret list --repo junyiacademy/ai-square | grep -q "^GCP_SA_KEY"; then
    echo "1. Set GCP_SA_KEY:"
    echo "   gh secret set GCP_SA_KEY --repo junyiacademy/ai-square < path/to/service-account-key.json"
    MISSING_REQUIRED=true
fi

if ! gh secret list --repo junyiacademy/ai-square | grep -q "^STAGING_DB_PASSWORD"; then
    echo "2. Set STAGING_DB_PASSWORD:"
    echo "   gh secret set STAGING_DB_PASSWORD --repo junyiacademy/ai-square"
    MISSING_REQUIRED=true
fi

if ! gh secret list --repo junyiacademy/ai-square | grep -q "^PROD_DB_PASSWORD"; then
    echo "3. Set PROD_DB_PASSWORD:"
    echo "   gh secret set PROD_DB_PASSWORD --repo junyiacademy/ai-square"
    MISSING_REQUIRED=true
fi

if ! gh secret list --repo junyiacademy/ai-square | grep -q "^NEXTAUTH_SECRET"; then
    echo "4. Set NEXTAUTH_SECRET:"
    echo "   gh secret set NEXTAUTH_SECRET --repo junyiacademy/ai-square"
    MISSING_REQUIRED=true
fi

if [ "$MISSING_REQUIRED" = false ]; then
    echo -e "${GREEN}✅ All required secrets are configured!${NC}"
else
    echo ""
    echo -e "${RED}⚠️  Some required secrets are missing. CI/CD will fail without them.${NC}"
fi

echo ""
echo "💡 Tips:"
echo "- DB_HOST values should NOT contain 'PRIVATE:' or shell metacharacters"
echo "- Use the format: /cloudsql/PROJECT_ID:REGION:INSTANCE_NAME"
echo "- Example: /cloudsql/ai-square-463013:asia-east1:ai-square-db-staging-asia"
echo ""
echo "To update a secret with potential special characters:"
echo 'echo "/cloudsql/ai-square-463013:asia-east1:ai-square-db-staging-asia" | gh secret set STAGING_DB_HOST --repo junyiacademy/ai-square'
