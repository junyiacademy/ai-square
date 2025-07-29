# ESLint Fix Plan - TDD Approach

## Summary
- Total warnings: 87
- Main issues:
  - `any` type usage: ~50 warnings
  - Unused variables: ~20 warnings
  - React Hook dependencies: ~5 warnings
  - Unused imports: ~12 warnings

## Fix Strategy (Following CLAUDE.md Rules)

### Phase 1: Scripts Directory (Rule #8 allows disable comments)
Files in `src/scripts/` can use eslint-disable comments

### Phase 2: Production Code (Zero tolerance)
Files in `src/app/`, `src/components/`, `src/lib/`, etc. must be fixed properly

### Phase 3: Type-only imports
Remove unused type imports

## TDD Process for Each Fix
1. Write/run existing tests to ensure they pass
2. Fix the ESLint warning
3. Run tests again to verify no regression
4. Test with Playwright if UI-related

## Files to Fix (Priority Order)
1. API Routes (critical):
   - /api/discovery/programs/[programId]/evaluation/route.ts
   - /api/discovery/programs/[programId]/tasks/[taskId]/route.ts
   - /api/discovery/programs/[programId]/tasks/route.ts

2. Core Services:
   - discovery-service.ts
   - discovery-repository.ts
   - user-repository.ts

3. Components:
   - ScenarioCard.tsx
   - CompetencyKnowledgeGraph.tsx

4. Hooks:
   - useAuth.ts
   - useHybridScenarios.ts
   - useUserData.ts