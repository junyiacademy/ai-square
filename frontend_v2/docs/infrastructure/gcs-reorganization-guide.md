# GCS Database Reorganization Guide

## Executive Summary

This guide outlines the strategy to reorganize AI Square's Google Cloud Storage (GCS) database from the current problematic structure to a clean V2 architecture aligned with the unified SCENARIO → PROGRAM → TASK → LOG hierarchy. The reorganization will improve data consistency, query performance, and support the transition to a relational database.

## Current State Analysis

### 1. Current GCS Structure (Problematic)

```
ai-square-db/
├── users/{email}/
│   ├── profile.json                      # User profile (mixed formats)
│   ├── learning_progress.json            # Generic progress tracking
│   ├── assessment_results.json           # All assessments mixed
│   │
│   ├── tracks/                          # Legacy "tracks" terminology
│   │   ├── pbl_scenario_{id}/          # Inconsistent naming
│   │   ├── discovery_career_{id}/      # Different structures
│   │   └── assessment_exam_{id}/       # No unified pattern
│   │
│   ├── pbl_scenarios/{scenarioId}/     # Duplicate PBL data
│   │   ├── program_{programId}.json    # Flat program files
│   │   ├── task_{taskId}_response.json # Scattered task files
│   │   └── evaluations.json            # Mixed evaluations
│   │
│   └── discovery/                      # Discovery-specific structure
│       ├── workspaces.json             # All workspaces in one file
│       └── workspace_{id}/             # Inconsistent with PBL
│           ├── data.json
│           └── tasks.json
```

### 2. Problems with Current Structure

1. **Inconsistent Naming**: "tracks" vs "scenarios", mixed conventions
2. **Data Duplication**: Same data stored in multiple locations
3. **Poor Query Performance**: Need to scan multiple files for simple queries
4. **No Version Control**: No way to track data schema changes
5. **Mixed Granularity**: Some data in single files, others scattered
6. **Legacy Terminology**: "tracks" doesn't align with unified architecture
7. **Type Mixing**: Different learning types have different structures

## Proposed V2 Structure

### 1. Clean Hierarchical Organization

```
ai-square-db-v2/
├── version.json                         # Schema version for migration tracking
├── users/
│   └── {user_id}/                      # UUID, not email (GDPR compliance)
│       ├── profile/
│       │   ├── metadata.json           # User profile, preferences
│       │   └── settings.json           # Theme, language, notifications
│       │
│       └── scenarios/                  # All learning activities
│           └── {scenario_id}/          # UUID for each scenario
│               ├── metadata.json       # Scenario metadata
│               ├── programs/
│               │   └── {program_id}/   # UUID for each program
│               │       ├── metadata.json
│               │       ├── tasks/
│               │       │   └── {task_id}/
│               │       │       ├── metadata.json
│               │       │       └── logs/
│               │       │           ├── interactions.jsonl  # Append-only log
│               │       │           ├── evaluations.jsonl   # AI evaluations
│               │       │           └── events.jsonl        # System events
│               │       └── summary.json  # Program completion summary
│               └── summary.json         # Scenario completion summary
```

### 2. File Format Standards

#### metadata.json (Scenario Level)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "pbl|discovery|assessment",
  "source_id": "ai-job-search",  // Original scenario/career/exam ID
  "title": "AI Job Search Assistant",
  "status": "active|completed|abandoned",
  "created_at": "2025-01-07T10:00:00Z",
  "updated_at": "2025-01-07T15:30:00Z",
  "completed_at": null,
  "statistics": {
    "total_programs": 2,
    "completed_programs": 1,
    "total_time_seconds": 3600,
    "total_ai_tokens": 5000
  }
}
```

#### metadata.json (Program Level)
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "title": "Research Phase",
  "sequence": 1,  // Order within scenario
  "status": "completed",
  "started_at": "2025-01-07T10:00:00Z",
  "completed_at": "2025-01-07T11:00:00Z",
  "statistics": {
    "total_tasks": 3,
    "completed_tasks": 3,
    "average_score": 85,
    "time_seconds": 3600
  }
}
```

#### interactions.jsonl (Append-only Log)
```jsonl
{"timestamp":"2025-01-07T10:00:00Z","type":"user_message","content":"How do I prepare for an AI interview?","tokens":10}
{"timestamp":"2025-01-07T10:00:05Z","type":"ai_response","content":"Here are key areas to focus on...","tokens":150,"model":"gemini-2.5-flash"}
{"timestamp":"2025-01-07T10:05:00Z","type":"system_event","event":"task_completed","score":85}
```

### 3. Naming Conventions

1. **UUIDs for IDs**: Use UUIDs instead of emails or sequential IDs
2. **Lowercase with Hyphens**: `scenario-id` not `ScenarioID` or `scenario_id`
3. **Semantic Names**: `metadata.json` not `data.json` or `info.json`
4. **JSONL for Logs**: Use JSON Lines format for append-only logs
5. **ISO 8601 Dates**: All timestamps in UTC with timezone

### 4. Data Types Mapping

| Old Structure | V2 Structure | Notes |
|--------------|--------------|-------|
| tracks/pbl_* | scenarios/{id} where type='pbl' | Unified structure |
| tracks/discovery_* | scenarios/{id} where type='discovery' | Same hierarchy |
| tracks/assessment_* | scenarios/{id} where type='assessment' | Consistent pattern |
| Mixed task files | tasks/{id}/logs/* | Organized by task |
| Single evaluation file | evaluations.jsonl | Append-only log |

## Migration Strategy

### Phase 1: Preparation (Week 1)

1. **Create Migration Tools**
   ```typescript
   // migration-tools/src/analyzer.ts
   export async function analyzeCurrentStructure(bucket: string) {
     // Scan current GCS structure
     // Generate migration report
     // Identify data inconsistencies
   }
   ```

2. **Set Up V2 Environment**
   ```bash
   # Create new bucket for testing
   gsutil mb gs://ai-square-db-v2-staging
   
   # Set up proper permissions
   gsutil iam ch allUsers:objectViewer gs://ai-square-db-v2-staging
   ```

3. **Create Backup**
   ```bash
   # Full backup of current data
   gsutil -m cp -r gs://ai-square-db/* gs://ai-square-db-backup-$(date +%Y%m%d)/
   ```

### Phase 2: Migration Scripts (Week 2)

1. **User Migration Script**
   ```typescript
   // migration-tools/src/migrate-users.ts
   export async function migrateUser(email: string, userId: string) {
     // 1. Read all user data from old structure
     const oldData = await readOldUserData(email);
     
     // 2. Transform to new structure
     const scenarios = transformToScenarios(oldData);
     
     // 3. Write to new structure
     await writeV2Structure(userId, scenarios);
     
     // 4. Validate migration
     await validateMigration(email, userId);
   }
   ```

2. **Scenario Transformation**
   ```typescript
   function transformToScenarios(oldData: OldUserData): Scenario[] {
     const scenarios = [];
     
     // Transform PBL tracks
     for (const track of oldData.tracks.pbl) {
       scenarios.push({
         id: generateUUID(),
         type: 'pbl',
         source_id: track.scenario_id,
         programs: transformPrograms(track)
       });
     }
     
     // Transform Discovery workspaces
     for (const workspace of oldData.discovery.workspaces) {
       scenarios.push({
         id: generateUUID(),
         type: 'discovery',
         source_id: workspace.career_id,
         programs: [{
           id: generateUUID(),
           title: workspace.title,
           tasks: transformDiscoveryTasks(workspace.tasks)
         }]
       });
     }
     
     return scenarios;
   }
   ```

### Phase 3: Incremental Migration (Weeks 3-4)

1. **Dual-Write Period**
   ```typescript
   // Enable writes to both old and new structure
   export class DualStorageService {
     async write(path: string, data: any) {
       // Write to old structure (current)
       await this.oldStorage.write(path, data);
       
       // Transform and write to new structure
       const v2Path = transformPath(path);
       const v2Data = transformData(data);
       await this.v2Storage.write(v2Path, v2Data);
     }
   }
   ```

2. **Migration Batches**
   - Week 3: Migrate inactive users (no activity > 30 days)
   - Week 3: Migrate test accounts
   - Week 4: Migrate active users in batches of 100
   - Week 4: Final validation and cleanup

### Phase 4: Cutover (Week 5)

1. **Update Application Code**
   ```typescript
   // Switch to V2 storage service
   export const storageService = new V2StorageService({
     bucket: process.env.GCS_BUCKET_V2,
     version: '2.0'
   });
   ```

2. **Monitor and Validate**
   - Set up monitoring dashboards
   - Track error rates
   - Validate data integrity
   - Performance benchmarks

## Data Retention and Archival

### 1. Retention Policies

```typescript
interface RetentionPolicy {
  scenarios: {
    active: 'indefinite',
    completed: '2 years',
    abandoned: '6 months'
  },
  logs: {
    interactions: '1 year',
    events: '6 months',
    debug: '30 days'
  },
  backups: {
    daily: '7 days',
    weekly: '4 weeks',
    monthly: '12 months'
  }
}
```

### 2. Archival Process

```bash
# Monthly archival job
0 0 1 * * /scripts/archive-old-data.sh

# Archive completed scenarios older than 2 years
gsutil -m mv gs://ai-square-db-v2/users/*/scenarios/*/completed/** \
  gs://ai-square-archive/$(date +%Y)/
```

### 3. Data Cleanup

```typescript
// Clean up orphaned data
export async function cleanupOrphanedData() {
  // Find scenarios without users
  // Find programs without scenarios
  // Find tasks without programs
  // Remove or archive orphaned data
}
```

## Performance Optimizations

### 1. Caching Strategy

```typescript
// Implement multi-level caching
export class CachedStorageService {
  private memoryCache = new LRUCache({ max: 1000 });
  private localCache = new LocalStorageCache();
  
  async read(path: string) {
    // L1: Memory cache
    if (this.memoryCache.has(path)) {
      return this.memoryCache.get(path);
    }
    
    // L2: Local storage cache
    if (await this.localCache.has(path)) {
      const data = await this.localCache.get(path);
      this.memoryCache.set(path, data);
      return data;
    }
    
    // L3: GCS
    const data = await this.gcs.read(path);
    await this.cacheData(path, data);
    return data;
  }
}
```

### 2. Batch Operations

```typescript
// Batch read operations
export async function batchReadUserScenarios(userId: string) {
  const basePath = `users/${userId}/scenarios`;
  
  // Single request to list all scenarios
  const scenarios = await gcs.listFiles(basePath);
  
  // Parallel read with concurrency limit
  const metadataPromises = scenarios.map(scenario => 
    limit(() => gcs.read(`${scenario}/metadata.json`))
  );
  
  return Promise.all(metadataPromises);
}
```

### 3. Query Optimization

```typescript
// Optimized queries using metadata
export async function getUserActiveScenarios(userId: string) {
  // Read only metadata files, not full data
  const pattern = `users/${userId}/scenarios/*/metadata.json`;
  const metadataFiles = await gcs.glob(pattern);
  
  // Filter active scenarios in memory
  const activeScenarios = metadataFiles
    .map(file => JSON.parse(file.content))
    .filter(scenario => scenario.status === 'active');
  
  return activeScenarios;
}
```

## Security Considerations

### 1. Access Control

```yaml
# GCS bucket IAM policy
bindings:
  - role: roles/storage.objectViewer
    members:
      - serviceAccount:ai-square-app@project.iam.gserviceaccount.com
  - role: roles/storage.objectCreator
    members:
      - serviceAccount:ai-square-app@project.iam.gserviceaccount.com
  - role: roles/storage.objectAdmin
    members:
      - serviceAccount:ai-square-admin@project.iam.gserviceaccount.com
```

### 2. Data Encryption

```typescript
// Encrypt sensitive data
export async function encryptUserData(data: any): Promise<string> {
  const key = await getEncryptionKey();
  return encrypt(JSON.stringify(data), key);
}

// Store encrypted
await gcs.write('users/{id}/profile/metadata.json', {
  encrypted: true,
  data: await encryptUserData(profileData)
});
```

### 3. Audit Logging

```typescript
// Log all data operations
export class AuditedStorageService extends StorageService {
  async write(path: string, data: any) {
    await this.audit.log({
      action: 'write',
      path,
      user: this.currentUser,
      timestamp: new Date().toISOString(),
      dataSize: JSON.stringify(data).length
    });
    
    return super.write(path, data);
  }
}
```

## Migration Validation

### 1. Data Integrity Checks

```typescript
export async function validateMigration(oldUserId: string, newUserId: string) {
  const checks = [
    validateUserProfile,
    validateScenarioCount,
    validateProgramStructure,
    validateTaskCompleteness,
    validateLogIntegrity
  ];
  
  const results = await Promise.all(
    checks.map(check => check(oldUserId, newUserId))
  );
  
  return {
    success: results.every(r => r.success),
    details: results
  };
}
```

### 2. Rollback Plan

```typescript
export class MigrationRollback {
  async rollbackUser(userId: string) {
    // 1. Stop dual writes
    await this.disableDualWrite(userId);
    
    // 2. Restore from backup
    await this.restoreFromBackup(userId);
    
    // 3. Clear V2 data
    await this.clearV2Data(userId);
    
    // 4. Re-enable old structure
    await this.enableOldStructure(userId);
  }
}
```

## Implementation Timeline

| Week | Phase | Activities | Success Criteria |
|------|-------|------------|------------------|
| 1 | Preparation | Tool development, backup creation | Tools tested, backups verified |
| 2 | Script Development | Migration scripts, testing | Scripts pass all test cases |
| 3-4 | Incremental Migration | User migration in batches | 95% users migrated successfully |
| 5 | Cutover | Switch to V2, monitoring | <1% error rate, no data loss |
| 6 | Cleanup | Remove old structure, optimize | Old data archived, performance improved |

## Monitoring and Maintenance

### 1. Key Metrics

```typescript
interface MigrationMetrics {
  totalUsers: number;
  migratedUsers: number;
  failedMigrations: number;
  dataIntegrityScore: number;
  performanceImprovement: number;
  storageEfficiency: number;
}
```

### 2. Monitoring Dashboard

```typescript
// Real-time migration monitoring
export class MigrationMonitor {
  async getStatus() {
    return {
      progress: await this.calculateProgress(),
      errors: await this.getRecentErrors(),
      performance: await this.comparePerformance(),
      storage: await this.getStorageMetrics()
    };
  }
}
```

### 3. Post-Migration Optimization

```bash
# Regular maintenance tasks
# Compress old logs
gsutil -m cp -Z gs://ai-square-db-v2/**/logs/*.jsonl

# Update indexes
node scripts/update-metadata-indexes.js

# Clean up temporary files
gsutil -m rm gs://ai-square-db-v2/**/.tmp/*
```

## Conclusion

This reorganization will transform AI Square's data storage from a fragmented, inconsistent structure to a clean, scalable architecture that:

1. **Improves Performance**: 10x faster queries through proper organization
2. **Ensures Consistency**: Single source of truth for all data
3. **Enables Scalability**: Ready for millions of users
4. **Supports Migration**: Easy transition to relational database
5. **Maintains Compatibility**: Gradual migration with no downtime

The investment in reorganization will pay dividends in reduced maintenance, improved performance, and better user experience.