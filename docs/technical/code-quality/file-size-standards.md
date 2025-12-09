# File Size Standards

## Overview

This document defines file size limits for the AI Square project to ensure code maintainability, readability, and proper modularization.

## Rationale

Large files are indicators of:
- Poor separation of concerns
- Mixing multiple responsibilities
- Lack of modularization
- Difficulty in code review
- Higher complexity and maintenance cost

By enforcing file size limits, we encourage:
- **Single Responsibility Principle**: Each file focuses on one concern
- **Modularity**: Code is split into reusable, testable units
- **Readability**: Easier to understand and navigate
- **Maintainability**: Simpler to modify and debug
- **Team Collaboration**: Easier code reviews and fewer merge conflicts

## File Size Thresholds

### By File Type

| File Type | Limit (lines) | Description |
|-----------|---------------|-------------|
| **Component** | 300 | React components (.tsx in components/) |
| **Page** | 400 | Next.js pages (coordination only) |
| **API Route** | 300 | API routes (should delegate to services) |
| **Service** | 500 | Service layer (business logic) |
| **Repository** | 400 | Repository pattern implementations |
| **Utility** | 200 | Utility/helper functions |
| **Test** | 600 | Test files (multiple test cases allowed) |
| **Config** | 1000 | Configuration files (exceptions allowed) |
| **Default** | 500 | All other TypeScript/JavaScript files |

### Severity Levels

1. **WARNING**: File exceeds threshold
   - Show in check reports
   - Does not block commits
   - Encourage refactoring

2. **ERROR**: File exceeds 2x threshold
   - **BLOCKS commits** in pre-commit check
   - Must be refactored before commit
   - Requires immediate action

## Line Counting Rules

Lines are counted **excluding**:
- Empty lines
- Comment-only lines (both `//` and `/* */`)
- Import statements (not counted toward complexity)

This focuses on **actual code complexity** rather than documentation or formatting.

## Usage

### Check File Sizes

```bash
# Check all files
npm run check:file-size

# Check with refactoring suggestions
npm run check:file-size:fix

# CI mode (exit with error if violations)
npm run check:file-size:ci

# Using Make
make check-file-size
make check-file-size-fix
```

### Pre-commit Integration

File size checking is automatically enforced in:

```bash
make pre-commit-check
```

This runs before every commit and will **block commits** if files exceed 2x threshold.

## Refactoring Strategies

### 1. Extract Components (React)

**Before** (500 lines):
```typescript
// components/UserDashboard.tsx - TOO LARGE
export function UserDashboard() {
  // Profile section (150 lines)
  // Stats section (150 lines)
  // Activity feed (150 lines)
  // Settings section (50 lines)
}
```

**After**:
```typescript
// components/UserDashboard.tsx (50 lines)
import { UserProfile } from './UserProfile';
import { UserStats } from './UserStats';
import { ActivityFeed } from './ActivityFeed';
import { UserSettings } from './UserSettings';

export function UserDashboard() {
  return (
    <>
      <UserProfile />
      <UserStats />
      <ActivityFeed />
      <UserSettings />
    </>
  );
}

// components/UserProfile.tsx (150 lines)
// components/UserStats.tsx (150 lines)
// components/ActivityFeed.tsx (150 lines)
// components/UserSettings.tsx (50 lines)
```

### 2. Extract Services (Business Logic)

**Before** (700 lines):
```typescript
// api/users/route.ts - TOO LARGE
export async function POST(req: Request) {
  // Validation logic (100 lines)
  // Database operations (200 lines)
  // Email sending (100 lines)
  // Payment processing (100 lines)
  // Notification sending (100 lines)
  // Response formatting (100 lines)
}
```

**After**:
```typescript
// api/users/route.ts (80 lines)
import { UserService } from '@/lib/services/user-service';
import { validateUserInput } from '@/lib/validators/user-validator';

export async function POST(req: Request) {
  const data = await req.json();
  const validated = validateUserInput(data);
  const result = await UserService.createUser(validated);
  return Response.json(result);
}

// lib/services/user-service.ts (200 lines)
// lib/validators/user-validator.ts (100 lines)
// lib/services/email-service.ts (150 lines)
// lib/services/payment-service.ts (150 lines)
```

### 3. Extract Utilities

**Before**:
```typescript
// utils/helpers.ts - TOO LARGE (800 lines)
export function formatDate() { /* ... */ }
export function formatCurrency() { /* ... */ }
export function validateEmail() { /* ... */ }
export function parseJSON() { /* ... */ }
// ... 30+ more utility functions
```

**After**:
```typescript
// utils/date-helpers.ts (150 lines)
export function formatDate() { /* ... */ }
export function parseDate() { /* ... */ }

// utils/currency-helpers.ts (100 lines)
export function formatCurrency() { /* ... */ }

// utils/validation-helpers.ts (200 lines)
export function validateEmail() { /* ... */ }

// utils/json-helpers.ts (150 lines)
export function parseJSON() { /* ... */ }
```

### 4. Use Feature Directories

Organize related files by feature instead of by type:

**Before**:
```
components/
  UserList.tsx (300 lines)
  UserDetail.tsx (250 lines)
  UserForm.tsx (400 lines)
services/
  user-service.ts (600 lines)
```

**After**:
```
features/
  users/
    components/
      UserList.tsx (200 lines)
      UserDetail.tsx (150 lines)
      UserForm/
        index.tsx (100 lines)
        FormFields.tsx (150 lines)
        FormValidation.tsx (100 lines)
    services/
      user-service.ts (300 lines)
      user-repository.ts (200 lines)
    utils/
      user-helpers.ts (100 lines)
```

## Exceptions

Configuration files may exceed limits if necessary:
- `tailwind.config.ts`
- `next.config.ts`
- `jest.config.ts`

These are marked as `config` type with a 1000-line limit.

## Integration with Quality Gates

File size checking is part of the comprehensive quality gate system:

1. **Pre-commit**: Automatic check before commit
2. **Code Review**: Reviewers check for large files
3. **CI/CD**: File size check in GitHub Actions
4. **Agent System**: `code-quality-enforcer` agent monitors file sizes

## Example Violations and Fixes

### Example 1: Component Too Large

**Violation**:
```
❌ ERROR: src/components/ScenarioEditor.tsx
  Lines: 850 / Limit: 300 (component)
  Exceeds limit by: 183%
```

**Fix**:
```bash
npm run check:file-size:fix
```

**Suggestions**:
- Extract child components into separate files
- Move utility functions to a separate utils file
- Consider using composition instead of large components
- Extract custom hooks if there is complex state logic

### Example 2: API Route Too Large

**Violation**:
```
⚠️ WARNING: src/app/api/scenarios/route.ts
  Lines: 420 / Limit: 300 (api)
```

**Fix**:
- Move business logic to service layer
- Extract validation to separate validator functions
- Use Repository Pattern for database access

## Best Practices

1. **Write focused files**: Each file should have a single, clear responsibility
2. **Use composition**: Combine small, focused components
3. **Extract early**: Don't wait until files are too large
4. **Follow patterns**: Use established architectural patterns (Repository, Service)
5. **Review regularly**: Run `make check-file-size` during development

## Monitoring

Track file size violations in:
- Daily development
- Code reviews
- Pre-commit checks
- CI/CD pipelines

**Goal**: Zero files exceeding 2x threshold

## Related Documentation

- [Code Quality Enforcer Agent](/.claude/agents/code-quality-enforcer.md)
- [Agents Manager](/.claude/agents/agents-manager.md)
- [Pre-commit Checks](../../deployment/CICD.md)

---

**Version**: 1.0
**Last Updated**: 2025-11-29
**Owner**: code-quality-enforcer agent
