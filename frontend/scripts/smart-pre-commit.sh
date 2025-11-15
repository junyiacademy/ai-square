#!/bin/bash
# Smart Pre-commit Check Script
# 智能判斷是否需要執行完整的 pre-commit 檢查

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Smart Pre-commit Check${NC}"
echo "================================"

# Get staged files
STAGED_FILES=$(git diff --cached --name-only)

if [ -z "$STAGED_FILES" ]; then
    echo -e "${YELLOW}⚠️  No staged files${NC}"
    exit 0
fi

# Analyze file types
HAS_TS_FILES=false
HAS_TEST_FILES=false
HAS_CONFIG_FILES=false
HAS_DOCS_ONLY=true

for file in $STAGED_FILES; do
    # Check if it's a TypeScript/JavaScript file
    if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
        HAS_TS_FILES=true
        HAS_DOCS_ONLY=false

        # Check if it's a test file
        if [[ "$file" =~ \.(test|spec)\.(ts|tsx|js|jsx)$ ]]; then
            HAS_TEST_FILES=true
        fi
    fi

    # Check if it's a config file
    if [[ "$file" =~ (package\.json|tsconfig|eslint|jest\.config) ]]; then
        HAS_CONFIG_FILES=true
        HAS_DOCS_ONLY=false
    fi

    # Check if non-documentation file
    if [[ ! "$file" =~ \.(md|txt|yml|yaml|sh)$ ]]; then
        HAS_DOCS_ONLY=false
    fi
done

# Determine what checks to run
echo ""
echo "📊 Analysis:"
echo "  TypeScript files: $HAS_TS_FILES"
echo "  Test files: $HAS_TEST_FILES"
echo "  Config files: $HAS_CONFIG_FILES"
echo "  Docs only: $HAS_DOCS_ONLY"

# Documentation only - skip all checks
if [ "$HAS_DOCS_ONLY" = true ]; then
    echo ""
    echo -e "${GREEN}✅ Documentation only - skipping checks${NC}"
    exit 0
fi

# Force full check if requested
if [ "$FORCE_CHECK" = "true" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Force check enabled - running all checks${NC}"
    npm run pre-commit-check
    exit $?
fi

# Smart check based on changes
echo ""
echo "🚀 Running smart checks..."

# Always run TypeScript check if TS files changed
if [ "$HAS_TS_FILES" = true ] || [ "$HAS_CONFIG_FILES" = true ]; then
    echo ""
    echo -e "${BLUE}📝 Checking TypeScript...${NC}"
    npm run typecheck

    echo ""
    echo -e "${BLUE}🔧 Running ESLint...${NC}"
    npm run lint
fi

# Only run tests if test files or source files changed
if [ "$HAS_TEST_FILES" = true ] || [ "$HAS_TS_FILES" = true ]; then
    # Check if it's a minor change
    CHANGED_LINES=$(git diff --cached --stat | tail -1 | awk '{print $4}')

    if [ -z "$CHANGED_LINES" ]; then
        CHANGED_LINES=0
    fi

    echo ""
    echo "  Changed lines: $CHANGED_LINES"

    # Skip tests for very minor changes (< 20 lines)
    if [ "$CHANGED_LINES" -lt 20 ] && [ "$SKIP_MINOR_TESTS" != "false" ]; then
        echo -e "${YELLOW}⚠️  Minor change (<20 lines) - skipping tests${NC}"
        echo "  Use SKIP_MINOR_TESTS=false to force tests"
    else
        echo ""
        echo -e "${BLUE}🧪 Running unit tests...${NC}"
        npm run test:unit:ci
    fi
fi

echo ""
echo -e "${GREEN}✅ Smart pre-commit check passed!${NC}"
echo ""
echo "💡 Tips:"
echo "  - Use 'git commit --no-verify' to skip all checks"
echo "  - Use 'FORCE_CHECK=true git commit' to run all checks"
echo "  - Use 'SKIP_MINOR_TESTS=false git commit' to always run tests"
