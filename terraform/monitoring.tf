# ============================================
# Comprehensive Monitoring and Alerting Setup
# ============================================
# Implements monitoring dashboard, alerts, and
# automated response for production reliability
# ============================================

# ============================================
# Notification Channels
# ============================================
resource "google_monitoring_notification_channel" "slack" {
  display_name = "AI Square Slack Alerts"
  type         = "slack"
  
  labels = {
    "url" = var.slack_webhook_url
  }
  
  user_labels = {
    environment = var.environment
  }
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "AI Square Email Alerts"
  type         = "email"
  
  labels = {
    "email_address" = var.alert_email
  }
  
  user_labels = {
    environment = var.environment
  }
}

# ============================================
# Uptime Checks
# ============================================
resource "google_monitoring_uptime_check_config" "health_check" {
  display_name = "AI Square ${var.environment} Health Check"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/api/health"
    port         = "443"
    use_ssl      = true
    validate_ssl = true
    
    accepted_response_status_codes {
      status_class = "2XX"
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = google_cloud_run_service.ai_square.status[0].url
    }
  }
  
  selected_regions = ["USA", "ASIA_PACIFIC"]
}

resource "google_monitoring_uptime_check_config" "api_check" {
  display_name = "AI Square ${var.environment} API Check"
  timeout      = "10s"
  period       = "300s"  # Every 5 minutes

  http_check {
    path         = "/api/pbl/scenarios?lang=en"
    port         = "443"
    use_ssl      = true
    validate_ssl = true
    
    accepted_response_status_codes {
      status_class = "2XX"
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = google_cloud_run_service.ai_square.status[0].url
    }
  }
}

# ============================================
# Alert Policies
# ============================================

# 1. High Error Rate Alert
resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "High Error Rate - ${var.environment}"
  combiner     = "OR"
  
  conditions {
    display_name = "Error rate > 5%"
    
    condition_threshold {
      filter          = <<-EOT
        resource.type = "cloud_run_revision"
        AND resource.labels.service_name = "ai-square-${var.environment}"
        AND metric.type = "run.googleapis.com/request_count"
        AND metric.labels.response_code_class != "2xx"
      EOT
      
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }
  
  notification_channels = [
    google_monitoring_notification_channel.slack.id,
    google_monitoring_notification_channel.email.id
  ]
  
  alert_strategy {
    auto_close = "1800s"  # 30 minutes
  }
}

# 2. High Response Time Alert
resource "google_monitoring_alert_policy" "high_latency" {
  display_name = "High Response Time - ${var.environment}"
  combiner     = "OR"
  
  conditions {
    display_name = "95th percentile latency > 2s"
    
    condition_threshold {
      filter          = <<-EOT
        resource.type = "cloud_run_revision"
        AND resource.labels.service_name = "ai-square-${var.environment}"
        AND metric.type = "run.googleapis.com/request_latencies"
      EOT
      
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 2000  # 2 seconds in milliseconds
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.slack.id]
}

# 3. Service Down Alert
resource "google_monitoring_alert_policy" "service_down" {
  display_name = "Service Down - ${var.environment}"
  combiner     = "OR"
  
  conditions {
    display_name = "Uptime check failure"
    
    condition_threshold {
      filter          = <<-EOT
        resource.type = "uptime_url"
        AND metric.type = "monitoring.googleapis.com/uptime_check/check_passed"
        AND resource.label.host = "${google_cloud_run_service.ai_square.status[0].url}"
      EOT
      
      duration        = "60s"
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_FRACTION_TRUE"
        cross_series_reducer = "REDUCE_MEAN"
      }
    }
  }
  
  notification_channels = [
    google_monitoring_notification_channel.slack.id,
    google_monitoring_notification_channel.email.id
  ]
  
  alert_strategy {
    auto_close = "600s"  # 10 minutes
    
    notification_rate_limit {
      period = "300s"  # 5 minutes
    }
  }
}

# 4. Database Connection Errors
resource "google_monitoring_alert_policy" "database_errors" {
  display_name = "Database Connection Errors - ${var.environment}"
  combiner     = "OR"
  
  conditions {
    display_name = "Cloud SQL connection errors"
    
    condition_threshold {
      filter          = <<-EOT
        resource.type = "cloudsql_database"
        AND resource.labels.database_id = "${var.project_id}:${google_sql_database_instance.main.name}"
        AND metric.type = "cloudsql.googleapis.com/database/postgresql/num_backends"
      EOT
      
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 50  # Max connections threshold
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MAX"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.slack.id]
}

# 5. Memory Usage Alert
resource "google_monitoring_alert_policy" "high_memory" {
  display_name = "High Memory Usage - ${var.environment}"
  combiner     = "OR"
  
  conditions {
    display_name = "Memory usage > 80%"
    
    condition_threshold {
      filter          = <<-EOT
        resource.type = "cloud_run_revision"
        AND resource.labels.service_name = "ai-square-${var.environment}"
        AND metric.type = "run.googleapis.com/container/memory/utilizations"
      EOT
      
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_MAX"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.slack.id]
}

# ============================================
# Custom Dashboard
# ============================================
resource "google_monitoring_dashboard" "ai_square_dashboard" {
  dashboard_json = jsonencode({
    displayName = "AI Square ${var.environment} Dashboard"
    mosaicLayout = {
      columns = 12
      tiles = [
        # Service Health Overview
        {
          width  = 6
          height = 4
          widget = {
            title = "Service Health"
            scorecard = {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"ai-square-${var.environment}\" metric.type=\"run.googleapis.com/request_count\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                  }
                }
              }
              sparkChartView = {
                sparkChartType = "SPARK_LINE"
              }
            }
          }
        },
        # Error Rate
        {
          xPos   = 6
          width  = 6
          height = 4
          widget = {
            title = "Error Rate"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"ai-square-${var.environment}\" metric.type=\"run.googleapis.com/request_count\" metric.labels.response_code_class!=\"2xx\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                    }
                  }
                }
                plotType = "LINE"
              }]
              timeshiftDuration = "0s"
              yAxis = {
                scale = "LINEAR"
              }
            }
          }
        },
        # Response Time Distribution
        {
          yPos   = 4
          width  = 12
          height = 4
          widget = {
            title = "Response Time Distribution"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"ai-square-${var.environment}\" metric.type=\"run.googleapis.com/request_latencies\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_DELTA"
                      crossSeriesReducer = "REDUCE_PERCENTILE_95"
                      groupByFields = ["resource.label.service_name"]
                    }
                  }
                }
                plotType = "LINE"
              }]
              timeshiftDuration = "0s"
              yAxis = {
                scale = "LINEAR"
              }
            }
          }
        },
        # Database Connections
        {
          yPos   = 8
          width  = 6
          height = 4
          widget = {
            title = "Database Connections"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloudsql_database\" resource.labels.database_id=\"${var.project_id}:${google_sql_database_instance.main.name}\" metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
                plotType = "LINE"
              }]
              yAxis = {
                scale = "LINEAR"
              }
            }
          }
        },
        # Memory Usage
        {
          xPos   = 6
          yPos   = 8
          width  = 6
          height = 4
          widget = {
            title = "Memory Usage"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"ai-square-${var.environment}\" metric.type=\"run.googleapis.com/container/memory/utilizations\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_MEAN"
                      crossSeriesReducer = "REDUCE_MEAN"
                    }
                  }
                }
                plotType = "LINE"
              }]
              yAxis = {
                scale = "LINEAR"
              }
            }
          }
        }
      ]
    }
  })
}

# ============================================
# SLO Configuration
# ============================================
resource "google_monitoring_slo" "availability_slo" {
  service      = google_monitoring_custom_service.ai_square_service.service_id
  display_name = "99.9% Availability SLO"
  
  goal                = 0.999
  rolling_period_days = 30
  
  request_based_sli {
    good_total_ratio {
      good_service_filter = <<-EOT
        resource.type = "cloud_run_revision"
        AND resource.labels.service_name = "ai-square-${var.environment}"
        AND metric.type = "run.googleapis.com/request_count"
        AND metric.labels.response_code_class = "2xx"
      EOT
      
      total_service_filter = <<-EOT
        resource.type = "cloud_run_revision"
        AND resource.labels.service_name = "ai-square-${var.environment}"
        AND metric.type = "run.googleapis.com/request_count"
      EOT
    }
  }
}

# ============================================
# Custom Service for SLO
# ============================================
resource "google_monitoring_custom_service" "ai_square_service" {
  display_name = "AI Square ${var.environment}"
  service_id   = "ai-square-${var.environment}"
}

# ============================================
# Log-based Metrics
# ============================================
resource "google_logging_metric" "error_logs" {
  name   = "ai-square-${var.environment}-errors"
  filter = <<-EOT
    resource.type = "cloud_run_revision"
    resource.labels.service_name = "ai-square-${var.environment}"
    severity >= ERROR
  EOT
  
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key         = "severity"
      value_type  = "STRING"
      description = "Error severity level"
    }
  }
  
  label_extractors = {
    "severity" = "EXTRACT(severity)"
  }
}

# ============================================
# Variables
# ============================================
variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = "alerts@ai-square.com"
}

# ============================================
# Outputs
# ============================================
output "dashboard_url" {
  value = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.ai_square_dashboard.id}?project=${var.project_id}"
  description = "URL to the monitoring dashboard"
}

output "slack_notification_channel" {
  value = google_monitoring_notification_channel.slack.name
  description = "Slack notification channel ID"
}

output "slo_name" {
  value = google_monitoring_slo.availability_slo.name
  description = "SLO resource name"
}