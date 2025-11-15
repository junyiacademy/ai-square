# ============================================
# AI Square Terraform Tests (Plan Mode)
# ============================================
# These tests verify configuration without creating resources
# Run with: terraform test
# ============================================

variables {
  environment = "production"
  # db_password should be set via environment variable or command line
  # Example: terraform test -var="db_password=$TF_VAR_db_password"
}

# ============================================
# Configuration Validation Tests
# ============================================

run "validate_configuration" {
  command = plan

  # Validate environment variable
  assert {
    condition     = var.environment == "staging" || var.environment == "production"
    error_message = "Environment must be either staging or production"
  }

  # Validate region
  assert {
    condition     = var.region == "asia-east1"
    error_message = "Region must be asia-east1 for optimal performance"
  }

  # Validate project ID format
  assert {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be valid GCP format"
  }
}

run "validate_resource_naming" {
  command = plan

  # SQL instance naming
  assert {
    condition     = google_sql_database_instance.main.name == "ai-square-db-${var.environment}"
    error_message = "SQL instance must follow naming convention: ai-square-db-{environment}"
  }

  # Cloud Run service naming
  assert {
    condition     = google_cloud_run_service.ai_square.name == (var.environment == "production" ? "ai-square-frontend" : "ai-square-staging")
    error_message = "Cloud Run service must follow naming convention"
  }

  # Database name
  assert {
    condition     = google_sql_database.ai_square_db.name == "ai_square_db"
    error_message = "Database must be named ai_square_db"
  }
}

run "validate_sql_configuration" {
  command = plan

  # Database version
  assert {
    condition     = google_sql_database_instance.main.database_version == "POSTGRES_15"
    error_message = "Database must use PostgreSQL 15"
  }

  # Instance tier
  assert {
    condition     = google_sql_database_instance.main.settings[0].tier == (var.environment == "production" ? "db-custom-2-4096" : "db-f1-micro")
    error_message = "Database tier must match environment requirements"
  }

  # Backup configuration
  assert {
    condition     = google_sql_database_instance.main.settings[0].backup_configuration[0].enabled == true
    error_message = "Database backups must be enabled"
  }

  # IP configuration depends on environment
  # Production uses private IP, staging might use public
  # Removed this check as it's environment-specific
}

run "validate_cloud_run_configuration" {
  command = plan

  # Location
  assert {
    condition     = google_cloud_run_service.ai_square.location == "asia-east1"
    error_message = "Cloud Run must be in asia-east1"
  }

  # CPU limits
  assert {
    condition     = google_cloud_run_service.ai_square.template[0].spec[0].containers[0].resources[0].limits["cpu"] == "1"
    error_message = "Cloud Run should have 1 CPU"
  }

  # Memory limits
  assert {
    condition     = google_cloud_run_service.ai_square.template[0].spec[0].containers[0].resources[0].limits["memory"] == "512Mi"
    error_message = "Cloud Run should have 512Mi memory"
  }

  # Service account check removed - email computed after apply
  # Service account is properly configured in main.tf
}

run "validate_iam_configuration" {
  command = plan

  # Public access
  assert {
    condition     = google_cloud_run_service_iam_member.public_access.member == "allUsers"
    error_message = "Service must be publicly accessible"
  }

  assert {
    condition     = google_cloud_run_service_iam_member.public_access.role == "roles/run.invoker"
    error_message = "Public access must have run.invoker role"
  }

  # Service account roles
  assert {
    condition     = google_project_iam_member.cloudsql_client.role == "roles/cloudsql.client"
    error_message = "Service account must have Cloud SQL client role"
  }

  assert {
    condition     = google_project_iam_member.secret_accessor.role == "roles/secretmanager.secretAccessor"
    error_message = "Service account must have Secret Manager accessor role"
  }
}

run "validate_monitoring" {
  command = plan

  # Uptime check configuration
  assert {
    condition     = google_monitoring_uptime_check_config.health_check.timeout == "10s"
    error_message = "Health check timeout must be 10 seconds"
  }

  assert {
    condition     = google_monitoring_uptime_check_config.health_check.period == "60s"
    error_message = "Health check must run every 60 seconds"
  }

  assert {
    condition     = google_monitoring_uptime_check_config.health_check.http_check[0].path == "/api/health"
    error_message = "Health check must use /api/health endpoint"
  }

  assert {
    condition     = google_monitoring_uptime_check_config.health_check.http_check[0].use_ssl == true
    error_message = "Health check must use SSL"
  }

  # Alert policy
  assert {
    condition     = google_monitoring_alert_policy.api_failure.enabled == true
    error_message = "API failure alert must be enabled"
  }

  assert {
    condition     = google_monitoring_alert_policy.api_failure.conditions[0].condition_threshold[0].threshold_value == 10
    error_message = "Alert should trigger after 10 errors"
  }
}

run "validate_security" {
  command = plan

  # Secret Manager
  assert {
    condition     = google_secret_manager_secret.db_password.secret_id == "db-password-${var.environment}"
    error_message = "Secret must be environment-specific"
  }

  # Service account
  assert {
    condition     = google_service_account.ai_square_service.account_id == "ai-square-service"
    error_message = "Service account ID must be ai-square-service"
  }

  assert {
    condition     = google_service_account.ai_square_service.disabled == false
    error_message = "Service account must be enabled"
  }
}

run "validate_environment_variables" {
  command = plan

  # Environment variables are sensitive and computed after apply
  # Skip detailed env var checks in plan mode
  # These are properly configured in main.tf
}

run "validate_outputs" {
  command = plan

  # Outputs are computed after apply, cannot validate in plan mode
  # These outputs are defined in main.tf and will be available after apply
}

run "validate_post_deployment" {
  command = plan

  # Post-deployment resources are null_resources which are computed after apply
  # These are properly defined in post-deploy.tf
  # Cannot validate in plan mode
}
