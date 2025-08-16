#!/bin/bash

# ============================================
# Terraform Import Script - Staging Environment
# ============================================
# This script imports existing staging resources
# into Terraform state management
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="ai-square-463013"
REGION="asia-east1"
ENVIRONMENT="staging"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Terraform Staging Import Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Change to terraform directory
cd "$(dirname "$0")/.."

# Initialize Terraform
echo -e "${YELLOW}Initializing Terraform...${NC}"
terraform init

# Set workspace or use default
echo -e "${YELLOW}Setting up staging workspace...${NC}"
terraform workspace select staging 2>/dev/null || terraform workspace new staging

# Temporary password that meets validation requirements
TEMP_PASSWORD="StagingPassword123"

# Import Service Account
echo -e "${YELLOW}Importing Service Account...${NC}"
terraform import \
  -var="environment=${ENVIRONMENT}" \
  -var="db_password=${TEMP_PASSWORD}" \
  google_service_account.ai_square_service \
  "projects/${PROJECT_ID}/serviceAccounts/ai-square-service@${PROJECT_ID}.iam.gserviceaccount.com" || {
    echo -e "${YELLOW}Service account already imported or doesn't exist${NC}"
  }

# Import Cloud SQL Instance
echo -e "${YELLOW}Importing Cloud SQL Instance...${NC}"
terraform import \
  -var="environment=${ENVIRONMENT}" \
  -var="db_password=${TEMP_PASSWORD}" \
  google_sql_database_instance.main \
  "projects/${PROJECT_ID}/instances/ai-square-db-${ENVIRONMENT}-asia" || {
    echo -e "${RED}Failed to import Cloud SQL instance${NC}"
    echo -e "${YELLOW}Instance might not exist or already imported${NC}"
  }

# Import Cloud SQL Database
echo -e "${YELLOW}Importing Cloud SQL Database...${NC}"
terraform import \
  -var="environment=${ENVIRONMENT}" \
  -var="db_password=${TEMP_PASSWORD}" \
  google_sql_database.ai_square_db \
  "projects/${PROJECT_ID}/instances/ai-square-db-${ENVIRONMENT}-asia/databases/ai_square_db" || {
    echo -e "${YELLOW}Database already imported or doesn't exist${NC}"
  }

# Import Cloud SQL User
echo -e "${YELLOW}Importing Cloud SQL User...${NC}"
terraform import \
  -var="environment=${ENVIRONMENT}" \
  -var="db_password=${TEMP_PASSWORD}" \
  google_sql_user.postgres \
  "projects/${PROJECT_ID}/instances/ai-square-db-${ENVIRONMENT}-asia/users/postgres" || {
    echo -e "${YELLOW}User already imported or doesn't exist${NC}"
  }

# Import Cloud Run Service
echo -e "${YELLOW}Importing Cloud Run Service...${NC}"
terraform import \
  -var="environment=${ENVIRONMENT}" \
  -var="db_password=${TEMP_PASSWORD}" \
  google_cloud_run_service.ai_square \
  "locations/${REGION}/namespaces/${PROJECT_ID}/services/ai-square-staging" || {
    echo -e "${RED}Failed to import Cloud Run service${NC}"
    echo -e "${YELLOW}Service might not exist or already imported${NC}"
  }

# Import Cloud Run IAM Policy
echo -e "${YELLOW}Importing Cloud Run IAM Policy...${NC}"
terraform import \
  -var="environment=${ENVIRONMENT}" \
  -var="db_password=${TEMP_PASSWORD}" \
  google_cloud_run_service_iam_member.public_access \
  "projects/${PROJECT_ID}/locations/${REGION}/services/ai-square-staging roles/run.invoker allUsers" || {
    echo -e "${YELLOW}IAM policy already imported or doesn't exist${NC}"
  }

# Import Secret Manager Secret (if exists)
echo -e "${YELLOW}Importing Secret Manager Secret...${NC}"
terraform import \
  -var="environment=${ENVIRONMENT}" \
  -var="db_password=${TEMP_PASSWORD}" \
  google_secret_manager_secret.db_password \
  "projects/${PROJECT_ID}/secrets/db-password-${ENVIRONMENT}" || {
    echo -e "${YELLOW}Secret already imported or doesn't exist${NC}"
    echo -e "${YELLOW}You may need to create it manually${NC}"
  }

# Show current state
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Import Complete! Current state:${NC}"
echo -e "${GREEN}========================================${NC}"
terraform state list

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "${YELLOW}1. Review the imported resources${NC}"
echo -e "${YELLOW}2. Update terraform/environments/staging.tfvars with correct values${NC}"
echo -e "${YELLOW}3. Run: terraform plan -var-file=\"environments/staging.tfvars\"${NC}"
echo -e "${YELLOW}4. Fix any discrepancies before applying${NC}"
echo -e "${YELLOW}========================================${NC}"
