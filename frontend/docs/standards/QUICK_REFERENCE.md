# File Quality Standards - Quick Reference

**Philosophy:** 行數不一定是關鍵，主要是有沒有好好拆分模組，基本上 AI 可以看得懂就好，不會浪費 token 就好

**Translation:** Line count is NOT the key. Focus on: module separation, AI-readability, token efficiency.

---

## Quick Decision Tree

```
File exceeds soft limit?
    ├─ No → ✅ Good
    └─ Yes → Check metrics:
        ├─ Complexity < 50 → ⚠️  Review (likely OK)
        ├─ Single responsibility → ⚠️  Review (likely OK)
        ├─ Clear sections → ⚠️  Review (likely OK)
        └─ ALL of:
            - Exceeds 2x limit
            - Complexity > 50
            - Multiple concerns
            → ❌ MUST refactor
```

---

## Soft Limits (Trigger Review Only)

| File Type | Soft Limit | 2x Limit (Enforcement Trigger) |
|-----------|------------|-------------------------------|
| Component | 300 lines  | 600 lines |
| Page | 400 lines  | 800 lines |
| API Route | 300 lines  | 600 lines |
| Service | 500 lines  | 1000 lines |
| Repository | 400 lines  | 800 lines |
| Utility | 200 lines  | 400 lines |
| Test | 800 lines  | 1600 lines |
| Config | 1500 lines | 3000 lines |

---

## Quality Metrics

### Check Your File

```bash
# In frontend/
npm run check:file-size              # Basic check
npm run check:file-size --fix        # With suggestions
npm run check:file-size --verbose    # Detailed metrics
```

### Metrics Tracked

1. **Lines:** Total non-comment, non-empty lines
2. **Complexity:** Cyclomatic complexity (threshold: 50)
3. **Exports:** Number of exported items (threshold: 10)
4. **Imports:** Number of import statements
5. **Mixed Concerns:** Detection of multiple responsibilities
6. **Clear Sections:** Presence of section comments
7. **Duplication:** Estimated code repetition (threshold: 30%)

---

## When to Refactor

### ✅ Refactor When:

- **High Complexity:** Cyclomatic complexity > 50
- **Mixed Concerns:** Multiple responsibilities detected
- **High Duplication:** > 30% code repetition
- **Meets ALL enforcement criteria**

### ❌ DON'T Refactor When:

- **Just exceeds soft limit** but has:
  - Single responsibility ✅
  - Low complexity ✅
  - Clear structure ✅
  - No duplication ✅

**Action:** Document exemption instead

---

## Exemption Template

Add to file header if justified > soft limit:

```typescript
/**
 * FILE SIZE EXEMPTION
 *
 * Current Size: 650 lines
 * Soft Limit: 500 lines
 *
 * Justification:
 * [Why this file is necessarily large - e.g., handles complete auth flow
 * with OAuth for 3 providers, session management, token refresh, password reset]
 *
 * Modularity Evidence:
 * - Single Responsibility: [Domain] ✅
 * - Clear Sections: [Number] well-defined sections ✅
 * - High Cohesion: All functions serve [domain] ✅
 * - AI-Readable: Clear section comments ✅
 * - Token-Efficient: No duplication, DRY ✅
 *
 * Reviewed: YYYY-MM-DD
 * Reviewer: @username
 */
```

---

## Common Patterns

### ✅ GOOD: 500-Line Well-Structured File

```typescript
/**
 * Authentication Service
 * Single Responsibility: Complete auth flow
 */

// === Types & Interfaces === (50 lines)

// === Login Logic === (100 lines)

// === Session Management === (100 lines)

// === Token Handling === (100 lines)

// === Password Reset === (100 lines)

// === Helpers === (50 lines)
```

**Why Good:**
- Single domain (auth)
- Clear sections
- All related
- AI can jump to section
- No duplication

---

### ❌ BAD: 250-Line Mixed File

```typescript
// API handling (80 lines)
export async function POST(req: Request) {
  // Inline validation
  // Direct DB queries
  // Business logic mixed in
}

// Random utils (70 lines)
function formatDate() { ... }
function calculateDiscount() { ... }

// Types (50 lines)
interface UserData { ... }
interface ProductData { ... }

// More API (50 lines)
export async function GET() { ... }
```

**Why Bad:**
- Multiple responsibilities
- Low cohesion
- Mixed concerns
- Hard to navigate

**Fix:** Split into:
- `route.ts` (API coordination)
- `validators.ts` (validation)
- `types.ts` (type definitions)
- `utils.ts` (utilities)

---

## Refactoring Strategies

### 1. Extract by Concern

**Problem:** Mixed API + business logic + data access

**Solution:**
```
page.tsx (400 lines, mixed)
  → page.tsx (150 lines, UI coordination)
  → service.ts (200 lines, business logic)
  → repository.ts (150 lines, data access)
```

---

### 2. Extract by Feature

**Problem:** Single file handling multiple features

**Solution:**
```
user-repository.ts (600 lines)
  → user-repository.ts (250 lines, core CRUD)
  → user-preferences-repository.ts (200 lines)
  → user-analytics-repository.ts (150 lines)
```

---

### 3. Extract Utilities

**Problem:** Many helper functions mixed with logic

**Solution:**
```
service.ts (500 lines)
  → service.ts (200 lines, core logic)
  → utils/formatters.ts (150 lines)
  → utils/validators.ts (150 lines)
```

---

## CI/CD Integration

### Pre-Commit Hook

```bash
# Only blocks on CRITICAL issues
npm run check:file-size --ci
# Exits with error only if file meets ALL enforcement criteria
```

### GitHub Actions

```yaml
- name: Check File Quality
  run: npm run check:file-size --ci
  # Only fails if critical issues (currently 0 in codebase)
```

---

## Current Codebase Status

```
✅ Critical Issues: 0 (BLOCKING)
⚠️  Warnings: 30 (Review recommended)
ℹ️  Info: 451 (Tracking only)
📋 Exempt: 3 (Documented justifications)
```

**High Priority for Review:**
1. `src/app/chat/page.tsx` - Complexity: 83
2. `src/app/discovery/scenarios/[id]/page.tsx` - Complexity: 120

---

## Key Takeaways

1. **Line count alone is NOT the metric**
2. **Focus on modularity and clarity**
3. **Complexity matters more than size**
4. **Document justified large files**
5. **A well-structured 500-line file > five poorly-structured 100-line files**

---

## Learn More

- **Full Documentation:** `docs/standards/file-size-standards.md`
- **Update Philosophy:** `docs/CODE_QUALITY_PHILOSOPHY_UPDATE.md`
- **Phase 3B Plan:** `docs/PHASE_3B_RECOMMENDATIONS.md`
- **Tool Implementation:** `scripts/check-file-size.ts`

---

**Remember:** 好好拆分模組 (Properly separate modules) > 減少行數 (Reduce line count)
