#!/bin/bash
# Load staging environment variables from .env.staging
# This script should NOT be committed with actual values

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
    echo -e "${RED}❌ .env.staging not found${NC}"
    echo "Please create .env.staging from .env.staging.example"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.staging | xargs)

echo -e "${GREEN}✅ Staging environment variables loaded${NC}"
echo "  DB_HOST: ${DB_HOST}"
echo "  DB_NAME: ${DB_NAME}"
echo "  DB_USER: ${DB_USER}"
echo "  DB_PASSWORD: [HIDDEN]"
echo "  GOOGLE_CLOUD_PROJECT: ${GOOGLE_CLOUD_PROJECT}"