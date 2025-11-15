# AI Square Frontend Makefile
# Quick commands for development workflow

.PHONY: help check quick full push-safe push-force

# Default target
help:
	@echo "AI Square Frontend - Quick Commands"
	@echo "===================================="
	@echo "make check      - Run TypeScript + ESLint (fast, ~4s)"
	@echo "make quick      - Run check + unit tests (~18s)"
	@echo "make full       - Run all checks including build (~55s)"
	@echo "make push-safe  - Git push with full checks"
	@echo "make push-force - Git push without checks (dangerous!)"
	@echo ""
	@echo "Shortcuts:"
	@echo "make c  - Same as 'make check'"
	@echo "make q  - Same as 'make quick'"
	@echo "make f  - Same as 'make full'"

# Quick checks (TypeScript + ESLint) - ~4 seconds
check:
	@echo "🔍 Running TypeScript checks..."
	@npm run typecheck
	@echo "📋 Running ESLint..."
	@npm run lint
	@echo "✅ Quick checks passed!"

# Alias for check
c: check

# Quick checks + unit tests - ~18 seconds
quick: check
	@echo "🧪 Running unit tests..."
	@npm run test:unit
	@echo "✅ Quick tests passed!"

# Alias for quick
q: quick

# Full validation (all checks) - ~55 seconds
full: quick
	@echo "🏗️ Running build check..."
	@npm run build
	@echo "✅ All checks passed!"

# Alias for full
f: full

# Safe push with all checks
push-safe: full
	@echo "🚀 Pushing to remote..."
	@git push

# Force push without checks (use with caution!)
push-force:
	@echo "⚠️  WARNING: Pushing without checks!"
	@git push --no-verify

# Pre-commit check (what CI/CD will run)
pre-commit-check:
	@npm run pre-commit-check

# Development shortcuts
dev:
	npm run dev

test:
	npm test

build:
	npm run build
