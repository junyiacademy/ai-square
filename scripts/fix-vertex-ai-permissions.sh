#!/bin/bash

# ============================================
# Fix Vertex AI Permissions for Cloud Run
# ============================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔧 Vertex AI Permission Fixer for AI Square"
echo "==========================================="
echo ""

# Configuration
PROJECT_ID="ai-square-463013"
REGION="asia-east1"
SERVICE_NAME="ai-square-staging"
SERVICE_ACCOUNT="ai-square-staging@${PROJECT_ID}.iam.gserviceaccount.com"

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "error")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "success")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        *)
            echo "$message"
            ;;
    esac
}

# Step 1: Check current configuration
echo "Step 1: Checking current configuration..."
echo "========================================="
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo "Service Account: $SERVICE_ACCOUNT"
echo ""

# Check if service exists
if gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID &> /dev/null; then
    print_status "success" "Cloud Run service found"

    # Get current service account
    CURRENT_SA=$(gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format="value(spec.template.spec.serviceAccountName)")

    echo "Current service account: $CURRENT_SA"
else
    print_status "error" "Cloud Run service not found"
    echo "Please deploy the service first"
    exit 1
fi

# Step 2: Check/Create service account
echo ""
echo "Step 2: Checking service account..."
echo "===================================="

if gcloud iam service-accounts describe $SERVICE_ACCOUNT --project=$PROJECT_ID &> /dev/null; then
    print_status "success" "Service account exists"
else
    print_status "warning" "Service account doesn't exist, creating..."
    gcloud iam service-accounts create ai-square-staging \
        --display-name="AI Square Staging Service Account" \
        --description="Service account for AI Square staging environment" \
        --project=$PROJECT_ID
    print_status "success" "Service account created"
fi

# Step 3: Check current IAM roles
echo ""
echo "Step 3: Checking current IAM roles..."
echo "====================================="

echo "Current roles for $SERVICE_ACCOUNT:"
gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT" \
    --format="table(bindings.role)" || echo "No roles found"

# Step 4: Grant required permissions
echo ""
echo "Step 4: Granting required permissions..."
echo "========================================"

# Function to add IAM role with error handling
grant_role() {
    local role=$1
    local description=$2
    echo -n "  $description... "

    if gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="$role" \
        --condition=None &> /dev/null; then
        print_status "success" "Added"
    else
        # Check if already has the role
        if gcloud projects get-iam-policy $PROJECT_ID \
            --flatten="bindings[].members" \
            --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT AND bindings.role:$role" \
            --format="value(bindings.role)" | grep -q "$role"; then
            print_status "success" "Already has role"
        else
            print_status "error" "Failed to add role"
        fi
    fi
}

# Essential Vertex AI permissions
grant_role "roles/aiplatform.user" "Vertex AI User"
grant_role "roles/aiplatform.serviceAgent" "Vertex AI Service Agent"
grant_role "roles/ml.developer" "ML Developer"

# Additional required permissions
grant_role "roles/cloudsql.client" "Cloud SQL Client"
grant_role "roles/secretmanager.secretAccessor" "Secret Manager Accessor"
grant_role "roles/storage.objectViewer" "Storage Object Viewer"

# Service account impersonation
grant_role "roles/iam.serviceAccountTokenCreator" "Service Account Token Creator"

# Step 5: Update Cloud Run service
echo ""
echo "Step 5: Updating Cloud Run service configuration..."
echo "==================================================="

echo "Updating service account..."
gcloud run services update $SERVICE_NAME \
    --service-account=$SERVICE_ACCOUNT \
    --region=$REGION \
    --project=$PROJECT_ID

echo "Adding Vertex AI environment variables..."
gcloud run services update $SERVICE_NAME \
    --update-env-vars \
GOOGLE_CLOUD_PROJECT=$PROJECT_ID,\
GCP_PROJECT_ID=$PROJECT_ID,\
VERTEX_AI_PROJECT=$PROJECT_ID,\
VERTEX_AI_LOCATION=$REGION \
    --region=$REGION \
    --project=$PROJECT_ID

print_status "success" "Cloud Run service updated"

# Step 6: Test Vertex AI connection
echo ""
echo "Step 6: Testing Vertex AI connection..."
echo "======================================="

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(status.url)")

echo "Service URL: $SERVICE_URL"
echo ""

# Create a simple test endpoint if it doesn't exist
echo "Creating test endpoint code..."
cat > /tmp/vertex-ai-test.js << 'EOF'
// Vertex AI Test Endpoint
import { VertexAI } from '@google-cloud/vertexai';

export async function GET(request) {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
    const location = process.env.VERTEX_AI_LOCATION || 'asia-east1';

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });

    // Get model
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    // Simple test
    const result = await model.generateContent('Hello, respond with "AI is working"');
    const response = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    return new Response(JSON.stringify({
      success: true,
      message: 'Vertex AI is connected',
      projectId,
      location,
      testResponse: response
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.VERTEX_AI_LOCATION
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
EOF

echo ""
echo "Test endpoint code saved to /tmp/vertex-ai-test.js"
echo "You can add this to your app at: frontend/src/app/api/health/vertex-ai/route.ts"

# Step 7: Verification
echo ""
echo "Step 7: Final verification..."
echo "============================"

echo "Waiting for changes to propagate (30 seconds)..."
sleep 30

echo ""
echo "Testing service health..."
if curl -sf "$SERVICE_URL/api/health" > /dev/null; then
    print_status "success" "Service is healthy"
else
    print_status "warning" "Service health check failed (may still be starting)"
fi

# Step 8: Troubleshooting tips
echo ""
echo "=========================================="
echo "🔍 Troubleshooting Guide"
echo "=========================================="
echo ""
echo "If you still see Vertex AI errors:"
echo ""
echo "1. Check Cloud Run logs:"
echo "   gcloud run services logs read $SERVICE_NAME --region=$REGION --limit=50"
echo ""
echo "2. Verify environment variables:"
echo "   gcloud run services describe $SERVICE_NAME --region=$REGION --format=export | grep -E '(GOOGLE_CLOUD|VERTEX_AI)'"
echo ""
echo "3. Test with service account impersonation:"
echo "   gcloud auth print-access-token --impersonate-service-account=$SERVICE_ACCOUNT"
echo ""
echo "4. Enable required APIs (if not enabled):"
echo "   gcloud services enable aiplatform.googleapis.com"
echo "   gcloud services enable secretmanager.googleapis.com"
echo ""
echo "5. Check quota and billing:"
echo "   https://console.cloud.google.com/apis/api/aiplatform.googleapis.com/quotas"
echo ""
echo "6. Force redeploy:"
echo "   gcloud run services update $SERVICE_NAME --region=$REGION --force"
echo ""

print_status "success" "Permission fix complete!"
echo ""
echo "If the issue persists, please check the troubleshooting guide above."
