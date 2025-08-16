# ============================================
# AI Square Infrastructure as Code
# ============================================
# This Terraform configuration manages all cloud
# infrastructure for the AI Square platform
# ============================================

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  
  # Store state in GCS bucket
  backend "gcs" {
    bucket = "ai-square-terraform-state"
    prefix = "terraform/state"
  }
}

# ============================================
# Provider Configuration
# ============================================
provider "google" {
  project = var.project_id
  region  = var.region
}

# ============================================
# Variables
# ============================================
variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "ai-square-463013"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-east1"
}

variable "environment" {
  description = "Environment (staging or production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either staging or production."
  }
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.db_password) >= 8
    error_message = "Database password must be at least 8 characters."
  }
}

# ============================================
# Service Account
# ============================================
resource "google_service_account" "ai_square_service" {
  account_id   = "ai-square-service"
  display_name = "AI Square Service Account"
  description  = "Service account for AI Square Cloud Run services"
}

# Grant necessary roles to service account
resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.ai_square_service.email}"
}

resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.ai_square_service.email}"
}

# ============================================
# Cloud SQL Database
# ============================================
resource "google_sql_database_instance" "main" {
  name             = "ai-square-db-${var.environment}"
  database_version = "POSTGRES_15"
  region          = var.region

  settings {
    tier = var.environment == "production" ? "db-custom-2-4096" : "db-f1-micro"
    
    ip_configuration {
      ipv4_enabled    = true
      private_network = null
      
      dynamic "authorized_networks" {
        for_each = var.environment == "production" ? [] : [1]
        content {
          name  = "allow-all-dev"
          value = "0.0.0.0/0"
        }
      }
    }
    
    backup_configuration {
      enabled            = var.environment == "production"
      start_time        = "03:00"
      location          = var.region
      point_in_time_recovery_enabled = var.environment == "production"
    }
    
    maintenance_window {
      day          = 7  # Sunday
      hour         = 3
      update_track = "stable"
    }
  }
  
  deletion_protection = var.environment == "production"
}

resource "google_sql_database" "ai_square_db" {
  name     = "ai_square_db"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "postgres" {
  name     = "postgres"
  instance = google_sql_database_instance.main.name
  password = var.db_password
}

# ============================================
# Secret Manager
# ============================================
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password-${var.environment}"
  
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

# ============================================
# Cloud Run Service
# ============================================
resource "google_cloud_run_service" "ai_square" {
  name     = var.environment == "production" ? "ai-square-frontend" : "ai-square-staging"
  location = var.region

  template {
    spec {
      service_account_name = google_service_account.ai_square_service.email
      
      containers {
        image = "gcr.io/${var.project_id}/${var.environment == "production" ? "ai-square-frontend" : "ai-square-staging"}:latest"
        
        resources {
          limits = {
            memory = "512Mi"
            cpu    = "1"
          }
        }
        
        # Environment variables - ALL required variables defined here
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        
        env {
          name  = "DB_HOST"
          value = "/cloudsql/${var.project_id}:${var.region}:${google_sql_database_instance.main.name}"
        }
        
        env {
          name  = "DB_NAME"
          value = google_sql_database.ai_square_db.name
        }
        
        env {
          name  = "DB_USER"
          value = google_sql_user.postgres.name
        }
        
        env {
          name = "DB_PASSWORD"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.db_password.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name  = "DATABASE_URL"
          value = "postgresql://${google_sql_user.postgres.name}:${var.db_password}@/${google_sql_database.ai_square_db.name}?host=/cloudsql/${var.project_id}:${var.region}:${google_sql_database_instance.main.name}"
        }
      }
    }
    
    metadata {
      annotations = {
        "run.googleapis.com/cloudsql-instances" = "${var.project_id}:${var.region}:${google_sql_database_instance.main.name}"
        "run.googleapis.com/cpu-throttling"     = "false"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Allow unauthenticated access
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.ai_square.name
  location = google_cloud_run_service.ai_square.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ============================================
# Monitoring & Alerts
# ============================================
resource "google_monitoring_uptime_check_config" "health_check" {
  display_name = "AI Square Health Check - ${var.environment}"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/api/health"
    port         = "443"
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = google_cloud_run_service.ai_square.status[0].url
    }
  }
}

resource "google_monitoring_alert_policy" "api_failure" {
  display_name = "AI Square API Failure - ${var.environment}"
  combiner     = "OR"
  
  conditions {
    display_name = "API Health Check Failed"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 10
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  notification_channels = [] # Add Slack/Email notification channels here
  
  alert_strategy {
    auto_close = "86400s"
  }
}

# ============================================
# Outputs
# ============================================
output "service_url" {
  description = "URL of the Cloud Run service"
  value       = google_cloud_run_service.ai_square.status[0].url
}

output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.main.connection_name
}

output "service_account_email" {
  description = "Service account email"
  value       = google_service_account.ai_square_service.email
}