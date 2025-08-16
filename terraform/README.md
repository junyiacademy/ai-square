# AI Square Infrastructure as Code (Terraform)

This directory contains all Terraform configurations for managing AI Square's cloud infrastructure on Google Cloud Platform.

## 🏗️ Architecture Overview

The infrastructure includes:
- **Cloud SQL** (PostgreSQL 15) - Database for user data and learning records
- **Cloud Run** - Serverless container hosting for the Next.js application
- **Secret Manager** - Secure storage for sensitive configuration
- **Service Accounts** - IAM for service authentication
- **Monitoring** - Health checks and alerts

## 📁 Directory Structure

```
terraform/
├── main.tf                    # Main Terraform configuration
├── environments/              # Environment-specific variables
│   ├── staging.tfvars        # Staging environment config
│   └── production.tfvars     # Production environment config
├── scripts/                   # Automation scripts
│   ├── import-staging.sh     # Import existing staging resources
│   └── import-production.sh  # Import existing production resources
├── security-check.sh          # Security validation script
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites
1. Install Terraform (>= 1.0)
2. Install Google Cloud SDK (`gcloud`)
3. Authenticate with GCP:
   ```bash
   gcloud auth application-default login
   ```

### Initialize Terraform
```bash
make terraform-init
```

### Deploy to Staging
```bash
# Preview changes
make terraform-plan-staging

# Apply changes
make deploy-staging
```

### Deploy to Production
```bash
# Preview changes
make terraform-plan-production

# Apply changes (requires confirmation)
make deploy-production
```

## 🔐 Security

### Required Secrets
Set these in your environment or tfvars:
- `db_password` - Database password (12+ chars, upper/lower/numbers)
- `GCP_SA_KEY` - Service account key for GitHub Actions

### Security Features
- Passwords stored in Secret Manager
- SSL enforcement for production database
- IP allowlisting for production
- Deletion protection on production resources
- Audit logging enabled
- Automated security checks before deployment

### Security Validation
Run security checks before deployment:
```bash
cd terraform && ./security-check.sh
```

## 🌍 Environments

### Staging
- **URL**: https://ai-square-staging-731209836128.asia-east1.run.app
- **Database**: db-f1-micro tier
- **Network**: Open access (0.0.0.0/0)
- **Backups**: Disabled
- **Deletion Protection**: Disabled

### Production
- **URL**: https://ai-square-frontend-731209836128.asia-east1.run.app
- **Database**: db-custom-2-4096 tier
- **Network**: IP allowlist only
- **Backups**: Daily with point-in-time recovery
- **Deletion Protection**: Enabled

## 📥 Importing Existing Resources

If you have existing GCP resources, import them into Terraform state:

```bash
# Import staging resources
make terraform-import-staging

# Import production resources
make terraform-import-production
```

## 🔄 CI/CD Integration

GitHub Actions automatically:
1. Runs `terraform plan` on pull requests
2. Deploys to staging on merge to main
3. Deploys to production after staging succeeds
4. Performs health checks after deployment

### Manual Deployment
Use GitHub Actions workflow dispatch for manual deployments.

## 📊 Monitoring

### Health Checks
```bash
# Check staging health
curl https://ai-square-staging-731209836128.asia-east1.run.app/api/health

# Check production health
make production-health
```

### Logs
```bash
# View Cloud Run logs
gcloud run logs read --service=ai-square-frontend --region=asia-east1

# View Cloud SQL logs
gcloud sql operations list --instance=ai-square-db-production
```

## 🔧 Troubleshooting

### Common Issues

#### State Lock
```bash
# If state is locked, force unlock (use carefully!)
terraform force-unlock <LOCK_ID>
```

#### Import Conflicts
```bash
# Remove from state and re-import
terraform state rm google_sql_database_instance.main
terraform import google_sql_database_instance.main <INSTANCE_ID>
```

#### Connection Issues
- Ensure Cloud SQL and Cloud Run are in the same region (asia-east1)
- Check Cloud SQL instance is running
- Verify service account has correct permissions

## 🚨 Rollback Procedures

### Cloud Run Rollback
```bash
# List all revisions
gcloud run revisions list --service=ai-square-frontend --region=asia-east1

# Route traffic to previous revision
gcloud run services update-traffic ai-square-frontend \
  --to-revisions=<PREVIOUS_REVISION>=100 \
  --region=asia-east1
```

### Database Rollback
```bash
# Use point-in-time recovery (production only)
gcloud sql backups list --instance=ai-square-db-production
gcloud sql backups restore <BACKUP_ID> --restore-instance=ai-square-db-production
```

## 📝 Best Practices

1. **Always run `terraform plan` before `apply`**
2. **Use workspaces for environment separation**
3. **Keep sensitive data in Secret Manager**
4. **Tag all resources appropriately**
5. **Regular state backups to GCS**
6. **Document any manual changes**
7. **Use consistent naming conventions**

## 🔑 Required GCP APIs

Ensure these APIs are enabled:
- Cloud Run API
- Cloud SQL Admin API
- Secret Manager API
- IAM API
- Cloud Resource Manager API
- Monitoring API

Enable them with:
```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  monitoring.googleapis.com
```

## 📞 Support

For issues or questions:
1. Check the [deployment guide](../docs/deployment/cicd-deployment-and-db-guide.md)
2. Review terraform logs: `terraform show`
3. Check GCP Console for resource status
4. Contact the platform team

## 🔄 Version History

- **v2.0** - Full Terraform migration (2025-01)
- **v1.0** - Initial shell script deployment (deprecated)
