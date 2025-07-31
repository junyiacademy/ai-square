#!/bin/bash
# ============================================
# AI Square Full QA Test Suite Runner
# Purpose: Execute all QA tests in sequence
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_square_db}"
DB_USER="${DB_USER:-postgres}"
LOG_DIR="qa_reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}AI Square Enterprise QA Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Create log directory
mkdir -p $LOG_DIR

# Function to run a test and capture results
run_test() {
    local test_name=$1
    local test_file=$2
    local log_file="$LOG_DIR/${test_name}_${TIMESTAMP}.log"
    
    echo -e "${YELLOW}▶ Running $test_name...${NC}"
    
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
        -f $test_file > "$log_file" 2>&1; then
        echo -e "${GREEN}✓ $test_name completed${NC}"
        
        # Check for critical issues
        if grep -q "✗ CRITICAL" "$log_file"; then
            echo -e "${RED}  ⚠ CRITICAL issues found! Check $log_file${NC}"
            return 1
        elif grep -q "WARNING" "$log_file"; then
            echo -e "${YELLOW}  ⚠ Warnings found. Review $log_file${NC}"
        else
            echo -e "${GREEN}  ✓ No critical issues${NC}"
        fi
    else
        echo -e "${RED}✗ $test_name failed! Check $log_file${NC}"
        return 1
    fi
    
    return 0
}

# Track test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
CRITICAL_ISSUES=false

# Run all tests
echo -e "${BLUE}Starting QA Test Suite...${NC}"
echo ""

# 1. Strict QA Tests
if run_test "Strict QA Tests" "scripts/qa/strict-qa-test-suite.sql"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
    CRITICAL_ISSUES=true
fi
((TESTS_RUN++))

# 2. Data Consistency Tests
if run_test "Data Consistency" "scripts/qa/data-consistency-test.sql"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
    CRITICAL_ISSUES=true
fi
((TESTS_RUN++))

# 3. Security Audit
if run_test "Security Audit" "scripts/qa/security-audit.sql"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
    CRITICAL_ISSUES=true
fi
((TESTS_RUN++))

# 4. Load Tests (optional - can be skipped for quick runs)
if [ "$SKIP_LOAD_TEST" != "true" ]; then
    echo ""
    echo -e "${YELLOW}Load test will create significant test data.${NC}"
    echo -e "${YELLOW}Set SKIP_LOAD_TEST=true to skip.${NC}"
    
    if run_test "Load Testing" "scripts/qa/load-test.sql"; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    ((TESTS_RUN++))
fi

# Generate summary report
SUMMARY_FILE="$LOG_DIR/qa_summary_${TIMESTAMP}.txt"

echo "" | tee -a $SUMMARY_FILE
echo "================================================" | tee -a $SUMMARY_FILE
echo "QA TEST SUITE SUMMARY" | tee -a $SUMMARY_FILE
echo "================================================" | tee -a $SUMMARY_FILE
echo "Timestamp: $(date)" | tee -a $SUMMARY_FILE
echo "Database: $DB_NAME@$DB_HOST:$DB_PORT" | tee -a $SUMMARY_FILE
echo "" | tee -a $SUMMARY_FILE
echo "Tests Run: $TESTS_RUN" | tee -a $SUMMARY_FILE
echo "Tests Passed: $TESTS_PASSED" | tee -a $SUMMARY_FILE
echo "Tests Failed: $TESTS_FAILED" | tee -a $SUMMARY_FILE
echo "" | tee -a $SUMMARY_FILE

# Check for critical issues in all logs
echo "Analyzing all test results..." | tee -a $SUMMARY_FILE
CRITICAL_COUNT=$(grep -l "✗ CRITICAL" $LOG_DIR/*_${TIMESTAMP}.log 2>/dev/null | wc -l)
WARNING_COUNT=$(grep -l "WARNING" $LOG_DIR/*_${TIMESTAMP}.log 2>/dev/null | wc -l)

echo "Critical Issues Found: $CRITICAL_COUNT" | tee -a $SUMMARY_FILE
echo "Warnings Found: $WARNING_COUNT" | tee -a $SUMMARY_FILE
echo "" | tee -a $SUMMARY_FILE

# Detailed issue extraction
if [ $CRITICAL_COUNT -gt 0 ]; then
    echo "CRITICAL ISSUES DETAIL:" | tee -a $SUMMARY_FILE
    echo "----------------------" | tee -a $SUMMARY_FILE
    grep -h "✗ CRITICAL" $LOG_DIR/*_${TIMESTAMP}.log | sort | uniq | tee -a $SUMMARY_FILE
    echo "" | tee -a $SUMMARY_FILE
fi

if [ $WARNING_COUNT -gt 0 ]; then
    echo "WARNINGS DETAIL:" | tee -a $SUMMARY_FILE
    echo "---------------" | tee -a $SUMMARY_FILE
    grep -h "WARNING" $LOG_DIR/*_${TIMESTAMP}.log | head -20 | tee -a $SUMMARY_FILE
    echo "" | tee -a $SUMMARY_FILE
fi

# Generate recommendations
echo "RECOMMENDATIONS:" | tee -a $SUMMARY_FILE
echo "---------------" | tee -a $SUMMARY_FILE

if [ $CRITICAL_COUNT -gt 0 ]; then
    echo "❌ DO NOT DEPLOY - Critical issues must be resolved first!" | tee -a $SUMMARY_FILE
else
    if [ $WARNING_COUNT -gt 0 ]; then
        echo "⚠️  DEPLOY WITH CAUTION - Review and address warnings" | tee -a $SUMMARY_FILE
    else
        echo "✅ READY TO DEPLOY - All tests passed without critical issues" | tee -a $SUMMARY_FILE
    fi
fi

echo "" | tee -a $SUMMARY_FILE
echo "Full reports available in: $LOG_DIR/" | tee -a $SUMMARY_FILE
echo "Summary saved to: $SUMMARY_FILE" | tee -a $SUMMARY_FILE

# Exit with appropriate code
if [ "$CRITICAL_ISSUES" = true ]; then
    echo ""
    echo -e "${RED}❌ QA FAILED - Critical issues found!${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}✅ QA COMPLETED - Check reports for details${NC}"
    exit 0
fi