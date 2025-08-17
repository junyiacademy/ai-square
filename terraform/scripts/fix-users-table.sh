#!/bin/bash
# Script to fix users table schema in Cloud SQL

set -e

ENVIRONMENT=$1
if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 [staging|production]"
  exit 1
fi

if [ "$ENVIRONMENT" == "staging" ]; then
  INSTANCE_NAME="ai-square-db-staging-asia"
elif [ "$ENVIRONMENT" == "production" ]; then
  INSTANCE_NAME="ai-square-db-production"
else
  echo "Invalid environment: $ENVIRONMENT"
  exit 1
fi

echo "Fixing users table for $ENVIRONMENT environment..."

# Create SQL script
cat > /tmp/fix-users.sql << 'EOF'
-- Add missing role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Update existing demo user with role
UPDATE users SET role = 'user' WHERE email = 'demo@example.com';

-- Verify the change
SELECT id, email, role FROM users LIMIT 5;
EOF

# Execute via gcloud
gcloud sql connect $INSTANCE_NAME \
  --user=postgres \
  --database=ai_square_db \
  < /tmp/fix-users.sql

echo "Users table fixed for $ENVIRONMENT!"