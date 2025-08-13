# Local Development Database Setup

This guide explains how to set up and manage the local PostgreSQL database for AI Square development.

## Quick Start

1. **Start the database and initialize it with demo data:**
   ```bash
   make db-init
   ```
   This command will:
   - Start PostgreSQL in Docker
   - Create the database schema
   - Load demo users (student, teacher, admin)
   - Load sample scenarios from YAML files

2. **Check if everything is working:**
   ```bash
   make db-status
   ```

3. **Start the development server:**
   ```bash
   make dev
   ```

## Database Management Commands

### Basic Operations
- `make db-up` - Start PostgreSQL container
- `make db-down` - Stop PostgreSQL container
- `make db-status` - Check database status and connection

### Data Management
- `make db-init` - Initialize database with schema and demo data
- `make db-reset` - Drop and recreate database (WARNING: deletes all data)
- `make db-seed` - Load sample scenarios from YAML files
- `make db-shell` - Open PostgreSQL interactive shell

### Backup and Restore
- `make db-backup` - Create a backup (saves to frontend/backups/)
- `make db-restore FILE=backup.sql` - Restore from a backup file

### Maintenance
- `make db-migrate` - Run database migrations
- `make db-logs` - View PostgreSQL logs
- `make db-clean-backups` - Remove old backup files

## Demo Users

After running `make db-init`, the following users are available:

| Email | Password | Role |
|-------|----------|------|
| student@example.com | student123 | Student |
| teacher@example.com | teacher123 | Teacher |
| admin@example.com | admin123 | Admin |

## Environment Variables

The database uses these default settings (can be overridden):
- `DB_HOST`: localhost
- `DB_PORT`: 5432
- `DB_NAME`: ai_square_db
- `DB_USER`: postgres
- `DB_PASSWORD`: postgres

## Troubleshooting

### Database won't start
```bash
# Check if port 5432 is already in use
lsof -i :5432

# Stop any existing PostgreSQL
make db-down
docker ps -a | grep postgres  # Check for orphaned containers
```

### Connection issues
```bash
# Verify database is running
make db-status

# Check logs
make db-logs

# Try connecting manually
make db-shell
```

### Reset everything
```bash
# Complete reset
make db-reset
make db-init
```

## Staging Deployment

For staging deployment with Cloud SQL:

1. Ensure Cloud SQL instance exists in the same region as Cloud Run
2. Set environment variables in Cloud Run:
   ```
   DB_HOST=/cloudsql/PROJECT:REGION:INSTANCE
   DB_NAME=ai_square_db
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```
3. Initialize the staging database:
   ```bash
   # Connect to Cloud SQL
    gcloud sql connect INSTANCE_NAME --user=postgres --database=ai_square_db
   
   # Run initialization scripts
    \i src/lib/repositories/postgresql/schema-v4.sql
   \i src/scripts/init-demo-users.sql
   ```

## Additional Scripts

Located in `frontend/scripts/`:
- `init-staging-db.sh` - Initialize staging database
- `init-local-db.sh` - Initialize local database
- `populate-staging-scenarios.ts` - Load scenarios to staging

## Notes

- The database uses PostgreSQL 15 in Docker
- All timestamps are stored in UTC
- JSONB is used for multilingual content
- UUID is used for all primary keys
- The schema follows the unified learning architecture (v3)