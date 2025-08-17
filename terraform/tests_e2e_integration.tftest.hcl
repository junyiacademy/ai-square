# ============================================
# E2E Integration Tests with Terraform
# ============================================
# This test file integrates frontend E2E tests with Terraform deployment
# Run with: terraform test -filter=tests_e2e_integration.tftest.hcl
# ============================================

variables {
  environment = "staging"
  # db_password should be set via environment variable
}

# ============================================
# Deploy Infrastructure and Run E2E Tests
# ============================================

run "deploy_and_test_e2e" {
  command = apply

  # Step 1: Verify infrastructure is deployed
  assert {
    condition     = google_cloud_run_service.ai_square.status[0].url != ""
    error_message = "Cloud Run service must have a URL"
  }

  assert {
    condition     = google_sql_database_instance.main.state == "RUNNABLE"
    error_message = "Database must be in RUNNABLE state"
  }

  # Step 2: Wait for service to be ready
  assert {
    condition     = null_resource.wait_for_service.id != null
    error_message = "Service health check must complete"
  }

  # Step 3: Verify database initialization
  assert {
    condition     = null_resource.init_database_schema.id != null
    error_message = "Database schema must be initialized"
  }

  assert {
    condition     = null_resource.seed_demo_accounts.id != null
    error_message = "Demo accounts must be seeded"
  }
}

# ============================================
# Run Frontend E2E Tests
# ============================================

run "execute_e2e_tests" {
  command = apply

  # E2E tests are executed via null_resource in e2e.tf
  # Check that E2E test resources were created
  assert {
    condition     = null_resource.e2e_tests.id != null
    error_message = "E2E tests must be executed"
  }

  assert {
    condition     = null_resource.critical_e2e_tests.id != null
    error_message = "Critical E2E tests must be executed"
  }
}

# ============================================
# Specific E2E Test Scenarios
# ============================================

run "test_service_availability" {
  command = apply

  # Verify service is accessible
  assert {
    condition     = google_cloud_run_service.ai_square.status[0].url != ""
    error_message = "Service must have a public URL"
  }

  assert {
    condition     = startswith(google_cloud_run_service.ai_square.status[0].url, "https://")
    error_message = "Service must use HTTPS"
  }
}