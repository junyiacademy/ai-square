# Code Quality Philosophy Update

**Date:** 2025-11-30
**Status:** Implemented
**Impact:** Paradigm shift from line-count enforcement to quality-based metrics

---

## Summary

We have redefined our file size standards and quality enforcement approach based on the principle:

> "行數不一定是關鍵，主要是有沒有好好拆分模組，基本上 AI 可以看得懂就好，不會浪費 token 就好"
>
> Translation: Line count is NOT the key metric. What matters is proper module separation. Goal: AI-readable code that doesn't waste tokens.

---

## What Changed

### Before (Line-Count Focused)

**Philosophy:**
- Hard limits enforced arbitrarily
- Component = 300 lines MAX
- Page = 400 lines MAX
- Any file exceeding 2x limit = ERROR

**Problems:**
- Forced arbitrary splits of well-structured files
- Ignored complexity and quality
- Created artificial boundaries
- Reduced cohesion in some cases

**Example Issue:**
```
File: auth-service.ts (550 lines)
Old System: ❌ ERROR - Exceeds 500 line limit
Reality: ✅ Well-structured, single responsibility, clear sections
```

---

### After (Modularity Focused)

**Philosophy:**
- Soft limits trigger review, not automatic enforcement
- Focus on cognitive complexity
- Check for mixed concerns
- Evaluate AI-readability
- Measure token efficiency

**Quality Metrics:**
1. **Single Responsibility:** Does file do ONE thing well?
2. **AI-Readability:** Can AI navigate efficiently?
3. **Token Efficiency:** Is there unnecessary repetition?
4. **Cohesion:** Are all elements related?
5. **Coupling:** Is it loosely coupled?

**Enforcement Criteria (ALL must be met to block):**
- File exceeds 2x soft limit AND
- Cyclomatic complexity > 50 AND
- Multiple responsibilities detected

**Example:**
```
File: auth-service.ts (550 lines)
New System: ⚠️  WARNING - Review recommended
Metrics:
  - Complexity: 35 (✅ OK)
  - Single Responsibility: ✅ Auth only
  - Clear Sections: ✅ Yes
  - Mixed Concerns: ✅ No
Decision: KEEP AS-IS with documentation
```

---

## New Tooling

### Updated `check-file-size.ts`

**New Checks:**
- ✅ Cyclomatic complexity calculation
- ✅ Export/import counting
- ✅ Mixed concern detection
- ✅ Section clarity analysis
- ✅ Code duplication estimation
- ✅ Exemption documentation support

**New Flags:**
```bash
npm run check:file-size              # Standard check
npm run check:file-size --fix        # Show suggestions
npm run check:file-size --verbose    # Detailed metrics
npm run check:file-size --ci         # CI mode (only errors block)
```

**Output Example:**
```
🔍 Analyzing file quality metrics...

📏 New Philosophy: Modularity > Line Counts

   Checking: Complexity, Cohesion, AI-Readability, Token Efficiency

❌ CRITICAL ISSUES (0 files - BLOCKING):

⚠️  WARNINGS (30 files - review recommended):
   Files exceed soft limits but may be justified if well-structured

  src/app/chat/page.tsx
    Lines: 625 / Soft Limit: 400 (page)
    Complexity: 83 (threshold: 50)
    Exports: 1 | Imports: 15
    ⚠️  MIXED CONCERNS detected
    Suggestions:
      • HIGH COMPLEXITY (83): Break down complex logic
      • MIXED CONCERNS: Separate different responsibilities

📊 Summary:
  Critical Issues (blocking): 0
  Warnings (review): 30
  Info (reference): 451
  Exempt Files: 3
```

---

## Updated Soft Limits

```typescript
const FILE_SIZE_SOFT_LIMITS = {
  component: 300,    // UI components (review if exceeded)
  page: 400,         // Next.js pages (review if exceeded)
  api: 300,          // API routes (review if exceeded)
  service: 500,      // Service layer (context-dependent)
  repository: 400,   // Repository pattern (context-dependent)
  utility: 200,      // Utility functions (usually should be smaller)
  test: 800,         // Tests (increased! Can be larger with good organization)
  config: 1500,      // Configuration (increased! Often necessarily large)
};
```

**Key Changes:**
- Test limit: 600 → 800 lines
- Config limit: 1000 → 1500 lines
- All limits are now "soft" (trigger review, not enforcement)

---

## Exemption Process

### Automatic Exemptions
- Configuration files (tailwind.config.ts, etc.)
- Type definition files (*.d.ts, types.ts)
- Generated files

### Documented Exemptions

Add to file header:

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

Tool automatically detects this comment and marks file as exempt.

---

## Refactoring Decision Tree

```
File Size Alert
    ↓
Does file have single responsibility?
    ├─ Yes → Check complexity
    │          ├─ Low (<50) → KEEP AS-IS, document if >2x limit
    │          └─ High (>50) → REFACTOR: Extract complex logic
    └─ No  → REFACTOR: Separate by concern
              ↓
Is file AI-readable with clear sections?
    ├─ Yes → Check duplication
    │          ├─ Low (<30%) → KEEP AS-IS
    │          └─ High (>30%) → REFACTOR: Extract patterns
    └─ No  → IMPROVE: Add sections or split
              ↓
Are all functions highly cohesive?
    ├─ Yes → Justified large file
    └─ No  → REFACTOR: Split by feature/domain
```

---

## Impact on Current Codebase

### Immediate Impact

**Before Update:**
- 39 files flagged as violations
- Mix of true issues and false positives
- Unclear which files truly needed refactoring

**After Update:**
- **0 critical issues** (no files meet all enforcement criteria)
- 30 warnings (soft limit exceeded, review recommended)
- 451 info (tracking metrics, no action needed)
- 3 exempt (documented justifications)

### Quality Insights

**Files Needing Attention:**
1. `src/app/chat/page.tsx` - Complexity: 83 (High)
2. `src/app/discovery/scenarios/[id]/page.tsx` - Complexity: 120 (Very High)

**Files Likely Justified:**
- Test files with comprehensive coverage
- Service files handling complex domains
- Repository files with full CRUD operations

---

## Integration with Agents

### Updated Agent Behavior

**code-quality-enforcer (deprecated) → quality-guardian-agent**

Now considers:
- File metrics beyond just line count
- Complexity and cohesion scores
- AI-readability factors
- Token efficiency

**agents-manager**

Updated decision tree:
```yaml
File size violations:
  → quality-guardian-agent
  Triggers:
    - "file too large" → Check metrics first
    - "refactor large file" → Analyze modularity
    - "split file" → Verify mixed concerns
```

---

## Migration Guide

### For Developers

**When you see a warning:**

1. **Check metrics:**
   ```bash
   npm run check:file-size --fix
   ```

2. **Evaluate against criteria:**
   - Is complexity > 50? → Extract complex logic
   - Mixed concerns? → Separate responsibilities
   - High duplication? → Apply DRY principle
   - Well-structured? → Document exemption

3. **Take appropriate action:**
   - Refactor if quality issues found
   - Document if justified as-is
   - Don't split just for line count

**When creating new files:**

- Focus on single responsibility
- Add section comments for navigation
- Keep complexity low (<50)
- Avoid mixing concerns
- Extract duplicated patterns

### For AI (Claude)

**When asked to refactor "large" file:**

1. **Analyze metrics first:**
   ```bash
   npm run check:file-size --verbose
   ```

2. **Check quality indicators:**
   - Complexity score
   - Mixed concerns
   - Duplication
   - Cohesion

3. **Recommend based on quality:**
   - High complexity → Extract logic
   - Mixed concerns → Separate responsibilities
   - Well-structured but large → Document exemption
   - Never split just for line count

---

## Documentation

### New/Updated Files

1. **`docs/standards/file-size-standards.md`**
   - Complete philosophy explanation
   - Pragmatic examples (good 500-line vs bad 250-line file)
   - Refactoring strategies
   - Token efficiency guidelines

2. **`scripts/check-file-size.ts`**
   - Complexity calculation
   - Mixed concern detection
   - Exemption support
   - Enhanced reporting

3. **`docs/PHASE_3B_RECOMMENDATIONS.md`**
   - Analysis of current codebase
   - Prioritized refactoring plan
   - Cost-benefit analysis
   - Success metrics

4. **This document**
   - Summary of changes
   - Migration guide
   - Impact analysis

---

## Success Metrics

### Quantitative (Tracked by Tool)

- Critical Issues: **0** (target: maintain 0)
- High Complexity Files (>100): **2** (target: 0)
- Medium Complexity Files (50-100): **~5** (target: 2)
- Average Complexity: **<30** (target: maintain)

### Qualitative (Developer Feedback)

- AI can understand files in single pass
- Developers report easier navigation
- Lower bug density in refactored files
- Faster feature development
- Higher code review satisfaction

---

## Next Steps

### Immediate (Week 1)

- [ ] Review 2-3 high-complexity files
- [ ] Refactor mixed-concern files
- [ ] Document justified large files

### Short-term (Month 1)

- [ ] Update all service/repository files with documentation
- [ ] Refactor remaining high-complexity pages
- [ ] Train team on new philosophy

### Long-term (Ongoing)

- [ ] Monitor metrics weekly
- [ ] Update standards based on learnings
- [ ] Collect and analyze quality trends
- [ ] Refine thresholds if needed

---

## FAQ

**Q: What if a file is 301 lines?**
A: Review the metrics. If complexity is low, concerns are clear, and structure is good - keep it! Document if > 2x soft limit.

**Q: Can I still split files?**
A: Yes! But split based on quality (mixed concerns, high complexity, duplication) not line count.

**Q: What about test files that are 1000+ lines?**
A: If well-organized with describe blocks and testing a complex feature comprehensively - likely justified. Check if sections are clear.

**Q: How do I know if my file should be exempt?**
A: Ask:
- Single responsibility? ✅
- Clear sections? ✅
- Low complexity? ✅
- No duplication? ✅
- AI-readable? ✅

If all yes → Document exemption

**Q: Will this break CI/CD?**
A: No! Only CRITICAL issues (all enforcement criteria met) block CI. Currently 0 critical issues in codebase.

---

## Conclusion

This update represents a **paradigm shift** from arbitrary enforcement to **quality-based assessment**.

**Key Principle:** A well-structured 500-line file is better than five poorly-structured 100-line files.

**Focus:** Modularity, AI-readability, and token efficiency over raw line counts.

**Outcome:** More pragmatic, developer-friendly, and actually improves code quality rather than just reducing file sizes.

---

**Version:** 1.0
**Last Updated:** 2025-11-30
**Approved By:** User (based on insight: "行數不一定是關鍵，主要是有沒有好好拆分模組")
