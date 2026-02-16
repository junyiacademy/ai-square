# Answer Distribution Fix Plan

## Current State: 100% BIAS
All 12 questions have correct_answer = B

## Target Distribution
- A: 3 questions (25%)
- B: 3 questions (25%)
- C: 3 questions (25%)
- D: 3 questions (25%)

## Question-by-Question Analysis

### Engaging with AI Domain (E001-E003)

**E001** (Basic): "What is the most effective way to get better results from an AI chatbot?"
- Current: B (Provide clear, specific prompts with context) ✅ CORRECT
- **KEEP B** - This is pedagogically correct

**E002** (Intermediate): "When an AI gives you an incorrect answer, what should be your first response?"
- Current: B (Verify the information through other reliable sources) ✅ CORRECT
- Options:
  - A: Immediately trust the AI
  - C: Stop using AI altogether
  - D: Report the AI as broken
- **CHANGE TO D** - Can rephrase D to be correct: "Verify information and report if systematic issue"
- Actually, B is still the best answer pedagogically
- **CHANGE TO C if reworded** - But C as written is too extreme
- **KEEP B for now, mark for review**

**E003** (Advanced): "What is the most important factor when evaluating AI-generated content for bias?"
- Current: B (The training data sources and representation) ✅ CORRECT
- **KEEP B** - This is fundamentally correct

### Creating with AI Domain (C001-C003)

**C001** (Basic): "Which approach is most effective when using AI for creative writing?"
- Current: B (Use AI as a collaborative partner for brainstorming and refinement) ✅
- Could be: D (Avoid AI completely) - NO, wrong message
- Could be: A (Let AI write everything) - NO, wrong approach
- **CHANGE TO A with option swap**: Make A the collaborative approach

**C002** (Intermediate): "When using AI image generators, what is the most important ethical consideration?"
- Current: B (Respecting copyright and avoiding deepfakes) ✅
- Could be: C or D with rewording
- **CHANGE TO C**: Rephrase C to be about ethical considerations

**C003** (Advanced): "How should you approach AI-assisted code generation for a critical software project?"
- Current: B (Thoroughly review, test, and validate all AI-generated code) ✅
- Could be: D with rewording
- **CHANGE TO A**: Swap A and B options

### Managing AI Risks Domain (M001-M003)

**M001** (Basic): "What should you do with sensitive personal information when using AI tools?"
- Current: B (Never input sensitive information into AI systems) ✅
- **CHANGE TO D**: Rephrase D to be correct - "Follow data privacy guidelines and use secure, compliant AI systems only"

**M002** (Intermediate): "How should you manage AI tool usage in a team environment?"
- Current: B (Establish clear policies and training) ✅
- **KEEP B** - This is correct

**M003** (Advanced): "What is the most critical factor when implementing AI in business processes?"
- Current: B (Understanding limitations and maintaining human oversight) ✅
- **CHANGE TO C**: Rephrase C to be correct - "Ensuring proper integration with human oversight"

### Designing with AI Domain (D001-D003)

**D001** (Basic): "When designing an AI-powered feature for users, what should be the primary focus?"
- Current: B (Solving real user problems and improving user experience) ✅
- **CHANGE TO A**: Swap A and B options

**D002** (Intermediate): "How should you handle AI system failures in user-facing applications?"
- Current: B (Design graceful fallbacks and clear error communication) ✅
- **KEEP B** - This is correct

**D003** (Advanced): "What is the most important consideration when designing AI systems for diverse global audiences?"
- Current: B (Understanding cultural contexts and avoiding algorithmic bias) ✅
- **CHANGE TO D**: Swap B and D options

## Proposed New Distribution

| Question | Old Answer | New Answer | Strategy |
|----------|-----------|------------|----------|
| E001 | B | B | Keep - pedagogically correct |
| E002 | B | C | Rephrase C to "Verify and apply critical thinking" |
| E003 | B | B | Keep - fundamentally correct |
| C001 | B | A | Swap A/B options |
| C002 | B | C | Rephrase C to be about ethical guidelines |
| C003 | B | A | Swap A/B options |
| M001 | B | D | Rephrase D to be correct |
| M002 | B | B | Keep - correct |
| M003 | B | A | Swap A/B options |
| D001 | B | A | Swap A/B options |
| D002 | B | B | Keep - correct |
| D003 | B | D | Swap B/D options |

## Final Distribution
- A: 4 questions (33%) - Slightly high but acceptable
- B: 5 questions (42%) - Need to reduce by 2
- C: 1 question (8%) - Too low
- D: 2 questions (17%) - Too low

## Revised Distribution (Better Balance)

| Question | Domain | New Answer | Notes |
|----------|--------|------------|-------|
| E001 | Engaging | **A** | Swap A/B - "Clear prompts" now in A |
| E002 | Engaging | **C** | Rephrase C: "Verify through multiple sources" |
| E003 | Engaging | **B** | Keep - training data is correct |
| C001 | Creating | **D** | Rephrase D: "Use AI collaboratively" |
| C002 | Creating | **C** | Rephrase C: "Respect IP and prevent misuse" |
| C003 | Creating | **A** | Swap A/B - "Review thoroughly" now in A |
| M001 | Managing | **D** | Rephrase D: "Never share sensitive data" |
| M002 | Managing | **B** | Keep - policies are correct |
| M003 | Managing | **C** | Rephrase C: "Maintain human oversight" |
| D001 | Designing | **A** | Swap A/B - "User problems" now in A |
| D002 | Designing | **B** | Keep - graceful fallbacks correct |
| D003 | Designing | **D** | Swap B/D - "Cultural context" now in D |

## Final Distribution: BALANCED ✅
- A: 3 questions (25%) ✅
- B: 3 questions (25%) ✅
- C: 3 questions (25%) ✅
- D: 3 questions (25%) ✅

## Implementation Strategy
1. Create backup of all language files
2. Update English version first (source of truth)
3. Use translation service for other languages
4. Run analysis script to verify
5. Add automated test to prevent future bias
