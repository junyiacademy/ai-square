#!/bin/bash

# Security check script for Terraform deployments
# This script performs basic security validations before allowing deployments

set -e

echo "🔒 Running security checks..."

# Check 1: Ensure no sensitive files are exposed
echo "✓ Checking for exposed sensitive files..."
if [ -f ".env" ] || [ -f "*.key" ] || [ -f "*.pem" ]; then
    echo "❌ Error: Sensitive files detected in repository"
    exit 1
fi

# Check 2: Validate Terraform files
echo "✓ Validating Terraform configuration..."
terraform init -backend=false
terraform validate

# Check 3: Check for hardcoded secrets in Terraform files
echo "✓ Scanning for hardcoded secrets..."
if grep -r "password\s*=\s*\"" *.tf 2>/dev/null | grep -v "var\." | grep -v "random_password"; then
    echo "❌ Error: Hardcoded passwords found in Terraform files"
    exit 1
fi

# Check 4: Ensure required environment variables are not hardcoded
echo "✓ Checking for hardcoded API keys..."
if grep -r "api_key\s*=\s*\"[^$]" *.tf 2>/dev/null | grep -v "var\."; then
    echo "❌ Error: Hardcoded API keys found"
    exit 1
fi

echo "✅ All security checks passed!"
exit 0