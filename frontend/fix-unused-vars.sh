#!/bin/bash

echo "Fixing all unused variables..."

# Fix unused imports in scenario-initialization-service.ts
sed -i '' 's/import { IScenario, LearningMode, SourceType, TaskType } from/import { IScenario } from/' src/lib/services/scenario-initialization-service.ts

# Fix YAMLLoaderOptions in pbl-yaml-loader.ts
sed -i '' 's/import { BaseYAMLLoader, YAMLLoaderOptions } from/import { BaseYAMLLoader } from/' src/lib/services/pbl-yaml-loader.ts

# Fix unused imports in discovery-types.ts
sed -i '' '/import { LearningMode } from/d' src/types/discovery-types.ts

# Fix unused uuidv4 in populate-real-scenarios.ts
sed -i '' '/import { v4 as uuidv4 } from/d' src/scripts/populate-real-scenarios.ts

# Fix options parameter in yaml loaders
sed -i '' 's/async loadAll(options?: { includeArchived?: boolean })/async loadAll(_options?: { includeArchived?: boolean })/' src/lib/services/assessment-yaml-loader.ts
sed -i '' 's/async loadAll(options?: { includeArchived?: boolean })/async loadAll(_options?: { includeArchived?: boolean })/' src/lib/services/discovery-yaml-loader.ts

# Fix userId and milestoneId in discovery-service.ts
sed -i '' 's/async getCareerMilestones(userId: string, milestoneId: string)/async getCareerMilestones(_userId: string, _milestoneId: string)/' src/lib/services/discovery-service.ts

# Fix career in discovery-service.ts
sed -i '' 's/const career = scenario.sourceId || scenario.metadata?.careerType || .unknown./const _career = scenario.sourceId || scenario.metadata?.careerType || "unknown"/' src/lib/services/discovery-service.ts

# Fix currentLevel and requiredLevel
sed -i '' '/const currentLevel = 0;/d' src/lib/services/discovery-service.ts
sed -i '' '/const requiredLevel = 1;/d' src/lib/services/discovery-service.ts

# Fix career in discovery-repository.ts
sed -i '' 's/const career = /const _career = /' src/lib/repositories/postgresql/discovery-repository.ts

# Fix userId in user-repository.ts methods that are stubs
sed -i '' 's/async getPortfolioItems(userId: string)/async getPortfolioItems(_userId: string)/' src/lib/repositories/postgresql/user-repository.ts
sed -i '' 's/async addPortfolioItem(userId: string/async addPortfolioItem(_userId: string/' src/lib/repositories/postgresql/user-repository.ts

# Fix _testData in mock-next-request.ts
sed -i '' 's/export function mockPostRequest(pathname: string, body: unknown, _testData?: any)/export function mockPostRequest(pathname: string, body: unknown)/' src/test-utils/mock-next-request.ts

# Fix all catch (error) to catch (_error) in scripts
find src/scripts -name "*.ts" -type f -exec sed -i '' 's/} catch (error) {/} catch (_error) {/g' {} \;

# Fix all catch (error) in test files
find src/scripts/test -name "*.ts" -type f -exec sed -i '' 's/} catch (error) {/} catch (_error) {/g' {} \;

# Also replace any remaining console.error(error) with console.error(_error)
find src/scripts -name "*.ts" -type f -exec sed -i '' 's/console.error(error)/console.error(_error)/g' {} \;
find src/scripts -name "*.ts" -type f -exec sed -i '' 's/console.log(error)/console.log(_error)/g' {} \;

echo "Checking results..."
npm run lint 2>&1 | grep -c "is defined but never used"