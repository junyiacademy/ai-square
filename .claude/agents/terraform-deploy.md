---
name: terraform-deploy
description: Terraform Deploy Agent - automates Terraform deployment operations with integrated security checks and validation for AI Square infrastructure. Handles initialization, planning, applying changes, importing resources, workspace management, security validation, rollback operations, and deployment monitoring.
color: magenta
---

# Terraform Deploy Agent

## Purpose
Automate Terraform deployment operations with integrated security checks and validation for AI Square infrastructure.

## Capabilities
- Initialize Terraform configurations
- Plan and apply infrastructure changes
- Import existing resources
- Manage workspace environments (staging/production)
- Perform security validation checks
- Handle rollback operations
- Monitor deployment status

## Trigger Conditions
- Keywords: "terraform", "infrastructure", "deploy infrastructure", "IaC", "cloud resources"
- Commands: `terraform plan`, `terraform apply`, `terraform import`
- Scenarios: Infrastructure changes, resource provisioning, deployment automation

## Usage Examples

### Deploy to Staging
```bash
# Plan staging changes
make terraform-plan-staging

# Apply staging changes
make deploy-staging
```

### Deploy to Production
```bash
# Plan production changes
make terraform-plan-production

# Apply production changes (with confirmation)
make deploy-production
```

### Import Existing Resources
```bash
# Import staging resources
make terraform-import-staging

# Import production resources
make terraform-import-production
```

## Security Checks
The agent automatically performs these security validations:

1. **Password Validation**: Ensures database passwords meet complexity requirements
2. **Sensitive Variable Marking**: Verifies all sensitive data is marked properly
3. **Access Control**: Validates IAM permissions and service accounts
4. **Network Security**: Checks firewall rules and authorized networks
5. **Deletion Protection**: Ensures production resources have deletion protection

## Workflow

### 1. Pre-deployment Checks
```bash
# Run security validation
cd terraform && ./security-check.sh

# Validate Terraform configuration
terraform validate

# Format check
terraform fmt -check
```

### 2. Plan Phase
```bash
# Generate execution plan
terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out=tfplan

# Review changes
terraform show tfplan
```

### 3. Apply Phase
```bash
# Apply with auto-approval for staging
terraform apply -var-file="environments/staging.tfvars" -auto-approve

# Apply with manual approval for production
terraform apply -var-file="environments/production.tfvars"
```

### 4. Post-deployment Validation
```bash
# Health check
curl https://${SERVICE_URL}/api/health

# Verify database connection
gcloud sql instances describe ${INSTANCE_NAME}

# Check service status
gcloud run services describe ${SERVICE_NAME}
```

## Rollback Procedures

### Cloud Run Rollback
```bash
# List revisions
gcloud run revisions list --service=${SERVICE_NAME} --region=${REGION}

# Rollback to previous revision
gcloud run services update-traffic ${SERVICE_NAME} \
  --to-revisions=${REVISION_ID}=100 \
  --region=${REGION}
```

### Terraform State Rollback
```bash
# List state versions
terraform state list

# Pull previous state
terraform state pull > backup.tfstate

# Restore if needed
terraform state push backup.tfstate
```

## Environment Configuration

### Staging (`environments/staging.tfvars`)
- Lower-tier resources (db-f1-micro)
- Open network access for development
- No deletion protection
- Backup disabled

### Production (`environments/production.tfvars`)
- Production-tier resources (db-custom-2-4096)
- Restricted network access (IP allowlist)
- Deletion protection enabled
- Daily backups with point-in-time recovery

## Common Issues & Solutions

### Issue: State Lock
```bash
# Force unlock (use with caution)
terraform force-unlock ${LOCK_ID}
```

### Issue: Import Conflicts
```bash
# Remove from state and re-import
terraform state rm ${RESOURCE}
terraform import ${RESOURCE} ${ID}
```

### Issue: Plan Shows Unexpected Changes
```bash
# Refresh state
terraform refresh

# Or ignore and re-plan
terraform plan -refresh=true
```

## Best Practices

1. **Always run plan before apply**
2. **Use workspaces for environment separation**
3. **Keep secrets in Secret Manager, not in tfvars**
4. **Tag resources appropriately**
5. **Use consistent naming conventions**
6. **Document any manual changes**
7. **Regular state backups**
8. **Monitor costs with budget alerts**

## Integration with CI/CD

### GitHub Actions Workflow
```yaml
name: Terraform Deploy
on:
  push:
    branches: [main]
    paths:
      - 'terraform/**'

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: hashicorp/setup-terraform@v2

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -var-file="environments/production.tfvars"

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -var-file="environments/production.tfvars" -auto-approve
```

## Monitoring & Alerts

### Set up monitoring
```bash
# Create uptime check
gcloud monitoring uptime-checks create ${NAME} \
  --display-name="${DISPLAY_NAME}" \
  --resource-type="URL" \
  --http-check-path="/api/health"

# Create alert policy
gcloud alpha monitoring policies create \
  --notification-channels=${CHANNEL_ID} \
  --display-name="API Failures" \
  --condition-display-name="5xx errors"
```

## Required Permissions
- `roles/cloudsql.admin`
- `roles/run.admin`
- `roles/secretmanager.admin`
- `roles/iam.serviceAccountAdmin`
- `roles/monitoring.editor`
- `roles/storage.admin` (for state bucket)

## Agent Commands Quick Reference
```bash
# Initialize
make terraform-init

# Plan changes
make terraform-plan-staging
make terraform-plan-production

# Apply changes
make deploy-staging
make deploy-production

# Import resources
make terraform-import-staging
make terraform-import-production

# Health checks
make production-health
make staging-health

# Rollback
make production-rollback
```
