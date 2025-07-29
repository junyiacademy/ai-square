#!/bin/bash

# Fix ESLint warnings systematically

echo "Starting ESLint fixes..."

# Fix 1: Remove unused imports in discovery-service.ts
sed -i '' '/IDiscoveryTask,/d' src/lib/services/discovery-service.ts
sed -i '' '/IDiscoveryEvaluation,/d' src/lib/services/discovery-service.ts

# Fix 2: Remove unused imports in scenario-initialization-service.ts
sed -i '' 's/import { IScenario, LearningMode, SourceType, TaskType } from/import { IScenario } from/' src/lib/services/scenario-initialization-service.ts
sed -i '' 's/import { CreateScenarioDto, UpdateScenarioDto } from/import { } from/' src/lib/services/scenario-initialization-service.ts
# Remove empty import
sed -i '' '/import { } from/d' src/lib/services/scenario-initialization-service.ts

# Fix 3: Remove unused YAMLLoaderOptions import
sed -i '' 's/import { BaseYAMLLoader, YAMLLoaderOptions }/import { BaseYAMLLoader }/' src/lib/services/pbl-yaml-loader.ts

# Fix 4: Remove/prefix unused parameters with underscore
# In discovery-service.ts
sed -i '' 's/async completeCareerPath(userId: string, career: string)/async completeCareerPath(_userId: string, _career: string)/' src/lib/services/discovery-service.ts
sed -i '' 's/async getSkillAssessment(userId: string, career: string)/async getSkillAssessment(_userId: string, _career: string)/' src/lib/services/discovery-service.ts
sed -i '' 's/async generateNextSteps(userId: string)/async generateNextSteps(_userId: string)/' src/lib/services/discovery-service.ts
sed -i '' 's/async getCareerMilestones(userId: string, milestoneId: string)/async getCareerMilestones(_userId: string, _milestoneId: string)/' src/lib/services/discovery-service.ts
sed -i '' 's/async getPortfolioItems(userId: string)/async getPortfolioItems(_userId: string)/' src/lib/services/discovery-service.ts

# Fix 5: Remove unused variables in functions
# In discovery-service.ts - checkPrerequisites
sed -i '' '/const currentLevel = 0;/d' src/lib/services/discovery-service.ts
sed -i '' '/const requiredLevel = 1;/d' src/lib/services/discovery-service.ts

# Fix 6: In user-repository.ts
sed -i '' 's/async updateProfile(userId: string/async updateProfile(_userId: string/' src/lib/repositories/postgresql/user-repository.ts
sed -i '' 's/async updateNotificationSettings(userId: string/async updateNotificationSettings(_userId: string/' src/lib/repositories/postgresql/user-repository.ts
sed -i '' 's/async trackActivity(userId: string/async trackActivity(_userId: string/' src/lib/repositories/postgresql/user-repository.ts

# Fix 7: In yaml loaders - remove unused options parameter
sed -i '' 's/async loadAll(options?: { includeArchived?: boolean })/async loadAll(_options?: { includeArchived?: boolean })/' src/lib/services/assessment-yaml-loader.ts
sed -i '' 's/async loadAll(options?: { includeArchived?: boolean })/async loadAll(_options?: { includeArchived?: boolean })/' src/lib/services/discovery-yaml-loader.ts

# Fix 8: Remove unused variable in discovery-repository.ts
sed -i '' '/const career =/s/const career =/const _career =/' src/lib/repositories/postgresql/discovery-repository.ts

echo "ESLint fixes applied. Running lint to check..."
npm run lint 2>&1 | grep -c "Warning:"