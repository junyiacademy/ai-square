# File Size Standards - Modularity over Line Counts

## Philosophy Shift

**OLD (Line-Count Focused):**
- "File is 301 lines → Must refactor"
- Hard limits enforced arbitrarily
- Focus on raw numbers

**NEW (Modularity Focused):**
- "File has multiple responsibilities → Should refactor"
- Focus on cognitive load and AI-readability
- Pragmatic, context-aware enforcement

**Core Principle:** "行數不一定是關鍵，主要是有沒有好好拆分模組，基本上 AI 可以看得懂就好，不會浪費 token 就好"

Translation: Line count is NOT the key metric. What matters is proper module separation. Goal: AI-readable code that doesn't waste tokens.

---

## New Quality Metrics

### 1. Single Responsibility Principle (SRP)
**Check:** Does this file do ONE thing well?

**Good Examples:**
- A 500-line service that handles ALL user authentication logic (login, logout, token refresh, session management)
- A 400-line repository that provides comprehensive CRUD operations for a single domain entity
- A 600-line test file covering all edge cases for a single component

**Bad Examples:**
- A 250-line file mixing API route handling, business logic, database queries, and validation
- A 300-line component with form logic, API calls, state management, and UI rendering mixed together

### 2. AI-Readability Score
**Check:** Can AI navigate and understand this file efficiently?

**Good Indicators:**
- Clear section comments marking different logical blocks
- Consistent naming conventions throughout
- Logical grouping of related functions
- Minimal cognitive jumps between sections

**Bad Indicators:**
- Random function order with no logical grouping
- Mixed concerns (UI + business logic + data access)
- Unclear variable names requiring context from other files
- Deeply nested logic requiring extensive mental tracking

### 3. Token Efficiency
**Check:** Is there unnecessary repetition or redundancy?

**Good Patterns:**
- DRY principle applied (Don't Repeat Yourself)
- Extracted common patterns into utilities
- Type definitions reused across file
- Clear imports without circular dependencies

**Bad Patterns:**
- Copy-pasted code blocks with minor variations
- Redundant type definitions
- Unnecessary verbose comments explaining obvious code
- Multiple similar functions that could be generalized

### 4. Cohesion Score
**Check:** How related are the elements within this file?

**High Cohesion (Good):**
- All functions work toward the same goal
- Shared state is minimal and well-managed
- Functions naturally call each other
- File represents a clear, bounded context

**Low Cohesion (Bad):**
- Unrelated utility functions thrown together
- Mix of different domain concepts
- Functions that never interact with each other
- "Junk drawer" files with miscellaneous code

### 5. Coupling Score
**Check:** How dependent is this file on other modules?

**Loose Coupling (Good):**
- Clear, minimal interfaces with other modules
- Dependencies injected or imported explicitly
- Easy to test in isolation
- Changes in other files rarely require changes here

**Tight Coupling (Bad):**
- Circular dependencies with other files
- Direct access to internal state of other modules
- Changes cascade across multiple files
- Difficult to test without mocking many dependencies

---

## When to Refactor

### ✅ Refactor When:

1. **Multiple Responsibilities Detected**
   - File mixes concerns (e.g., API handling + business logic + data access)
   - Clear opportunity to extract into separate modules

2. **AI Navigation Difficulty**
   - Claude/AI struggles to understand file structure
   - Requires multiple passes to grasp full scope
   - Token waste due to unclear organization

3. **Cognitive Load Too High**
   - Developers report difficulty understanding file
   - Frequent bugs in this file
   - Changes take longer than expected

4. **DRY Violations**
   - Significant code duplication within file
   - Could extract common patterns

5. **Testing Difficulty**
   - Hard to write focused tests
   - Tests require extensive mocking
   - Test file significantly larger than implementation

### ❌ DO NOT Refactor When:

1. **Arbitrary Line Count**
   - File is 301 lines but well-structured
   - All code serves single, clear purpose
   - AI can easily navigate and understand

2. **Natural Complexity**
   - File represents inherently complex domain logic
   - Splitting would create artificial boundaries
   - Current structure is the most natural representation

3. **Configuration/Metadata Files**
   - Tailwind configs, test fixtures, type definitions
   - Splitting would reduce clarity
   - Size is necessary for completeness

---

## Pragmatic Examples

### Example 1: GOOD 500-Line File

```typescript
/**
 * User Authentication Service
 *
 * Single Responsibility: Complete user authentication flow
 * Well-structured sections:
 * - Types & Interfaces (lines 1-50)
 * - Login Logic (lines 51-150)
 * - Logout & Session Management (lines 151-250)
 * - Token Refresh & Validation (lines 251-350)
 * - Password Reset Flow (lines 351-450)
 * - Helper Functions (lines 451-500)
 */

// ✅ Clear sections
// ✅ Single domain (auth)
// ✅ All functions related
// ✅ Easy for AI to navigate
// ✅ No code duplication
```

**Why This is Good:**
- Single responsibility: Authentication
- Logical sections with clear boundaries
- All functions serve the same domain
- AI can quickly jump to relevant section
- No token waste - everything is needed

### Example 2: BAD 250-Line File

```typescript
/**
 * Mixed Concerns Example
 */

// API route handling (lines 1-80)
export async function POST(req: Request) {
  // Inline validation logic
  // Direct database queries
  // Business logic mixed in
}

// Unrelated utility functions (lines 81-150)
function formatDate(date: Date) { ... }
function calculateDiscount(price: number) { ... }

// Random type definitions (lines 151-200)
interface UserData { ... }
interface ProductData { ... }

// More API handlers (lines 201-250)
export async function GET(req: Request) { ... }
```

**Why This is Bad:**
- Multiple responsibilities: API, utils, types, business logic
- Poor cohesion - unrelated functions together
- AI must parse entire file to understand any part
- Token waste due to mixed concerns
- Should be split into: route.ts, validators.ts, types.ts, utils.ts

### Example 3: GOOD 600-Line Test File

```typescript
/**
 * Comprehensive User Service Tests
 *
 * Tests ALL user service functionality:
 * - Registration (50 lines)
 * - Login/Logout (100 lines)
 * - Profile Management (150 lines)
 * - Permissions (200 lines)
 * - Edge Cases & Error Handling (100 lines)
 */

describe('UserService', () => {
  // ✅ Organized by feature
  // ✅ Each test focused and clear
  // ✅ Comprehensive coverage
  // ✅ AI can navigate by describe blocks
})
```

**Why This is Good:**
- Single responsibility: Testing UserService
- Organized with clear describe blocks
- Comprehensive coverage justifies length
- AI can jump to specific test sections
- Splitting would reduce test cohesion

---

## Refactoring Strategies

### 1. Extract by Concern

**Before (Mixed Concerns):**
```typescript
// page.tsx - 400 lines
export default function UserPage() {
  // API calls inline
  const handleSubmit = async () => {
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(validateUserData(formData))
    });
  };

  // Validation inline
  const validateUserData = (data) => { ... };

  // Business logic inline
  const calculateUserLevel = (xp) => { ... };

  return <div>...</div>;
}
```

**After (Separated Concerns):**
```typescript
// page.tsx - 150 lines (UI coordination only)
import { useUserService } from '@/services/user-service';
import { UserForm } from '@/components/UserForm';

export default function UserPage() {
  const { createUser } = useUserService();

  return (
    <div>
      <UserForm onSubmit={createUser} />
    </div>
  );
}

// services/user-service.ts - 200 lines (business logic)
export function useUserService() {
  const createUser = async (data: UserData) => {
    const validated = userValidator.validate(data);
    return userRepository.create(validated);
  };
  // ... more service methods
}

// validators/user-validator.ts - 100 lines (validation)
export const userValidator = {
  validate: (data: unknown): UserData => { ... }
};

// components/UserForm.tsx - 150 lines (UI component)
export function UserForm({ onSubmit }: Props) {
  // Pure UI logic
}
```

### 2. Extract by Feature

**Before (Feature Spread Across File):**
```typescript
// user-repository.ts - 600 lines
export class UserRepository {
  // User CRUD (200 lines)
  async findById(id: string) { ... }
  async create(user: User) { ... }

  // User Preferences (200 lines)
  async getPreferences(userId: string) { ... }
  async updatePreferences(userId: string, prefs: Preferences) { ... }

  // User Analytics (200 lines)
  async getUserStats(userId: string) { ... }
  async trackActivity(userId: string, activity: Activity) { ... }
}
```

**After (Separated by Feature):**
```typescript
// repositories/user-repository.ts - 250 lines (core CRUD)
export class UserRepository {
  async findById(id: string) { ... }
  async create(user: User) { ... }
  // Focus on core user data operations
}

// repositories/user-preferences-repository.ts - 200 lines
export class UserPreferencesRepository {
  // All preference-related operations
}

// repositories/user-analytics-repository.ts - 200 lines
export class UserAnalyticsRepository {
  // All analytics-related operations
}
```

### 3. Extract Utilities

**Before (Utilities Mixed with Logic):**
```typescript
// service.ts - 500 lines
export class ScenarioService {
  async processScenario(id: string) {
    const data = await this.fetch(id);
    const formatted = this.formatMultilingual(data);
    const validated = this.validateStructure(formatted);
    return validated;
  }

  // Many helper functions inline (300 lines)
  private formatMultilingual(data: unknown) { ... }
  private validateStructure(data: unknown) { ... }
  private transformData(data: unknown) { ... }
  private calculateMetrics(data: unknown) { ... }
}
```

**After (Utilities Extracted):**
```typescript
// services/scenario-service.ts - 200 lines (core logic)
import { multilingualFormatter } from '@/lib/utils/multilingual';
import { structureValidator } from '@/lib/validators/structure';

export class ScenarioService {
  async processScenario(id: string) {
    const data = await this.fetch(id);
    const formatted = multilingualFormatter.format(data);
    const validated = structureValidator.validate(formatted);
    return validated;
  }
}

// lib/utils/multilingual.ts - 150 lines (reusable)
export const multilingualFormatter = {
  format: (data: unknown) => { ... }
};

// lib/validators/structure.ts - 150 lines (reusable)
export const structureValidator = {
  validate: (data: unknown) => { ... }
};
```

---

## Updated File Size Guidelines

### Soft Limits (Trigger Review, Not Enforcement)

```typescript
const FILE_SIZE_SOFT_LIMITS = {
  component: 300,    // UI components (review if exceeded)
  page: 400,         // Next.js pages (review if exceeded)
  api: 300,          // API routes (review if exceeded)
  service: 500,      // Service layer (context-dependent)
  repository: 400,   // Repository pattern (context-dependent)
  utility: 200,      // Utility functions (usually should be smaller)
  test: 800,         // Tests (can be larger with good organization)
  config: 1500,      // Configuration (often necessarily large)
};
```

### Hard Limits (Enforcement)

**Only enforce when:**
- File exceeds 2x soft limit AND has clear modularity issues
- Multiple responsibilities detected (automated analysis)
- High cognitive complexity score (cyclomatic complexity > 50)
- Low cohesion score (unrelated functions)

```typescript
const ENFORCEMENT_CRITERIA = {
  // File must meet ALL of these to block:
  size: fileLines > softLimit * 2,
  complexity: cyclomaticComplexity > 50,
  cohesion: cohesionScore < 0.6,
  responsibilities: responsibilityCount > 1,
};
```

---

## AI-Readability Checklist

### For File Authors:

- [ ] File has clear purpose stated in header comment
- [ ] Logical sections marked with comments
- [ ] Related functions grouped together
- [ ] Consistent naming conventions throughout
- [ ] Minimal external dependencies
- [ ] Clear import organization
- [ ] Type definitions at top or in separate file
- [ ] No deeply nested logic (max 3-4 levels)

### For Code Reviewers:

- [ ] Can understand file purpose in 30 seconds
- [ ] Can find specific function without searching
- [ ] No "what does this do?" moments
- [ ] Clear separation of concerns
- [ ] Would be easy to test
- [ ] Changes would be localized

---

## Token Efficiency Guidelines

### Token-Efficient Code:

1. **Clear Structure Reduces Context Loading**
   - AI doesn't need to read entire file to understand any part
   - Section comments allow targeted reading

2. **DRY Reduces Redundancy**
   - Common patterns extracted
   - No repetitive code that AI must parse multiple times

3. **Type Definitions Reduce Inference**
   - Explicit types prevent AI from guessing
   - Shared types prevent duplication

4. **Focused Modules Reduce Cross-File Reading**
   - Self-contained files reduce need to read multiple files
   - Clear interfaces minimize coupling

### Token-Wasteful Code:

1. **Mixed Concerns Force Full File Reading**
   - AI must read entire file to understand any part
   - No clear entry points

2. **Code Duplication**
   - AI must parse similar code multiple times
   - Increases context window usage

3. **Unclear Structure**
   - AI must read entire file to build mental model
   - No section markers to guide navigation

4. **Tight Coupling**
   - AI must read multiple files to understand one
   - Circular dependencies create context loops

---

## Migration Strategy

### Phase 1: Update Tooling (Week 1)
- [x] Update check-file-size.ts with new metrics
- [ ] Add cognitive complexity analysis
- [ ] Add cohesion/coupling detection
- [ ] Create exemption list for justified large files

### Phase 2: Documentation (Week 1)
- [x] Create this standards document
- [ ] Update code-quality-enforcer agent
- [ ] Create refactoring playbook with examples
- [ ] Add to CLAUDE.md

### Phase 3: Gradual Application (Ongoing)
- [ ] Review existing large files against new criteria
- [ ] Refactor only those with clear modularity issues
- [ ] Document justified exceptions
- [ ] Update as patterns emerge

### Phase 4: Continuous Improvement (Ongoing)
- [ ] Collect feedback from developers
- [ ] Track which files cause most confusion
- [ ] Refine metrics based on real-world data
- [ ] Update standards quarterly

---

## Exemptions & Exceptions

### Automatically Exempt:
- Configuration files (tailwind.config.ts, etc.)
- Generated files
- Test fixtures with large datasets
- Type definition aggregators

### Requires Justification:
- Services > 600 lines (document why complexity is inherent)
- Components > 400 lines (explain why splitting would reduce clarity)
- API routes > 400 lines (justify why can't delegate to services)

### Documentation Template:
```typescript
/**
 * FILE SIZE EXEMPTION
 *
 * Current Size: 650 lines
 * Soft Limit: 500 lines
 *
 * Justification:
 * This service handles the complete authentication flow including
 * OAuth integration with 3 providers, session management, token
 * refresh, and password reset. Splitting would create artificial
 * boundaries and reduce cohesion of the auth domain.
 *
 * Modularity Evidence:
 * - Single Responsibility: Authentication ✅
 * - Clear Sections: 6 well-defined sections ✅
 * - High Cohesion: All functions serve auth domain ✅
 * - AI-Readable: Clear section comments ✅
 * - Token-Efficient: No duplication, DRY ✅
 *
 * Reviewed: 2025-11-30
 * Reviewer: @youngtsai
 */
```

---

## Metrics Dashboard (Future)

Track project-wide quality metrics:

```yaml
Code Quality Metrics:
  - Average File Size by Type
  - Files Exceeding Soft Limits (with justification)
  - Files Exceeding Hard Limits (blocking issues)
  - Cognitive Complexity Distribution
  - Cohesion Score Average
  - Coupling Score Average
  - Token Efficiency Score

AI-Readability Metrics:
  - Average Section Count per File
  - Files with Clear Structure (%)
  - Files with Mixed Concerns (%)
  - Navigation Difficulty Score

Refactoring Impact:
  - Before/After Metrics
  - Bug Reduction in Refactored Files
  - Development Velocity Changes
  - Test Coverage Changes
```

---

## Summary

**Key Takeaway:** Focus on modularity, AI-readability, and token efficiency - NOT arbitrary line counts.

**Decision Tree:**

```
File Size Alert
    ↓
Does file have single responsibility?
    ├─ Yes → Keep as-is (document if >2x limit)
    └─ No  → Refactor by concern
              ↓
Is file AI-readable with clear sections?
    ├─ Yes → Keep as-is
    └─ No  → Improve structure or split
              ↓
Is code token-efficient (no duplication)?
    ├─ Yes → Keep as-is
    └─ No  → Extract common patterns
              ↓
Are all functions highly cohesive?
    ├─ Yes → Justified large file
    └─ No  → Split by feature or domain
```

**Remember:** A well-structured 500-line file is better than five poorly-structured 100-line files.
