#!/bin/bash

# Initialize Assessment scenarios in Staging Cloud SQL database
# This script runs the assessment initialization against the staging database
#
# Usage: 
#   source .env.staging && ./scripts/init-staging-cloud-sql.sh
#
# Required environment variables (set in .env.staging):
#   - DB_HOST: Cloud SQL instance IP or socket path
#   - DB_PORT: Database port (usually 5432)
#   - DB_NAME: Database name
#   - DB_USER: Database user
#   - DB_PASSWORD: Database password

echo "🚀 Initializing Assessment scenarios in Staging Cloud SQL..."
echo ""

# Check if required environment variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: Required environment variables not set!"
    echo "Please source your .env.staging file first:"
    echo "  source .env.staging && $0"
    exit 1
fi

echo "📊 Database Configuration:"
echo "  Host: [MASKED]"
echo "  Port: ${DB_PORT:-5432}"
echo "  Database: $DB_NAME"
echo ""

# Run the initialization script
echo "🔄 Running assessment initialization..."
npx tsx scripts/init-staging-assessment.ts

echo ""
echo "✅ Assessment initialization complete!"