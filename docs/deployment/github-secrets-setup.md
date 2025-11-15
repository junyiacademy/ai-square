# GitHub Secrets Configuration for AI Square

## Required Secrets for Staging Deployment

The following secrets must be configured in GitHub Repository Settings → Secrets and variables → Actions:

### Database Connection Secrets

| Secret Name | Description | Example Format |
|-------------|-------------|----------------|
| `STAGING_DB_CONNECTION_NAME` | Cloud SQL instance connection name | `project-id:region:instance-name` |
| `STAGING_DB_USER` | Database username | `postgres` |
| `STAGING_DB_PASSWORD` | Database password | `[SECURE_PASSWORD]` |
| `STAGING_DB_NAME` | Database name | `ai_square_db` |

### Admin API Secret

| Secret Name | Description | Example Format |
|-------------|-------------|----------------|

### Service Account Secret

| Secret Name | Description | Example Format |
|-------------|-------------|----------------|
| `GCP_SA_KEY` | Service account JSON key | `{"type": "service_account", ...}` |

## How to Set Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Enter the secret name and value
5. Click "Add secret"

## Verification

After setting the secrets, the deployment workflow will validate them automatically. Check the "Validate Required Secrets" step in the GitHub Actions log.

## Security Notes

- Never commit actual passwords or secrets to the repository
- Use strong, unique passwords for each environment
- Rotate secrets regularly
- Limit access to GitHub secrets to authorized personnel only
