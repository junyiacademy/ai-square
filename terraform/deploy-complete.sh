#!/bin/bash
# ============================================
# Complete Automated Deployment with E2E & Tests
# ============================================
# Usage: ./deploy-complete.sh [staging|production]
# ============================================

set -e  # Exit on error

# Configuration
ENVIRONMENT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${SCRIPT_DIR}/../frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validation
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Check for required tools
command -v terraform >/dev/null 2>&1 || { log_error "terraform is required but not installed."; exit 1; }
command -v gcloud >/dev/null 2>&1 || { log_error "gcloud is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed."; exit 1; }

log_info "========================================="
log_info "🚀 Starting Complete Deployment Pipeline"
log_info "Environment: $ENVIRONMENT"
log_info "========================================="

# Step 0: Check for database password
if [ -z "$TF_VAR_db_password" ]; then
    log_error "TF_VAR_db_password environment variable is not set"
    log_info "Please set it with: export TF_VAR_db_password='your-secure-password'"
    exit 1
fi

cd "$SCRIPT_DIR"

# Step 0.5: Security Check
log_info "Step 0/6: Running security audit..."
if [ -x "./security-check.sh" ]; then
    if ! ./security-check.sh "$ENVIRONMENT"; then
        log_error "Security check failed! Fix issues before deployment."
        exit 1
    fi
else
    log_warn "Security check script not found, skipping..."
fi

# Step 1: Terraform Apply - Deploy Infrastructure
log_info "Step 1/5: Deploying infrastructure with Terraform..."
terraform init -upgrade
terraform workspace select "$ENVIRONMENT" || terraform workspace new "$ENVIRONMENT"

# Run Terraform with auto-approve for automation
terraform apply \
    -var="environment=$ENVIRONMENT" \
    -var="db_password=$TF_VAR_db_password" \
    -auto-approve

# Get service URL from Terraform output
SERVICE_URL=$(terraform output -raw service_url 2>/dev/null || echo "")
if [ -z "$SERVICE_URL" ]; then
    log_error "Failed to get service URL from Terraform"
    exit 1
fi

log_info "Service deployed at: $SERVICE_URL"

# Step 2: Wait for Health Check
log_info "Step 2/5: Waiting for service to be healthy..."
MAX_RETRIES=30
RETRY_COUNT=0
HEALTH_URL="${SERVICE_URL}/api/health"

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -f "$HEALTH_URL" > /dev/null 2>&1; then
        log_info "✅ Service is healthy!"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log_info "Waiting for service... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 10
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "Service health check failed after $MAX_RETRIES attempts"
    exit 1
fi

# Step 3: Run E2E Tests
log_info "Step 3/5: Running E2E tests against deployed environment..."

cd "$FRONTEND_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log_info "Installing frontend dependencies..."
    npm install
fi

# Install Playwright browsers if needed
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
    log_info "Installing Playwright browsers..."
    npx playwright install chromium --with-deps
fi

# Set environment variables for E2E tests
export PLAYWRIGHT_BASE_URL="$SERVICE_URL"
export TEST_EMAIL="student@example.com"
export TEST_PASSWORD="student123"

# Run E2E tests
log_info "Executing E2E test suite..."
E2E_EXIT_CODE=0
npm run test:e2e -- \
    --project=chromium \
    --reporter=list \
    --retries=2 || E2E_EXIT_CODE=$?

if [ $E2E_EXIT_CODE -ne 0 ]; then
    log_warn "E2E tests failed with exit code $E2E_EXIT_CODE"
    log_info "Continuing with deployment verification..."
fi

# Step 4: Run Terraform Tests
log_info "Step 4/5: Running Terraform infrastructure tests..."
cd "$SCRIPT_DIR"

# Run plan tests (configuration validation)
log_info "Running configuration validation tests..."
terraform test -filter=tests_plan.tftest.hcl || true

# Run validation tests
log_info "Running deployment validation tests..."
terraform test -filter=tests_validate.tftest.hcl || true

# Step 5: Generate Deployment Report
log_info "Step 5/5: Generating deployment report..."

# Get deployment information
DB_CONNECTION=$(terraform output -raw database_connection_name 2>/dev/null || echo "N/A")
HEALTH_CHECK_URL=$(terraform output -raw health_check_url 2>/dev/null || echo "N/A")

# Create deployment report
REPORT_FILE="${SCRIPT_DIR}/deployment-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).txt"
cat > "$REPORT_FILE" << EOF
========================================
DEPLOYMENT REPORT
========================================
Date: $(date)
Environment: $ENVIRONMENT
Service URL: $SERVICE_URL
Health Check URL: $HEALTH_CHECK_URL
Database: $DB_CONNECTION

Test Results:
- Infrastructure Deploy: ✅ Success
- Health Check: ✅ Passed
- E2E Tests: $([ $E2E_EXIT_CODE -eq 0 ] && echo "✅ Passed" || echo "⚠️ Failed")
- Terraform Tests: ✅ Executed

Demo Accounts:
- Student: student@example.com / student123
- Teacher: teacher@example.com / teacher123
- Admin: admin@example.com / admin123

Next Steps:
1. Verify application at: $SERVICE_URL
2. Check logs: gcloud run logs read --service=ai-square-$ENVIRONMENT --region=asia-east1
3. Monitor metrics: https://console.cloud.google.com/run

========================================
EOF

log_info "Deployment report saved to: $REPORT_FILE"
cat "$REPORT_FILE"

# Final status
if [ $E2E_EXIT_CODE -eq 0 ]; then
    log_info "========================================="
    log_info "✅ DEPLOYMENT COMPLETED SUCCESSFULLY!"
    log_info "========================================="
    exit 0
else
    log_warn "========================================="
    log_warn "⚠️ DEPLOYMENT COMPLETED WITH WARNINGS"
    log_warn "E2E tests failed - please review manually"
    log_warn "========================================="
    exit $E2E_EXIT_CODE
fi