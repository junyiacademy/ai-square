# Timestamp Field Standardization

## Overview
This document describes the standardization of timestamp fields across the codebase to align with PostgreSQL schema conventions and improve consistency.

## Changes Made

### 1. Program Interface Update
- **File**: `src/lib/repositories/interfaces/index.ts`
- **Change**: Renamed `startTime` to `createdAt` in the Program interface
- **Rationale**: Aligns with PostgreSQL schema where `created_at` represents record creation time

### 2. PostgreSQL Repository Updates
- **File**: `src/lib/repositories/postgresql/program-repository.ts`
- **Changes**:
  - Updated all SQL queries to map `created_at` to `createdAt`
  - Added mapping for `start_time` to `startedAt` (optional field)
  - Updated `updateStatus` to set `started_at` when status changes to 'active'

### 3. API Route Updates
Updated all API routes that reference `startTime` to use `createdAt`:
- `src/app/api/pbl/draft-program/route.ts`
- `src/app/api/pbl/programs/[programId]/activate/route.ts`
- `src/app/api/pbl/programs/[programId]/route.ts`
- `src/app/api/pbl/programs/[programId]/completion/route.ts`
- `src/app/api/pbl/history/route.ts`
- `src/app/api/pbl/user-programs/route.ts`
- `src/app/api/assessment/scenarios/[id]/programs/route.ts`
- `src/app/api/assessment/programs/[programId]/complete/route.ts`
- `src/app/api/discovery/scenarios/[id]/programs/route.ts`
- `src/app/api/discovery/scenarios/[id]/programs/[programId]/route.ts`
- `src/app/api/discovery/my-programs/route.ts`
- `src/app/api/discovery/programs/[programId]/evaluation/route.ts`
- `src/app/api/discovery/programs/[programId]/regenerate/route.ts`

### 4. Database Schema Enhancement
- **File**: `src/lib/repositories/postgresql/migrations/002_add_started_at_to_programs.sql`
- **Purpose**: Adds `started_at` column to programs table to track when a program actually starts
- **Migration**: Automatically applied on first repository access

### 5. Migration System
- **File**: `src/lib/db/migration-runner.ts`
- **Purpose**: Automated migration system for applying database schema changes
- **Integration**: Added to repository factory to run migrations on initialization

## Field Definitions

### Program Timestamps
- **`createdAt`**: When the program record was created in the database
- **`startedAt`** (optional): When the program actually started (status changed to 'active')
- **`endTime`** (optional): When the program was completed
- **`lastActivityAt`**: Last time any activity occurred on the program

### Usage Guidelines

1. **Creating a program**: Only `createdAt` is set (automatically by database)
2. **Starting a program**: Set `startedAt` when status changes from 'pending' to 'active'
3. **Displaying start time**: Use `startedAt || createdAt` as fallback pattern
4. **Sorting by recency**: Use `createdAt` for consistent ordering

## Migration Notes

- The `start_time` column in PostgreSQL is deprecated but retained for backward compatibility
- Existing programs will have their `started_at` populated from `start_time` during migration
- All new code should use `createdAt` and `startedAt` fields

## Testing

After deployment, verify:
1. Programs can be created and started normally
2. Existing programs display correct timestamps
3. Sorting and filtering work as expected
4. No TypeScript type errors related to timestamp fields