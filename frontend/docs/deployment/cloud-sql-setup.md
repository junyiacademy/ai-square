# Cloud SQL Setup Guide

## 📋 Prerequisites

1. Google Cloud Project with billing enabled
2. `gcloud` CLI installed and authenticated
3. Required APIs enabled:
   - Cloud SQL Admin API
   - Cloud SQL API

## 🚀 Step 1: Create Cloud SQL Instance

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Create PostgreSQL instance
gcloud sql instances create ai-square-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --network=default \
  --no-assign-ip \
  --backup-start-time=03:00

# For production, use a larger tier:
# --tier=db-n1-standard-1
```

## 🔐 Step 2: Set Root Password

```bash
gcloud sql users set-password postgres \
  --instance=ai-square-db \
  --password=YOUR_SECURE_PASSWORD
```

## 📊 Step 3: Create Database

```bash
gcloud sql databases create ai_square_db \
  --instance=ai-square-db \
  --charset=UTF8
```

## 🔌 Step 4: Configure Connection

### Option A: Cloud SQL Proxy (Recommended for Development)

```bash
# Install Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Get connection name
gcloud sql instances describe ai-square-db --format="value(connectionName)"
# Output: PROJECT_ID:REGION:ai-square-db

# Start proxy
./cloud-sql-proxy --port=5432 PROJECT_ID:REGION:ai-square-db
```

### Option B: Private IP (Recommended for Production)

```bash
# Enable private IP
gcloud sql instances patch ai-square-db \
  --network=projects/PROJECT_ID/global/networks/default \
  --no-assign-ip
```

## 📝 Step 5: Run Migration Schema

```bash
# Connect to instance
gcloud sql connect ai-square-db --user=postgres --database=ai_square_db

# Or using psql with proxy
psql -h localhost -U postgres -d ai_square_db
```

Then run the consolidated schema:
```sql
-- Copy and paste the content from:
-- docs/infrastructure/postgresql-migration-schema-docker-v3.5.sql (v3.5.1)
-- This is the consolidated schema with all features including onboarding and question bank
```

## 🔧 Step 6: Configure Application

### Environment Variables for Cloud Run

```bash
# Set environment variables
gcloud run services update ai-square-frontend \
  --set-env-vars="DB_HOST=/cloudsql/PROJECT_ID:REGION:ai-square-db" \
  --set-env-vars="DB_PORT=5432" \
  --set-env-vars="DB_NAME=ai_square_db" \
  --set-env-vars="DB_USER=postgres" \
  --set-env-vars="DB_PASSWORD=YOUR_SECURE_PASSWORD" \
  --set-env-vars="DB_SSL=false" \
  --set-env-vars="MIGRATION_COMPLETED=true"
```

### Connection String Format

```env
# For Cloud SQL Proxy
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/ai_square_db

# For Private IP
DATABASE_URL=postgresql://postgres:PASSWORD@PRIVATE_IP:5432/ai_square_db

# For Unix Socket (Cloud Run)
DATABASE_URL=postgresql://postgres:PASSWORD@/ai_square_db?host=/cloudsql/PROJECT_ID:REGION:ai-square-db
```

## 🚨 Step 7: Enable Cloud SQL Connection for Cloud Run

```bash
gcloud run services update ai-square-frontend \
  --add-cloudsql-instances=PROJECT_ID:REGION:ai-square-db
```

## 📊 Step 8: Run Data Migration

```bash
# From local with Cloud SQL Proxy running
cd frontend
npm run migrate:production

# Or create a one-time Cloud Run Job
gcloud run jobs create migrate-to-postgresql \
  --image=gcr.io/PROJECT_ID/ai-square-migration \
  --add-cloudsql-instances=PROJECT_ID:REGION:ai-square-db \
  --set-env-vars="DB_HOST=/cloudsql/PROJECT_ID:REGION:ai-square-db" \
  --set-env-vars="DB_USER=postgres" \
  --set-env-vars="DB_PASSWORD=YOUR_SECURE_PASSWORD" \
  --set-env-vars="GCS_BUCKET_NAME=ai-square-db-v2" \
  --max-retries=0 \
  --parallelism=1 \
  --task-timeout=3600
```

## 🔍 Step 9: Verify Migration

```sql
-- Connect to Cloud SQL
gcloud sql connect ai-square-db --user=postgres --database=ai_square_db

-- Check data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM programs;
SELECT COUNT(*) FROM tasks;
SELECT COUNT(*) FROM evaluations;
```

## 🛡️ Security Best Practices

1. **Use Cloud SQL Auth Proxy** in production
2. **Enable SSL** for connections
3. **Use IAM authentication** instead of passwords
4. **Set up automatic backups**
5. **Configure maintenance windows**

### Enable IAM Authentication

```bash
gcloud sql instances patch ai-square-db \
  --database-flags=cloudsql.iam_authentication=on

# Create IAM user
gcloud sql users create USER_EMAIL \
  --instance=ai-square-db \
  --type=cloud_iam_user
```

## 📈 Monitoring

```bash
# View instance metrics
gcloud sql instances describe ai-square-db

# View operations
gcloud sql operations list --instance=ai-square-db

# Export logs
gcloud logging read "resource.type=cloudsql_database \
  AND resource.labels.database_id=PROJECT_ID:ai-square-db" \
  --limit=50
```

## 💰 Cost Optimization

1. **Use committed use discounts** for predictable workloads
2. **Enable automatic storage increase** to avoid over-provisioning
3. **Set up **deletion protection** to avoid accidental deletion
4. **Use read replicas** for read-heavy workloads

```bash
# Enable deletion protection
gcloud sql instances patch ai-square-db --deletion-protection

# Create read replica
gcloud sql instances create ai-square-db-replica \
  --master-instance-name=ai-square-db \
  --tier=db-f1-micro \
  --region=us-east1
```

## 🔄 Backup and Recovery

```bash
# Create on-demand backup
gcloud sql backups create --instance=ai-square-db

# List backups
gcloud sql backups list --instance=ai-square-db

# Restore from backup
gcloud sql instances restore-backup ai-square-db \
  --backup-id=BACKUP_ID
```

## 🎯 Next Steps

1. Update all API routes to use PostgreSQL repositories
2. Set up monitoring alerts
3. Configure automatic backups
4. Plan for scaling (read replicas, connection pooling)
5. Implement caching strategy (Redis)

---

## Troubleshooting

### Connection Issues
```bash
# Check instance status
gcloud sql instances describe ai-square-db

# Check Cloud SQL Proxy logs
./cloud-sql-proxy --port=5432 PROJECT_ID:REGION:ai-square-db --log-debug-stdout
```

### Performance Issues
```sql
-- Check slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT * FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```