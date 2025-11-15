# ============================================
# AI Square Terraform Tests
# ============================================
# Run with: terraform test
# ============================================

# Variables for testing
variables {
  environment = "production"
  # db_password should be set via environment variable or command line
  # Example: terraform test -var="db_password=$TF_VAR_db_password"
}

# ============================================
# Infrastructure Tests
# ============================================

# Test that all required resources are created
run "verify_infrastructure" {
  command = apply

  # Check SQL instance
  assert {
    condition     = google_sql_database_instance.main.state == "RUNNABLE"
    error_message = "SQL instance must be in RUNNABLE state"
  }

  assert {
    condition     = google_sql_database_instance.main.database_version == "POSTGRES_15"
    error_message = "Database must be PostgreSQL 15"
  }

  # Check database
  assert {
    condition     = google_sql_database.ai_square_db.name == "ai_square_db"
    error_message = "Database must be named ai_square_db"
  }

  # Check Cloud Run service
  assert {
    condition     = google_cloud_run_service.ai_square.location == "asia-east1"
    error_message = "Cloud Run service must be in asia-east1"
  }

  assert {
    condition     = length(google_cloud_run_service.ai_square.status) > 0
    error_message = "Cloud Run service must have status"
  }

  # Check IAM
  assert {
    condition     = google_cloud_run_service_iam_member.public_access.member == "allUsers"
    error_message = "Service must be publicly accessible"
  }

  assert {
    condition     = google_cloud_run_service_iam_member.public_access.role == "roles/run.invoker"
    error_message = "Public access must have run.invoker role"
  }
}

# ============================================
# Service Health Tests
# ============================================

run "health_check" {
  command = apply

  # Wait for service to be ready
  assert {
    condition     = can(google_cloud_run_service.ai_square.status[0].url)
    error_message = "Service must have a URL"
  }

  assert {
    condition     = startswith(google_cloud_run_service.ai_square.status[0].url, "https://")
    error_message = "Service URL must use HTTPS"
  }
}

# ============================================
# Database Initialization Tests
# ============================================

run "database_initialization" {
  command = apply

  # Check that initialization resources ran
  assert {
    condition     = null_resource.init_database_schema.id != null
    error_message = "Database schema initialization must have run"
  }

  assert {
    condition     = null_resource.seed_demo_accounts.id != null
    error_message = "Demo account seeding must have run"
  }

  assert {
    condition     = null_resource.init_scenarios.id != null
    error_message = "Scenario initialization must have run"
  }
}

# ============================================
# Monitoring Tests
# ============================================

run "monitoring_configuration" {
  command = apply

  # Check uptime monitoring
  assert {
    condition     = google_monitoring_uptime_check_config.health_check.display_name != ""
    error_message = "Health check must have a display name"
  }

  assert {
    condition     = google_monitoring_uptime_check_config.health_check.timeout == "10s"
    error_message = "Health check timeout must be 10 seconds"
  }

  assert {
    condition     = google_monitoring_uptime_check_config.health_check.period == "60s"
    error_message = "Health check period must be 60 seconds"
  }

  # Check alert policy
  assert {
    condition     = google_monitoring_alert_policy.api_failure.enabled == true
    error_message = "API failure alert must be enabled"
  }
}

# ============================================
# Security Tests
# ============================================

run "security_configuration" {
  command = apply

  # Check service account
  assert {
    condition     = google_service_account.ai_square_service.account_id == "ai-square-service"
    error_message = "Service account must have correct ID"
  }

  # Check IAM bindings
  assert {
    condition     = google_project_iam_member.cloudsql_client.role == "roles/cloudsql.client"
    error_message = "Service account must have Cloud SQL client role"
  }

  assert {
    condition     = google_project_iam_member.secret_accessor.role == "roles/secretmanager.secretAccessor"
    error_message = "Service account must have Secret Manager accessor role"
  }

  # Check secrets
  assert {
    condition     = google_secret_manager_secret.db_password.secret_id == "db-password-${var.environment}"
    error_message = "Database password secret must be environment-specific"
  }
}

# ============================================
# Output Tests
# ============================================

run "verify_outputs" {
  command = apply

  # Check required outputs exist
  assert {
    condition     = output.service_url != ""
    error_message = "Service URL output must not be empty"
  }

  assert {
    condition     = output.database_connection_name != ""
    error_message = "Database connection name output must not be empty"
  }

  assert {
    condition     = output.health_check_url != ""
    error_message = "Health check URL output must not be empty"
  }

  assert {
    condition     = output.service_account_email != ""
    error_message = "Service account email output must not be empty"
  }

  # Check output formats
  assert {
    condition     = can(regex("^https://.+\\.run\\.app$", output.service_url))
    error_message = "Service URL must be a valid Cloud Run URL"
  }

  assert {
    condition     = can(regex("^.+:asia-east1:.+$", output.database_connection_name))
    error_message = "Database connection name must include region"
  }
}

# ============================================
# Environment Consistency Tests
# ============================================

run "environment_consistency" {
  command = apply

  # Check naming consistency
  assert {
    condition     = google_sql_database_instance.main.name == "ai-square-db-${var.environment}"
    error_message = "SQL instance name must include environment"
  }

  assert {
    condition     = google_cloud_run_service.ai_square.name == "ai-square-${var.environment}"
    error_message = "Cloud Run service name must include environment"
  }

  assert {
    condition     = google_monitoring_uptime_check_config.health_check.display_name == "AI Square Health Check - ${var.environment}"
    error_message = "Health check name must include environment"
  }
}

# ============================================
# Deployment Validation Tests
# ============================================

run "deployment_validation" {
  command = apply

  # Check that deployment tests were configured
  assert {
    condition     = null_resource.deployment_tests.id != null
    error_message = "Deployment tests must have run"
  }

  # Verify demo accounts output structure
  assert {
    condition     = can(output.demo_accounts.student.email)
    error_message = "Demo accounts must include student email"
  }

  assert {
    condition     = output.demo_accounts.student.email == "student@example.com"
    error_message = "Student email must be correct"
  }

  assert {
    condition     = can(output.demo_accounts.teacher.email)
    error_message = "Demo accounts must include teacher email"
  }

  assert {
    condition     = output.demo_accounts.teacher.email == "teacher@example.com"
    error_message = "Teacher email must be correct"
  }

  assert {
    condition     = can(output.demo_accounts.admin.email)
    error_message = "Demo accounts must include admin email"
  }

  assert {
    condition     = output.demo_accounts.admin.email == "admin@example.com"
    error_message = "Admin email must be correct"
  }
}
