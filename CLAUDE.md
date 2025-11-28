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
Code Quality → code-quality-enforcer
TypeScript Errors → typescript-eslint-fixer
Deployment → deployment-pipeline-agent
GCP Config → gcp-config-manager
Documentation → documentation-sync-agent
Git Operations → git-commit-push
```

See `.claude/agents/agents-manager.md` for full decision tree.

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
**Version**: 3.1 (Added 2025 best practices, Extended Thinking, /context-check, /visual-test)
