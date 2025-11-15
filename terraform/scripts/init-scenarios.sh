#!/bin/bash
# Scenario initialization script for Terraform
# This script implements the same logic as in post-deploy.tf

set -e

SERVICE_URL=${1:-"https://ai-square-staging-731209836128.asia-east1.run.app"}

echo "========================================="
echo "Initializing scenarios for AI Square"
echo "Service URL: ${SERVICE_URL}"
echo "Time: $(date)"
echo "========================================="

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to initialize a module
init_module() {
  local module=$1
  local module_display=$2

  echo -e "\n${YELLOW}Initializing ${module_display}...${NC}"

  for i in {1..3}; do
    echo "Attempt ${i}/3..."

    RESPONSE=$(curl -s -X POST "${SERVICE_URL}/api/admin/init-${module}" \
      -H "Content-Type: application/json" \
      -d '{"force": true}')

    # Check if response contains success:true
    if echo "${RESPONSE}" | grep -q '"success":true'; then
      # Extract summary information
      CREATED=$(echo "${RESPONSE}" | jq -r '.results.created // 0' 2>/dev/null || echo "0")
      UPDATED=$(echo "${RESPONSE}" | jq -r '.results.updated // 0' 2>/dev/null || echo "0")
      ERRORS=$(echo "${RESPONSE}" | jq -r '.results.errors | length // 0' 2>/dev/null || echo "0")
      SUMMARY=$(echo "${RESPONSE}" | jq -r '.summary // "No summary"' 2>/dev/null || echo "No summary")

      echo -e "${GREEN}✅ ${module_display} initialized successfully${NC}"
      echo "   Created: ${CREATED}, Updated: ${UPDATED}, Errors: ${ERRORS}"
      echo "   Summary: ${SUMMARY}"

      # If there are errors, show first few
      if [ "${ERRORS}" -gt 0 ]; then
        echo -e "${YELLOW}   ⚠️  Some errors occurred:${NC}"
        echo "${RESPONSE}" | jq -r '.results.errors[:3][]' 2>/dev/null | sed 's/^/      - /'
        if [ "${ERRORS}" -gt 3 ]; then
          echo "      ... and $((ERRORS - 3)) more errors"
        fi
      fi

      return 0
    else
      echo -e "${RED}❌ Attempt ${i} failed${NC}"
      ERROR_MSG=$(echo "${RESPONSE}" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "Unknown error")
      echo "   Error: ${ERROR_MSG}"

      if [ ${i} -lt 3 ]; then
        echo "   Retrying in 5 seconds..."
        sleep 5
      fi
    fi
  done

  echo -e "${RED}❌ Failed to initialize ${module_display} after 3 attempts${NC}"
  return 1
}

# Initialize all modules
SUCCESS_COUNT=0
FAILED_COUNT=0

# Assessment
if init_module "assessment" "Assessment scenarios"; then
  ((SUCCESS_COUNT++))
else
  ((FAILED_COUNT++))
fi

# PBL
if init_module "pbl" "PBL scenarios"; then
  ((SUCCESS_COUNT++))
else
  ((FAILED_COUNT++))
fi

# Discovery
if init_module "discovery" "Discovery scenarios"; then
  ((SUCCESS_COUNT++))
else
  ((FAILED_COUNT++))
fi

# Final summary
echo -e "\n========================================="
echo "Initialization Summary:"
echo -e "  ${GREEN}Successful: ${SUCCESS_COUNT}${NC}"
echo -e "  ${RED}Failed: ${FAILED_COUNT}${NC}"

# Check database content if possible
if command -v psql > /dev/null 2>&1 && [ -n "${DB_HOST}" ] && [ -n "${DB_PASSWORD}" ]; then
  echo -e "\nChecking database content..."
  DB_RESULT=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U postgres -d ai_square_db -t -c "
    SELECT
      'Total: ' || COUNT(*) ||
      ' (PBL: ' || COUNT(*) FILTER (WHERE mode = 'pbl') ||
      ', Discovery: ' || COUNT(*) FILTER (WHERE mode = 'discovery') ||
      ', Assessment: ' || COUNT(*) FILTER (WHERE mode = 'assessment') || ')'
    FROM scenarios;
  " 2>/dev/null || echo "Unable to query database")

  echo "  Database scenarios: ${DB_RESULT}"
fi

echo "========================================="

# Exit with error if any module failed
if [ ${FAILED_COUNT} -gt 0 ]; then
  echo -e "${RED}Some modules failed to initialize. Please check the errors above.${NC}"
  exit 1
else
  echo -e "${GREEN}All modules initialized successfully!${NC}"
  exit 0
fi
