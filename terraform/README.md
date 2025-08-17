# AI Square Infrastructure as Code (Terraform)

This directory contains all Terraform configurations for managing AI Square's cloud infrastructure on Google Cloud Platform.

## 🎯 Pure Infrastructure as Code

This Terraform configuration follows pure Infrastructure as Code principles:
- ✅ **No shell script dependencies** - All deployment logic in Terraform and Makefile
- ✅ **Integrated security checks** - Built into Make targets, no external scripts
- ✅ **Native Terraform provisioners** - Post-deployment tasks handled by Terraform
- ✅ **Single source of truth** - Everything defined in `.tf` files

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
├── post-deploy.tf             # Post-deployment provisioners
├── e2e.tf                     # E2E test configuration and outputs
├── Makefile                   # All deployment and test commands
├── environments/              # Environment-specific variables
│   ├── staging.tfvars        # Staging environment config
│   └── production.tfvars     # Production environment config
├── modules/                   # Terraform modules
│   └── e2e-tests/           # E2E test module (deprecated)
├── scripts/                   # Legacy migration scripts (not used for deployment)
│   ├── import-staging.sh     # Import existing resources
│   └── import-production.sh  # Import existing resources
├── *.tftest.hcl              # Terraform test files
├── DEPLOYMENT-E2E-ARCHITECTURE.md  # E2E testing architecture documentation
└── README.md                  # This file
```

## 📋 Available Commands

Run `make help` to see all available commands:

### Deployment Commands
- `make init` - Initialize Terraform
- `make deploy-staging` - Complete deployment to staging
- `make deploy-production` - Complete deployment to production
- `make plan` - Preview changes
- `make apply` - Apply infrastructure
- `make test` - Run Terraform tests

### E2E Testing Commands
- `make e2e` - Run complete E2E test suite
- `make e2e-smoke` - Run smoke tests only
- `make e2e-critical` - Run critical path tests
- `make e2e-auth` - Run authentication tests
- `make e2e-debug` - Run tests in headed mode
- `make e2e-report` - View test report

### Maintenance Commands
- `make security-check` - Run security audit
- `make status` - Show deployment status
- `make logs` - View Cloud Run logs
- `make clean` - Clean Terraform files

## 🚀 Quick Start

### Prerequisites
1. Install Terraform (>= 1.0)
2. Install Google Cloud SDK (`gcloud`)
3. Authenticate with GCP:
   ```bash
   gcloud auth application-default login
   ```

### Set Database Password
```bash
export TF_VAR_db_password='your-secure-password'
```

### Initialize Terraform
```bash
make init
```

### Deploy to Staging
```bash
# Complete deployment pipeline (apply + tests + health checks)
make deploy-staging

# Or individual steps:
make plan ENV=staging          # Preview changes
make apply ENV=staging         # Apply infrastructure
make test ENV=staging          # Run tests
make e2e ENV=staging           # Run E2E tests
```

### Deploy to Production
```bash
# Complete deployment pipeline (with confirmation)
make deploy-production

# Or individual steps:
make plan ENV=production       # Preview changes
make apply ENV=production      # Apply infrastructure (manual)
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
Security checks are automatically run before deployment. To run manually:
```bash
make security-check

# Fix common issues automatically
make security-fix
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

### CI/CD Commands
```bash
# For CI/CD pipelines (non-interactive)
make ci-deploy ENV=staging
make ci-deploy ENV=production
```

### Manual Deployment
Use GitHub Actions workflow dispatch or run Make commands locally.

## 📊 Monitoring

### Health Checks
```bash
# Check deployment status and health
make status ENV=staging
make status ENV=production

# Wait for service to be healthy
make wait-for-health ENV=staging

# View deployment summary
make deployment-summary ENV=staging
```

### Logs
```bash
# View Cloud Run logs using Make
make logs ENV=staging
make logs ENV=production

# Direct gcloud commands
gcloud run logs read --service=ai-square-staging --region=asia-east1
gcloud run logs read --service=ai-square-production --region=asia-east1
```

## 🧪 E2E Testing Architecture

### Clean Separation of Concerns
The E2E testing architecture follows a clean separation between infrastructure and test execution:

- **Terraform (e2e.tf)**: Provides outputs, configurations, and basic smoke tests
- **Makefile**: Handles complex E2E test orchestration and execution

### Running E2E Tests
```bash
# Full test suite
make e2e ENV=staging

# Targeted test runs
make e2e-smoke ENV=staging      # Quick validation
make e2e-critical ENV=staging   # Essential flows only
make e2e-auth ENV=staging       # Authentication tests

# Debug mode (with browser visible)
make e2e-debug ENV=staging

# View test report
make e2e-report
```

### Test Configuration
E2E tests automatically use outputs from Terraform:
- Service URL from `e2e_service_url` output
- Test credentials from `e2e_test_credentials` output
- Environment setup handled by Makefile

For more details, see [DEPLOYMENT-E2E-ARCHITECTURE.md](./DEPLOYMENT-E2E-ARCHITECTURE.md).

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

- **v3.0** - Pure Infrastructure as Code (2025-01) - Removed all shell script dependencies
- **v2.0** - Full Terraform migration (2025-01)
- **v1.0** - Initial shell script deployment (deprecated)
