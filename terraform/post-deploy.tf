# ============================================
# Post-Deployment Configuration (Clean Version)
# ============================================
# This file only handles infrastructure-level tasks
# All application initialization is handled by GitHub Actions
# ============================================

# Health check to ensure service is accessible
resource "null_resource" "service_health_check" {
  depends_on = [
    google_cloud_run_service.ai_square,
    google_cloud_run_service_iam_member.public_access
  ]

  triggers = {
    service_url = google_cloud_run_service.ai_square.status[0].url
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Service deployed at: ${google_cloud_run_service.ai_square.status[0].url}"
      echo "========================================="
      echo "Infrastructure deployment complete!"
      echo "========================================="
      echo ""
      echo "Next steps (handled by GitHub Actions):"
      echo "1. Initialize database schema"
      echo "2. Create demo accounts"  
      echo "3. Load scenario data"
      echo "4. Run E2E tests"
      echo ""
      echo "To trigger application deployment:"
      echo "  git push origin ${var.environment}"
      echo "========================================="
    EOT
  }
}

# Output deployment information
output "deployment_info" {
  value = {
    service_url     = google_cloud_run_service.ai_square.status[0].url
    database_host   = google_sql_database_instance.main.public_ip_address
    database_name   = google_sql_database.ai_square_db.name
    environment     = var.environment
    region          = var.region
    deployed_at     = timestamp()
  }
  
  description = "Infrastructure deployment information"
}

# Service readiness check only
output "service_ready" {
  value = "Infrastructure ready. Push to git branch to deploy application."
  depends_on = [null_resource.service_health_check]
}