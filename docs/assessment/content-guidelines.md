# Assessment Content Guidelines

**Purpose**: Ensure assessment validity and prevent pattern bias that allows gaming.

**Context**: User scored 12/12 by selecting all B options. This should NEVER happen again.

## Core Principles

### 1. Test Validity First
- Pedagogical correctness is necessary but NOT sufficient
- Answer distribution matters as much as content quality
- Assume adversarial test-takers will look for patterns
- Balance is the foundation of valid assessment

### 2. Pattern Bias Prevention
**Pattern bias** = Systematic distribution that allows gaming without knowledge

**Example of bias**:
- All correct answers = B (100% bias) ❌
- 10 out of 12 = B (83% bias) ❌
- 7 out of 12 = B (58% bias) ⚠️
- 3 out of 12 = B (25% bias) ✅

**Rule**: No option should appear >40% of the time as correct answer.

## Answer Distribution Standards

### For 4-Option Multiple Choice Questions

#### Target Distribution (12 questions)
```
Option A: 3 questions (25%)
Option B: 3 questions (25%)
Option C: 3 questions (25%)
Option D: 3 questions (25%)
```

#### Acceptable Ranges
| Questions | Min per Option | Max per Option | Ideal |
|-----------|---------------|---------------|-------|
| 12 | 2 (17%) | 4 (33%) | 3 (25%) |
| 16 | 3 (19%) | 5 (31%) | 4 (25%) |
| 20 | 4 (20%) | 6 (30%) | 5 (25%) |
| 24 | 5 (21%) | 7 (29%) | 6 (25%) |

**Golden Rule**: Keep each option between 20-30% of total questions.

### For 3-Option Multiple Choice Questions
```
Option A: 33%
Option B: 33%
Option C: 33%

Acceptable range: 25-40% per option
```

### For True/False Questions
```
True: 50%
False: 50%

Acceptable range: 40-60% per option
```

## Content Creation Workflow

### Phase 1: Content Development
Focus on pedagogical correctness:
1. Write questions that assess target knowledge/skills
2. Create plausible distractors
3. Ensure correct answer is clearly best
4. Write clear explanations

**Do NOT worry about answer position yet.**

### Phase 2: Answer Distribution Balancing
After creating all questions:

1. **Analyze current distribution**:
   ```bash
   python3 scripts/analyze-answer-distribution.py
   ```

2. **If bias detected (>40% any option)**:
   - Review questions where reordering won't compromise quality
   - Swap options to achieve balanced distribution
   - Verify explanations still match

3. **Verify no new patterns**:
   - Check distribution per domain
   - Check distribution per difficulty
   - Ensure randomness (no ABCDABCD sequences)

### Phase 3: Quality Verification
Before deployment:
```bash
# 1. Run validation
python3 scripts/analyze-answer-distribution.py

# 2. Run tests
cd frontend
npm run test -- assessment-answer-distribution.test.ts

# 3. Manual spot check
# Try answering with all A, all B, all C, all D
# Each strategy should score near 25% (±8%)
```

## Pattern Detection Rules

### ❌ Prohibited Patterns

#### 1. Sequential Patterns
```
ABCD ABCD ABCD ❌ (too predictable)
DCBA DCBA DCBA ❌ (too predictable)
```

#### 2. Domain Clustering
```
Domain 1: AAA ❌ (all same answer)
Domain 2: BBB ❌ (all same answer)
Domain 3: CCC ❌ (all same answer)
```

#### 3. Difficulty Correlation
```
Basic: AAAA ❌
Intermediate: BBBB ❌
Advanced: CCCC ❌
```

### ✅ Good Patterns

#### 1. Randomized Distribution
```
ACBDABDCABCD ✅ (no obvious pattern)
BDACDBACABCD ✅ (no obvious pattern)
```

#### 2. Varied per Domain
```
Domain 1: ACB ✅ (variety)
Domain 2: DCA ✅ (variety)
Domain 3: BDA ✅ (variety)
```

#### 3. No Difficulty Correlation
```
Basic: ADAB ✅ (variety)
Intermediate: BCDC ✅ (variety)
Advanced: CABD ✅ (variety)
```

## Quality Checklist

### Before Creating Questions
- [ ] Understand target knowledge/skills to assess
- [ ] Review distribution standards
- [ ] Prepare balanced distribution plan

### During Content Creation
- [ ] Write pedagogically sound questions
- [ ] Create plausible distractors
- [ ] Write clear explanations
- [ ] Don't worry about distribution yet

### After Content Creation
- [ ] Run distribution analysis
- [ ] Reorder options to balance (if needed)
- [ ] Verify explanations still match
- [ ] Check for systematic patterns

### Before Deployment
- [ ] Distribution within acceptable range (20-30% per option)
- [ ] No option >40% of questions
- [ ] No obvious patterns (sequential, domain, difficulty)
- [ ] All tests pass
- [ ] Manual gaming test fails (all A/B/C/D scores ~25%)

## Automated Validation

### Pre-commit Hook
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
python3 scripts/analyze-answer-distribution.py
if [ $? -ne 0 ]; then
    echo "❌ Answer distribution bias detected!"
    echo "Fix before committing."
    exit 1
fi
```

### CI/CD Integration
Add to `.github/workflows/test.yml`:
```yaml
- name: Validate Answer Distribution
  run: |
    python3 scripts/analyze-answer-distribution.py
  working-directory: ./
```

### Local Testing
```bash
# Before committing changes to questions
npm run validate:assessment-distribution

# Or directly
python3 scripts/analyze-answer-distribution.py
```

## Maintenance Schedule

### After Every Content Update
- [ ] Run validation script
- [ ] Review distribution report
- [ ] Fix any bias detected

### Quarterly Review
- [ ] Audit all assessments
- [ ] Check for new patterns
- [ ] Review gaming strategies
- [ ] Update validation rules

### Annual Review
- [ ] Statistical analysis of results
- [ ] Item response theory (IRT) analysis
- [ ] Compare with industry benchmarks
- [ ] Update guidelines based on findings

## Common Mistakes to Avoid

### ❌ Mistake 1: "Pedagogically correct = valid test"
**Wrong**: Focusing only on content quality
**Right**: Content quality + distribution balance

### ❌ Mistake 2: "Students won't notice patterns"
**Wrong**: Assuming passive test-takers
**Right**: Assume smart, pattern-seeking students

### ❌ Mistake 3: "Manual review is enough"
**Wrong**: Trusting human pattern detection
**Right**: Automate validation in CI/CD

### ❌ Mistake 4: "One-time fix is sufficient"
**Wrong**: Fix once and forget
**Right**: Continuous monitoring and validation

### ❌ Mistake 5: "Distribution doesn't matter for small tests"
**Wrong**: "Only 12 questions, doesn't matter"
**Right**: Small tests are MORE vulnerable to bias

## Examples

### Example 1: Good Distribution
```yaml
# 12 questions, balanced distribution
questions:
  - id: Q1
    correct_answer: a  # 1/12 A
  - id: Q2
    correct_answer: c  # 1/12 C
  - id: Q3
    correct_answer: b  # 1/12 B
  - id: Q4
    correct_answer: d  # 1/12 D
  - id: Q5
    correct_answer: a  # 2/12 A
  - id: Q6
    correct_answer: c  # 2/12 C
  - id: Q7
    correct_answer: d  # 2/12 D
  - id: Q8
    correct_answer: b  # 2/12 B
  - id: Q9
    correct_answer: c  # 3/12 C (25%)
  - id: Q10
    correct_answer: a  # 3/12 A (25%)
  - id: Q11
    correct_answer: b  # 3/12 B (25%)
  - id: Q12
    correct_answer: d  # 3/12 D (25%)

# Result: Perfect 25% distribution ✅
```

### Example 2: Bad Distribution (Bias)
```yaml
# 12 questions, 100% bias
questions:
  - id: Q1
    correct_answer: b  # ❌
  - id: Q2
    correct_answer: b  # ❌
  - id: Q3
    correct_answer: b  # ❌
  # ... all b
  - id: Q12
    correct_answer: b  # ❌

# Result: Student selects all B → 12/12 ❌
```

### Example 3: Acceptable Variation
```yaml
# 12 questions, slightly unbalanced but acceptable
questions:
  # 4 × A (33%) ⚠️ High but acceptable
  # 3 × B (25%) ✅
  # 3 × C (25%) ✅
  # 2 × D (17%) ⚠️ Low but acceptable

# Result: All options present, no single strategy dominates ✅
```

## Tools & Resources

### Available Tools
1. **`scripts/analyze-answer-distribution.py`** - Distribution analyzer
2. **`assessment-answer-distribution.test.ts`** - Automated tests
3. **GitHub Actions** - CI/CD validation

### External Resources
- Classical Test Theory (CTT) basics
- Item Response Theory (IRT) principles
- Psychometric validation standards
- AERA/APA/NCME test standards

## FAQs

### Q: Can I have slight imbalance?
**A**: Yes. 20-30% per option is acceptable. Perfect 25% is ideal but not required.

### Q: What if I have 13 questions?
**A**: Target ~25% per option. With 13 questions:
- 3 × A (23%) ✅
- 3 × B (23%) ✅
- 3 × C (23%) ✅
- 4 × D (31%) ✅

Still balanced, no gaming possible.

### Q: Can I use different distribution for different domains?
**A**: Check TOTAL distribution first. Within-domain variety is good, but overall balance is critical.

### Q: What if reordering changes question quality?
**A**: Keep pedagogical correctness as priority. If reordering compromises quality, write new questions instead.

### Q: How often should I validate?
**A**: Every time you modify questions. Automate in CI/CD to prevent bias from ever reaching production.

## Summary

**Remember**:
1. 🎯 Valid test = Good content + Balanced distribution
2. 🚫 No option should appear >40% of the time
3. ✅ Target 20-30% per option (25% ideal)
4. 🤖 Automate validation in CI/CD
5. 🔄 Regular audits (quarterly minimum)

**One sentence**: Create pedagogically sound questions, then balance distribution to prevent gaming.

---

**Version**: 1.0
**Last Updated**: 2026-01-29
**Next Review**: 2026-04-29
