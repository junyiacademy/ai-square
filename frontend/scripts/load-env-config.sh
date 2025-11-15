#!/bin/bash
# Load environment configuration based on ENVIRONMENT variable

# Determine environment
ENVIRONMENT="${ENVIRONMENT:-local}"

# Standard defaults (same for all environments)
export DB_NAME="${DB_NAME:-ai_square_db}"
export DB_USER="${DB_USER:-postgres}"
export DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Load appropriate .env file and set connection details
case "$ENVIRONMENT" in
  staging)
    if [ -f ".env.staging" ]; then
      echo "Loading staging environment from .env.staging"
      export $(grep -v '^#' .env.staging | xargs)
    fi
    # For local connection to Cloud SQL via proxy
    if [ "$USE_CLOUD_SQL_PROXY" = "true" ]; then
      export DB_HOST="127.0.0.1"
      export DB_PORT="5432"
    fi
    ;;
  production)
    if [ -f ".env.production" ]; then
      echo "Loading production environment from .env.production"
      export $(grep -v '^#' .env.production | xargs)
    fi
    # For local connection to Cloud SQL via proxy
    if [ "$USE_CLOUD_SQL_PROXY" = "true" ]; then
      export DB_HOST="127.0.0.1"
      export DB_PORT="5432"
    fi
    ;;
  *)
    # Local development
    if [ -f ".env.local" ]; then
      export $(grep -v '^#' .env.local | xargs)
    fi
    export DB_HOST="${DB_HOST:-127.0.0.1}"
    export DB_PORT="${DB_PORT:-5434}"  # Local Docker PostgreSQL port
    ;;
esac

# Display loaded configuration
echo "Environment: $ENVIRONMENT"
echo "DB_NAME: $DB_NAME"
echo "DB_HOST: $DB_HOST"
echo "DB_PORT: $DB_PORT"
echo "DB_USER: $DB_USER"
