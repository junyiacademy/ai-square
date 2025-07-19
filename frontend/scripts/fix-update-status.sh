#!/bin/bash

# Fix updateStatus calls to include status parameter

echo "Fixing updateStatus calls..."

# Fix programRepo.updateStatus to mark as completed
find src/app/api -name "*.ts" -type f ! -path "*/__tests__/*" -exec sed -i '' 's/programRepo\.updateStatus(\([^)]*\))/programRepo.update(\1, { status: "completed" })/g' {} \;

# Fix taskRepo.updateStatus without status to mark as completed  
find src/app/api -name "*.ts" -type f ! -path "*/__tests__/*" -exec sed -i '' 's/taskRepo\.updateStatus(\([^,)]*\))/taskRepo.updateStatus(\1, "completed")/g' {} \;

echo "updateStatus fixes completed!"