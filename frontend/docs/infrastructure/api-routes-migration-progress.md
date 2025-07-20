# API Routes Migration Progress

## Summary
Updating API routes to use the new unified Schema V3 instead of the old sourceRef pattern.

## Completed Routes

### Assessment Routes
✅ **src/app/api/assessment/scenarios/[id]/route.ts**
- Updated from `sourceRef?.metadata?.configPath` to `sourceMetadata?.configPath`

✅ **src/app/api/assessment/scenarios/route.ts**
- Updated scenario creation to use new IScenario structure
- Removed sourceRef construction, using direct source fields
- Fixed multi-language title/description access

### PBL Routes
✅ **src/app/api/pbl/scenarios/route.ts**
- Removed unnecessary convertScenarioForIndex function
- Updated to use IScenario consistently
- Fixed multi-language title/description handling
- Removed old Scenario interface import

## Completed Routes (Updated)

### Discovery Routes
✅ **src/app/api/discovery/scenarios/route.ts**
- Updated from `findByType('discovery')` to `findByMode('discovery')`

✅ **src/app/api/discovery/scenarios/find-by-career/route.ts**
- Updated from `findByType('discovery')` to `findByMode('discovery')`

### Other Assessment Routes
✅ **src/app/api/assessment/scenarios/[id]/programs/route.ts**
- Updated to use IScenario, IProgram, ITask, IEvaluation interfaces
- Changed from `sourceRef?.metadata?.configPath` to `sourceMetadata?.configPath`
- Updated from `sourceType === 'assessment'` to `mode === 'assessment'`

✅ **src/app/api/assessment/scenarios/route-hybrid.ts**
- Updated from `findByType('assessment')` to `findByMode('assessment')`

✅ **src/app/api/assessment/scenarios/route-v2.ts**
- Updated from `findByType('assessment')` to `findByMode('assessment')`

### PBL Routes (Updated)
✅ **src/app/api/pbl/scenarios/route.ts**
- Updated from `findByType('pbl')` to `findByMode('pbl')`

## Routes Still To Update

### Discovery Routes
- [ ] src/app/api/discovery/scenarios/[id]/route.ts
- [ ] src/app/api/discovery/scenarios/[id]/programs/[programId]/route.ts

## Key Changes Pattern

1. **Replace sourceRef access**:
   ```typescript
   // OLD
   scenario.sourceRef?.metadata?.configPath
   
   // NEW
   scenario.sourceMetadata?.configPath
   ```

2. **Remove sourceRef construction**:
   ```typescript
   // OLD - Don't construct sourceRef
   sourceRef: {
     type: 'yaml',
     path: 'path',
     metadata: { ... }
   }
   
   // NEW - Use direct fields
   sourceType: 'yaml',
   sourcePath: 'path',
   sourceId: 'id',
   sourceMetadata: { ... }
   ```

3. **Handle multi-language fields**:
   ```typescript
   // Title and description are now Record<string, string>
   const title = scenario.title?.[lang] || scenario.title?.en || 'Default';
   ```

4. **Use IScenario interface**:
   - Import from `@/types/unified-learning`
   - Remove old Scenario imports from `@/lib/repositories/interfaces`

## Benefits Achieved
- Consistent source tracking across all modes
- No more nested sourceRef navigation
- Better TypeScript type safety
- Simplified code structure