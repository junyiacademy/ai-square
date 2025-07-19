#!/bin/bash

# Fix missing repositoryFactory imports

echo "Fixing missing repositoryFactory imports..."

# Files that need the import
FILES=(
  "src/app/api/assessment/programs/[programId]/evaluation/route.ts"
  "src/app/api/assessment/programs/[programId]/next-task/route.ts"
  "src/app/api/assessment/programs/[programId]/route.ts"
)

for file in "${FILES[@]}"; do
  echo "Processing: $file"
  
  # Check if already has the import
  if ! grep -q "repositoryFactory" "$file" | head -1; then
    # Add import after other imports
    sed -i '' '1a\
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
' "$file"
  fi
done

echo "Import fixes completed!"