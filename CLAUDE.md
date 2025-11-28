# CLAUDE.md - AI Square Project

This file provides guidance to Claude Code when working with this repository.

## 🎯 Core Principles

### Infrastructure First
- Use production-grade solutions from Day 1
- Never create temporary scripts or workarounds
- "There is nothing more permanent than a temporary solution"

### Development Workflow
```bash
make ai-new TYPE=feature TICKET=name   # Start new work
make ai-save                          # Save progress (track complexity)
make ai-done                          # Complete (test+commit+merge)
```

## ☁️ GCP Configuration

**Project**: `ai-square-463013` | **Account**: `youngtsai@junyiacademy.org` | **Region**: `asia-east1`

**CRITICAL**: Before any GCP operation, verify configuration:
```bash
gcloud config list  # Must show correct project/account/region
```

If incorrect, use `gcp-config-manager` agent to fix.

**Note**: Hook system automatically reminds you to verify GCP config when GCP keywords are detected.

## 🤖 MANDATORY: Use Agents Manager

**CRITICAL RULE**: For **ANY** task beyond simple questions, YOU MUST use `agents-manager`.

### When to Use agents-manager

**Use for** (basically everything):
- New features
- Bug fixes
- Deployments
- TypeScript errors
- Architecture changes
- Code reviews
- Quality checks
- Git operations
- Any task requiring validation

**DO NOT use for**:
- Simple questions ("What's in the PRD?")
- Reading documentation

### How to Use

```
Task(
    subagent_type="agents-manager",
    description="Brief task description",
    prompt="Detailed explanation of what needs to be done"
)
```

**The agents-manager will**:
- Analyze the task
- Determine which specialized agents to call
- Coordinate multiple agents if needed
- Ensure all quality standards are met

### agents-manager Coordinates

```yaml
Infrastructure → infrastructure-first-agent
Testing → tdd-validator-agent
Architecture → unified-architecture-guardian
Security → security-audit-agent
Code Quality & Type Safety → quality-guardian-agent (NEW: merged code-quality + typescript-eslint)
Deployment & QA → deployment-master-agent (NEW: merged deployment-pipeline + deployment-qa)
GCP Config → gcp-config-manager
Documentation → documentation-sync-agent
Git Operations → git-commit-push
Performance → performance-optimization-agent
Database → database-management-agent
Monitoring → observability-monitoring-agent
Error Learning → error-reflection-agent (NEW: analyzes errors and drives improvements)
```

**Optimization Note**: agents-manager can run multiple independent agents in parallel for 30% faster workflows.

See `.claude/agents/agents-manager.md` for full decision tree and parallel execution rules.

## ⚡ Parallel Agent Execution (30% Faster)

### When to Run Agents in Parallel

**Safe Parallel Combinations:**
```yaml
Testing + Performance:
  - tdd-validator-agent + performance-optimization-agent
  - Tests verify performance improvements don't break functionality

Security + Documentation:
  - security-audit-agent + documentation-sync-agent
  - Independent domains, no shared state

Database + Monitoring:
  - database-management-agent + observability-monitoring-agent
  - Monitoring tracks database changes in real-time

Quality + Architecture:
  - quality-guardian-agent + unified-architecture-guardian
  - Complementary validation from different perspectives
```

**Must Run Sequentially:**
```yaml
Pipeline Dependencies:
  infrastructure-first-agent → deployment-master-agent
  tdd-validator-agent → git-commit-push
  gcp-config-manager → Any GCP operation
  quality-guardian-agent → deployment-master-agent
```

**Example:**
```typescript
// ✅ Parallel - Independent tasks
Task(subagent_type="security-audit-agent", ...);
Task(subagent_type="documentation-sync-agent", ...);

// ❌ Sequential - Dependent tasks
Task(subagent_type="infrastructure-first-agent", ...);
// Wait for completion, then:
Task(subagent_type="deployment-master-agent", ...);
```

## 📏 Code Quality Standards (Quick Reference)

### TypeScript Rules
1. **Zero `any` types** - Use `Record<string, unknown>` or specific types
2. **No `@ts-ignore`** - Fix root cause
3. **Next.js 15 routes** - Must `await` params:
   ```typescript
   export default async function Page(props: { params: Promise<{ id: string }> }) {
     const params = await props.params;
   }
   ```
4. **Multilingual fields** - `Record<string, string>`:
   ```typescript
   { title: { en: "Math", zh: "數學" } }
   ```

### Pre-Commit Requirements
```bash
make pre-commit-check  # Must pass: TypeScript, ESLint, Tests, Build
```

## 🎯 Context Management

**Use `/clear` frequently** (Anthropic research-backed best practice):
- Before new feature
- Before bug fixing
- When context > 50k tokens
- When switching focus
- Use `/context-check` command to monitor token usage

**Why**: Prevents context pollution, improves accuracy by ~15%, reduces token waste

## 🧠 Extended Thinking Mode

**When to Activate Extended Thinking**:
Extended Thinking is a deep analysis mode that should be triggered for complex problems requiring comprehensive reasoning.

**Trigger Phrases**:
- "think about this deeply"
- "analyze all options"
- "consider all edge cases"
- "what are all the implications"
- "explore different approaches"

**Use Cases**:
- Architecture decisions affecting multiple systems
- Complex debugging requiring root cause analysis
- Performance optimization strategies
- Security vulnerability assessment
- Multi-step migration planning

**Example**:
```
User: "Think about how to refactor our authentication system to support SSO"

Claude: [Enters Extended Thinking mode]
- Analyzes current auth flow
- Evaluates SSO protocols (OAuth2, SAML, OIDC)
- Considers database schema changes
- Assesses security implications
- Plans migration strategy
- Identifies breaking changes
```

**When NOT to use**:
- Simple bug fixes
- Straightforward feature additions
- Code formatting changes
- Documentation updates

## 🚀 Claude Code 2025 Best Practices

### Plan Mode Strategy
**Automatically enter Plan Mode for**:
- New features affecting 3+ files
- Architecture refactoring
- Multi-step deployments
- Complex bug investigations

**In Plan Mode**: Read-only operations, create comprehensive plan, then exit before implementation.

**Pattern**:
```
1. Enter Plan Mode
2. Read relevant files
3. Create detailed plan
4. Exit Plan Mode
5. Implement step-by-step
```

### Subagent Strategy (Context Preservation)
**Use subagents to preserve main context**:
- Investigations that don't need immediate action
- Verification tasks separate from implementation
- Code review independent of coding
- Complex searches

**Pattern**: One Claude writes code, another reviews; one writes tests, another writes implementation.

**Example**:
```
Task(subagent_type="agents-manager", ...)  # Investigation
[Main Claude continues with implementation]
```

### Visual Iteration for UI Development
**Workflow**: Screenshot → Implement → Screenshot → Compare → Iterate

Use `/visual-test` command for:
1. Request design reference/screenshot
2. Build component
3. Take screenshot of implementation
4. Adjust until pixel-perfect
5. Add Playwright visual regression test

**Impact**: Reduces design iteration cycles from 5+ to 2-3

### Anti-Patterns to Eliminate
**Remove from outputs** (improves accuracy by 5%+ per Anthropic SWE-Bench):

1. Hedging language: "might", "could potentially", "perhaps"
2. Excessive explanation of obvious concepts
3. Agreement phrases: "I understand", "Sure", "Of course"
4. Emotional acknowledgments without technical value

**Be direct and technical**:
- ✅ "I'll implement the auth endpoint using Repository Pattern"
- ❌ "Sure! I'd be happy to help you implement the auth endpoint. Of course, I'll use the Repository Pattern as that might be the best approach here."

### Headless Mode for Scale
**Use `claude -p` for**:
- Large-scale migrations
- Bulk file processing
- Automated test generation
- Fan-out pattern: Generate task list, loop through with programmatic calls

### Prompt Optimization Principles
**Be extremely specific**:
- ✅ "Next.js 15.1.0 with App Router, TypeScript 5.3.3, Tailwind 3.4"
- ❌ "Next.js with TypeScript"

**Use emphasis for critical rules**:
- "IMPORTANT:", "YOU MUST", "CRITICAL:" for non-negotiable requirements
- Improves instruction-following by ~15%

**Constant refinement**:
- Treat CLAUDE.md as living document
- Update based on results
- Remove what doesn't help
- Add specific examples

### Commands Available
- `/context-check` - Monitor token usage and context health
- `/visual-test` - Screenshot-based UI iteration workflow
- `/clear` - Reset context to prevent pollution

## 🔄 Error Reflection & Continuous Improvement

### Core Philosophy
**"每個錯誤都是學習機會" (Every error is a learning opportunity)**

### Automatic Reflection System
Every error automatically triggers `error-reflection-agent`:
1. **Root Cause Analysis** - Why did it happen?
2. **Improvement Proposals** - How to prevent recurrence?
3. **System Updates** - Immediate preventive measures
4. **Learning Records** - Update `.claude/learning/` knowledge base

### Improvement Priority
When errors occur, evaluate in order:
- **Agent Optimization**: Are responsibilities clear? Need enhancement?
- **Skill Enhancement**: Missing capabilities?
- **Command Addition**: Need new automation?
- **CLAUDE.md Updates**: Rules need adjustment?

### Learning System Structure
```
.claude/learning/
├── error-patterns.json      # Error pattern tracking
├── improvements.json         # Improvement history
├── user-preferences.json    # User work patterns
└── performance-metrics.json # Performance metrics
```

### Reflection Commands
- `/reflect` - Manually trigger error reflection
- `/weekly-review` - Weekly performance & improvement review

### Continuous Improvement Metrics
- 📉 Error rate decreases week-over-week
- 🔄 Same error doesn't repeat more than twice
- 📚 Documentation continuously improves
- 🤖 Agent capabilities keep growing
- ⚡ Resolution time keeps decreasing

### Hook Integration
- `error-reflection.py` - Auto-detects errors and triggers reflection
- Updates `error-patterns.json` to track frequency
- Provides intelligent improvement suggestions

**Remember**: The goal is not perfection, but perfect improvement!

## 📁 Key Documentation

- **Product**: `docs/handbook/PRD.md`
- **Architecture**: `docs/technical/infrastructure/unified-learning-architecture.md`
- **Deployment**: `docs/deployment/CICD.md`
- **Frontend Guide**: `frontend/FRONTEND-GUIDE.md`
- **Documentation Standards**: `docs/DOCUMENTATION-GUIDE.md`

## 🔑 Technical Specs

- **Framework**: Next.js 15 (App Router) + TypeScript 5.3
- **Database**: PostgreSQL (Cloud SQL)
- **Cache**: Redis
- **Deployment**: Cloud Run (asia-east1)
- **AI Model**: Vertex AI `gemini-2.5-flash`

---

**Note**: This file should remain in project root for Claude Code auto-loading.
**Version**: 3.2 (Added Error Reflection & Continuous Improvement System, /reflect, /weekly-review)
