# Staging Deployment Guide

## Environment Information

- **Cloud Run Service**: ai-square-staging
- **URL**: https://ai-square-staging-731209836128.asia-east1.run.app
- **Region**: asia-east1
- **Database**: ai-square-db-staging-asia (Cloud SQL)
- **Database Name**: ai_square_db

## Database Schema Management

### Current Schema Version: v4

We use a **single schema file** approach for simplicity:
- `schema-v4.sql` - Original schema (without authentication)
- `schema-v4-safe.sql` - Safe version without DROP commands
- `schema-v4.sql` - Complete schema with authentication support

### Why Not Migrations?

For staging environment, we decided against a migration system because:
1. **Not yet in production** - Can rebuild database when needed
2. **Simplicity** - One schema file is clearer than multiple migrations
3. **Easier debugging** - Complete schema in one place

### Database Initialization

```bash
# Apply schema v4 (includes authentication)
PGPASSWORD=postgres psql -h [CLOUD_SQL_IP] -p 5432 -U postgres -d ai_square_db -f src/lib/repositories/postgresql/schema-v4.sql
```

## Deployment Process

### 1. Build and Deploy

```bash
# Run deployment script
./deploy-staging.sh
```

### 2. Verify Deployment

```bash
# Test login endpoint
curl -X POST https://ai-square-staging-731209836128.asia-east1.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com", "password": "student123"}' \
  -s | jq
```

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| student@example.com | student123 | student |
| teacher@example.com | teacher123 | teacher |
| admin@example.com | admin123 | admin |

## Environment Variables

Key environment variables (stored in Cloud Run):
- `DB_HOST`: /cloudsql/ai-square-463013:asia-east1:ai-square-db-staging-asia
- `DB_PASSWORD`: postgres
- `DB_NAME`: ai_square_db
- `NEXTAUTH_URL`: https://ai-square-staging-731209836128.asia-east1.run.app

## Important Notes

1. **Database Connection**: Cloud SQL uses Unix socket connection via Cloud Run
2. **Authentication**: Schema v4 includes all necessary auth fields
3. **Demo Users**: Created automatically by schema with hashed passwords
4. **Session Management**: Uses JWT tokens with HTTP-only cookies

## Troubleshooting

### Login Issues
- Verify database has authentication fields (password_hash, role, etc.)
- Check demo users exist with correct password hashes
- Ensure Cloud Run has correct DB_PASSWORD environment variable

### Database Connection
- Cloud SQL and Cloud Run must be in same region (asia-east1)
- Use Unix socket connection, not IP-based
- Verify Cloud SQL instance is mounted to Cloud Run service

## Testing Before Deployment

### E2E Test Suite
We maintain a focused set of E2E tests that verify critical functionality:

```bash
# Run all E2E tests before deployment
npx playwright test

# Core tests that must pass:
- e2e/simple-working-test.spec.ts    # Basic page functionality
- e2e/basic-health-check.spec.ts     # Health endpoints
- e2e/test-api-direct.spec.ts        # API endpoints
- e2e/pbl-simple.spec.ts             # Learning modules with auth
- e2e/public-pages.spec.ts           # Public page access
```

### Test User for E2E
```javascript
// Test account for automated testing
Email: test@example.com
Password: Test123!
```

### Pre-deployment Checklist
```bash
# 1. Run tests locally
npm run test:e2e

# 2. Check TypeScript
npm run typecheck

# 3. Check ESLint
npm run lint

# 4. Build production
npm run build

# 5. Verify test user exists
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test123!"}'
```

## Future Improvements

When moving to production:
1. Consider implementing migration system for zero-downtime updates
2. Use Secret Manager for database passwords
3. Set up automated backups
4. Implement monitoring and alerting
5. Add smoke tests after deployment
6. Implement rollback procedures

---
Last Updated: 2025-01-14
