# Database Migration Guide

## Overview
AI Square uses Prisma for database schema management with different strategies for staging and production environments.

## Migration Strategy

### Staging Environment (Automated)
- **Automatic migrations** run in CI/CD pipeline on every deployment
- Migrations execute after Docker build, before Cloud Run deployment
- Uses Cloud SQL Proxy for secure database connection
- No manual intervention required

### Production Environment (Manual)
- **Manual migrations** for safety and control
- Requires explicit approval before execution
- Provides dry-run capability to preview changes
- Executed through Makefile commands with confirmation prompts

## Commands

### Local Development
```bash
# Check migration status
make db-migrate-status

# Create new migration
cd frontend
npx prisma migrate dev --name your_migration_name

# Apply migrations
make db-migrate
```

### Staging (Automated in CI/CD)
Migrations run automatically when pushing to main branch. The GitHub Actions workflow:
1. Builds Docker image
2. Runs database migrations via Cloud SQL Proxy
3. Deploys to Cloud Run
4. Verifies deployment health

### Production (Manual)
```bash
# 1. Preview changes (dry run)
make production-db-migrate-plan

# 2. Check current migration status
make production-db-migrate-status

# 3. Apply migrations (requires confirmation)
make production-db-migrate
# Type 'yes' when prompted

# 4. Verify migration was applied
make production-db-migrate-status
```

## Migration Files

### Location
- Migration files: `frontend/prisma/migrations/`
- Schema file: `frontend/prisma/schema.prisma`

### Baseline Migration
- Initial baseline: `20250109000000_initial_baseline`
- Created to sync existing database with Prisma migrations
- Marked as "already applied" to avoid re-running

## Schema Validation

### Pre-commit Hooks
Automatically runs on every commit:
1. Prisma schema validation
2. Migration status check
3. TypeScript type consistency check

### Manual Validation
```bash
# Check for schema drift
npm run prisma:drift

# Validate schema syntax
npm run prisma:validate

# Full schema check
npm run schema:check
```

## CI/CD Integration

### GitHub Actions Workflow
Located at `.github/workflows/deploy-staging.yml`

Key steps:
1. Quality checks (TypeScript, ESLint, Tests)
2. Build Docker image
3. **Run database migrations** (NEW!)
4. Deploy to Cloud Run
5. Health check verification

### Prisma Drift Detection
Separate workflow at `.github/workflows/prisma-drift-detection.yml`
- Runs on every push and PR
- Daily scheduled checks
- Alerts on schema drift between code and database

## Troubleshooting

### Common Issues

#### 1. Migration Fails in CI/CD
- Check GitHub Actions logs for specific error
- Verify `STAGING_DB_PASSWORD` secret is set correctly
- Ensure Cloud SQL instance is running

#### 2. Schema Drift Detected
```bash
# Reset local migrations to match database
npx prisma migrate reset --skip-generate --skip-seed

# Create new baseline
npx prisma migrate dev --name sync_with_database
```

#### 3. Production Migration Errors
- Always run `production-db-migrate-plan` first
- Check database connectivity
- Verify `PRODUCTION_DB_PASSWORD` environment variable
- Consider creating backup before migration

### Best Practices

1. **Always test migrations locally first**
   ```bash
   npx prisma migrate dev
   npm run test:ci
   ```

2. **Review migration SQL before production**
   ```bash
   make production-db-migrate-plan
   ```

3. **Monitor after deployment**
   - Check application logs
   - Verify API endpoints
   - Test critical user flows

4. **Keep migrations small and focused**
   - One logical change per migration
   - Avoid mixing schema changes with data migrations

## Security Considerations

1. **Never commit passwords** - Use environment variables and secrets
2. **Use Cloud SQL Proxy** for secure connections
3. **Limit production access** - Manual migrations require explicit confirmation
4. **Audit trail** - All migrations are logged in `_prisma_migrations` table

## Recovery Procedures

### Rollback Migration (Emergency)
```sql
-- Connect to production database
-- Find migration to rollback
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;

-- Mark migration as rolled back (replace with actual migration name)
UPDATE _prisma_migrations
SET rolled_back_at = NOW()
WHERE migration_name = 'migration_to_rollback';

-- Manually reverse schema changes if needed
```

### Create Database Backup
```bash
# Before risky migrations
make production-db-backup

# Restore if needed
make production-db-restore BACKUP_FILE=backup_name.sql
```

## References
- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Cloud SQL Proxy Documentation](https://cloud.google.com/sql/docs/mysql/sql-proxy)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
