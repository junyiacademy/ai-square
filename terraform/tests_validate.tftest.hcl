# ============================================
# AI Square Deployment Validation Tests
# ============================================
# These tests validate existing deployment
# Run with: terraform test
# ============================================

variables {
  environment = "production"
  # db_password should be set via environment variable or command line
  # Example: terraform test -var="db_password=$TF_VAR_db_password"
}

# ============================================
# Basic Configuration Tests
# ============================================

run "basic_validation" {
  command = plan

  # Validate required variables are set
  assert {
    condition     = var.environment != ""
    error_message = "Environment must be set"
  }

  assert {
    condition     = var.db_password != ""
    error_message = "Database password must be set"
  }

  assert {
    condition     = var.project_id == "ai-square-463013"
    error_message = "Project ID must be ai-square-463013"
  }

  assert {
    condition     = var.region == "asia-east1"
    error_message = "Region must be asia-east1"
  }
}

# ============================================
# Resource Existence Tests
# ============================================

run "resources_exist" {
  command = plan

  # Check core resources are defined
  assert {
    condition     = can(google_sql_database_instance.main)
    error_message = "SQL instance resource must be defined"
  }

  assert {
    condition     = can(google_sql_database.ai_square_db)
    error_message = "Database resource must be defined"
  }

  assert {
    condition     = can(google_cloud_run_service.ai_square)
    error_message = "Cloud Run service must be defined"
  }

  assert {
    condition     = can(google_service_account.ai_square_service)
    error_message = "Service account must be defined"
  }
}

# ============================================
# Critical Configuration Tests
# ============================================

run "critical_config" {
  command = plan

  # Database must be PostgreSQL 15
  assert {
    condition     = google_sql_database_instance.main.database_version == "POSTGRES_15"
    error_message = "Database must be PostgreSQL 15"
  }

  # Database name must be correct
  assert {
    condition     = google_sql_database.ai_square_db.name == "ai_square_db"
    error_message = "Database must be named ai_square_db"
  }

  # Cloud Run must be in correct region
  assert {
    condition     = google_cloud_run_service.ai_square.location == "asia-east1"
    error_message = "Cloud Run must be in asia-east1"
  }

  # Public access must be configured
  assert {
    condition     = google_cloud_run_service_iam_member.public_access.member == "allUsers"
    error_message = "Service must be publicly accessible"
  }
}

# ============================================
# Security Configuration Tests
# ============================================

run "security_config" {
  command = plan

  # Service account roles
  assert {
    condition     = google_project_iam_member.cloudsql_client.role == "roles/cloudsql.client"
    error_message = "Service account must have Cloud SQL client role"
  }

  assert {
    condition     = google_project_iam_member.secret_accessor.role == "roles/secretmanager.secretAccessor"
    error_message = "Service account must have Secret Manager accessor role"
  }

  # Secret is environment-specific
  assert {
    condition     = google_secret_manager_secret.db_password.secret_id == "db-password-${var.environment}"
    error_message = "Database password secret must be environment-specific"
  }
}

# ============================================
# Monitoring Configuration Tests
# ============================================

run "monitoring_config" {
  command = plan

  # Health check configuration
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
}

# ============================================
# Post-Deployment Resources Tests
# ============================================

run "post_deployment" {
  command = plan

  # All post-deployment resources must be defined
  assert {
    condition     = can(null_resource.init_database_schema)
    error_message = "Database schema initialization must be defined"
  }

  assert {
    condition     = can(null_resource.seed_demo_accounts)
    error_message = "Demo account seeding must be defined"
  }

  assert {
    condition     = can(null_resource.init_scenarios)
    error_message = "Scenario initialization must be defined"
  }
}

# ============================================
# Output Tests
# ============================================

run "outputs_defined" {
  command = plan

  # Critical outputs must be defined
  assert {
    condition     = can(output.service_url)
    error_message = "service_url output must be defined"
  }

  assert {
    condition     = can(output.database_connection_name)
    error_message = "database_connection_name output must be defined"
  }

  assert {
    condition     = can(output.health_check_url)
    error_message = "health_check_url output must be defined"
  }

  assert {
    condition     = can(output.demo_accounts)
    error_message = "demo_accounts output must be defined"
  }

  assert {
    condition     = can(output.service_account_email)
    error_message = "service_account_email output must be defined"
  }
}
