# GCS v2 Legacy Code Removal Checklist

## Files to Remove

### 1. Main GCS v2 Implementation
- [ ] `/src/lib/implementations/gcs-v2/` (entire directory)

### 2. GCS User Data Service
- [ ] `/src/lib/services/user-data-service-gcs.ts`

### 3. Test Files Using GCS v2 (need updating)
- [ ] `/src/app/api/assessment/results/__tests__/route.test.ts`
- [ ] `/src/app/api/pbl/user-programs/__tests__/route.test.ts`
- [ ] `/src/app/api/pbl/history/__tests__/route.test.ts`
- [ ] `/src/app/api/assessment/scenarios/__tests__/route-hybrid.test.ts`
- [ ] `/src/app/api/discovery/my-programs/__tests__/route.test.ts`
- [ ] `/src/app/api/discovery/scenarios/__tests__/route.test.ts`
- [ ] `/src/app/api/discovery/scenarios/[id]/programs/__tests__/route.test.ts`
- [ ] `/src/app/api/discovery/scenarios/[id]/programs/[programId]/tasks/[taskId]/__tests__/route.test.ts`
- [ ] `/src/app/api/assessment/programs/[programId]/__tests__/complete.test.ts`

### 4. Archive Scripts
- [ ] `/src/scripts/archive/gcs-migration/verify-gcs-data.ts`

### 5. Update Exports
- [ ] Remove GCS exports from `/src/lib/services/index.ts`

## Actions Required

1. Remove the entire gcs-v2 directory
2. Remove user-data-service-gcs.ts
3. Update test files to use PostgreSQL repositories instead of GCS
4. Remove GCS exports from service index
5. Clean up any remaining references