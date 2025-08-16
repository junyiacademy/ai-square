#!/bin/bash

# ============================================
# Terraform Security Check Script
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔒 Terraform Security Check"
echo "==========================="
echo ""

ISSUES=0
WARNINGS=0

# Check 1: Ensure no hardcoded passwords
echo "Checking for hardcoded passwords..."
if grep -r "password\s*=\s*\"" *.tf 2>/dev/null | grep -v "var.db_password" | grep -v "password\s*=\s*var"; then
    echo -e "${RED}❌ Found hardcoded passwords!${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ No hardcoded passwords found${NC}"
fi

# Check 2: Ensure sensitive variables are marked
echo ""
echo "Checking sensitive variable markings..."
if ! grep -q "sensitive\s*=\s*true" main.tf; then
    echo -e "${RED}❌ No sensitive variables marked!${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ Sensitive variables properly marked${NC}"
fi

# Check 3: Check for public access in production
echo ""
echo "Checking production access controls..."
if grep -q "0.0.0.0/0" environments/production.tfvars 2>/dev/null; then
    echo -e "${RED}❌ Production allows public access (0.0.0.0/0)!${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ Production access properly restricted${NC}"
fi

# Check 4: Ensure state bucket is encrypted
echo ""
echo "Checking state bucket encryption..."
BUCKET_ENCRYPTION=$(gsutil encryption get gs://ai-square-terraform-state 2>/dev/null || echo "not-found")
if [[ "$BUCKET_ENCRYPTION" == *"not-found"* ]]; then
    echo -e "${YELLOW}⚠️  Could not verify state bucket encryption${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ State bucket encryption verified${NC}"
fi

# Check 5: Ensure deletion protection for production
echo ""
echo "Checking deletion protection..."
if grep -q "enable_deletion_protection = true" environments/production.tfvars; then
    echo -e "${GREEN}✅ Deletion protection enabled for production${NC}"
else
    echo -e "${YELLOW}⚠️  Deletion protection not explicitly set for production${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 6: SSL enforcement
echo ""
echo "Checking SSL enforcement..."
if grep -q "require_ssl.*true" main.tf; then
    echo -e "${GREEN}✅ SSL enforcement configured${NC}"
else
    echo -e "${YELLOW}⚠️  SSL not enforced for database connections${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 7: Audit logging
echo ""
echo "Checking audit logging..."
if grep -q "log_connections" main.tf && grep -q "log_disconnections" main.tf; then
    echo -e "${GREEN}✅ Audit logging enabled${NC}"
else
    echo -e "${YELLOW}⚠️  Audit logging not fully configured${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 8: Check for .tfvars files with secrets
echo ""
echo "Checking for secrets in .tfvars files..."
if ls *.tfvars 2>/dev/null | xargs grep -l "password\|secret\|key" 2>/dev/null; then
    echo -e "${RED}❌ Found potential secrets in .tfvars files!${NC}"
    echo "    Never commit .tfvars files with secrets to Git!"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ No secrets found in .tfvars files${NC}"
fi

# Summary
echo ""
echo "=================================="
echo "Security Check Summary"
echo "=================================="
echo -e "Critical Issues: ${ISSUES}"
echo -e "Warnings: ${WARNINGS}"

if [ $ISSUES -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ FAILED: Critical security issues found!${NC}"
    echo "Please fix the issues above before proceeding."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  PASSED with warnings${NC}"
    echo "Consider addressing the warnings for better security."
    exit 0
else
    echo ""
    echo -e "${GREEN}✅ PASSED: All security checks passed!${NC}"
    exit 0
fi