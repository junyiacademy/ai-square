# ============================================
# Terraform Deployment Automation Makefile
# ============================================

.PHONY: help init deploy-staging deploy-production test clean destroy-staging destroy-production

# Default environment
ENV ?= staging

# Database password from environment
DB_PASSWORD ?= $(TF_VAR_db_password)

# Check for required environment variables
check-password:
	@if [ -z "$(DB_PASSWORD)" ]; then \
		echo "❌ Error: TF_VAR_db_password is not set"; \
		echo "Please run: export TF_VAR_db_password='your-password'"; \
		exit 1; \
	fi

help: ## Show this help message
	@echo "Terraform Deployment Automation"
	@echo "================================"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make deploy-staging     # Deploy to staging with full pipeline"
	@echo "  make deploy-production  # Deploy to production with full pipeline"
	@echo "  make test ENV=staging   # Run tests for staging environment"
	@echo ""

init: ## Initialize Terraform
	terraform init -upgrade

# ============================================
# Security Checks
# ============================================

security-check: ## Run security audit
	@echo "🔒 Running security audit..."
	@./security-check.sh

security-fix: ## Auto-fix common security issues
	@echo "🔧 Fixing security issues..."
	@# Remove hardcoded passwords from test files
	@find . -name "*.tftest.hcl" -exec sed -i.bak '/db_password.*=.*"/d' {} \;
	@echo "✅ Security fixes applied"

# ============================================
# Complete Deployment Pipeline
# ============================================

deploy-staging: check-password security-check ## Complete deployment to staging (apply + e2e + tests + security)
	@echo "🚀 Starting complete deployment to STAGING..."
	./deploy-complete.sh staging

deploy-production: check-password security-check ## Complete deployment to production (apply + e2e + tests + security)
	@echo "🚀 Starting complete deployment to PRODUCTION..."
	@read -p "⚠️  Deploy to PRODUCTION? Type 'yes' to confirm: " confirm && \
	if [ "$$confirm" = "yes" ]; then \
		./deploy-complete.sh production; \
	else \
		echo "Deployment cancelled"; \
	fi

# ============================================
# Individual Steps
# ============================================

apply: check-password init ## Apply Terraform configuration
	terraform workspace select $(ENV) || terraform workspace new $(ENV)
	terraform apply \
		-var="environment=$(ENV)" \
		-var="db_password=$(DB_PASSWORD)" \
		-auto-approve

plan: check-password init ## Plan Terraform changes
	terraform workspace select $(ENV) || terraform workspace new $(ENV)
	terraform plan \
		-var="environment=$(ENV)" \
		-var="db_password=$(DB_PASSWORD)"

test: check-password ## Run Terraform tests
	@echo "🧪 Running Terraform tests for $(ENV)..."
	terraform workspace select $(ENV) || terraform workspace new $(ENV)
	export TF_VAR_db_password=$(DB_PASSWORD) && \
	export TF_VAR_environment=$(ENV) && \
	terraform test

e2e: ## Run E2E tests against deployed environment
	@echo "🧪 Running E2E tests..."
	@SERVICE_URL=$$(terraform output -raw service_url 2>/dev/null); \
	if [ -z "$$SERVICE_URL" ]; then \
		echo "❌ No service URL found. Deploy first with 'make deploy-$(ENV)'"; \
		exit 1; \
	fi; \
	cd ../frontend && \
	PLAYWRIGHT_BASE_URL=$$SERVICE_URL npm run test:e2e

# ============================================
# Maintenance Commands
# ============================================

output: ## Show Terraform outputs
	@terraform workspace select $(ENV) 2>/dev/null || echo "Workspace $(ENV) not found"
	@terraform output

status: ## Show deployment status
	@echo "Environment: $(ENV)"
	@terraform workspace select $(ENV) 2>/dev/null || echo "Workspace not initialized"
	@SERVICE_URL=$$(terraform output -raw service_url 2>/dev/null || echo "Not deployed"); \
	echo "Service URL: $$SERVICE_URL"; \
	if [ "$$SERVICE_URL" != "Not deployed" ]; then \
		curl -s -f "$$SERVICE_URL/api/health" > /dev/null 2>&1 && \
		echo "Health Check: ✅ Healthy" || echo "Health Check: ❌ Unhealthy"; \
	fi

logs: ## View Cloud Run logs
	gcloud run logs read --service=ai-square-$(ENV) --region=asia-east1 --limit=50

# ============================================
# Cleanup Commands
# ============================================

destroy-staging: ## Destroy staging infrastructure
	@read -p "⚠️  Destroy STAGING? Type 'yes' to confirm: " confirm && \
	if [ "$$confirm" = "yes" ]; then \
		terraform workspace select staging && \
		terraform destroy \
			-var="environment=staging" \
			-var="db_password=$(DB_PASSWORD)" \
			-auto-approve; \
	fi

destroy-production: ## Destroy production infrastructure
	@read -p "⚠️  Destroy PRODUCTION? Type 'YES_DESTROY_PROD' to confirm: " confirm && \
	if [ "$$confirm" = "YES_DESTROY_PROD" ]; then \
		terraform workspace select production && \
		terraform destroy \
			-var="environment=production" \
			-var="db_password=$(DB_PASSWORD)" \
			-auto-approve; \
	fi

clean: ## Clean Terraform files
	rm -rf .terraform/
	rm -f .terraform.lock.hcl
	rm -f *.tfplan
	rm -f deployment-report-*.txt

# ============================================
# CI/CD Integration
# ============================================

ci-deploy: check-password ## Deploy for CI/CD (no interaction)
	@echo "🤖 Running automated deployment for $(ENV)..."
	terraform init -backend=true -reconfigure
	terraform workspace select $(ENV) || terraform workspace new $(ENV)
	terraform apply \
		-var="environment=$(ENV)" \
		-var="db_password=$(DB_PASSWORD)" \
		-auto-approve
	@echo "✅ Infrastructure deployed"
	@echo "🧪 Running E2E tests..."
	@SERVICE_URL=$$(terraform output -raw service_url); \
	cd ../frontend && \
	PLAYWRIGHT_BASE_URL=$$SERVICE_URL npm run test:e2e -- --reporter=json
	@echo "🧪 Running Terraform tests..."
	terraform test
	@echo "✅ All tests completed"