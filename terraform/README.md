# AI Square Infrastructure as Code

## 🚀 Quick Start

### Prerequisites
1. Install Terraform: `brew install terraform`
2. Install Google Cloud SDK: `brew install google-cloud-sdk`
3. Authenticate: `gcloud auth application-default login`

### First Time Setup

1. **Create state bucket** (one time only):
```bash
gsutil mb -p ai-square-463013 -l asia-east1 gs://ai-square-terraform-state
gsutil versioning set on gs://ai-square-terraform-state
```

2. **Initialize Terraform**:
```bash
terraform init
```

### Deploy Infrastructure

#### Staging Environment
```bash
# Plan changes (preview)
terraform plan -var="environment=staging" -var="db_password=$STAGING_DB_PASSWORD"

# Apply changes
terraform apply -var="environment=staging" -var="db_password=$STAGING_DB_PASSWORD"
```

#### Production Environment
```bash
# Plan changes (preview)
terraform plan -var="environment=production" -var="db_password=$PROD_DB_PASSWORD"

# Apply changes
terraform apply -var="environment=production" -var="db_password=$PROD_DB_PASSWORD"
```

### Using terraform.tfvars (Recommended)

Create `terraform.tfvars`:
```hcl
project_id  = "ai-square-463013"
region      = "asia-east1"
environment = "staging"
# Don't put passwords in this file!
```

For sensitive variables, use environment variables:
```bash
export TF_VAR_db_password="your-secure-password"
terraform apply
```

## 📊 What This Manages

### Resources Created
- ✅ Cloud SQL PostgreSQL instance
- ✅ Cloud Run service
- ✅ Service Account with proper IAM roles
- ✅ Secret Manager for passwords
- ✅ Monitoring & Uptime checks
- ✅ Alert policies for failures

### Environment Differences

| Resource | Staging | Production |
|----------|---------|------------|
| Database Size | db-f1-micro | db-custom-2-4096 |
| Backup | Disabled | Daily at 3 AM |
| Point-in-time Recovery | No | Yes |
| Deletion Protection | No | Yes |
| Public Access | Yes (dev) | Restricted |

## 🔧 Common Operations

### View Current State
```bash
terraform show
```

### Destroy Infrastructure (⚠️ Careful!)
```bash
terraform destroy -var="environment=staging" -var="db_password=$STAGING_DB_PASSWORD"
```

### Import Existing Resources
```bash
# Import existing Cloud Run service
terraform import google_cloud_run_service.ai_square ai-square-staging

# Import existing SQL instance
terraform import google_sql_database_instance.main ai-square-db-staging
```

### Update Only Specific Resources
```bash
terraform apply -target=google_cloud_run_service.ai_square
```

## 🛡️ Security Notes

1. **Never commit passwords** to Git
2. Use **environment variables** for sensitive data
3. Store state in **encrypted GCS bucket**
4. Use **service accounts** with minimal permissions
5. Enable **audit logging** for production

## 🚨 Troubleshooting

### State Lock Issues
```bash
terraform force-unlock <lock-id>
```

### Refresh State
```bash
terraform refresh
```

### Validate Configuration
```bash
terraform validate
terraform fmt  # Format code
```

## 📈 Benefits vs Manual Deployment

| Manual (Current) | Terraform (IaC) |
|-----------------|-----------------|
| Forget env variables | All variables defined in code |
| Manual rollback | `terraform apply` previous version |
| No history | Complete change history in Git |
| Inconsistent environments | Identical configs with different vars |
| Hard to replicate | `terraform apply` creates everything |

## 🔄 Migration from Manual to Terraform

1. **Import existing resources** (don't recreate)
2. **Test in staging first**
3. **Compare with current setup**
4. **Gradually migrate production**

## 📝 Next Steps

1. Set up remote state backend ✅
2. Configure CI/CD integration
3. Add more monitoring alerts
4. Implement auto-scaling rules
5. Add VPC and private networking