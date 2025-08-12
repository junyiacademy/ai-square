#!/bin/bash

# Quick integration test script for development
# Usage: ./scripts/test-integration-quick.sh [test-pattern]

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TEST_PATTERN=${1:-""}

echo -e "${YELLOW}🚀 Quick Integration Test Setup${NC}"

# Check if services are already running
POSTGRES_RUNNING=$(docker ps | grep "ai-square-test-db" | wc -l)
REDIS_RUNNING=$(docker ps | grep "ai-square-test-redis" | wc -l)

if [ "$POSTGRES_RUNNING" -eq 0 ] || [ "$REDIS_RUNNING" -eq 0 ]; then
    echo "📦 Starting test services..."
    docker-compose -f docker-compose.test.yml up -d
    
    echo "⏳ Waiting for services..."
    sleep 10
else
    echo -e "${GREEN}✅ Services already running${NC}"
fi

# Set environment variables
export NODE_ENV=test
export DB_HOST=localhost
export DB_PORT=5434
export DB_NAME=ai_square_db
export DB_USER=postgres
export DB_PASSWORD=postgres
export REDIS_ENABLED=true
export REDIS_URL=redis://localhost:6380

# Run tests
cd frontend

if [ -n "$TEST_PATTERN" ]; then
    echo "🧪 Running tests matching: $TEST_PATTERN"
    npm run test:integration -- --testNamePattern="$TEST_PATTERN"
else
    echo "🧪 Running all integration tests"
    npm run test:integration
fi 