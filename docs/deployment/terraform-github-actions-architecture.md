# 🏗️ AI Square Deployment Architecture - Terraform + GitHub Actions

## 📋 Overview

AI Square uses a clean separation between infrastructure management (Terraform) and application deployment (GitHub Actions). This architecture was implemented in 2025/08 after experiencing circular dependency issues with the previous approach.

## 🎯 Core Principles

1. **Separation of Concerns**
   - Terraform: Infrastructure only (Cloud SQL, Cloud Run, IAM, networking)
   - GitHub Actions: Application deployment (Docker build, deploy, data initialization)

2. **Idempotent Operations**
   - No `always_run = "${timestamp()}"` anti-patterns
   - All operations can be safely re-run
   - State is properly managed

3. **Environment Isolation**
   - Staging: Flexible, fast iteration
   - Production: Protected, gradual rollouts

## 🏛️ Architecture Components

### Infrastructure Layer (Terraform)

```
terraform/
├── main-clean.tf          # Core infrastructure resources
├── post-deploy-clean.tf   # Infrastructure-only post-deployment
├── variables.tf           # Variable definitions
├── outputs.tf            # Output values for GitHub Actions
├── environments/
│   ├── staging.tfvars    # Staging configuration
│   └── production.tfvars # Production configuration
└── Makefile              # Simplified commands
```

**Manages:**
- Cloud SQL instances and databases
- Cloud Run services (container only)
- Service accounts and IAM
- Secret Manager
- Monitoring and alerts
- Networking (VPC, firewall rules)

**Does NOT manage:**
- Database schema initialization
- Demo user creation
- Scenario data loading
- Application-specific configuration

### Application Layer (GitHub Actions)

```
.github/workflows/
├── deploy-staging.yml     # Staging deployment pipeline
└── deploy-production.yml  # Production deployment with safeguards
```

**Handles:**
- Docker image building
- Application deployment to Cloud Run
- Database schema initialization via API
- Demo account creation via API
- Scenario data loading via API
- E2E testing and verification
- Gradual traffic rollout (production)

## 🔄 Deployment Flow

### Staging Deployment

1. **Infrastructure** (Manual trigger)
   ```bash
   make terraform-deploy-staging
   ```
   - Creates/updates Cloud SQL, Cloud Run shell, IAM

2. **Application** (Automatic on `git push staging`)
   ```yaml
   # GitHub Actions automatically:
   - Build and test code
   - Build Docker image
   - Deploy to Cloud Run
   - Initialize database via API
   - Create demo accounts via API
   - Load scenarios via API
   - Run E2E tests
   ```

### Production Deployment

1. **Infrastructure** (Manual with confirmation)
   ```bash
   make terraform-deploy-production
   ```
   - Requires typing "DEPLOY" to confirm
   - Creates production-grade resources

2. **Application** (Automatic on `git push main`)
   ```yaml
   # GitHub Actions with safeguards:
   - Deployment window checks (9 AM - 6 PM)
   - Staging verification first
   - Database backup before deployment
   - Gradual rollout (10% → 50% → 100%)
   - Smoke tests at each stage
   - Automatic rollback on failure
   ```

## 🔐 Security Architecture

### Secret Management
```
GitHub Secrets:
├── GCP_SA_KEY            # Staging service account
├── GCP_SA_KEY_PROD       # Production service account
└── SLACK_WEBHOOK_URL     # Deployment notifications

Terraform Variables:
├── db_password           # Database password (sensitive)
└── demo_passwords        # Demo account passwords
```

### API Security
- Admin endpoints require `X-Admin-Key` header
- Initialization APIs are idempotent
- No hardcoded credentials in code

## 📡 API Endpoints for Deployment

### Admin APIs (Used by GitHub Actions)

```typescript
POST /api/admin/init-schema
- Verifies database tables exist
- Idempotent operation

POST /api/admin/seed-users
- Creates/updates demo accounts
- Uses bcrypt for password hashing
- Idempotent (updates if exists)

POST /api/admin/init-assessment
POST /api/admin/init-pbl
POST /api/admin/init-discovery
- Loads scenario data
- Supports force reload

GET /api/admin/stats
- Returns deployment verification data
- Used to confirm initialization
```

## 🚀 Quick Start

### First Time Setup

1. **Initialize Terraform**
   ```bash
   cd terraform
   terraform init
   ```

2. **Set up GitHub Secrets**
   ```bash
   # Add service account keys
   gh secret set GCP_SA_KEY < staging-sa-key.json
   gh secret set GCP_SA_KEY_PROD < prod-sa-key.json

   # Add admin API key
   ```

3. **Deploy Infrastructure**
   ```bash
   # Staging
   make terraform-deploy-staging

   # Production (with confirmations)
   make terraform-deploy-production
   ```

4. **Deploy Application**
   ```bash
   # Staging - automatic on push
   git push origin staging

   # Production - automatic on push to main
   git push origin main
   ```

## 🔍 Monitoring and Verification

### Health Checks
```bash
# Staging
curl https://ai-square-staging-*.run.app/api/health

# Production
curl https://ai-square-frontend-*.run.app/api/health
```

### Deployment Verification
```bash
# Check deployment status
make check-staging
make check-production

# View logs
gcloud run logs read --service ai-square-staging
gcloud run logs read --service ai-square-frontend
```

### Database Verification
```sql
-- Check initialization
SELECT COUNT(*) FROM users WHERE email LIKE '%@example.com';
SELECT COUNT(*) FROM scenarios GROUP BY mode;
```

## 🚨 Troubleshooting

### Common Issues

1. **"relation does not exist" errors**
   - Ensure Cloud SQL and Cloud Run are in same region
   - Check if schema initialization completed

2. **Login failures after deployment**
   - Verify bcrypt hashes match between API and DB
   - Check demo passwords in Terraform variables

3. **Scenarios not loading**
   - Check if init APIs were called
   - Verify API responses in GitHub Actions logs

4. **GitHub Actions failures**
   - Check service account permissions
   - Verify secrets are correctly set
   - Review deployment logs

### Recovery Procedures

1. **Rollback Application**
   ```bash
   # List revisions
   gcloud run revisions list --service ai-square-frontend

   # Route traffic to previous revision
   gcloud run services update-traffic ai-square-frontend \
     --to-revisions REVISION_ID=100
   ```

2. **Restore Database**
   ```bash
   # List backups
   gcloud sql backups list --instance ai-square-db-production

   # Restore from backup
   gcloud sql backups restore BACKUP_ID \
     --restore-instance ai-square-db-production
   ```

## 📚 References

- [Terraform Cloud Run Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_service)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud SQL Best Practices](https://cloud.google.com/sql/docs/postgres/best-practices)

---

*Last updated: 2025/08/21*
