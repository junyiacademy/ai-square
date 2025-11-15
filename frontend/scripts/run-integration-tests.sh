#!/bin/bash

# Smart Integration Test Runner
# Automatically detects and configures the test environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TEST_PORT=${TEST_PORT:-3456}
TEST_DB_PORT=${TEST_DB_PORT:-5434}
TEST_REDIS_PORT=${TEST_REDIS_PORT:-6380}

echo "🧪 Integration Test Runner"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Function to check if a service is running
check_service() {
    local port=$1
    local name=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name is running on port $port"
        return 0
    else
        echo -e "${YELLOW}✗${NC} $name is not running on port $port"
        return 1
    fi
}

# Function to check Docker
check_docker() {
    if docker ps >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start services with Docker
start_docker_services() {
    echo ""
    echo "🐳 Starting services with Docker Compose..."

    if [ -f "docker-compose.test.yml" ]; then
        docker-compose -f docker-compose.test.yml up -d

        # Wait for services to be healthy
        echo "⏳ Waiting for services to be healthy..."
        local attempts=0
        while [ $attempts -lt 30 ]; do
            if docker-compose -f docker-compose.test.yml ps | grep -q "healthy"; then
                echo -e "${GREEN}✓${NC} Docker services are healthy"
                return 0
            fi
            sleep 2
            attempts=$((attempts + 1))
        done

        echo -e "${YELLOW}⚠${NC} Services may not be fully ready"
    else
        echo -e "${RED}✗${NC} docker-compose.test.yml not found"
        return 1
    fi
}

# Function to start local PostgreSQL
start_local_postgres() {
    echo ""
    echo "🐘 Starting local PostgreSQL on port $TEST_DB_PORT..."

    # Check if PostgreSQL is installed
    if ! command -v postgres &> /dev/null; then
        echo -e "${RED}✗${NC} PostgreSQL is not installed"
        echo "  Install with: brew install postgresql@15"
        return 1
    fi

    # Create test data directory
    TEST_DATA_DIR="/tmp/postgres-test-data"
    if [ ! -d "$TEST_DATA_DIR" ]; then
        echo "Creating test database cluster..."
        initdb -D "$TEST_DATA_DIR" -U postgres >/dev/null 2>&1
    fi

    # Start PostgreSQL
    pg_ctl -D "$TEST_DATA_DIR" -o "-p $TEST_DB_PORT" start >/dev/null 2>&1

    # Create database
    sleep 2
    createdb -h localhost -p $TEST_DB_PORT -U postgres ai_square_db 2>/dev/null || true

    echo -e "${GREEN}✓${NC} Local PostgreSQL started on port $TEST_DB_PORT"
    return 0
}

# Function to start local Redis
start_local_redis() {
    echo ""
    echo "🔴 Starting local Redis on port $TEST_REDIS_PORT..."

    # Check if Redis is installed
    if ! command -v redis-server &> /dev/null; then
        echo -e "${YELLOW}⚠${NC} Redis is not installed"
        echo "  Install with: brew install redis"
        return 1
    fi

    # Start Redis
    redis-server --port $TEST_REDIS_PORT --daemonize yes >/dev/null 2>&1

    echo -e "${GREEN}✓${NC} Local Redis started on port $TEST_REDIS_PORT"
    return 0
}

# Main logic
echo ""
echo "📋 Checking environment..."

# Detect CI environment
if [ "$CI" = "true" ] || [ -n "$GITHUB_ACTIONS" ]; then
    echo -e "${GREEN}✓${NC} CI environment detected"
    echo "  Services should be pre-configured"
    npm run test:integration
    exit $?
fi

# Check what's already running
echo ""
echo "🔍 Checking existing services..."
postgres_running=$(check_service $TEST_DB_PORT "PostgreSQL" && echo "true" || echo "false")
redis_running=$(check_service $TEST_REDIS_PORT "Redis" && echo "true" || echo "false")

# If both services are running, just run tests
if [ "$postgres_running" = "true" ] && [ "$redis_running" = "true" ]; then
    echo ""
    echo -e "${GREEN}✓${NC} All services are already running"
    echo ""
    echo "🚀 Running integration tests..."
    npm run test:integration
    exit $?
fi

# Try Docker first
echo ""
echo "🐳 Checking Docker availability..."
if check_docker; then
    echo -e "${GREEN}✓${NC} Docker is available"

    # Check if we should use Docker
    if [ "$USE_DOCKER" != "false" ]; then
        if start_docker_services; then
            echo ""
            echo "🚀 Running integration tests with Docker services..."
            npm run test:integration
            exit_code=$?

            # Optionally stop services
            if [ "$KEEP_SERVICES" != "true" ]; then
                echo ""
                echo "🧹 Stopping Docker services..."
                docker-compose -f docker-compose.test.yml down
            fi

            exit $exit_code
        fi
    fi
else
    echo -e "${YELLOW}⚠${NC} Docker is not available"
fi

# Fallback to local services
echo ""
echo "💻 Using local services..."

# Start missing services
if [ "$postgres_running" = "false" ]; then
    if ! start_local_postgres; then
        echo -e "${RED}✗${NC} Failed to start PostgreSQL"
        echo ""
        echo "Options:"
        echo "  1. Install PostgreSQL: brew install postgresql@15"
        echo "  2. Start Docker Desktop and run: $0"
        echo "  3. Use development database on port 5433"
        exit 1
    fi
fi

if [ "$redis_running" = "false" ]; then
    start_local_redis || echo -e "${YELLOW}⚠${NC} Redis not available (tests will run without cache)"
fi

# Run tests
echo ""
echo "🚀 Running integration tests with local services..."
npm run test:integration
exit_code=$?

# Cleanup (optional)
if [ "$KEEP_SERVICES" != "true" ] && [ "$postgres_running" = "false" ]; then
    echo ""
    echo "🧹 Stopping local services..."
    pg_ctl -D /tmp/postgres-test-data stop >/dev/null 2>&1 || true
    redis-cli -p $TEST_REDIS_PORT shutdown >/dev/null 2>&1 || true
fi

exit $exit_code
