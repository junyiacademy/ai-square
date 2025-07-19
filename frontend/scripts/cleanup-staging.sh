#!/bin/bash

# AI Square Staging Cleanup Script
# 清理 staging 環境資源

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"ai-square-463013"}
REGION="us-central1"
SERVICE_NAME="ai-square-staging"
DB_INSTANCE_NAME="ai-square-db-staging"

echo -e "${BLUE}🧹 AI Square Staging Cleanup${NC}"
echo -e "${YELLOW}Project: ${PROJECT_ID}${NC}"
echo ""

# Confirmation prompt
echo -e "${RED}⚠️  WARNING: This will delete all staging resources!${NC}"
echo -e "${YELLOW}Resources to be deleted:${NC}"
echo -e "- Cloud Run service: $SERVICE_NAME"
echo -e "- Cloud SQL instance: $DB_INSTANCE_NAME (including all data)"
echo -e "- Container images in GCR"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Cleanup cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Starting cleanup...${NC}"

# Step 1: Delete Cloud Run service
echo -e "${YELLOW}🗑️  Deleting Cloud Run service: $SERVICE_NAME${NC}"
if gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    gcloud run services delete $SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --quiet
    echo -e "${GREEN}✅ Cloud Run service deleted${NC}"
else
    echo -e "${YELLOW}⚠️  Cloud Run service not found${NC}"
fi

# Step 2: Delete Cloud SQL instance
echo -e "${YELLOW}🗑️  Deleting Cloud SQL instance: $DB_INSTANCE_NAME${NC}"
if gcloud sql instances describe $DB_INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    # Remove deletion protection first
    gcloud sql instances patch $DB_INSTANCE_NAME \
        --no-deletion-protection \
        --project=$PROJECT_ID \
        --quiet
    
    # Delete instance
    gcloud sql instances delete $DB_INSTANCE_NAME \
        --project=$PROJECT_ID \
        --quiet
    echo -e "${GREEN}✅ Cloud SQL instance deleted${NC}"
else
    echo -e "${YELLOW}⚠️  Cloud SQL instance not found${NC}"
fi

# Step 3: Delete container images
echo -e "${YELLOW}🗑️  Deleting container images...${NC}"
IMAGES=$(gcloud container images list-tags gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --format="value(digest)" \
    --project=$PROJECT_ID 2>/dev/null || echo "")

if [ -n "$IMAGES" ]; then
    for digest in $IMAGES; do
        gcloud container images delete gcr.io/$PROJECT_ID/$SERVICE_NAME@$digest \
            --force-delete-tags \
            --quiet \
            --project=$PROJECT_ID 2>/dev/null || true
    done
    echo -e "${GREEN}✅ Container images deleted${NC}"
else
    echo -e "${YELLOW}⚠️  No container images found${NC}"
fi

# Step 4: Clean up any remaining staging buckets (optional)
echo -e "${YELLOW}🗑️  Checking for staging buckets...${NC}"
STAGING_BUCKETS=$(gsutil ls -p $PROJECT_ID | grep staging || echo "")
if [ -n "$STAGING_BUCKETS" ]; then
    echo -e "${YELLOW}Found staging buckets:${NC}"
    echo "$STAGING_BUCKETS"
    echo ""
    read -p "Delete staging buckets? (y/N): " delete_buckets
    if [ "$delete_buckets" = "y" ] || [ "$delete_buckets" = "Y" ]; then
        for bucket in $STAGING_BUCKETS; do
            gsutil -m rm -r $bucket 2>/dev/null || true
        done
        echo -e "${GREEN}✅ Staging buckets deleted${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No staging buckets found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Staging cleanup completed!${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "✅ Cloud Run service removed"
echo -e "✅ Cloud SQL instance and data deleted"
echo -e "✅ Container images cleaned up"
echo -e "✅ Staging environment fully cleaned"
echo ""
echo -e "${YELLOW}Note: This does not affect your production environment${NC}"