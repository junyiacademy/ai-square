# AI Square Staging Deployment Complete Guide

**Date**: 2025-01-14
**Status**: ✅ Successfully Deployed and Verified

## 🎯 Achievement Summary

Successfully deployed AI Square to Google Cloud Run staging environment with:
- ✅ Database schema initialized (8 tables)
- ✅ All 22 scenarios loaded (1 assessment, 9 PBL, 12 discovery)
- ✅ Demo users created (3 users)
- ✅ Health check passing
- ✅ All APIs functional

## 📊 Final Verification Results

```json
{
  "database_status": {
    "table_count": 8,
    "user_count": 3,
    "scenario_count": 22,
    "assessment_count": 1,
    "pbl_count": 9,
    "discovery_count": 12
  },
  "health_check": {
    "status": "healthy",
    "database": "connected",
    "response_time": "25ms"
  },
  "service_url": "https://ai-square-staging-731209836128.asia-east1.run.app"
}
```

## 🔧 Solution Architecture

### Key Innovation: HTTP-based Schema Initialization

Due to Cloud SQL IPv6 connection limitations, we implemented an HTTP API endpoint for schema initialization that can be called after deployment.

### Components Created

1. **Schema Initialization API** (`/api/admin/init-schema`)
   - POST: Initialize database schema
   - GET: Check schema status
   - Handles Cloud SQL Unix socket connections

2. **Scenario Initialization APIs**
   - `/api/admin/init-assessment`
   - `/api/admin/init-pbl`
   - `/api/admin/init-discovery`

## 📝 Complete Deployment Process

### Prerequisites

1. **Google Cloud Setup**
   ```bash
   # Set project
   gcloud config set project ai-square-463013
   
   # Create Cloud SQL instance if not exists
   gcloud sql instances create ai-square-db-staging-asia \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=asia-east1
   
   # Create database
   gcloud sql databases create ai_square_db \
     --instance=ai-square-db-staging-asia
   ```

2. **Environment Configuration**
   - Ensure all environment variables are set in Cloud Run
   - DATABASE_URL format: `postgresql://user:pass@/dbname?host=/cloudsql/INSTANCE`

### Step-by-Step Deployment

#### Step 1: Deploy Application Code

```bash
# Deploy without database initialization
SKIP_DB_INIT=true ./deploy-staging.sh
```

This will:
- Build Docker image
- Push to Google Container Registry
- Deploy to Cloud Run
- Mount Cloud SQL instance

#### Step 2: Initialize Database Schema

```bash
# Initialize schema using HTTP API
curl -X POST "https://YOUR-SERVICE-URL/api/admin/init-schema" \
  -H "x-admin-key: schema-init-2025-secure" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "Schema initialized successfully",
  "tablesCreated": 5,
  "demoUsersCreated": true
}
```

#### Step 3: Initialize Scenarios

```bash
# Initialize Assessment scenarios
curl -X POST "https://YOUR-SERVICE-URL/api/admin/init-assessment" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'

# Initialize PBL scenarios (9 scenarios)
curl -X POST "https://YOUR-SERVICE-URL/api/admin/init-pbl" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'

# Initialize Discovery scenarios (12 scenarios)
curl -X POST "https://YOUR-SERVICE-URL/api/admin/init-discovery" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

#### Step 4: Verify Deployment

```bash
# Check database status
curl "https://YOUR-SERVICE-URL/api/admin/init-schema"

# Check health
curl "https://YOUR-SERVICE-URL/api/health"
```

## 🚨 Important Lessons Learned

### 1. Cloud SQL Connection Issues

**Problem**: Cannot connect to Cloud SQL from local machine
- IPv6 addresses not supported
- Cloud SQL Auth Proxy required for local connections

**Solution**: HTTP-based initialization API that runs within Cloud Run

### 2. Schema File Execution

**Problem**: Complex SQL with DO blocks caused parsing errors
**Solution**: Execute entire schema file as single statement

### 3. Database Configuration Consistency

**Critical**: All environments must use:
- DB_NAME: `ai_square_db`
- DB_PASSWORD: `postgres`
- DB_USER: `postgres`

### 4. Region Matching

**Critical**: Cloud SQL and Cloud Run must be in same region
- Both in `asia-east1` for this deployment

## 🔍 Troubleshooting Guide

### Issue: "relation does not exist" errors

**Cause**: Database schema not initialized
**Solution**: Run schema initialization API

### Issue: Connection timeouts

**Cause**: Region mismatch or network configuration
**Solution**: Ensure Cloud SQL and Cloud Run in same region

### Issue: Authentication failures

**Cause**: Missing environment variables
**Solution**: Set DATABASE_URL, NEXTAUTH_SECRET, JWT_SECRET

## 📋 Deployment Checklist

- [x] Cloud SQL instance created
- [x] Database created
- [x] Environment variables configured
- [x] Application deployed to Cloud Run
- [x] Schema initialized via API
- [x] Scenarios initialized (22 total)
- [x] Health check passing
- [x] Demo users created

## 🔐 Security Considerations

1. **Admin API Protection**
   - Uses `x-admin-key` header
   - Should use Secret Manager in production

2. **Database Credentials**
   - Use Secret Manager for passwords
   - Rotate credentials regularly

3. **Network Security**
   - Cloud SQL uses private IP
   - Cloud Run uses IAM authentication

## 📊 Monitoring

### Key Metrics to Track

1. **Database Connection Pool**
   ```bash
   gcloud run logs read --service ai-square-staging \
     --region asia-east1 \
     --filter "database connection"
   ```

2. **API Response Times**
   - Monitor `/api/health` endpoint
   - Check database response times

3. **Error Rates**
   ```bash
   gcloud run logs read --service ai-square-staging \
     --region asia-east1 \
     --filter "severity>=ERROR"
   ```

## 🚀 Next Steps

1. **Production Deployment**
   - Use same process with production Cloud SQL
   - Implement proper secret management
   - Set up monitoring and alerting

2. **CI/CD Integration**
   - Add schema initialization to GitHub Actions
   - Automate scenario updates
   - Implement rollback procedures

3. **Performance Optimization**
   - Add Redis for caching
   - Optimize database queries
   - Implement connection pooling

## 📝 Configuration Files

### deploy-staging.sh
```bash
#!/bin/bash
# Key configurations
PROJECT_ID="ai-square-463013"
REGION="asia-east1"
SERVICE_NAME="ai-square-staging"
CLOUD_SQL_INSTANCE="ai-square-463013:asia-east1:ai-square-db-staging-asia"

# Environment variables
DB_HOST="/cloudsql/$CLOUD_SQL_INSTANCE"
DB_NAME="ai_square_db"
DB_USER="postgres"
DB_PASSWORD="postgres"
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@/$DB_NAME?host=$DB_HOST"
```

### Dockerfile.staging
```dockerfile
FROM node:20-alpine AS base
# ... standard Next.js production build
```

## 🎉 Success Criteria Met

1. ✅ Database fully initialized with schema v4
2. ✅ All 22 scenarios loaded correctly:
   - 1 Assessment scenario
   - 9 PBL scenarios
   - 12 Discovery scenarios
3. ✅ Demo users created and accessible
4. ✅ Health check showing "healthy" status
5. ✅ No data loss during deployment
6. ✅ Repeatable deployment process

## 📚 References

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres)
- [Connecting from Cloud Run](https://cloud.google.com/sql/docs/postgres/connect-run)
- [Unix Socket Connections](https://cloud.google.com/sql/docs/postgres/connect-run#unix-sockets)

---

**Last Updated**: 2025-01-14 18:50 UTC
**Author**: AI Square Development Team
**Status**: Production Ready