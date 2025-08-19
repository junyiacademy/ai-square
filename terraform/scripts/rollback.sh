#!/bin/bash
# ============================================
# Emergency Rollback Script
# ============================================
set -e

ENVIRONMENT="staging"
REGION="asia-east1"
CURRENT_COLOR="blue"
PREVIOUS_COLOR="green"

echo "🚨 EMERGENCY ROLLBACK: Switching back to ${PREVIOUS_COLOR}..."

# Immediate traffic switch
gcloud run services update-traffic ai-square-${ENVIRONMENT} \
  --region=${REGION} \
  --to-revisions=${PREVIOUS_COLOR}=100

echo "✅ Rolled back to ${PREVIOUS_COLOR}"

# Send notification
if [ ! -z "" ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 Emergency rollback executed for ${ENVIRONMENT}. Switched to ${PREVIOUS_COLOR}.\"}" \
    
fi
