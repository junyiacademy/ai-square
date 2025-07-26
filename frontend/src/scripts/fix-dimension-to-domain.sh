#!/bin/bash

# Script to replace all dimensionScores with domainScores

echo "🔄 Replacing all dimensionScores with domainScores..."

# Find all TypeScript files and replace
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/dimensionScores/domainScores/g'

# Also replace dimension_scores with domain_scores
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/dimension_scores/domain_scores/g'

echo "✅ Replacement complete!"

# Run TypeScript check to verify
echo "🔍 Running TypeScript check..."
npm run typecheck 2>&1 | grep -E "dimension|domain" | head -20