# GCS to PostgreSQL Migration Status

## 🚨 Current Status: INCOMPLETE MIGRATION

The system is currently in a **mixed state** with both GCS and PostgreSQL implementations active.

## Architecture Overview

### Two Repository Factories Exist:

1. **Base Repository Factory** (`/lib/repositories/base/repository-factory.ts`)
   - ✅ Uses PostgreSQL for all dynamic data
   - ✅ Uses GCS only for static content (media, files)
   - ✅ This is the target architecture per CLAUDE.md

2. **GCS v2 Repository Factory** (`/lib/implementations/gcs-v2/`)
   - ❌ Still uses GCS as a database
   - ❌ Should be removed after migration
   - ⚠️ Currently used by 28 API routes

## Current Usage

### API Routes Using PostgreSQL (37 routes) ✅
- `/api/assessment/*` routes
- `/api/discovery/*` routes
- `/api/programs/*` routes
- `/api/users/*` routes
- `/api/scenarios/index/*` routes

### API Routes Still Using GCS v2 (28 routes) ❌
- `/api/pbl/*` routes
- `/api/learning/*` routes
- `/api/user-data/*` routes
- Various other routes importing from `@/lib/implementations/gcs-v2`

## Migration Steps Required

### 1. Update Environment Configuration
```bash
# In .env.local
STORAGE_BACKEND=postgresql  # Currently defaults to 'gcs'
MIGRATION_COMPLETED=true    # Currently 'false'
```

### 2. Update All GCS v2 Imports

Replace all imports from GCS v2:
```typescript
// ❌ OLD - Remove this
import { getProgramRepository } from '@/lib/implementations/gcs-v2';

// ✅ NEW - Use this
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
const programRepo = repositoryFactory.getProgramRepository();
```

### 3. Routes That Need Migration

Priority routes to migrate:
1. `/api/pbl/scenarios/[id]/programs/route.ts`
2. `/api/learning/programs/route.ts`
3. `/api/user-data/route.ts`
4. All other routes importing from `gcs-v2`

### 4. After Migration Complete

1. Delete entire `/lib/implementations/gcs-v2/` directory
2. Remove GCS bucket configuration for user data
3. Update documentation
4. Remove migration scripts from archive

## Configuration System

A storage configuration system exists at `/lib/config/storage-config.ts` that supports:
- Switching between GCS and PostgreSQL via `STORAGE_BACKEND` env var
- Hybrid mode for gradual migration
- Per-entity backend selection

However, this configuration is not actively used by the repository factories.

## Risks

1. **Data Inconsistency**: Different parts of the app may be reading/writing to different storage systems
2. **Performance**: GCS is not optimized for relational queries
3. **Cost**: Running both systems increases infrastructure costs

## Recommendation

Complete the migration immediately by:
1. Setting `STORAGE_BACKEND=postgresql` in production
2. Running a comprehensive test suite
3. Migrating all remaining routes to use base repository factory
4. Removing GCS v2 implementation entirely

## Timeline

Based on `.env.example`:
- Migration cutoff date: 2025-02-01
- Current date: 2025-01-19
- **Days remaining: 13 days**

⚠️ **Action Required**: The migration must be completed before the cutoff date!