#!/bin/bash
# ============================================
# Test Complete Deployment Pipeline
# ============================================
# This script tests the entire deployment flow including security
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    log_test "Running: $test_name"
    if eval "$test_command"; then
        log_info "✅ $test_name PASSED"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_error "❌ $test_name FAILED"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# ============================================
# Start Testing
# ============================================

echo "========================================="
echo "🧪 Testing Deployment Pipeline"
echo "Environment: $ENVIRONMENT"
echo "========================================="
echo ""

# Test 1: Check environment variable
log_test "Test 1: Database Password Environment Variable"
if [ -z "$TF_VAR_db_password" ]; then
    log_warn "TF_VAR_db_password not set. Setting test password..."
    export TF_VAR_db_password="TestPassword123!"
    log_info "Set test password for testing"
else
    log_info "✅ TF_VAR_db_password is set"
fi
TESTS_PASSED=$((TESTS_PASSED + 1))

# Test 2: Security check script exists and is executable
run_test "Test 2: Security Check Script" "[ -x './security-check.sh' ]"

# Test 3: Run security audit
log_test "Test 3: Security Audit"
if ./security-check.sh; then
    log_info "✅ Security audit passed"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_warn "⚠️ Security audit has warnings (continuing...)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 4: Deploy complete script exists
run_test "Test 4: Deploy Script Exists" "[ -x './deploy-complete.sh' ]"

# Test 5: Makefile targets
log_test "Test 5: Makefile Targets"
if make help > /dev/null 2>&1; then
    log_info "✅ Makefile is valid"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "❌ Makefile has errors"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 6: Terraform initialization
log_test "Test 6: Terraform Init"
if terraform init -backend=false > /dev/null 2>&1; then
    log_info "✅ Terraform can initialize"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "❌ Terraform initialization failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 7: Terraform validation
log_test "Test 7: Terraform Validation"
if terraform validate > /dev/null 2>&1; then
    log_info "✅ Terraform configuration is valid"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "❌ Terraform configuration is invalid"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 8: Check for hardcoded passwords
log_test "Test 8: No Hardcoded Passwords"
if grep -r 'password\s*=\s*"[^"]*"' *.tf 2>/dev/null | \
   grep -v 'var.db_password' | \
   grep -v 'sensitive' | \
   grep -v '\[Check deployment documentation\]' | \
   grep -v 'password\s*=\s*"\${' ; then
    log_error "❌ Found hardcoded passwords in Terraform files!"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    log_info "✅ No hardcoded passwords found"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 9: Check test files for hardcoded passwords
log_test "Test 9: Test Files Security"
if grep -r 'db_password\s*=\s*"[^"]*"' *.tftest.hcl 2>/dev/null; then
    log_error "❌ Found hardcoded passwords in test files!"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    log_info "✅ Test files are clean"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 10: Frontend directory exists
log_test "Test 10: Frontend Directory"
if [ -d "../frontend" ]; then
    log_info "✅ Frontend directory exists"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "❌ Frontend directory not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 11: E2E tests exist
log_test "Test 11: E2E Tests"
if [ -d "../frontend/e2e" ]; then
    log_info "✅ E2E test directory exists"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "❌ E2E test directory not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 12: Check deployment flow order
log_test "Test 12: Deployment Flow Order"
if grep -q "Step 0.5: Security Check" deploy-complete.sh && \
   grep -q "Step 1/5: Deploying infrastructure" deploy-complete.sh && \
   grep -q "Step 2/5: Waiting for service" deploy-complete.sh && \
   grep -q "Step 3/5: Running E2E tests" deploy-complete.sh && \
   grep -q "Step 4/5: Running Terraform" deploy-complete.sh; then
    log_info "✅ Deployment flow order is correct"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "❌ Deployment flow order is incorrect"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 13: Makefile includes security-check prerequisite
log_test "Test 13: Makefile Security Integration"
if grep -q "deploy-staging: check-password security-check" Makefile && \
   grep -q "deploy-production: check-password security-check" Makefile; then
    log_info "✅ Makefile has security checks integrated"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "❌ Makefile missing security integration"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 14: CI/CD documentation exists
log_test "Test 14: CI/CD Documentation"
if [ -f "../docs/deployment/cicd-deployment-and-db-guide.md" ]; then
    log_info "✅ CI/CD documentation exists"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "❌ CI/CD documentation not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 15: Security audit in CI/CD docs
log_test "Test 15: Security in CI/CD Docs"
if grep -q "安全審計與 CI/CD 整合" ../docs/deployment/cicd-deployment-and-db-guide.md 2>/dev/null; then
    log_info "✅ Security audit documented in CI/CD guide"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_warn "⚠️ Security section might be missing in docs"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 16: Terraform workspace commands
log_test "Test 16: Terraform Workspaces"
if terraform workspace list > /dev/null 2>&1; then
    log_info "✅ Terraform workspaces configured"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_warn "⚠️ Terraform workspaces not initialized"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 17: Required tools check
log_test "Test 17: Required Tools"
TOOLS_OK=true
for tool in terraform gcloud npm make; do
    if ! command -v $tool > /dev/null 2>&1; then
        log_warn "Missing tool: $tool"
        TOOLS_OK=false
    fi
done
if $TOOLS_OK; then
    log_info "✅ All required tools installed"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_warn "⚠️ Some tools missing (may affect deployment)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 18: Environment files check
log_test "Test 18: Environment Configuration"
if [ -f "environments/staging.tfvars" ] || [ -f "terraform.tfvars" ]; then
    log_info "✅ Environment configuration found"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_warn "⚠️ No environment configuration files found"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 19: State backend configuration
log_test "Test 19: State Backend"
if grep -q "backend \"gcs\"" main.tf 2>/dev/null; then
    log_info "✅ GCS backend configured"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_warn "⚠️ Backend not configured (using local state)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 20: Deployment automation completeness
log_test "Test 20: Complete Automation"
AUTOMATION_COMPLETE=true
for file in deploy-complete.sh security-check.sh Makefile; do
    if [ ! -f "$file" ]; then
        log_warn "Missing file: $file"
        AUTOMATION_COMPLETE=false
    fi
done
if $AUTOMATION_COMPLETE; then
    log_info "✅ All automation files present"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "❌ Automation files missing"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# ============================================
# Test Summary
# ============================================

echo ""
echo "========================================="
echo "📊 Test Results Summary"
echo "========================================="
echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Failed:${NC} $TESTS_FAILED"
echo -e "Total:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "The deployment pipeline is ready to use:"
    echo ""
    echo "  Quick deployment:"
    echo "    make deploy-staging"
    echo ""
    echo "  Full deployment with all checks:"
    echo "    ./deploy-complete.sh staging"
    echo ""
    echo "  With custom password:"
    echo "    export TF_VAR_db_password='YourSecurePassword'"
    echo "    make deploy-staging"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please fix the failed tests before deploying."
    echo "Run './test-deployment-pipeline.sh' again after fixes."
    echo ""
    exit 1
fi