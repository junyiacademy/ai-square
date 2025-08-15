#!/bin/bash
# Setup Production Secrets for AI Square
# This script helps create all necessary secrets in Google Secret Manager

set -e

PROJECT_ID="ai-square-463013"

echo "🔐 Setting up Production Secrets for AI Square"
echo "Project: ${PROJECT_ID}"
echo ""

# Function to create or update a secret
create_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    local DESCRIPTION=$3
    
    echo "Creating secret: ${SECRET_NAME}"
    
    # Check if secret exists
    if gcloud secrets describe ${SECRET_NAME} --project=${PROJECT_ID} &>/dev/null; then
        echo "  Secret exists, creating new version..."
        echo -n "${SECRET_VALUE}" | gcloud secrets versions add ${SECRET_NAME} \
            --project=${PROJECT_ID} \
            --data-file=-
    else
        echo "  Creating new secret..."
        echo -n "${SECRET_VALUE}" | gcloud secrets create ${SECRET_NAME} \
            --project=${PROJECT_ID} \
            --replication-policy="automatic" \
            --data-file=-
    fi
    
    echo "  ✅ ${SECRET_NAME} configured"
}

# Function to create secret from file
create_secret_from_file() {
    local SECRET_NAME=$1
    local FILE_PATH=$2
    local DESCRIPTION=$3
    
    echo "Creating secret from file: ${SECRET_NAME}"
    
    if [ ! -f "${FILE_PATH}" ]; then
        echo "  ❌ File not found: ${FILE_PATH}"
        return 1
    fi
    
    # Check if secret exists
    if gcloud secrets describe ${SECRET_NAME} --project=${PROJECT_ID} &>/dev/null; then
        echo "  Secret exists, creating new version..."
        gcloud secrets versions add ${SECRET_NAME} \
            --project=${PROJECT_ID} \
            --data-file="${FILE_PATH}"
    else
        echo "  Creating new secret..."
        gcloud secrets create ${SECRET_NAME} \
            --project=${PROJECT_ID} \
            --replication-policy="automatic" \
            --data-file="${FILE_PATH}"
    fi
    
    echo "  ✅ ${SECRET_NAME} configured"
}

echo "📝 Required Secrets Checklist:"
echo ""
echo "1. Database Password (db-password-production)"
echo "2. NextAuth Secret (nextauth-secret-production)"
echo "3. JWT Secret (jwt-secret-production)"
echo "4. Claude API Key (claude-api-key-production)"
echo "5. Google Service Account (google-credentials-production)"
echo "6. Admin Init Key (admin-init-key-production)"
echo ""

# Interactive mode
read -p "Do you want to create/update production secrets? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

echo ""
echo "🔑 Creating Production Secrets..."
echo ""

# 1. Database Password
echo "1. Database Password"
read -s -p "Enter production database password (or press Enter to generate): " DB_PASSWORD
echo
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 32)
    echo "  Generated random password"
fi
create_secret "db-password-production" "$DB_PASSWORD" "PostgreSQL database password"

# 2. NextAuth Secret
echo ""
echo "2. NextAuth Secret"
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "  Generating random secret..."
create_secret "nextauth-secret-production" "$NEXTAUTH_SECRET" "NextAuth.js secret key"

# 3. JWT Secret
echo ""
echo "3. JWT Secret"
JWT_SECRET=$(openssl rand -base64 32)
echo "  Generating random secret..."
create_secret "jwt-secret-production" "$JWT_SECRET" "JWT signing secret"

# 4. Claude API Key
echo ""
echo "4. Claude API Key"
read -s -p "Enter Claude API key: " CLAUDE_API_KEY
echo
if [ -z "$CLAUDE_API_KEY" ]; then
    echo "  ⚠️  Skipping Claude API key (optional)"
else
    create_secret "claude-api-key-production" "$CLAUDE_API_KEY" "Claude API key for translations"
fi

# 5. Google Service Account
echo ""
echo "5. Google Service Account Credentials"
read -p "Enter path to service account JSON file: " SA_FILE_PATH
if [ -z "$SA_FILE_PATH" ]; then
    echo "  ⚠️  Skipping service account (will use default credentials)"
else
    create_secret_from_file "google-credentials-production" "$SA_FILE_PATH" "Google Cloud service account"
fi

# 6. Admin Init Key
echo ""
echo "6. Admin Init Key"
ADMIN_KEY=$(openssl rand -base64 24)
echo "  Generating admin key..."
create_secret "admin-init-key-production" "$ADMIN_KEY" "Admin API initialization key"
echo "  ⚠️  Save this key securely: ${ADMIN_KEY}"

# Grant access to Cloud Run service account
echo ""
echo "🔓 Granting secret access to Cloud Run..."
SERVICE_ACCOUNT="ai-square-production@${PROJECT_ID}.iam.gserviceaccount.com"

# Create service account if it doesn't exist
if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT} --project=${PROJECT_ID} &>/dev/null; then
    echo "Creating service account..."
    gcloud iam service-accounts create ai-square-production \
        --display-name="AI Square Production Service Account" \
        --project=${PROJECT_ID}
fi

# Grant secret accessor role
SECRETS=(
    "db-password-production"
    "nextauth-secret-production"
    "jwt-secret-production"
    "claude-api-key-production"
    "google-credentials-production"
    "admin-init-key-production"
)

for SECRET in "${SECRETS[@]}"; do
    echo "Granting access to ${SECRET}..."
    gcloud secrets add-iam-policy-binding ${SECRET} \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/secretmanager.secretAccessor" \
        --project=${PROJECT_ID} &>/dev/null || true
done

echo ""
echo "✅ Production secrets setup complete!"
echo ""
echo "📋 Summary:"
echo "  - Database password: Configured"
echo "  - NextAuth secret: Generated"
echo "  - JWT secret: Generated"
echo "  - Claude API key: ${CLAUDE_API_KEY:+Configured}"
echo "  - Google credentials: ${SA_FILE_PATH:+Configured}"
echo "  - Admin init key: Generated (save it!)"
echo ""
echo "🚀 Next steps:"
echo "1. Save the admin key securely"
echo "2. Update GitHub secrets if using CI/CD"
echo "3. Run production deployment"
echo ""
echo "⚠️  Security reminders:"
echo "- Never commit secrets to git"
echo "- Rotate secrets regularly"
echo "- Use different secrets for each environment"
echo "- Monitor secret access in Cloud Console"