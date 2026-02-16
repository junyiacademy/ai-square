# CLAUDE.md - AI Square Project

This file provides guidance to Claude Code when working with this repository.

## 🎯 Core Principles

### Infrastructure First
- Use production-grade solutions from Day 1
- Never create temporary scripts or workarounds
- "There is nothing more permanent than a temporary solution"

### Development Workflow (Agent-Driven)
Development workflow is now fully automated through specialized agents:
- Use `agents-manager` for ALL tasks (features, bugs, deployments)
- Agents handle quality checks, testing, commits, and merges
- No manual workflow commands needed - agents orchestrate everything

## ☁️ GCP Configuration

| Field | Value |
|-------|-------|
| gcloud config | `ai-square` |
| Account | `youngtsai@junyiacademy.org` |
| GCP Project | `ai-square-463013` |
| Region | `asia-east1` |

> Hook auto-switches. If permission error → `gcloud config configurations activate ai-square`

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
5. **Code modularity** - Focus on quality over line counts:
   - **NEW PHILOSOPHY:** "行數不一定是關鍵，主要是有沒有好好拆分模組，基本上 AI 可以看得懂就好，不會浪費 token 就好"
   - Translation: Line count is NOT the key. Focus on: module separation, AI-readability, token efficiency
   - Soft limits trigger review (not enforcement): Components 300, Pages 400, APIs 300, Services 500
   - **Enforcement criteria** (ALL must be met to block):
     - Exceeds 2x soft limit AND
     - Cyclomatic complexity > 50 AND
     - Multiple responsibilities detected
   - Check quality metrics: `npm run check:file-size` (in frontend/)
   - See: `frontend/docs/standards/file-size-standards.md`
   - Current status: **0 critical issues** in codebase ✅

### Pre-Commit Requirements
Quality checks are handled by agents automatically. For manual verification:
```bash
cd frontend
npm run typecheck              # TypeScript check
npm run lint                   # ESLint check
npm run test:unit:ci          # Unit tests
npm run build                  # Production build
npm run schema:check           # Schema consistency
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

## 🗄️ Database Management Strategy

**CRITICAL**: Production uses unified Prisma-based schema (migrated 2025-08-19)

### Schema Management: Prisma Only
```bash
# Create new migration
npx prisma migrate dev --name description

# Apply to production
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

**Official Migrations**: `prisma/migrations/` (tracked in git)
**Deleted Obsolete**: `src/db/migrations/`, `src/lib/db/migrations/`, `schema-v4.sql`

### Data Access: Repository Pattern with Raw SQL
- **65+ API routes** use Repositories (`src/lib/repositories/`)
- **Query execution**: Raw SQL via `pool.query()` (NOT Prisma Client)
- **Complex queries**: Raw SQL for performance (e.g., weekly report)
- **Why raw SQL**: Performance, flexibility for complex joins/aggregations

### Key Architecture Decisions
1. **ENUMs → TEXT**: All PostgreSQL ENUMs converted to TEXT for flexibility
2. **Prisma for schema**: Migrations and schema definition
3. **Raw SQL for queries**: Performance and Repository Pattern compatibility
4. **Mode-based analytics**: Tracks assessment/pbl/discovery separately

### Migration Workflow Going Forward
```bash
1. Design schema change in prisma/schema.prisma
2. Run: npx prisma migrate dev --name add_feature_x
3. Test in development
4. Deploy to staging: npx prisma migrate deploy
5. Verify production: Check migration status
6. Never modify old migrations (immutable)
```

### ⚠️ Known Issues
- `scripts/init-cloud-sql.sh` references deleted `schema-v4.sql` (needs update or removal)
- Keep both Prisma AND Repository Pattern (don't consolidate to Prisma Client)

## 🔀 Per-Issue Preview Workflow (MANDATORY)

**CRITICAL**: 每個 Issue 必須使用獨立分支和 Preview 環境！

### 🔴 絕對禁止
```bash
❌ 直接推送到 staging 或 main
❌ 多個 Issue 共用同一個 Preview URL
❌ 跳過 Per-Issue Preview 直接部署
```

### ✅ 正確流程
```
main → fix/issue-34 → 自動 Preview Deploy → PR → merge to staging
```

### 完整步驟

```bash
# 1. 為 Issue 建立專用分支
git checkout main
git checkout -b fix/issue-34

# 2. 修改程式碼

# 3. 推送 (自動觸發 Per-Issue Preview)
git push origin fix/issue-34

# 4. 系統自動：
#    - 部署到獨立 Cloud Run: ai-square-preview-issue-34
#    - 產生獨立 URL: https://ai-square-preview-issue-34-731209836128.asia-east1.run.app
#    - 在 Issue #34 留言 Preview URL

# 5. 案主測試通過後
#    - 建立 PR (fix/issue-34 → staging)
#    - Merge 後自動清理 Preview 環境
```

### Preview URL 格式
```
https://ai-square-preview-issue-{N}-731209836128.asia-east1.run.app
```

| Issue | 分支 | Preview URL |
|-------|------|-------------|
| #34 | `fix/issue-34` | `ai-square-preview-issue-34-...run.app` |
| #35 | `fix/issue-35` | `ai-square-preview-issue-35-...run.app` |

### 為何這樣做？
1. **隔離測試**: 每個 Issue 有獨立環境，不互相影響
2. **案主清晰**: 案主知道哪個 URL 對應哪個 Issue
3. **自動清理**: PR merge 後自動刪除，不浪費資源
4. **成本極低**: min-instances=0，每個 Issue 約 $0.02-0.10

### 工作流程配置
- **觸發**: `.github/workflows/preview-deploy.yml`
- **分支模式**: `fix/issue-**` 或 `feat/issue-**`
- **自動留言**: 部署完成後自動在 Issue 留言
- **自動清理**: PR 關閉/合併後自動刪除 Cloud Run service

## 🔒 Git Workflow Rules

**CRITICAL USER RULE**: Only user can command commit and push!

**Agent Behavior**:
- ✅ Prepare changes and stage files
- ✅ Present summary for review
- ✅ Ask user for explicit confirmation
- ❌ **NEVER** auto-commit without user command
- ❌ **NEVER** auto-push without user command

**User must explicitly say**: "commit", "push", "提交", "推送"

**Pattern**:
```
Agent: "Changes ready. Files staged:
- file1.ts
- file2.ts

To commit: say 'commit' or '提交'
To push: say 'push' or '推送'"
```

## 🚨 Post-Commit Verification (MANDATORY)

**CRITICAL**: After EVERY commit+push, you MUST verify CI/CD success.

### The Problem (血淋淋的教訓)
- Code changes committed but NOT deployed to staging
- Preview URLs showing old version
- Case owners think nothing was done
- Trust broken with users

### Mandatory Steps After Push

```bash
# 1. Check CI status immediately after push
gh run list --limit 1 --branch staging

# 2. Wait for completion and verify
gh run watch <run-id> --exit-status

# 3. If FAIL → Fix immediately!
gh run view <run-id> --log-failed

# 4. Keep fixing until deployment succeeds
# DO NOT report "fixed" until CI is green!
```

### Verification Checklist
After every push to staging:
- [ ] `gh run list` - Check workflow started
- [ ] `gh run watch` - Wait for completion
- [ ] Verify status = `success` (not `failure`!)
- [ ] If failed: Fix tests/code and push again
- [ ] Only report completion when deployment is LIVE

### When Reporting to Issues
**NEVER** say "Fixed" or "已修復" until:
1. CI/CD passes completely
2. Deployment to staging succeeds
3. Preview URL works correctly

**Pattern**:
```
❌ WRONG: "Fixed! Changes pushed."
✅ RIGHT: "Fixed and verified:
- CI/CD: ✅ Passed (run #12345)
- Deployment: ✅ Live
- Preview: https://ai-square-staging.run.app
Please test and confirm."
```

### Emergency Fix Protocol
If tests fail after push:
1. **DO NOT** modify implementation to pass tests blindly
2. **DO** analyze: Is the test wrong or the implementation?
3. If test expectations are outdated → Fix tests
4. If implementation is wrong → Fix implementation
5. Push fix and verify CI again

**Remember**: 用戶說「你有沒有去 CICD 看啊！」= 你沒有做好 post-commit verification!

---

**Note**: This file should remain in project root for Claude Code auto-loading.
**Version**: 3.4 (Added Per-Issue Preview Workflow MANDATORY rules - 2026-01-10)
