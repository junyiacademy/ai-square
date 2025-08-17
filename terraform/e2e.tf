# ============================================
# Post-Deployment E2E Testing
# ============================================
# Run E2E tests after infrastructure deployment
# ============================================

# Run E2E tests after deployment
resource "null_resource" "e2e_tests" {
  depends_on = [
    null_resource.wait_for_service,
    null_resource.init_database_schema,
    null_resource.seed_demo_accounts,
    null_resource.init_scenarios
  ]

  triggers = {
    service_url = google_cloud_run_service.ai_square.status[0].url
  }

  provisioner "local-exec" {
    working_dir = "${path.module}/../frontend"
    command = <<-EOT
      echo "🧪 Running E2E tests against ${google_cloud_run_service.ai_square.status[0].url}"
      
      # Install dependencies if needed
      if [ ! -d "node_modules" ]; then
        npm install
      fi
      
      # Install Playwright browsers if needed
      if [ ! -d "$HOME/.cache/ms-playwright" ]; then
        npx playwright install chromium --with-deps
      fi
      
      # Set environment variables for E2E tests
      export PLAYWRIGHT_BASE_URL="${google_cloud_run_service.ai_square.status[0].url}"
      export TEST_EMAIL="student@example.com"
      export TEST_PASSWORD="student123"
      
      # Run E2E tests
      npm run test:e2e -- \
        --project=chromium \
        --grep "critical|smoke" \
        --reporter=list \
        --retries=2
    EOT

    on_failure = continue # Don't fail deployment if tests fail
  }
}

# Separate critical path E2E tests
resource "null_resource" "critical_e2e_tests" {
  depends_on = [null_resource.e2e_tests]

  triggers = {
    service_url = google_cloud_run_service.ai_square.status[0].url
  }

  provisioner "local-exec" {
    working_dir = "${path.module}/../frontend"
    command = <<-EOT
      echo "🚨 Running critical E2E tests"
      
      export PLAYWRIGHT_BASE_URL="${google_cloud_run_service.ai_square.status[0].url}"
      
      # Run only critical tests
      npx playwright test \
        e2e/auth-flow.spec.ts \
        e2e/basic-health-check.spec.ts \
        --reporter=json \
        --output=critical-test-results.json
      
      # Check results
      if [ $? -ne 0 ]; then
        echo "❌ Critical E2E tests failed!"
        exit 1
      fi
      
      echo "✅ Critical E2E tests passed!"
    EOT
  }
}

# Performance E2E tests (optional)
resource "null_resource" "performance_e2e_tests" {
  count = var.run_performance_tests ? 1 : 0
  
  depends_on = [null_resource.critical_e2e_tests]

  triggers = {
    service_url = google_cloud_run_service.ai_square.status[0].url
  }

  provisioner "local-exec" {
    working_dir = "${path.module}/../frontend"
    command = <<-EOT
      echo "⚡ Running performance E2E tests"
      
      export PLAYWRIGHT_BASE_URL="${google_cloud_run_service.ai_square.status[0].url}"
      
      # Run performance tests
      npx playwright test \
        e2e/performance/*.spec.ts \
        --reporter=html \
        --workers=1
    EOT

    on_failure = continue
  }
}

# Output E2E test status
output "e2e_tests_url" {
  value = "${google_cloud_run_service.ai_square.status[0].url}/playwright-report"
  description = "URL to view E2E test results"
}

output "e2e_test_command" {
  value = "cd frontend && PLAYWRIGHT_BASE_URL=${google_cloud_run_service.ai_square.status[0].url} npm run test:e2e"
  description = "Command to manually run E2E tests"
}

# Variable to control E2E testing
variable "run_e2e_tests" {
  description = "Whether to run E2E tests after deployment"
  type        = bool
  default     = true
}

variable "run_performance_tests" {
  description = "Whether to run performance E2E tests"
  type        = bool
  default     = false
}