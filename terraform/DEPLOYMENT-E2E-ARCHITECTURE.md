# Deployment and E2E Testing Architecture

## Overview

This document describes the clean separation of concerns between Terraform and Makefile for deployment and E2E testing.

## Architecture Principles

### 1. Terraform Responsibilities
- **Infrastructure provisioning**: Cloud Run, Cloud SQL, networking
- **Basic validation**: Simple smoke tests to verify deployment
- **Configuration outputs**: URLs, credentials, and environment variables for testing
- **Resource dependencies**: Ensure proper initialization order

### 2. Makefile Responsibilities
- **Orchestration**: Coordinate complex deployment workflows
- **E2E test execution**: Run Playwright tests with proper setup
- **Environment management**: Handle workspaces and variables
- **Reporting**: Generate and display test results

## E2E Testing Architecture

### Terraform (e2e.tf)
The `e2e.tf` file now focuses on:
1. **Smoke tests**: Basic HTTP checks to verify service is responding
2. **Configuration outputs**: Service URLs, test credentials, environment variables
3. **Test command references**: Document how to run various test suites

Example outputs:
```hcl
output "e2e_service_url" {
  value = google_cloud_run_service.ai_square.status[0].url
}

output "e2e_test_credentials" {
  value = {
    student_email = "student@example.com"
    # ... other test accounts
  }
}
```

### Makefile (E2E Targets)
The Makefile provides specialized targets for different testing needs:

#### Core E2E Targets
- `make e2e`: Run complete E2E test suite
- `make e2e-smoke`: Quick smoke tests only
- `make e2e-critical`: Critical path tests
- `make e2e-auth`: Authentication flow tests
- `make e2e-debug`: Run tests in headed mode for debugging
- `make e2e-report`: View test results

#### E2E Test Flow
```bash
# 1. Select workspace
terraform workspace select $ENV

# 2. Get service URL from Terraform output
SERVICE_URL=$(terraform output -raw e2e_service_url)

# 3. Install dependencies if needed
npm install
npx playwright install

# 4. Run tests with proper environment
PLAYWRIGHT_BASE_URL=$SERVICE_URL npm run test:e2e
```

## Usage Examples

### Complete Deployment with E2E Tests
```bash
# Deploy to staging with full validation
make deploy-staging

# This runs:
# 1. Security checks
# 2. Terraform apply
# 3. Wait for health
# 4. E2E tests
# 5. Deployment summary
```

### Targeted E2E Testing
```bash
# Run specific test suites after deployment
make e2e-smoke ENV=staging      # Quick validation
make e2e-critical ENV=staging   # Essential flows
make e2e-auth ENV=staging       # Auth testing
```

### Debug Failed Tests
```bash
# Run tests with browser visible
make e2e-debug ENV=staging

# View detailed report
make e2e-report
```

## Benefits of This Architecture

1. **Clear separation**: Infrastructure code vs test execution logic
2. **Flexibility**: Easy to add new test suites without modifying Terraform
3. **Maintainability**: Test logic in Makefile is easier to debug and modify
4. **Reusability**: Same Makefile targets work for any environment
5. **Performance**: Skip unnecessary Terraform runs when just testing

## Migration from Old Architecture

### Before (Complex e2e.tf)
- Terraform ran npm install, Playwright install, and tests
- Hard to debug failures
- Mixed concerns between infrastructure and testing
- Difficult to run tests independently

### After (Clean separation)
- Terraform only does basic smoke tests
- Makefile handles all complex test orchestration
- Easy to run tests multiple times without Terraform
- Clear debugging path for test failures

## Best Practices

1. **Use Terraform outputs**: Always get URLs and config from Terraform outputs
2. **Environment variables**: Pass test configuration via environment
3. **Fail gracefully**: E2E test failures shouldn't break deployment
4. **Progressive testing**: smoke → critical → full suite
5. **Cache dependencies**: Check for node_modules before installing

## Future Enhancements

1. **Parallel test execution**: Run test suites in parallel for faster feedback
2. **Test result artifacts**: Upload results to GCS for historical tracking
3. **Performance benchmarks**: Add performance testing targets
4. **Visual regression tests**: Add screenshot comparison tests
5. **API contract tests**: Validate API responses against schemas