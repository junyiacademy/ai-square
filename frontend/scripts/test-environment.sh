#!/bin/bash

# Test Environment Setup Script
# Ensures clean test environment with proper port management

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test-specific ports (avoid conflicts with development)
TEST_NEXT_PORT=3456
TEST_DB_PORT=5434
TEST_REDIS_PORT=6380

echo -e "${YELLOW}🔧 Setting up test environment...${NC}"

# Function to kill process on port
kill_port() {
    local port=$1
    local name=$2
    echo -e "${YELLOW}Checking port $port ($name)...${NC}"
    
    # Find and kill any process using the port
    if lsof -ti :$port > /dev/null 2>&1; then
        echo -e "${YELLOW}Killing process on port $port...${NC}"
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    
    # Verify port is free
    if lsof -ti :$port > /dev/null 2>&1; then
        echo -e "${RED}❌ Failed to free port $port${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Port $port is free${NC}"
    fi
}

# 1. Clean up all test ports
echo -e "${YELLOW}🧹 Cleaning up test ports...${NC}"
kill_port $TEST_NEXT_PORT "Next.js Test Server"
kill_port $TEST_DB_PORT "PostgreSQL Test DB"
kill_port $TEST_REDIS_PORT "Redis Test Cache"

# 2. Start Docker containers for test environment
echo -e "${YELLOW}🐳 Starting Docker test containers...${NC}"

# Resolve docker compose command (prefer v2 'docker compose')
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo -e "${RED}❌ Neither 'docker compose' nor 'docker-compose' found${NC}"
  exit 1
fi

# Check if docker-compose.test.yml exists
if [ ! -f "docker-compose.test.yml" ]; then
    echo -e "${RED}❌ docker-compose.test.yml not found${NC}"
    exit 1
fi

# Stop any existing test containers
$DC -f docker-compose.test.yml down 2>/dev/null || true

# Start fresh test containers
$DC -f docker-compose.test.yml up -d

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
for i in {1..30}; do
    if docker exec ai-square-test-db pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ PostgreSQL failed to start${NC}"
        exit 1
    fi
    sleep 1
done

# Wait for Redis to be ready
echo -e "${YELLOW}⏳ Waiting for Redis to be ready...${NC}"
for i in {1..30}; do
    if docker exec ai-square-test-redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Redis failed to start${NC}"
        exit 1
    fi
    sleep 1
done

# 3. Run database migrations on test database
echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
DB_PORT=$TEST_DB_PORT npm run db:migrate || true

# 4. Export test environment variables
echo -e "${YELLOW}📝 Setting test environment variables...${NC}"
export TEST_PORT=$TEST_NEXT_PORT
export TEST_DB_PORT=$TEST_DB_PORT
export TEST_REDIS_PORT=$TEST_REDIS_PORT
export DB_PORT=$TEST_DB_PORT
export REDIS_PORT=$TEST_REDIS_PORT
export API_URL="http://localhost:$TEST_NEXT_PORT"

echo -e "${GREEN}✅ Test environment is ready!${NC}"
echo -e "${GREEN}Ports configured:${NC}"
echo -e "  Next.js: $TEST_NEXT_PORT"
echo -e "  PostgreSQL: $TEST_DB_PORT"
echo -e "  Redis: $TEST_REDIS_PORT"
echo ""
echo -e "${YELLOW}Run tests with:${NC}"
echo -e "  npm run test:integration:level-1"
echo -e "  npm run test:integration:level-2"
echo -e "  npm run test:integration:all"