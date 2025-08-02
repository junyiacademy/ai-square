#!/bin/bash
# Safe Test Development Script - 避免 TypeScript 錯誤累積

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Safe Test Development Workflow${NC}"

# Function to count TypeScript errors
count_ts_errors() {
    local error_count=$(npm run typecheck 2>&1 | grep -c "error TS" || echo "0")
    echo $error_count
}

# Step 1: Record baseline
echo -e "${YELLOW}📊 Recording baseline TypeScript errors...${NC}"
baseline_errors=$(count_ts_errors)
echo -e "Baseline errors: ${RED}$baseline_errors${NC}"

# Step 2: Allow development work
echo -e "${GREEN}✅ You can now create/modify test files${NC}"
echo -e "${YELLOW}💡 When you're done, run this script again with --check${NC}"

if [[ "$1" == "--check" ]]; then
    # Step 3: Check if errors increased
    echo -e "${YELLOW}🔍 Checking for new TypeScript errors...${NC}"
    current_errors=$(count_ts_errors)
    
    if [ $current_errors -gt $baseline_errors ]; then
        echo -e "${RED}❌ ERROR: TypeScript errors increased!${NC}"
        echo -e "Baseline: $baseline_errors, Current: $current_errors"
        echo -e "Increase: +$((current_errors - baseline_errors)) errors"
        echo -e "${YELLOW}🔧 Please fix TypeScript errors before committing${NC}"
        
        # Show the errors
        echo -e "${YELLOW}📝 Showing TypeScript errors:${NC}"
        npm run typecheck
        exit 1
    elif [ $current_errors -lt $baseline_errors ]; then
        echo -e "${GREEN}🎉 Great! You reduced TypeScript errors!${NC}"
        echo -e "Reduced by: $((baseline_errors - current_errors)) errors"
    else
        echo -e "${GREEN}✅ No new TypeScript errors introduced${NC}"
    fi
    
    # Step 4: Run full checks
    echo -e "${YELLOW}🧪 Running full quality checks...${NC}"
    npm run pre-commit-check
    
    echo -e "${GREEN}🎉 All checks passed! Safe to commit.${NC}"
fi