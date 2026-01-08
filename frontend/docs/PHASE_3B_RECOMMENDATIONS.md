# Phase 3B Refactoring Recommendations

**Date:** 2025-11-30
**Philosophy:** Modularity > Line Counts

---

## Executive Summary

Based on the new file-size-standards focusing on **modularity**, **AI-readability**, and **token efficiency**, here are recommendations for continuing Phase 3B refactoring work.

### Key Findings

**Critical Issues (Blocking):** 0 files
**Warnings (Review Recommended):** 30 files
**Info (Reference):** 451 files
**Exempt Files:** 3 files

**GOOD NEWS:** No files meet ALL enforcement criteria (2x size + high complexity + multiple concerns). This indicates the codebase is generally well-structured.

---

## Strategic Recommendations

### 1. Pause Mass Refactoring

**Recommendation:** STOP arbitrary line-count-based refactoring.

**Rationale:**

- Current codebase has ZERO critical quality issues
- 30 files exceed soft limits but may be justified
- Focus should shift to **quality** over **quantity**

**Action:** Review the 30 warning files individually against new criteria.

---

## File-by-File Analysis

### High Priority (Review & Possibly Refactor)

Files that show **both** size issues AND quality concerns:

#### 1. `src/app/chat/page.tsx` (625 lines, Complexity: 83)

**Issues:**

- High complexity (83 vs threshold 50)
- Mixed concerns detected
- Exceeds page soft limit (400)

**Recommendation:** REFACTOR

- Extract chat logic into service layer
- Separate UI components
- Reduce complexity with early returns

**Estimated Impact:** High - This is a user-facing page with complex logic

---

#### 2. `src/app/discovery/scenarios/[id]/page.tsx` (529 lines, Complexity: 120)

**Issues:**

- VERY high complexity (120 vs threshold 50)
- Mixed concerns detected
- Exceeds page soft limit

**Recommendation:** REFACTOR (Priority 1)

- Extract business logic to discovery-service
- Create smaller components for UI sections
- Break down complex conditional logic

**Estimated Impact:** High - Core discovery learning flow

---

#### 3. `src/app/api/discovery/scenarios/[id]/programs/[programId]/tasks/[taskId]/route.ts` (344 lines)

**Issues:**

- Exceeds API route soft limit (300)
- Likely has mixed concerns (API + business logic)

**Recommendation:** REVIEW

- Check if business logic should move to service layer
- Verify Repository Pattern usage
- If well-structured, document exemption

**Estimated Impact:** Medium - API route should be coordination only

---

### Medium Priority (Review for Justification)

Files that exceed limits but may be justified:

#### Test Files (4 files)

```
src/app/api/pbl/programs/[programId]/complete/__tests__/route.test.ts - 1148 lines
src/lib/repositories/postgresql/__tests__/task-repository.test.ts - 1123 lines
src/lib/repositories/postgresql/__tests__/scenario-repository.test.ts - 987 lines
src/lib/types/__tests__/user-data.test.ts - 846 lines
```

**Recommendation:** KEEP AS-IS (with monitoring)

- Test files can be larger with good organization
- Soft limit for tests increased to 800 lines
- Check if well-organized with describe blocks
- Only refactor if hard to navigate

**Rationale:** Comprehensive test coverage justifies larger files

---

#### Service Files (2 files)

```
src/lib/services/evaluation/evaluation-strategies.ts - 582 lines
src/lib/services/discovery-learning-service.ts - 573 lines
```

**Recommendation:** REVIEW for Single Responsibility

- Check if handling ONE domain or multiple
- If multiple strategies/features, consider splitting
- If single complex domain, document exemption

**Example Exemption:**

```typescript
/**
 * FILE SIZE EXEMPTION
 *
 * Current Size: 582 lines
 * Soft Limit: 500 lines
 *
 * Justification:
 * This service handles the complete evaluation flow including
 * multiple evaluation strategies (rubric, points, qualitative).
 * Splitting by strategy would reduce cohesion as all strategies
 * share common evaluation logic and state.
 *
 * Modularity Evidence:
 * - Single Responsibility: Evaluation ✅
 * - Clear Sections: 5 strategy sections ✅
 * - High Cohesion: All functions serve evaluation ✅
 * - AI-Readable: Clear section comments ✅
 *
 * Reviewed: 2025-11-30
 * Reviewer: @youngtsai
 */
```

---

#### Repository Files (3 files)

```
src/lib/repositories/postgresql/scenario-repository.ts - 436 lines
src/lib/repositories/postgresql/evaluation-repository.ts - 429 lines
src/lib/repositories/interfaces/index.ts - 448 lines
```

**Recommendation:** KEEP AS-IS

- Repository Pattern naturally creates comprehensive files
- These provide CRUD + domain queries for single entity
- Soft limit is 400, these are just slightly over
- High cohesion (all serve same domain)

**Rationale:** Well-structured repositories for complex domains

---

### Low Priority (Likely Justified)

Files that slightly exceed limits but are well-structured:

#### Page Components (7 files)

```
src/app/learning-path/page.tsx - 619 lines
src/app/discovery/scenarios/[id]/programs/[programId]/tasks/[taskId]/page.tsx - 558 lines
src/app/dashboard/page.tsx - 466 lines
... (4 more)
```

**Recommendation:** MONITOR

- Pages are coordination layers (should delegate to services)
- Check if business logic can be extracted
- If primarily UI coordination, may be justified

**Action Plan:**

1. For each page, check for inline business logic
2. Extract any business logic to services
3. If remains large after extraction, document why (e.g., complex UI state management)

---

#### Utility/Helper Files (3 files)

```
src/test-utils/mocks/repository-helpers.ts - 290 lines
src/test/utils/test-helpers.tsx - 257 lines
src/test-utils/mocks/components.tsx - 213 lines
```

**Recommendation:** REVIEW & POSSIBLY SPLIT

- Utility soft limit is 200 lines (lowest)
- Check if mixing multiple utility types
- Consider splitting by feature/domain

**Example:**

```
repository-helpers.ts (290 lines)
  → scenario-mock-helpers.ts (100 lines)
  → user-mock-helpers.ts (90 lines)
  → program-mock-helpers.ts (100 lines)
```

---

## Recommended Action Plan

### Week 1: High Priority Refactoring

**Target:** 2-3 high-complexity pages

1. **`src/app/discovery/scenarios/[id]/page.tsx`** (Complexity: 120)
   - Extract business logic to service
   - Create smaller UI components
   - Reduce complexity to < 50

2. **`src/app/chat/page.tsx`** (Complexity: 83)
   - Extract chat logic to service
   - Separate message handling
   - Improve structure

**Success Metrics:**

- Complexity reduced by 50%+
- Clear separation of concerns
- Easier to test
- Better AI navigation

---

### Week 2: Medium Priority Review

**Target:** Service & API route files

1. **Review all service files > 500 lines**
   - Check Single Responsibility Principle
   - Document exemptions where justified
   - Split where multiple responsibilities found

2. **Review all API routes > 300 lines**
   - Verify business logic delegated to services
   - Ensure Repository Pattern usage
   - Extract validation to validators

**Success Metrics:**

- All service files documented (exemption or refactored)
- All API routes follow coordination pattern
- Clear architectural consistency

---

### Week 3: Test & Utility Organization

**Target:** Large test and utility files

1. **Organize test files with describe blocks**
   - Ensure clear sections
   - Add comments for navigation
   - Keep comprehensive coverage

2. **Split utility files by domain**
   - Group related helpers
   - Extract by feature
   - Maintain cohesion

**Success Metrics:**

- All test files have clear organization
- Utility files split by logical domains
- No reduction in test coverage

---

### Ongoing: Documentation & Monitoring

**Continuous Actions:**

1. **Document Exemptions**
   - For all files > soft limit that are justified
   - Use template from file-size-standards.md
   - Include modularity evidence

2. **Update Quality Metrics**
   - Run `npm run check:file-size --verbose` weekly
   - Track complexity trends
   - Monitor new files

3. **Team Education**
   - Share new philosophy with team
   - Emphasize modularity over line counts
   - Provide refactoring examples

---

## Anti-Patterns to Avoid

### ❌ DON'T:

1. **Arbitrarily split well-structured files**
   - Example: A 500-line service with perfect SRP
   - Impact: Reduces cohesion, increases coupling

2. **Create artificial boundaries**
   - Example: Splitting auth service into login-service, logout-service
   - Impact: Related logic separated, harder to maintain

3. **Sacrifice clarity for line count**
   - Example: Extracting 3-line helper just to reduce file size
   - Impact: More files to navigate, context switching

4. **Split test files prematurely**
   - Example: Breaking comprehensive test suite into tiny files
   - Impact: Loses test cohesion, harder to run related tests

### ✅ DO:

1. **Refactor when complexity is high**
   - Extract complex logic into focused functions
   - Use composition to reduce nesting

2. **Separate mixed concerns**
   - Split when file handles multiple responsibilities
   - Create clear architectural boundaries

3. **Extract for reusability**
   - Pull out duplicated patterns
   - Create utilities when multiple files need same logic

4. **Document justified large files**
   - Provide clear exemption reasoning
   - Show modularity evidence

---

## Success Metrics

### Quantitative Targets:

- **Critical Issues:** Maintain 0
- **High Complexity Files (>100):** Reduce from 2 to 0
- **Medium Complexity Files (50-100):** Reduce from ~5 to ~2
- **Average Complexity:** Maintain < 30
- **Mixed Concerns:** Reduce from detected files to 0

### Qualitative Targets:

- **AI Navigation:** Files can be understood in single pass
- **Developer Feedback:** "Files are easy to navigate"
- **Bug Density:** Lower bug rate in refactored files
- **Test Coverage:** Maintain or increase coverage
- **Development Velocity:** Faster feature development

---

## Tools & Automation

### Updated npm Scripts:

```json
{
  "check:file-size": "tsx scripts/check-file-size.ts",
  "check:file-size:fix": "tsx scripts/check-file-size.ts --fix",
  "check:file-size:verbose": "tsx scripts/check-file-size.ts --verbose",
  "check:file-size:ci": "tsx scripts/check-file-size.ts --ci"
}
```

### Pre-Commit Hook:

```bash
# Only block on CRITICAL issues, not warnings
npm run check:file-size:ci
```

### CI/CD Integration:

```yaml
# GitHub Actions
- name: Check File Quality Metrics
  run: npm run check:file-size:ci
  # Only fails on critical issues (all enforcement criteria met)
```

---

## Cost-Benefit Analysis

### Estimated Effort:

| Priority               | Files | Effort (hours) | Impact                            |
| ---------------------- | ----- | -------------- | --------------------------------- |
| High (Complex Pages)   | 2-3   | 8-12h          | High - User-facing, reduces bugs  |
| Medium (Services/APIs) | 5-7   | 10-15h         | Medium - Improves maintainability |
| Low (Tests/Utils)      | 10-15 | 5-10h          | Low - Organizational improvement  |
| Documentation          | All   | 3-5h           | High - Prevents future issues     |

**Total Estimated Effort:** 26-42 hours (~5-8 working days)

### Expected Benefits:

1. **Reduced Cognitive Load:** Easier for developers and AI to navigate
2. **Faster Development:** Less time understanding code
3. **Fewer Bugs:** Simpler logic = fewer edge cases
4. **Better Testing:** Focused files easier to test
5. **Token Efficiency:** AI wastes less tokens parsing mixed concerns

### ROI:

- **Break-even:** ~2-3 months (time saved in future development)
- **Long-term:** Ongoing reduction in maintenance cost
- **Team Morale:** Improved developer satisfaction with cleaner codebase

---

## Conclusion

### Key Takeaways:

1. **No Crisis:** Current codebase is in good shape
2. **Targeted Refactoring:** Focus on high-complexity, mixed-concern files
3. **Document Justifications:** Large files can be justified if well-structured
4. **Continuous Monitoring:** Use new metrics to guide decisions
5. **Pragmatic Approach:** Modularity and clarity over arbitrary limits

### Next Steps:

1. **Immediate:** Review and approve this plan
2. **Week 1:** Refactor 2-3 high-priority files
3. **Week 2-3:** Review and document medium-priority files
4. **Ongoing:** Monitor metrics, document exemptions, educate team

### Success Criteria:

- Zero critical quality issues (✅ Already achieved!)
- High-complexity files refactored
- All large justified files documented
- Team aligned on new philosophy
- Improved developer and AI experience

---

**Remember:** "行數不一定是關鍵，主要是有沒有好好拆分模組，基本上 AI 可以看得懂就好，不會浪費 token 就好"

Line count is NOT the key metric. Focus on proper module separation, AI readability, and token efficiency.
