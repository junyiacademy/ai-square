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

**Use `/clear` frequently**:
- Before new feature
- Before bug fixing
- When context > 50k tokens
- When switching focus

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
**Version**: 3.0 (Ultra-simplified with agents-manager orchestration)
