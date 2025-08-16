#!/bin/bash

# Deployment QA Agent Command Interface
# Usage: ./scripts/deployment-qa.sh [environment] [options]

set -e

# Default configuration
ENVIRONMENT="${1:-staging}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"
FAIL_ON_CRITICAL="${FAIL_ON_CRITICAL:-true}"

# Environment URLs (bash 3 compatible)
case "$ENVIRONMENT" in
    "local")
        BASE_URL="http://localhost:3000"
        ;;
    "staging")
        BASE_URL="https://ai-square-staging-731209836128.asia-east1.run.app"
        ;;
    "production")
        BASE_URL="https://ai-square-frontend-731209836128.asia-east1.run.app"
        ;;
    *)
        BASE_URL=""
        ;;
esac

if [ -z "$BASE_URL" ]; then
    echo "❌ Error: Unknown environment '$ENVIRONMENT'"
    echo "Available environments: local, staging, production"
    exit 1
fi

echo "🚀 Deployment QA Agent"
echo "Environment: $ENVIRONMENT"
echo "Base URL: $BASE_URL"
echo "===================="

# Quick health check
echo "📊 Quick Health Check..."
HEALTH_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/health" || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ Health endpoint: PASS"
elif [ "$HEALTH_STATUS" = "404" ]; then
    echo "❌ Health endpoint: MISSING (404)"
else
    echo "⚠️  Health endpoint: DEGRADED ($HEALTH_STATUS)"
fi

# Run comprehensive QA if requested
if [ "$2" = "--comprehensive" ]; then
    echo ""
    echo "🔍 Running comprehensive QA..."
    node deployment-qa-script.js --environment "$ENVIRONMENT" --baseUrl "$BASE_URL"
    QA_EXIT_CODE=$?
    
    if [ "$FAIL_ON_CRITICAL" = "true" ] && [ $QA_EXIT_CODE -ne 0 ]; then
        echo ""
        echo "❌ Critical failures detected. Exiting with error code."
        exit 1
    fi
fi

# Test critical endpoints
echo ""
echo "🧪 Testing Critical Endpoints..."

# List of critical endpoints (bash 3 compatible)
CRITICAL_ENDPOINTS="/ /api/pbl/scenarios /api/discovery/scenarios /api/assessment/scenarios"

FAILED_ENDPOINTS=0
TOTAL_ENDPOINTS=4

for endpoint in $CRITICAL_ENDPOINTS; do
    STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL$endpoint" || echo "000")
    
    if [ "$STATUS" = "200" ]; then
        echo "✅ $endpoint"
    else
        echo "❌ $endpoint ($STATUS)"
        FAILED_ENDPOINTS=$((FAILED_ENDPOINTS + 1))
    fi
done

echo ""
echo "📋 Summary:"
echo "Total endpoints tested: $TOTAL_ENDPOINTS"
echo "Failed endpoints: $FAILED_ENDPOINTS"
echo "Success rate: $(( (TOTAL_ENDPOINTS - FAILED_ENDPOINTS) * 100 / TOTAL_ENDPOINTS ))%"

# Generate output based on format
if [ "$OUTPUT_FORMAT" = "json" ]; then
    cat > "/tmp/qa-report-$ENVIRONMENT.json" << EOF
{
    "environment": "$ENVIRONMENT",
    "baseUrl": "$BASE_URL",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "healthStatus": "$HEALTH_STATUS",
    "totalEndpoints": $TOTAL_ENDPOINTS,
    "failedEndpoints": $FAILED_ENDPOINTS,
    "successRate": $(( (TOTAL_ENDPOINTS - FAILED_ENDPOINTS) * 100 / TOTAL_ENDPOINTS )),
    "status": "$([ $FAILED_ENDPOINTS -eq 0 ] && echo 'HEALTHY' || echo 'DEGRADED')"
}
EOF
    echo ""
    echo "📄 Report saved to: /tmp/qa-report-$ENVIRONMENT.json"
fi

# Exit with appropriate code
if [ $FAILED_ENDPOINTS -gt 0 ] && [ "$FAIL_ON_CRITICAL" = "true" ]; then
    exit 1
else
    exit 0
fi