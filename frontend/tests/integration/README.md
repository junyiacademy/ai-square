# Integration Tests Setup Guide

## 🎯 Overview
This guide explains how to run integration tests in different environments: Local, Docker, GitHub Actions, and Cloud CI/CD.

## 🏗️ Architecture

### Test Ports Configuration
- **Next.js Test Server**: Port 3456 (avoids conflict with dev server on 3000)
- **PostgreSQL Test DB**: Port 5434 (avoids conflict with dev DB on 5433)
- **Redis Test Cache**: Port 6380 (avoids conflict with dev Redis on 6379)

### Environment Detection
The test setup automatically detects the environment:
1. **CI Environment** (GitHub Actions): Uses service containers
2. **Cloud Environment** (GCP): Uses Cloud SQL and Memorystore
3. **Docker Environment**: Uses docker-compose
4. **Local Environment**: Uses local services or Docker

## 🚀 Quick Start

### Option 1: Docker (Recommended)
```bash
# Start test services
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Stop services when done
docker-compose -f docker-compose.test.yml down
```

### Option 2: Local Services
```bash
# If you have PostgreSQL and Redis installed locally
# Start PostgreSQL on port 5434
pg_ctl -D /tmp/postgres-test-data -o "-p 5434" start

# Start Redis on port 6380
redis-server --port 6380 --daemonize yes

# Run tests
npm run test:integration
```

### Option 3: Use Development Services
```bash
# If you already have dev services running
# The tests will fallback to port 5433 (dev DB) and 6379 (dev Redis)
npm run test:integration
```

## 📋 Environment Variables

### Local Development (.env.test)
```env
# Test ports
TEST_PORT=3456
TEST_DB_PORT=5434
TEST_REDIS_PORT=6380

# Database
DB_HOST=localhost
DB_PORT=5434
DB_NAME=ai_square_db
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380

# Optional: Force environment type
TEST_ENV=local  # or: docker, ci, cloud
```

### GitHub Actions (Auto-configured)
```yaml
env:
  CI: true
  DB_HOST: localhost
  DB_PORT: 5434
  REDIS_HOST: localhost
  REDIS_PORT: 6380
```

### Cloud Run (Auto-configured)
```env
DATABASE_URL=postgresql://...
CLOUD_SQL_CONNECTION_NAME=project:region:instance
REDIS_HOST=10.x.x.x
```

## 🧪 Test Levels

### Level 1: Basic Tests
```bash
npm run test:integration:level-1
```
- Health checks
- Basic API endpoints
- Database connectivity

### Level 2: Simple Flows
```bash
npm run test:integration:level-2
```
- API workflows
- CRUD operations
- Session handling

### Level 3: Advanced Scenarios
```bash
npm run test:integration:level-3
```
- Complex user flows
- Performance tests
- Cache behavior

## 🔧 Troubleshooting

### Common Issues

#### 1. "Cannot connect to database"
```bash
# Check if PostgreSQL is running
psql -h localhost -p 5434 -U postgres -c "SELECT 1"

# If not, start it:
docker-compose -f docker-compose.test.yml up -d postgres-test
```

#### 2. "Port already in use"
```bash
# Kill processes on test ports
lsof -ti :3456 | xargs kill -9  # Next.js
lsof -ti :5434 | xargs kill -9  # PostgreSQL
lsof -ti :6380 | xargs kill -9  # Redis
```

#### 3. "Docker daemon not running"
```bash
# On macOS
open -a "Docker Desktop"

# Or use local services instead
./scripts/start-test-db-local.sh
```

#### 4. "Tests timeout"
```bash
# Increase timeout in jest.integration.config.js
testTimeout: 60000  # 60 seconds
```

## 📊 CI/CD Integration

### GitHub Actions
The workflow file `.github/workflows/integration-test.yml` automatically:
1. Starts PostgreSQL and Redis services
2. Runs integration tests
3. Uploads test results

### Google Cloud Build
```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['compose', '-f', 'docker-compose.test.yml', 'up', '-d']
  
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'test:integration']
    env:
      - 'CI=true'
      - 'DB_HOST=postgres-test'
      - 'REDIS_HOST=redis-test'
```

## 🎯 Best Practices

1. **Isolation**: Tests use separate ports to avoid conflicts
2. **Cleanup**: Tests clean up data after running
3. **Fallback**: Tests try multiple service locations
4. **Speed**: Use in-memory databases when possible
5. **Reliability**: Health checks ensure services are ready

## 📝 Writing New Integration Tests

```typescript
// tests/integration/my-feature/feature.test.ts
describe('My Feature', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3456';
  
  it('should do something', async () => {
    const response = await fetch(`${baseUrl}/api/my-endpoint`);
    expect(response.ok).toBe(true);
  });
});
```

## 🔄 Continuous Testing

### Watch Mode (Local)
```bash
# Keep services running and watch for changes
docker-compose -f docker-compose.test.yml up -d
npm run test:integration:watch
```

### Pre-push Hook
```bash
# Add to .git/hooks/pre-push
#!/bin/bash
npm run test:integration:level-1
```

## 📈 Coverage Reports

```bash
# Run with coverage
npm run test:integration:coverage

# View HTML report
open coverage/lcov-report/index.html
```

## 🚨 Important Notes

1. **Don't use production database** - Always use test-specific databases
2. **Clean up resources** - Stop services when done testing
3. **Use appropriate timeouts** - Integration tests take longer than unit tests
4. **Check service health** - Ensure services are ready before running tests
5. **Environment variables** - Set TEST_ENV to force specific behavior

## 🤝 Contributing

When adding new integration tests:
1. Place them in appropriate level directory
2. Use environment-aware configuration
3. Add cleanup in test teardown
4. Document any special requirements
5. Update this README if needed