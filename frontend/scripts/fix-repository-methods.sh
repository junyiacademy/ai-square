#!/bin/bash

# Fix repository method calls to match new interfaces

echo "Fixing repository method calls..."

# Fix addInteraction to recordAttempt
find src/app/api -name "*.ts" -type f ! -path "*/__tests__/*" -exec sed -i '' 's/\.addInteraction(/\.recordAttempt(/g' {} \;

# Fix updateInteractions (doesn't exist in interface)
find src/app/api -name "*.ts" -type f ! -path "*/__tests__/*" -exec sed -i '' 's/\.updateInteractions(/\.update(/g' {} \;

# Fix complete method (doesn't exist)
find src/app/api -name "*.ts" -type f ! -path "*/__tests__/*" -exec sed -i '' 's/\.complete(/\.updateStatus(/g' {} \;

# Fix findBySourceType to findByType
find src/app/api -name "*.ts" -type f ! -path "*/__tests__/*" -exec sed -i '' 's/\.findBySourceType(/\.findByType(/g' {} \;

# Fix updateTaskIds (doesn't exist)
find src/app/api -name "*.ts" -type f ! -path "*/__tests__/*" -exec sed -i '' 's/\.updateTaskIds(/\.update(/g' {} \;

echo "Repository method fixes completed!"