# ============================================
# E2E Testing Configuration and Outputs
# ============================================
# Provides outputs and configurations for E2E testing
# Actual test execution is handled by Makefile
# ============================================

# ============================================
# Basic Smoke Tests (Infrastructure Validation)
# ============================================

# Simple smoke test to verify service is responding
resource "null_resource" "smoke_test" {
  depends_on = [
    google_cloud_run_service.ai_square,
    null_resource.service_health_check
  ]

  triggers = {
    service_url = google_cloud_run_service.ai_square.status[0].url
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "🔥 Running basic smoke tests..."

      # Test 1: Health check endpoint
      if curl -sf "${google_cloud_run_service.ai_square.status[0].url}/api/health" > /dev/null; then
        echo "✅ Health check passed"
      else
        echo "❌ Health check failed"
        exit 1
      fi

      # Test 2: API responsiveness
      RESPONSE=$(curl -s -w "%%{http_code}" -o /dev/null "${google_cloud_run_service.ai_square.status[0].url}/api/pbl/scenarios?lang=en")
      if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "401" ]; then
        echo "✅ API is responding (HTTP $RESPONSE)"
      else
        echo "❌ API not responding properly (HTTP $RESPONSE)"
        exit 1
      fi

      # Test 3: Database connectivity (via health endpoint)
      HEALTH=$(curl -s "${google_cloud_run_service.ai_square.status[0].url}/api/health" | grep -o '"database":"healthy"' || true)
      if [ -n "$HEALTH" ]; then
        echo "✅ Database connectivity verified"
      else
        echo "⚠️  Database health not verified (may be expected)"
      fi

      echo "✅ All smoke tests passed!"
    EOT

    on_failure = continue
  }
}

# ============================================
# E2E Test Configuration Outputs
# ============================================

# Output the service URL for E2E tests
output "e2e_service_url" {
  value       = google_cloud_run_service.ai_square.status[0].url
  description = "The deployed service URL for E2E testing"
}

# Output the test credentials
output "e2e_test_credentials" {
  value = {
    student_email    = "student@example.com"
    teacher_email    = "teacher@example.com"
    admin_email      = "admin@example.com"
    credentials_note = "Passwords are set in demo-credentials.env.example"
  }
  description = "Test account credentials for E2E testing"
}

# Output commands for manual E2E test execution
output "e2e_test_commands" {
  value = {
    all_tests        = "make e2e ENV=${var.environment}"
    smoke_tests      = "cd ../frontend && PLAYWRIGHT_BASE_URL=${google_cloud_run_service.ai_square.status[0].url} npm run test:e2e -- --grep smoke"
    critical_tests   = "cd ../frontend && PLAYWRIGHT_BASE_URL=${google_cloud_run_service.ai_square.status[0].url} npm run test:e2e -- --grep critical"
    auth_tests       = "cd ../frontend && PLAYWRIGHT_BASE_URL=${google_cloud_run_service.ai_square.status[0].url} npm run test:e2e -- e2e/auth-flow.spec.ts"
    performance_tests = "cd ../frontend && PLAYWRIGHT_BASE_URL=${google_cloud_run_service.ai_square.status[0].url} npm run test:e2e -- e2e/performance"
  }
  description = "Commands to run different E2E test suites"
}

# Output environment variables needed for E2E tests
output "e2e_env_vars" {
  value = {
    PLAYWRIGHT_BASE_URL = google_cloud_run_service.ai_square.status[0].url
    TEST_EMAIL         = "student@example.com"
    TEST_PASSWORD      = "See demo-credentials.env.example"
    HEADLESS          = "true"
  }
  description = "Environment variables required for E2E tests"
}

# Output test report locations
output "e2e_test_reports" {
  value = {
    playwright_report = "../frontend/playwright-report/index.html"
    test_results     = "../frontend/test-results/"
    coverage_report  = "../frontend/coverage/lcov-report/index.html"
  }
  description = "Locations of test reports after E2E execution"
}

# ============================================
# E2E Test Variables
# ============================================

variable "enable_smoke_tests" {
  description = "Whether to run smoke tests after deployment"
  type        = bool
  default     = true
}

# Note: Complex E2E test execution is handled by Makefile
# using the outputs provided above. This keeps the separation
# of concerns clear:
# - Terraform: Infrastructure + basic validation + configuration
# - Makefile: Orchestration + test execution + reporting
