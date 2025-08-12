#!/bin/bash

echo "🚀 Starting local PostgreSQL for tests (without Docker)"

# Check if PostgreSQL is installed
if ! command -v postgres &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install it first:"
    echo "   brew install postgresql@15"
    exit 1
fi

# Create test data directory if needed
TEST_DATA_DIR="/tmp/postgres-test-data"
if [ ! -d "$TEST_DATA_DIR" ]; then
    echo "📁 Creating test database cluster..."
    initdb -D "$TEST_DATA_DIR" -U postgres
fi

# Start PostgreSQL on test port 5434
echo "🚀 Starting PostgreSQL on port 5434..."
postgres -D "$TEST_DATA_DIR" -p 5434 &
PG_PID=$!

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 3

# Create the test database
createdb -h localhost -p 5434 -U postgres ai_square_db 2>/dev/null || true
createdb -h localhost -p 5434 -U postgres postgres 2>/dev/null || true

echo "✅ PostgreSQL is running on port 5434 (PID: $PG_PID)"
echo "📌 To stop: kill $PG_PID"
echo ""
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5434"
echo "  User: postgres"
echo "  Database: ai_square_db"
echo ""
echo "Press Ctrl+C to stop the database"

# Keep running
wait $PG_PID