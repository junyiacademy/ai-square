# Production Deployment Parameters for AI Square

## 🎯 Current Production Status

**Service URL**: https://ai-square-frontend-731209836128.asia-east1.run.app
**Service Name**: `ai-square-frontend`
**Region**: `asia-east1`
**Project ID**: `ai-square-463013`

## 🔧 Required Configuration

### 1. Cloud SQL Instance

**Current Status**: ⚠️ No production Cloud SQL instance exists

**Options**:
1. **Create Production Instance** (Recommended):
   ```bash
   gcloud sql instances create ai-square-db-production \
     --database-version=POSTGRES_15 \
     --tier=db-n1-standard-1 \
     --region=asia-east1 \
     --network=default \
     --backup \
     --backup-start-time=03:00 \
     --maintenance-window-day=SUN \
     --maintenance-window-hour=03 \
     --maintenance-release-channel=production \
     --project=ai-square-463013

   # Create database
   gcloud sql databases create ai_square_db \
     --instance=ai-square-db-production \
     --project=ai-square-463013
   ```

2. **Use Staging Instance** (Not recommended for production):
   - Instance: `ai-square-db-staging-asia`
   - Connection: `ai-square-463013:asia-east1:ai-square-db-staging-asia`

### 2. Environment Variables

**Required for Production**:

```bash
# Database Configuration
DB_HOST="/cloudsql/ai-square-463013:asia-east1:ai-square-db-production"
DB_PORT="5432"
DB_NAME="ai_square_db"
DB_USER="postgres"
DB_PASSWORD="[Secret Manager: db-password-production]"

# Application Configuration
NODE_ENV="production"
NEXTAUTH_URL="https://ai-square-frontend-731209836128.asia-east1.run.app"
NEXTAUTH_SECRET="[Secret Manager: nextauth-secret-production]"
JWT_SECRET="[Secret Manager: jwt-secret-production]"

# AI Services
CLAUDE_API_KEY="[Secret Manager: claude-api-key-production]"
GOOGLE_APPLICATION_CREDENTIALS="[Secret Manager: google-credentials-production]"

# Database URL (constructed)
DATABASE_URL="postgresql://postgres:[PASSWORD]@/ai_square_db?host=/cloudsql/[INSTANCE]"
```

### 3. Secrets in Google Secret Manager

**Create these secrets before deployment**:

```bash
# Database password (strong, unique password)
echo -n "YOUR_SECURE_PASSWORD" | \
  gcloud secrets create db-password-production --data-file=- --project=ai-square-463013

# NextAuth secret (random 32+ chars)
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create nextauth-secret-production --data-file=- --project=ai-square-463013

# JWT secret (random 32+ chars)
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create jwt-secret-production --data-file=- --project=ai-square-463013

# Claude API key (your actual key)
echo -n "YOUR_CLAUDE_API_KEY" | \
  gcloud secrets create claude-api-key-production --data-file=- --project=ai-square-463013

# Admin initialization key (for protected endpoints)
echo -n "$(openssl rand -base64 24)" | \
  gcloud secrets create admin-init-key-production --data-file=- --project=ai-square-463013
```

### 4. Service Account Permissions

**Required IAM roles**:
```bash
# Create service account if not exists
gcloud iam service-accounts create ai-square-frontend \
  --display-name="AI Square Frontend Service Account" \
  --project=ai-square-463013

# Grant necessary roles
SERVICE_ACCOUNT="ai-square-frontend@ai-square-463013.iam.gserviceaccount.com"

# Cloud SQL Client
gcloud projects add-iam-policy-binding ai-square-463013 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"

# Secret Manager Accessor
gcloud projects add-iam-policy-binding ai-square-463013 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

# Cloud Storage (if needed)
gcloud projects add-iam-policy-binding ai-square-463013 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectViewer"
```

## 📝 Deployment Command

**Full deployment command with all parameters**:

```bash
gcloud run deploy ai-square-frontend \
  --image gcr.io/ai-square-463013/ai-square-frontend:latest \
  --platform managed \
  --region asia-east1 \
  --port 3000 \
  --allow-unauthenticated \
  --add-cloudsql-instances=ai-square-463013:asia-east1:ai-square-db-production \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DB_HOST="/cloudsql/ai-square-463013:asia-east1:ai-square-db-production" \
  --set-env-vars DB_PORT=5432 \
  --set-env-vars DB_NAME=ai_square_db \
  --set-env-vars DB_USER=postgres \
  --set-env-vars NEXTAUTH_URL="https://ai-square-frontend-731209836128.asia-east1.run.app" \
  --set-secrets DB_PASSWORD=db-password-production:latest \
  --set-secrets NEXTAUTH_SECRET=nextauth-secret-production:latest \
  --set-secrets JWT_SECRET=jwt-secret-production:latest \
  --set-secrets CLAUDE_API_KEY=claude-api-key-production:latest \
  --set-secrets ADMIN_INIT_KEY=admin-init-key-production:latest \
  --service-account="ai-square-frontend@ai-square-463013.iam.gserviceaccount.com" \
  --memory 1Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --timeout 300 \
  --project ai-square-463013
```

## 🚀 Deployment Steps

### Step 1: Prepare Infrastructure
```bash
# 1. Create Cloud SQL instance (if not exists)
# 2. Create all secrets in Secret Manager
# 3. Set up service account and permissions
```

### Step 2: Build and Push Docker Image
```bash
cd frontend

# Build production image
docker build -t gcr.io/ai-square-463013/ai-square-frontend:latest \
  -f Dockerfile.production .

# Push to GCR
docker push gcr.io/ai-square-463013/ai-square-frontend:latest
```

### Step 3: Deploy to Cloud Run
```bash
# Use the deployment script
./deploy-production.sh

# Or use the full gcloud command above
```

### Step 4: Initialize Database
```bash
# Initialize schema via API
curl -X POST "https://ai-square-frontend-731209836128.asia-east1.run.app/api/admin/init-schema" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json"

# Initialize scenarios
curl -X POST "https://ai-square-frontend-731209836128.asia-east1.run.app/api/admin/init-assessment" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'

curl -X POST "https://ai-square-frontend-731209836128.asia-east1.run.app/api/admin/init-pbl" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'

curl -X POST "https://ai-square-frontend-731209836128.asia-east1.run.app/api/admin/init-discovery" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'
```

### Step 5: Verify Deployment
```bash
# Health check
curl "https://ai-square-frontend-731209836128.asia-east1.run.app/api/health"

# Check scenario counts
curl "https://ai-square-frontend-731209836128.asia-east1.run.app/api/admin/init-schema"
```

## ⚠️ Important Notes

1. **Cloud SQL Instance**: Production currently has no dedicated Cloud SQL instance. You must create one or use staging (not recommended).

2. **Secrets**: All sensitive values must be stored in Secret Manager, never in environment variables directly.

3. **Service URL**: The production URL is already established as `https://ai-square-frontend-731209836128.asia-east1.run.app`

4. **Database Initialization**: Use the HTTP API endpoints to initialize the database after deployment.

5. **Monitoring**: Set up Cloud Monitoring and alerts for production.

## 📊 Cost Considerations

### Estimated Monthly Costs
- **Cloud Run**: ~$50-100 (depends on traffic)
- **Cloud SQL (db-n1-standard-1)**: ~$50-70
- **Cloud Storage**: ~$5-10
- **Secret Manager**: ~$0.06 per secret
- **Total**: ~$105-180/month

### Cost Optimization
- Use Cloud SQL shared core (db-f1-micro) for lower traffic: ~$15/month
- Set Cloud Run min instances to 0 for cold starts but lower cost
- Use Cloud CDN for static assets

## 🔒 Security Checklist

- [ ] All secrets in Secret Manager
- [ ] Service account with minimal permissions
- [ ] HTTPS only (enforced by Cloud Run)
- [ ] Admin endpoints protected with secret key
- [ ] Database backups enabled
- [ ] Cloud Armor for DDoS protection (optional)
- [ ] Identity-Aware Proxy for internal access (optional)

---

**Last Updated**: 2025-01-14
**Current Status**: Ready for production deployment (pending Cloud SQL instance creation)
