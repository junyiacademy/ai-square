# API Routes Migration Guide for Schema V3

## Overview
This guide documents the changes needed to update API routes from the old `sourceRef` pattern to the new unified source tracking fields in Schema V3.

## Old Pattern (sourceRef)
```typescript
// OLD - Accessing sourceRef
const sourceRef = scenario.sourceRef as { metadata?: { configPath?: string } };
if (sourceRef?.metadata?.configPath) {
  // use configPath
}

// OLD - Creating sourceRef
sourceRef: {
  type: 'yaml',
  path: 'some/path',
  metadata: { yamlId: 'id' }
}
```

## New Pattern (Unified Source Tracking)
```typescript
// NEW - Accessing source metadata
const configPath = scenario.sourceMetadata?.configPath as string | undefined;
if (configPath) {
  // use configPath
}

// NEW - Source fields are now top-level
scenario.sourceType    // 'yaml' | 'api' | 'ai-generated'
scenario.sourcePath    // optional path
scenario.sourceId      // optional unique ID
scenario.sourceMetadata // JSONB metadata
```

## Changes Required in API Routes

### 1. Assessment Routes
**File**: `src/app/api/assessment/scenarios/[id]/route.ts`
```typescript
// OLD
const sourceRef = scenario.sourceRef as { metadata?: { configPath?: string } };
if (sourceRef?.metadata?.configPath) {

// NEW
const configPath = scenario.sourceMetadata?.configPath as string | undefined;
if (configPath) {
```

### 2. Discovery Routes
**File**: `src/app/api/discovery/scenarios/[id]/route.ts`
```typescript
// OLD
careerType: scenario.sourceRef ? scenario.metadata?.careerType : 'unknown'

// NEW
careerType: scenario.sourceMetadata?.careerType || 'unknown'
```

### 3. PBL Routes
**File**: `src/app/api/pbl/scenarios/route.ts`
```typescript
// OLD
sourceRef: {
  type: scenario.sourceRef?.type || 'yaml',
  path: scenario.sourceRef?.path || '',
  metadata: { yamlId: scenario.id }
}

// NEW - No need to construct sourceRef, use fields directly
sourceType: scenario.sourceType,
sourcePath: scenario.sourcePath,
sourceId: scenario.sourceId,
sourceMetadata: scenario.sourceMetadata
```

## Repository Pattern
The repositories already handle the conversion correctly:
- `sourceType` maps to `source_type`
- `sourcePath` maps to `source_path`
- `sourceId` maps to `source_id`
- `sourceMetadata` maps to `source_metadata`

## Benefits
1. **Consistency**: All modes use the same source tracking pattern
2. **Performance**: Direct field access without nested object navigation
3. **Type Safety**: Proper TypeScript types for all fields
4. **Simplicity**: No need to construct or deconstruct sourceRef objects