#!/bin/bash

# ============================================
# GCR Image Cleanup Script
# ============================================
# Cleans up old container images from Google Container Registry
# Keeps only the most recent images
# ============================================

set -e

PROJECT_ID="ai-square-463013"

echo "🧹 Starting GCR cleanup for project: $PROJECT_ID"
echo "================================================"

# Function to clean repository keeping only latest N images
cleanup_repository() {
    local REPO=$1
    local KEEP_COUNT=${2:-1}  # Default keep 1 (latest only)

    echo ""
    echo "📦 Processing: $REPO"
    echo "   Keeping only the latest $KEEP_COUNT image(s)"

    # Get all images sorted by timestamp (newest first)
    IMAGES=$(gcloud container images list-tags "$REPO" \
        --format="get(digest)" \
        --sort-by="~timestamp" 2>/dev/null || echo "")

    if [ -z "$IMAGES" ]; then
        echo "   ⚠️  No images found or repository doesn't exist"
        return
    fi

    # Count total images
    TOTAL=$(echo "$IMAGES" | wc -l | tr -d ' ')
    echo "   Found $TOTAL total images"

    # Skip the first KEEP_COUNT images (newest) and delete the rest
    DELETE_COUNT=0
    echo "$IMAGES" | tail -n +$((KEEP_COUNT + 1)) | while read -r DIGEST; do
        if [ -n "$DIGEST" ]; then
            echo "   🗑️  Deleting: $DIGEST"
            gcloud container images delete "$REPO@$DIGEST" --quiet --force-delete-tags 2>/dev/null || true
            DELETE_COUNT=$((DELETE_COUNT + 1))
        fi
    done

    echo "   ✅ Cleanup complete for $REPO"
}

# Clean up old/unused repositories (delete completely)
echo ""
echo "🗑️  Removing unused repositories..."
echo "-----------------------------------"

# 1. Remove ai-square-cms (old CMS system)
echo "Removing ai-square-cms..."
gcloud container images list-tags gcr.io/$PROJECT_ID/ai-square-cms \
    --format="get(digest)" 2>/dev/null | while read -r DIGEST; do
    if [ -n "$DIGEST" ]; then
        gcloud container images delete "gcr.io/$PROJECT_ID/ai-square-cms@$DIGEST" --quiet --force-delete-tags 2>/dev/null || true
    fi
done

# 2. Remove vaitor2 (old project)
echo "Removing vaitor2..."
gcloud container images list-tags gcr.io/$PROJECT_ID/vaitor2 \
    --format="get(digest)" 2>/dev/null | while read -r DIGEST; do
    if [ -n "$DIGEST" ]; then
        gcloud container images delete "gcr.io/$PROJECT_ID/vaitor2@$DIGEST" --quiet --force-delete-tags 2>/dev/null || true
    fi
done

# Clean up ai-square-frontend (keep only latest)
echo ""
echo "🧹 Cleaning up ai-square-frontend..."
echo "-----------------------------------"
cleanup_repository "gcr.io/$PROJECT_ID/ai-square-frontend" 1

# Clean up ai-square-staging (keep only latest)
echo ""
echo "🧹 Cleaning up ai-square-staging..."
echo "-----------------------------------"
cleanup_repository "gcr.io/$PROJECT_ID/ai-square-staging" 1

# Clean up ai-square-production (keep only latest)
echo ""
echo "🧹 Cleaning up ai-square-production..."
echo "-----------------------------------"
cleanup_repository "gcr.io/$PROJECT_ID/ai-square-production" 1

echo ""
echo "================================================"
echo "✅ GCR cleanup complete!"
echo ""
echo "📊 Final status:"
gcloud container images list --project=$PROJECT_ID
echo ""
echo "🎯 Remaining images per repository:"
for REPO in ai-square-frontend ai-square-staging ai-square-production; do
    COUNT=$(gcloud container images list-tags gcr.io/$PROJECT_ID/$REPO --format="value(digest)" 2>/dev/null | wc -l | tr -d ' ')
    echo "   - $REPO: $COUNT image(s)"
done
