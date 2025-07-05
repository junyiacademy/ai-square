# Track System Migration Guide

## Overview

This guide explains how to migrate from the existing file-based storage system to the new unified Track architecture. The Track system provides a consistent way to manage all learning activities (PBL, Assessment, Discovery, Chat) with built-in evaluation and progress tracking.

## Architecture Changes

### Before (File-based)
```
User Data → localStorage/GCS → Individual Services → Components
```

### After (Track-based)
```
User Data → Track Repository → Storage Abstraction → Components
                ↓
          Evaluation Repository
```

## Key Concepts

### 1. Track (活動軌跡)
A Track represents any learning activity with:
- Unified lifecycle management (active, paused, completed, abandoned)
- Type-specific context data
- Metadata for UI display
- Soft delete support

### 2. Evaluation (評估)
Evaluations are attached to Tracks and provide:
- Quantitative scores
- Qualitative AI-generated feedback
- Progress tracking
- Learning analytics

### 3. Storage Abstraction
- Supports multiple backends (localStorage, GCS, future database)
- Automatic caching and retry logic
- Batch operations for performance

## Migration Steps

### Step 1: Install Dependencies

```bash
# No new dependencies needed - all code is in src/lib/core/
```

### Step 2: Update Imports

Replace individual service imports with Track system imports:

```typescript
// Before
import { PBLStorageService } from '@/lib/storage/pbl-storage-service';
import { UserDataService } from '@/lib/services/user-data-service';

// After
import { trackService } from '@/lib/core/track/services';
import { PBLTrackAdapter } from '@/lib/core/track/adapters';
```

### Step 3: Use Adapters for Backward Compatibility

The adapters maintain compatibility with existing data:

```typescript
// PBL Example
const pblAdapter = new PBLTrackAdapter();

// Create a new PBL track (replaces createPBLSession)
const track = await pblAdapter.createPBLTrack(
  userId,
  projectId,
  scenarioId,
  programId,
  language
);

// Submit task answer (replaces direct storage calls)
const result = await pblAdapter.submitTaskAnswer(
  track.id,
  taskId,
  userResponse
);
```

### Step 4: Migrate Existing Data

Run the migration for each user:

```typescript
// Migrate all legacy data
const pblAdapter = new PBLTrackAdapter();
const assessmentAdapter = new AssessmentTrackAdapter();
const discoveryAdapter = new DiscoveryTrackAdapter();

// Run migrations
const migratedPBL = await pblAdapter.migrateLegacyPBLData(userId);
const migratedAssessment = await assessmentAdapter.migrateLegacyAssessmentData(userId);
const migratedDiscovery = await discoveryAdapter.migrateLegacyDiscoveryData(userId);

console.log(`Migrated ${migratedPBL.length} PBL sessions`);
console.log(`Migrated ${migratedAssessment.length} assessments`);
console.log(`Migrated ${migratedDiscovery.length} discovery sessions`);
```

### Step 5: Update Components

Use the new React hooks:

```typescript
// Track List Hook
function MyComponent() {
  const { tracks, loading, createTrack } = useTrackList({
    userId: currentUser.id,
    type: TrackType.PBL,
    autoLoad: true
  });
  
  // Create new track
  const handleStart = async () => {
    await createTrack({
      userId: currentUser.id,
      projectId: 'my-project',
      type: TrackType.PBL,
      context: { /* ... */ }
    });
  };
}

// Single Track Hook
function TrackDetails({ trackId }) {
  const { track, updateTrack, pauseTrack } = useTrack(trackId);
  
  // Update progress
  const handleProgress = async () => {
    await updateTrack({
      context: { /* updated context */ }
    });
  };
}

// Evaluation Hook
function EvaluationView({ trackId }) {
  const { evaluations, latestEvaluation, stats } = useEvaluation({
    trackId,
    autoLoad: true
  });
  
  return (
    <div>
      Average Score: {stats?.averageScore}%
    </div>
  );
}
```

## Component Examples

### Dashboard Component
```typescript
import { TrackDashboard } from '@/components/examples/TrackDashboard';

function App() {
  return <TrackDashboard userId={currentUser.id} />;
}
```

### PBL Component
```typescript
import { PBLTrackView } from '@/components/examples/PBLTrackView';

function PBLPage({ trackId }) {
  return <PBLTrackView trackId={trackId} />;
}
```

## API Reference

### Track Service Methods

```typescript
// Create a new track
createTrack(params: CreateTrackParams): Promise<ISoftDeletableTrack>

// Get track by ID
getTrack(id: string): Promise<ISoftDeletableTrack | null>

// Update track
updateTrack(id: string, params: UpdateTrackParams): Promise<ISoftDeletableTrack>

// Query tracks
queryTracks(options: TrackQueryOptions): Promise<ISoftDeletableTrack[]>

// Lifecycle management
pauseTrack(id: string): Promise<ISoftDeletableTrack>
resumeTrack(id: string): Promise<ISoftDeletableTrack>
completeTrack(id: string): Promise<ISoftDeletableTrack>
abandonTrack(id: string): Promise<ISoftDeletableTrack>

// Evaluations
createEvaluation(params: CreateEvaluationParams): Promise<ISoftDeletableEvaluation>
getTrackEvaluations(trackId: string): Promise<ISoftDeletableEvaluation[]>
```

### Hook Options

```typescript
// useTrackList
interface UseTrackListOptions {
  userId?: string;
  projectId?: string;
  type?: TrackType;
  status?: TrackStatus;
  autoLoad?: boolean;
  pollInterval?: number;
}

// useTrack
interface UseTrackOptions {
  autoLoad?: boolean;
  pollInterval?: number;
}

// useEvaluation
interface UseEvaluationOptions {
  trackId?: string;
  autoLoad?: boolean;
}

// useLearningProgress
interface UseLearningProgressOptions {
  userId: string;
  autoLoad?: boolean;
  pollInterval?: number;
}
```

## Benefits of Migration

1. **Unified Data Model**: All learning activities use the same structure
2. **Built-in Analytics**: Automatic progress tracking and statistics
3. **Better Performance**: Caching, batch operations, and optimistic updates
4. **Type Safety**: Full TypeScript support with discriminated unions
5. **Future-proof**: Ready for database migration
6. **Offline Support**: Works with localStorage for offline scenarios

## Troubleshooting

### Common Issues

1. **Missing Track ID**
   - Ensure you're passing the track ID to components
   - Check that tracks are created before accessing

2. **Type Mismatches**
   - Use type guards for context data
   - Import types from `@/lib/core/track/types`

3. **Migration Failures**
   - Check console for specific errors
   - Ensure user has permission to access data
   - Verify storage quota is not exceeded

### Debug Mode

Enable debug logging:

```typescript
// In your app initialization
if (process.env.NODE_ENV === 'development') {
  window.trackDebug = true;
}
```

## Next Steps

1. Start with one module (e.g., PBL)
2. Test migration with sample data
3. Gradually migrate components
4. Remove old service dependencies
5. Plan database migration timeline

## Support

For questions or issues:
1. Check the example components
2. Review test files for usage patterns
3. Open an issue in the repository