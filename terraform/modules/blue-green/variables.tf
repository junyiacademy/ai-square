# ============================================
# Blue-Green Module Variables
# ============================================

variable "service_name" {
  description = "Base name for the Cloud Run service"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "active_color" {
  description = "Currently active deployment color (blue or green)"
  type        = string
  default     = "blue"
  
  validation {
    condition     = contains(["blue", "green"], var.active_color)
    error_message = "active_color must be either 'blue' or 'green'"
  }
}

variable "blue_image" {
  description = "Docker image for blue deployment"
  type        = string
}

variable "green_image" {
  description = "Docker image for green deployment"  
  type        = string
}

variable "env_vars" {
  description = "Environment variables for the service"
  type        = map(string)
  default     = {}
}

variable "service_account_email" {
  description = "Service account email for the Cloud Run service"
  type        = string
}

variable "cloudsql_instance" {
  description = "Cloud SQL instance connection name"
  type        = string
  default     = ""
}

variable "cpu_limit" {
  description = "CPU limit for the service"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Memory limit for the service"
  type        = string
  default     = "512Mi"
}

variable "allow_unauthenticated" {
  description = "Allow unauthenticated access"
  type        = bool
  default     = true
}

variable "annotations" {
  description = "Additional annotations for the service"
  type        = map(string)
  default     = {}
}

variable "labels" {
  description = "Additional labels for the service"
  type        = map(string)
  default     = {}
}

variable "enable_canary" {
  description = "Enable canary deployment testing"
  type        = bool
  default     = false
}