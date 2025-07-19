#!/bin/bash

# Fix API imports from GCS v2 to PostgreSQL repositories

echo "Fixing API imports..."

# Find all API route files using GCS v2
FILES=$(grep -r "from '@/lib/implementations/gcs-v2'" src/app/api --include="*.ts" --exclude-dir="__tests__" -l)

for file in $FILES; do
  echo "Processing: $file"
  
  # Replace the import statement
  sed -i '' "s|import { \(.*\) } from '@/lib/implementations/gcs-v2';|import { repositoryFactory } from '@/lib/repositories/base/repository-factory';|g" "$file"
  
  # Replace getProgramRepository() with repositoryFactory.getProgramRepository()
  sed -i '' "s|getProgramRepository()|repositoryFactory.getProgramRepository()|g" "$file"
  
  # Replace getTaskRepository() with repositoryFactory.getTaskRepository()
  sed -i '' "s|getTaskRepository()|repositoryFactory.getTaskRepository()|g" "$file"
  
  # Replace getEvaluationRepository() with repositoryFactory.getEvaluationRepository()
  sed -i '' "s|getEvaluationRepository()|repositoryFactory.getEvaluationRepository()|g" "$file"
  
  # Replace getScenarioRepository() with repositoryFactory.getScenarioRepository()
  sed -i '' "s|getScenarioRepository()|repositoryFactory.getScenarioRepository()|g" "$file"
  
  # Replace getUserRepository() with repositoryFactory.getUserRepository()
  sed -i '' "s|getUserRepository()|repositoryFactory.getUserRepository()|g" "$file"
  
  # Replace getInteractionRepository() with repositoryFactory.getInteractionRepository()
  sed -i '' "s|getInteractionRepository()|repositoryFactory.getInteractionRepository()|g" "$file"
done

echo "Import fixes completed!"