# GCS v2 Index System

## Overview
This index system provides fast bidirectional queries for UUID relationships in the unified learning architecture.

## Index Structure

### 1. Primary Indexes (Maintained in UUID files)
Each UUID file maintains its direct relationships:

```typescript
// Scenario file includes:
{
  "programCount": 5,  // Denormalized count for performance
  "lastProgramCreated": "2024-01-15T..."
}

// Program file includes:
{
  "scenarioId": "uuid",     // Parent reference
  "taskIds": [...],         // Child references
  "evaluationIds": [...]    // Child references
}
```

### 2. Secondary Indexes (For cross-cutting queries)
Located in `v2/indexes/`:

- `user-index.json` - User to programs mapping
- `scenario-stats.json` - Aggregated scenario statistics
- `daily-activity.json` - Time-based activity index

## Query Patterns

### 1. Get all programs for a scenario
```typescript
// Direct query (no index needed)
const programs = await programRepo.findByScenario(scenarioId);
```

### 2. Get all tasks for a program
```typescript
// From program file
const program = await programRepo.findById(programId);
const tasks = await Promise.all(
  program.taskIds.map(id => taskRepo.findById(id))
);
```

### 3. Get user's learning history
```typescript
// Using user index
const userIndex = await indexService.getUserIndex(userId);
const programs = userIndex.programs;
```

## Best Practices

1. **Maintain relationships in parent entities** - Programs know their tasks
2. **Use indexes for cross-cutting concerns** - User activity, statistics
3. **Denormalize counts** for performance - Store programCount in scenarios
4. **Update indexes asynchronously** - Don't block main operations
5. **Cache frequently accessed indexes** - User indexes, scenario stats