# ============================================
# AI Square Infrastructure as Code (Clean Version)
# ============================================
# Terraform ONLY manages infrastructure
# NO application logic, NO data initialization
# ============================================

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  
  backend "gcs" {
    bucket = "ai-square-terraform-state"
    prefix = "terraform/state"
  }
}

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
    error_message = "Environment must be staging or production"
  }
}

variable "db_password" {
  description = "Password for the database user"
  type        = string
  sensitive   = true
}

# ============================================
# Cloud SQL Instance (Database Server)
# ============================================
resource "google_sql_database_instance" "main" {
  name             = "ai-square-db-${var.environment}-asia"
  database_version = "POSTGRES_15"
  region          = var.region
  
  settings {
    tier = var.environment == "production" ? "db-n1-standard-1" : "db-f1-micro"
    
    database_flags {
      name  = "log_connections"
      value = "on"
    }
    
    ip_configuration {
      ipv4_enabled = true
      
      dynamic "authorized_networks" {
        for_each = var.environment == "production" ? [] : ["0.0.0.0/0"]
        content {
          name  = "allow-all-dev"
          value = authorized_networks.value
        }
      }
    }
    
    backup_configuration {
      enabled            = var.environment == "production"
      start_time        = "03:00"
      location          = var.region
      point_in_time_recovery_enabled = var.environment == "production"
    }
  }
  
  deletion_protection = var.environment == "production"
}

# ============================================
# Database
# ============================================
resource "google_sql_database" "ai_square_db" {
  name     = "ai_square_db"
  instance = google_sql_database_instance.main.name
}

# ============================================
# Database User
# ============================================
resource "google_sql_user" "postgres" {
  name     = "postgres"
  instance = google_sql_database_instance.main.name
  password = var.db_password
}

# ============================================
# Service Account for Cloud Run
# ============================================
resource "google_service_account" "cloud_run" {
  account_id   = "ai-square-${var.environment}"
  display_name = "AI Square ${var.environment} Service Account"
}

# Grant Cloud SQL Client role
resource "google_project_iam_member" "cloud_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# ============================================
# Cloud Run Service
# ============================================
resource "google_cloud_run_service" "ai_square" {
  name     = "ai-square-${var.environment}"
  location = var.region
  
  template {
    spec {
      service_account_name = google_service_account.cloud_run.email
      
      containers {
        image = "gcr.io/${var.project_id}/ai-square-${var.environment}:latest"
        
        resources {
          limits = {
            cpu    = var.environment == "production" ? "2" : "1"
            memory = var.environment == "production" ? "2Gi" : "512Mi"
          }
        }
        
        # Basic environment variables only
        env {
          name  = "NODE_ENV"
          value = var.environment
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
      }
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale"      = var.environment == "production" ? "1" : "0"
        "autoscaling.knative.dev/maxScale"      = var.environment == "production" ? "10" : "5"
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.main.connection_name
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [
    google_project_iam_member.cloud_sql_client
  ]
}

# ============================================
# Public Access
# ============================================
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.ai_square.name
  location = google_cloud_run_service.ai_square.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ============================================
# Outputs for GitHub Actions
# ============================================
output "service_url" {
  value = google_cloud_run_service.ai_square.status[0].url
  description = "The URL of the Cloud Run service"
}

output "db_connection_name" {
  value = google_sql_database_instance.main.connection_name
  description = "Cloud SQL connection name for the app"
}

output "db_host" {
  value = "/cloudsql/${google_sql_database_instance.main.connection_name}"
  description = "Database host for Unix socket connection"
}

output "service_account_email" {
  value = google_service_account.cloud_run.email
  description = "Service account email for the Cloud Run service"
}