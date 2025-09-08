#!/bin/bash

# ============================================
# GitHub Secrets Setup Script for AI Square
# ============================================

set -e

echo "🔧 AI Square - GitHub Secrets Setup"
echo "===================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it first: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub."
    echo "Please run: gh auth login"
    exit 1
fi

# Configuration
PROJECT_ID="ai-square-463013"
SERVICE_ACCOUNT_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="github-actions-key.json"

echo "📋 This script will help you set up the following GitHub secrets:"
echo "  - GCP_SA_KEY: Service account key for GitHub Actions"
echo "  - STAGING_DB_PASSWORD: Database password for staging"
echo "  - SLACK_WEBHOOK_URL: (Optional) Slack notification webhook"
echo ""

# Step 1: Create GitHub Actions service account
echo "Step 1: Creating GitHub Actions service account..."
echo "================================================="

# Check if service account exists
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &> /dev/null; then
    echo "✅ Service account already exists"
else
    echo "Creating service account..."
    gcloud iam service-accounts create github-actions \
        --display-name="GitHub Actions CI/CD" \
        --description="Service account for GitHub Actions CI/CD pipeline" \
        --project=$PROJECT_ID
fi

# Step 2: Grant necessary permissions
echo ""
echo "Step 2: Granting IAM permissions..."
echo "===================================="

# Function to add role
add_role() {
    local role=$1
    local description=$2
    echo "  Adding $description..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$role" \
        --condition=None &> /dev/null || echo "    (Already has $role)"
}

# Essential roles for CI/CD
add_role "roles/run.admin" "Cloud Run Admin"
add_role "roles/storage.admin" "Storage Admin"
add_role "roles/cloudsql.client" "Cloud SQL Client"
add_role "roles/iam.serviceAccountUser" "Service Account User"
add_role "roles/artifactregistry.writer" "Artifact Registry Writer"
add_role "roles/container.developer" "Container Registry Developer"

echo "✅ Permissions granted"

# Step 3: Create and download service account key
echo ""
echo "Step 3: Creating service account key..."
echo "======================================="

# Remove old key if exists
if [ -f "$KEY_FILE" ]; then
    rm $KEY_FILE
fi

gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SERVICE_ACCOUNT_EMAIL \
    --project=$PROJECT_ID

echo "✅ Key created: $KEY_FILE"

# Step 4: Set GitHub secrets
echo ""
echo "Step 4: Setting GitHub Secrets..."
echo "================================="

# Get repository name
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "Repository: $REPO"

# Set GCP_SA_KEY
echo "Setting GCP_SA_KEY..."
gh secret set GCP_SA_KEY < $KEY_FILE
echo "✅ GCP_SA_KEY set"

# Set STAGING_DB_PASSWORD
echo ""
echo "Enter your staging database password:"
read -s DB_PASSWORD
echo ""
echo "$DB_PASSWORD" | gh secret set STAGING_DB_PASSWORD
echo "✅ STAGING_DB_PASSWORD set"

# Optional: Set SLACK_WEBHOOK_URL
echo ""
echo "Do you want to set up Slack notifications? (y/n)"
read -r SETUP_SLACK

if [[ "$SETUP_SLACK" == "y" || "$SETUP_SLACK" == "Y" ]]; then
    echo "Enter your Slack webhook URL:"
    read -s SLACK_URL
    echo ""
    echo "$SLACK_URL" | gh secret set SLACK_WEBHOOK_URL
    echo "✅ SLACK_WEBHOOK_URL set"
fi

# Step 5: Clean up
echo ""
echo "Step 5: Cleaning up..."
echo "====================="

# Secure the key file
chmod 600 $KEY_FILE

echo "⚠️  IMPORTANT: The service account key has been saved to $KEY_FILE"
echo "   Keep this file secure and do not commit it to git!"
echo "   Consider deleting it after setup: rm $KEY_FILE"

# Step 6: Verify setup
echo ""
echo "Step 6: Verifying setup..."
echo "========================="

echo "GitHub Secrets configured:"
gh secret list

echo ""
echo "✅ Setup complete!"
echo ""
echo "=========================================="
echo "🎉 GitHub Actions CI/CD is ready!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Push to main branch to trigger deployment"
echo "2. Check Actions tab in GitHub for progress"
echo "3. Monitor Cloud Run logs for any issues"
echo ""
echo "Useful commands:"
echo "  View workflow runs:  gh run list"
echo "  View latest run:     gh run view"
echo "  View Cloud Run logs: gcloud run services logs read ai-square-staging --region=asia-east1"