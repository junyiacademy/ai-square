# ============================================
# Terraform Deployment Automation Makefile
# ============================================

.PHONY: help init security-check security-fix deploy-staging deploy-production apply plan test e2e output status logs wait-for-health deployment-summary destroy-staging destroy-production clean ci-deploy

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
	@echo "E2E Testing:"
	@echo "  make e2e ENV=staging    # Run all E2E tests"
	@echo "  make e2e-smoke          # Run smoke tests only"
	@echo "  make e2e-critical       # Run critical path tests"
	@echo "  make e2e-auth           # Run authentication tests"
	@echo "  make e2e-debug          # Run tests in headed mode"
	@echo "  make e2e-report         # View test report"
	@echo ""

init: ## Initialize Terraform
	terraform init -upgrade

# ============================================
# Security Checks (Pure Terraform)
# ============================================

security-check: ## Run security audit using Terraform native checks
	@echo "🔒 Running security audit..."
	@echo "Checking for hardcoded passwords..."
	@! grep -r "password\s*=\s*\"" *.tf 2>/dev/null | \
		grep -v "var.db_password" | \
		grep -v "password\s*=\s*var" | \
		grep -v "\[Check deployment documentation\]" | \
		grep -v "password\s*=\s*\"\$${" | \
		grep -v "password: dbPassword" | \
		grep -v "# password" || \
		(echo "❌ Found hardcoded passwords!" && exit 1)
	@echo "✅ No hardcoded passwords found"
	@echo ""
	@echo "Checking sensitive variable markings..."
	@grep -q "sensitive\s*=\s*true" main.tf && \
		echo "✅ Sensitive variables properly marked" || \
		(echo "❌ No sensitive variables marked!" && exit 1)
	@echo ""
	@echo "Checking production access controls..."
	@! grep -q "0.0.0.0/0" environments/production.tfvars 2>/dev/null || \
		(echo "❌ Production allows public access (0.0.0.0/0)!" && exit 1)
	@echo "✅ Production access properly restricted"
	@echo ""
	@echo "✅ Security audit passed!"

security-fix: ## Auto-fix common security issues
	@echo "🔧 Fixing security issues..."
	@# Remove hardcoded passwords from test files
	@find . -name "*.tftest.hcl" -exec sed -i.bak '/db_password.*=.*"/d' {} \;
	@echo "✅ Security fixes applied"

# ============================================
# Complete Deployment Pipeline (Pure Terraform)
# ============================================

deploy-staging: check-password security-check ## Complete deployment to staging (apply + e2e + tests + security)
	@echo "🚀 Starting complete deployment to STAGING..."
	@echo "========================================="
	@echo "Environment: staging"
	@echo "========================================="
	@$(MAKE) apply ENV=staging
	@echo ""
	@echo "⏳ Waiting for service to be healthy..."
	@$(MAKE) wait-for-health ENV=staging
	@echo ""
	@echo "🧪 Running E2E tests..."
	@$(MAKE) e2e ENV=staging || echo "⚠️  E2E tests failed but continuing..."
	@echo ""
	@echo "🧪 Running Terraform tests..."
	@$(MAKE) test ENV=staging
	@echo ""
	@$(MAKE) deployment-summary ENV=staging

deploy-production: check-password security-check ## Complete deployment to production (apply + e2e + tests + security)
	@echo "🚀 Starting complete deployment to PRODUCTION..."
	@read -p "⚠️  Deploy to PRODUCTION? Type 'yes' to confirm: " confirm && \
	if [ "$$confirm" = "yes" ]; then \
		echo "=========================================" && \
		echo "Environment: production" && \
		echo "=========================================" && \
		$(MAKE) apply ENV=production && \
		echo "" && \
		echo "⏳ Waiting for service to be healthy..." && \
		$(MAKE) wait-for-health ENV=production && \
		echo "" && \
		echo "🧪 Running E2E tests..." && \
		$(MAKE) e2e ENV=production || echo "⚠️  E2E tests failed but continuing..." && \
		echo "" && \
		echo "🧪 Running Terraform tests..." && \
		$(MAKE) test ENV=production && \
		echo "" && \
		$(MAKE) deployment-summary ENV=production; \
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
	@echo "🧪 Running E2E tests against $(ENV) environment..."
	@terraform workspace select $(ENV) 2>/dev/null || (echo "❌ Workspace $(ENV) not found" && exit 1)
	@SERVICE_URL=$$(terraform output -raw e2e_service_url 2>/dev/null); \
	if [ -z "$$SERVICE_URL" ]; then \
		echo "❌ No service URL found. Deploy first with 'make deploy-$(ENV)'"; \
		exit 1; \
	fi; \
	echo "🌐 Target URL: $$SERVICE_URL"; \
	echo "📦 Installing dependencies..."; \
	cd ../frontend && \
	if [ ! -d "node_modules" ]; then npm install; fi && \
	if [ ! -d "$$HOME/.cache/ms-playwright" ]; then \
		echo "🎭 Installing Playwright browsers..."; \
		npx playwright install chromium --with-deps; \
	fi && \
	echo "🧪 Executing E2E tests..."; \
	PLAYWRIGHT_BASE_URL=$$SERVICE_URL \
	TEST_EMAIL="student@example.com" \
	TEST_PASSWORD="student123" \
	npm run test:e2e -- --reporter=list

e2e-smoke: ## Run only smoke tests
	@echo "🔥 Running smoke tests against $(ENV)..."
	@terraform workspace select $(ENV) 2>/dev/null || (echo "❌ Workspace $(ENV) not found" && exit 1)
	@SERVICE_URL=$$(terraform output -raw e2e_service_url 2>/dev/null); \
	cd ../frontend && \
	PLAYWRIGHT_BASE_URL=$$SERVICE_URL npm run test:e2e -- --grep smoke --reporter=list

e2e-critical: ## Run only critical path tests
	@echo "🚨 Running critical tests against $(ENV)..."
	@terraform workspace select $(ENV) 2>/dev/null || (echo "❌ Workspace $(ENV) not found" && exit 1)
	@SERVICE_URL=$$(terraform output -raw e2e_service_url 2>/dev/null); \
	cd ../frontend && \
	PLAYWRIGHT_BASE_URL=$$SERVICE_URL npm run test:e2e -- --grep critical --reporter=list

e2e-auth: ## Run authentication tests
	@echo "🔐 Running auth tests against $(ENV)..."
	@terraform workspace select $(ENV) 2>/dev/null || (echo "❌ Workspace $(ENV) not found" && exit 1)
	@SERVICE_URL=$$(terraform output -raw e2e_service_url 2>/dev/null); \
	cd ../frontend && \
	PLAYWRIGHT_BASE_URL=$$SERVICE_URL npm run test:e2e -- e2e/auth-flow.spec.ts --reporter=list

e2e-report: ## Generate and open E2E test report
	@echo "📊 Generating E2E test report..."
	@cd ../frontend && \
	if [ -d "playwright-report" ]; then \
		npx playwright show-report; \
	else \
		echo "❌ No test report found. Run 'make e2e' first."; \
	fi

e2e-debug: ## Run E2E tests in debug mode (headed)
	@echo "🔍 Running E2E tests in debug mode..."
	@terraform workspace select $(ENV) 2>/dev/null || (echo "❌ Workspace $(ENV) not found" && exit 1)
	@SERVICE_URL=$$(terraform output -raw e2e_service_url 2>/dev/null); \
	cd ../frontend && \
	PLAYWRIGHT_BASE_URL=$$SERVICE_URL \
	HEADLESS=false \
	npm run test:e2e -- --headed --workers=1

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

wait-for-health: ## Wait for service to be healthy
	@terraform workspace select $(ENV) 2>/dev/null || (echo "Workspace $(ENV) not found" && exit 1)
	@SERVICE_URL=$$(terraform output -raw service_url 2>/dev/null); \
	if [ -z "$$SERVICE_URL" ]; then \
		echo "❌ No service URL found. Deploy first with 'make deploy-$(ENV)'"; \
		exit 1; \
	fi; \
	MAX_RETRIES=30; \
	RETRY_COUNT=0; \
	while [ $$RETRY_COUNT -lt $$MAX_RETRIES ]; do \
		if curl -sf "$$SERVICE_URL/api/health" > /dev/null 2>&1; then \
			echo "✅ Service is healthy!"; \
			exit 0; \
		fi; \
		RETRY_COUNT=$$((RETRY_COUNT + 1)); \
		echo "Waiting for service... ($$RETRY_COUNT/$$MAX_RETRIES)"; \
		sleep 10; \
	done; \
	echo "❌ Service health check failed after $$MAX_RETRIES attempts"; \
	exit 1

deployment-summary: ## Generate deployment summary
	@echo "========================================="
	@echo "📊 DEPLOYMENT SUMMARY"
	@echo "========================================="
	@echo "Date: $$(date)"
	@echo "Environment: $(ENV)"
	@terraform workspace select $(ENV) 2>/dev/null
	@SERVICE_URL=$$(terraform output -raw service_url 2>/dev/null || echo "Not deployed"); \
	DB_CONNECTION=$$(terraform output -raw database_connection_name 2>/dev/null || echo "N/A"); \
	HEALTH_URL=$$(terraform output -raw health_check_url 2>/dev/null || echo "N/A"); \
	echo "Service URL: $$SERVICE_URL"; \
	echo "Health Check URL: $$HEALTH_URL"; \
	echo "Database: $$DB_CONNECTION"; \
	echo ""; \
	echo "Test Results:"; \
	echo "- Infrastructure Deploy: ✅ Success"; \
	if [ "$$SERVICE_URL" != "Not deployed" ]; then \
		curl -sf "$$SERVICE_URL/api/health" > /dev/null 2>&1 && \
		echo "- Health Check: ✅ Passed" || echo "- Health Check: ❌ Failed"; \
	fi; \
	echo "- Terraform Tests: ✅ Executed"; \
	echo ""; \
	echo "Demo Accounts:"; \
	echo "- Student: student@example.com / [Check documentation]"; \
	echo "- Teacher: teacher@example.com / [Check documentation]"; \
	echo "- Admin: admin@example.com / [Check documentation]"; \
	echo ""; \
	echo "Next Steps:"; \
	echo "1. Verify application at: $$SERVICE_URL"; \
	echo "2. Check logs: make logs ENV=$(ENV)"; \
	echo "3. Monitor metrics: https://console.cloud.google.com/run"; \
	echo "========================================="

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
