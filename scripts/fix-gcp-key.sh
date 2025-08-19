#!/bin/bash

# Fix GCP Service Account Key Format
# This script helps format and update the GCP_SA_KEY secret properly

set -e

echo "🔧 GCP Service Account Key Formatter"
echo "===================================="

# Check if we have gcloud installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if we have gh installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI is not installed. Please install it first."
    exit 1
fi

PROJECT_ID="ai-square-463013"
SERVICE_ACCOUNT="ai-square-service@${PROJECT_ID}.iam.gserviceaccount.com"

echo "📋 Service Account: $SERVICE_ACCOUNT"
echo "📋 Project ID: $PROJECT_ID"
echo ""

# Check if service account exists
echo "🔍 Checking if service account exists..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT &> /dev/null; then
    echo "✅ Service account exists"
else
    echo "❌ Service account does not exist. Creating it..."
    gcloud iam service-accounts create ai-square-service \
        --description="AI Square deployment service account" \
        --display-name="AI Square Service Account"
fi

# List existing keys
echo ""
echo "🔍 Checking existing service account keys..."
EXISTING_KEYS=$(gcloud iam service-accounts keys list --iam-account=$SERVICE_ACCOUNT --format="value(name)" | wc -l)
echo "📊 Found $EXISTING_KEYS existing keys"

# Create new key file
KEY_FILE="/tmp/gcp-sa-key-$(date +%Y%m%d-%H%M%S).json"
echo ""
echo "🔑 Creating new service account key..."
gcloud iam service-accounts keys create "$KEY_FILE" --iam-account=$SERVICE_ACCOUNT

if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Failed to create service account key"
    exit 1
fi

echo "✅ Service account key created: $KEY_FILE"

# Validate the JSON format
echo ""
echo "🔍 Validating JSON format..."
if jq empty "$KEY_FILE" 2>/dev/null; then
    echo "✅ JSON format is valid"
else
    echo "❌ JSON format is invalid"
    exit 1
fi

# Show key info (without private key)
echo ""
echo "📋 Key Information:"
jq -r '{
    type: .type,
    project_id: .project_id,
    private_key_id: .private_key_id,
    client_email: .client_email,
    client_id: .client_id
}' "$KEY_FILE"

# Format for GitHub Secret (base64 encoded)
echo ""
echo "🔄 Formatting key for GitHub Actions..."
KEY_CONTENT=$(cat "$KEY_FILE")

# Update GitHub Secret
echo ""
echo "🚀 Updating GitHub Secret GCP_SA_KEY..."
echo "$KEY_CONTENT" | gh secret set GCP_SA_KEY

if [ $? -eq 0 ]; then
    echo "✅ GitHub Secret GCP_SA_KEY updated successfully"
else
    echo "❌ Failed to update GitHub Secret"
    exit 1
fi

# Test authentication
echo ""
echo "🧪 Testing authentication with new key..."
TEMP_CRED_FILE="/tmp/test-cred-$(date +%Y%m%d-%H%M%S).json"
cp "$KEY_FILE" "$TEMP_CRED_FILE"

# Activate service account
gcloud auth activate-service-account --key-file="$TEMP_CRED_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Authentication test successful"
    
    # Test basic gcloud commands
    echo "🔍 Testing gcloud commands..."
    gcloud config list
    echo ""
    gcloud projects describe $PROJECT_ID --format="value(name,projectId)" || echo "⚠️  Project access might be limited"
else
    echo "❌ Authentication test failed"
    exit 1
fi

# Clean up
echo ""
echo "🧹 Cleaning up temporary files..."
rm -f "$KEY_FILE" "$TEMP_CRED_FILE"

echo ""
echo "🎉 GCP Service Account Key has been successfully formatted and updated!"
echo ""
echo "📝 Next steps:"
echo "1. Go to GitHub Actions and trigger a test workflow"
echo "2. Check if the authentication error is resolved"
echo "3. Run the staging deployment"
echo ""
echo "🔗 GitHub Actions: https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/actions"