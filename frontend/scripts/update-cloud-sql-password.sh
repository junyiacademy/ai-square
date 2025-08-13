#!/bin/bash
# Update Cloud SQL password to match our standard

set -e

echo "🔐 Updating Cloud SQL passwords to standard 'postgres'"

# Update staging instance
echo "Updating ai-square-db-staging-asia..."
gcloud sql users set-password postgres \
  --instance=ai-square-db-staging-asia \
  --password=postgres \
  --project=ai-square-463013

echo "✅ Password updated for staging instance"

# If we have production instance in the future
# echo "Updating ai-square-db-production..."
# gcloud sql users set-password postgres \
#   --instance=ai-square-db-production \
#   --password=postgres \
#   --project=ai-square-463013

echo "✅ All Cloud SQL passwords updated to 'postgres'"
echo "📝 Remember to update Cloud Run environment variables too!"