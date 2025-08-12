#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting integration test environment...${NC}"

# Resolve docker compose command (prefer v2 'docker compose')
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo -e "${RED}❌ Neither 'docker compose' nor 'docker-compose' found${NC}"
  exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
$DC -f docker-compose.test.yml down

# Start test environment
echo "▶️  Starting test services..."
$DC -f docker-compose.test.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
TIMEOUT=60
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
    POSTGRES_HEALTHY=$($DC -f docker-compose.test.yml ps postgres-test | grep "healthy" | wc -l)
    REDIS_HEALTHY=$($DC -f docker-compose.test.yml ps redis-test | grep "healthy" | wc -l)
    
    if [ "$POSTGRES_HEALTHY" -eq 1 ] && [ "$REDIS_HEALTHY" -eq 1 ]; then
        echo -e "${GREEN}✅ All services are ready!${NC}"
        break
    fi
    
    if [ $((ELAPSED % 10)) -eq 0 ]; then
        echo "⏳ Still waiting... (${ELAPSED}s/${TIMEOUT}s)"
    fi
    
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${RED}❌ Services failed to start within ${TIMEOUT} seconds${NC}"
    $DC -f docker-compose.test.yml logs
    $DC -f docker-compose.test.yml down
    exit 1
fi

# Set environment variables for tests
export NODE_ENV=test
export DB_HOST=localhost
export DB_PORT=5434
export DB_NAME=ai_square_db
export DB_USER=postgres
export DB_PASSWORD=postgres
export REDIS_ENABLED=true
export REDIS_URL=redis://localhost:6380

# Run integration tests
echo -e "${YELLOW}🧪 Running integration tests...${NC}"
npm run test:integration

# Capture exit code
TEST_EXIT_CODE=$?

# Show results
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All integration tests passed!${NC}"
else
    echo -e "${RED}❌ Some integration tests failed${NC}"
fi

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
$DC -f docker-compose.test.yml down

# Exit with test status
exit $TEST_EXIT_CODE 