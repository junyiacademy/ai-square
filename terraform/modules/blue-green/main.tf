# ============================================
# Blue-Green Deployment Module for Cloud Run
# ============================================
# This module implements blue-green deployment pattern
# for zero-downtime deployments
# ============================================

locals {
  blue_service_name  = "${var.service_name}-blue"
  green_service_name = "${var.service_name}-green"
  
  # Determine which service is currently active
  active_service = var.active_color == "blue" ? local.blue_service_name : local.green_service_name
  inactive_service = var.active_color == "blue" ? local.green_service_name : local.blue_service_name
}

# ============================================
# Blue Service
# ============================================
resource "google_cloud_run_service" "blue" {
  name     = local.blue_service_name
  location = var.region

  template {
    spec {
      containers {
        image = var.blue_image
        
        dynamic "env" {
          for_each = var.env_vars
          content {
            name  = env.key
            value = env.value
          }
        }
        
        env {
          name  = "DEPLOYMENT_COLOR"
          value = "blue"
        }
        
        resources {
          limits = {
            cpu    = var.cpu_limit
            memory = var.memory_limit
          }
        }
      }
      
      service_account_name = var.service_account_email
    }
    
    metadata {
      annotations = merge(
        var.annotations,
        {
          "run.googleapis.com/cloudsql-instances" = var.cloudsql_instance
          "run.googleapis.com/startup-cpu-boost"   = "true"
        }
      )
      
      labels = merge(
        var.labels,
        {
          "deployment-color" = "blue"
          "service-type"     = "blue-green"
        }
      )
    }
  }

  traffic {
    percent         = var.active_color == "blue" ? 100 : 0
    latest_revision = true
  }

  autogenerate_revision_name = true
}

# ============================================
# Green Service
# ============================================
resource "google_cloud_run_service" "green" {
  name     = local.green_service_name
  location = var.region

  template {
    spec {
      containers {
        image = var.green_image
        
        dynamic "env" {
          for_each = var.env_vars
          content {
            name  = env.key
            value = env.value
          }
        }
        
        env {
          name  = "DEPLOYMENT_COLOR"
          value = "green"
        }
        
        resources {
          limits = {
            cpu    = var.cpu_limit
            memory = var.memory_limit
          }
        }
      }
      
      service_account_name = var.service_account_email
    }
    
    metadata {
      annotations = merge(
        var.annotations,
        {
          "run.googleapis.com/cloudsql-instances" = var.cloudsql_instance
          "run.googleapis.com/startup-cpu-boost"   = "true"
        }
      )
      
      labels = merge(
        var.labels,
        {
          "deployment-color" = "green"
          "service-type"     = "blue-green"
        }
      )
    }
  }

  traffic {
    percent         = var.active_color == "green" ? 100 : 0
    latest_revision = true
  }

  autogenerate_revision_name = true
}

# ============================================
# Main Service (Traffic Router)
# ============================================
resource "google_cloud_run_service" "main" {
  name     = var.service_name
  location = var.region

  template {
    spec {
      containers {
        # This is just a placeholder, actual traffic goes to blue/green
        image = var.active_color == "blue" ? var.blue_image : var.green_image
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = false
    revision_name   = var.active_color == "blue" ? 
      google_cloud_run_service.blue.status[0].latest_created_revision_name :
      google_cloud_run_service.green.status[0].latest_created_revision_name
  }
}

# ============================================
# IAM Bindings
# ============================================
resource "google_cloud_run_service_iam_member" "blue_public" {
  count    = var.allow_unauthenticated ? 1 : 0
  location = google_cloud_run_service.blue.location
  project  = google_cloud_run_service.blue.project
  service  = google_cloud_run_service.blue.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "green_public" {
  count    = var.allow_unauthenticated ? 1 : 0
  location = google_cloud_run_service.green.location
  project  = google_cloud_run_service.green.project
  service  = google_cloud_run_service.green.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "main_public" {
  count    = var.allow_unauthenticated ? 1 : 0
  location = google_cloud_run_service.main.location
  project  = google_cloud_run_service.main.project
  service  = google_cloud_run_service.main.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ============================================
# Health Check for Active Service
# ============================================
resource "null_resource" "health_check" {
  depends_on = [
    google_cloud_run_service.blue,
    google_cloud_run_service.green
  ]

  triggers = {
    active_color = var.active_color
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Checking health of ${var.active_color} deployment..."
      
      ACTIVE_URL="${var.active_color == "blue" ? google_cloud_run_service.blue.status[0].url : google_cloud_run_service.green.status[0].url}"
      
      for i in {1..30}; do
        if curl -sf "$${ACTIVE_URL}/api/health" > /dev/null 2>&1; then
          echo "✅ ${var.active_color} deployment is healthy!"
          exit 0
        fi
        echo "Waiting for ${var.active_color} deployment... ($i/30)"
        sleep 10
      done
      
      echo "❌ ${var.active_color} deployment health check failed!"
      exit 1
    EOT
  }
}

# ============================================
# Canary Deployment Support
# ============================================
resource "null_resource" "canary_deployment" {
  count = var.enable_canary ? 1 : 0
  
  depends_on = [null_resource.health_check]

  provisioner "local-exec" {
    command = <<-EOT
      echo "Starting canary deployment..."
      
      # Get the inactive service URL
      INACTIVE_URL="${var.active_color == "blue" ? google_cloud_run_service.green.status[0].url : google_cloud_run_service.blue.status[0].url}"
      
      # Test the inactive service
      if ! curl -sf "$${INACTIVE_URL}/api/health" > /dev/null 2>&1; then
        echo "❌ Inactive service health check failed!"
        exit 1
      fi
      
      echo "✅ Inactive service is healthy, ready for traffic shift"
    EOT
  }
}

# ============================================
# Outputs
# ============================================
output "active_service_url" {
  value = var.active_color == "blue" ? 
    google_cloud_run_service.blue.status[0].url :
    google_cloud_run_service.green.status[0].url
  description = "URL of the currently active service"
}

output "inactive_service_url" {
  value = var.active_color == "blue" ? 
    google_cloud_run_service.green.status[0].url :
    google_cloud_run_service.blue.status[0].url
  description = "URL of the currently inactive service"
}

output "main_service_url" {
  value = google_cloud_run_service.main.status[0].url
  description = "URL of the main service (traffic router)"
}

output "blue_service_name" {
  value = google_cloud_run_service.blue.name
}

output "green_service_name" {
  value = google_cloud_run_service.green.name
}

output "active_revision" {
  value = var.active_color == "blue" ? 
    google_cloud_run_service.blue.status[0].latest_created_revision_name :
    google_cloud_run_service.green.status[0].latest_created_revision_name
}

output "inactive_revision" {
  value = var.active_color == "blue" ? 
    google_cloud_run_service.green.status[0].latest_created_revision_name :
    google_cloud_run_service.blue.status[0].latest_created_revision_name
}