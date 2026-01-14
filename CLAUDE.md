# AI Square - AI 學習平台

> 通用規則見 `~/.claude/CLAUDE.md`（Agent 路由、Git、Security、TDD、Context Management、Claude Code Best Practices）

## 🎯 Project Type

- ✅ Production SaaS Application (Monorepo)
- ✅ Multi-tenant LMS platform
- ✅ Per-Issue Preview Deployment
- ❌ NOT a prototype/MVP

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript 5.3 |
| Database | PostgreSQL (Cloud SQL) |
| Cache | Redis |
| ORM | Prisma (schema only) + Raw SQL (queries) |
| AI Model | Vertex AI (gemini-2.5-flash) |
| Deploy | GCP Cloud Run (asia-east1) |

## ☁️ GCP Configuration

**Project**: `ai-square-463013`
**Account**: `youngtsai@junyiacademy.org`
**Region**: `asia-east1`

**CRITICAL**: 每次 GCP 操作前必須驗證配置：
```bash
gcloud config list  # 確認 project/account/region
```

不正確時使用 `gcp-config-manager` agent 修正。

## 🤖 MANDATORY: Use agents-manager

**關鍵規則**: 任何非簡單問題的任務，**必須**使用 `agents-manager`

### 何時使用

**使用於** (基本上所有任務):
- 新功能、Bug 修復、部署
- TypeScript 錯誤、架構變更
- Code Review、品質檢查、Git 操作

**不使用於**:
- 簡單問題 ("PRD 內容是什麼？")
- 讀取文件

### 使用方式

```
Task(
    subagent_type="agents-manager",
    description="簡短任務描述",
    prompt="詳細說明需要完成的事項"
)
```

### agents-manager 協調的 Agents

```yaml
Infrastructure: infrastructure-first-agent
Testing: tdd-validator-agent
Architecture: unified-architecture-guardian
Security: security-audit-agent
Code Quality + Type Safety: quality-guardian-agent
Deployment + QA: deployment-master-agent
GCP Config: gcp-config-manager
Documentation: documentation-sync-agent
Git Operations: git-commit-push
Performance: performance-optimization-agent
Database: database-management-agent
Monitoring: observability-monitoring-agent
Error Learning: error-reflection-agent
```

**並行執行**: agents-manager 可並行執行獨立 agents，提升 30% 效率

詳見：`.claude/agents/agents-manager.md`

## ⚡ Parallel Agent Execution

**可並行組合**:
- `tdd-validator-agent` + `performance-optimization-agent`
- `security-audit-agent` + `documentation-sync-agent`
- `database-management-agent` + `observability-monitoring-agent`

**必須Sequential**:
- `infrastructure-first-agent` → `deployment-master-agent`
- `tdd-validator-agent` → `git-commit-push`
- `gcp-config-manager` → Any GCP operation

## 📏 TypeScript Rules (Project-Specific)

1. **Zero `any` types** - 使用 `Record<string, unknown>` 或具體型別
2. **No `@ts-ignore`** - 修復根本原因
3. **Next.js 15 routes** - 必須 `await` params:
   ```typescript
   export default async function Page(props: { params: Promise<{ id: string }> }) {
     const params = await props.params;
   }
   ```
4. **多語言欄位** - `Record<string, string>`:
   ```typescript
   { title: { en: "Math", zh: "數學" } }
   ```
5. **模組化原則**:
   - 重點：模組拆分、AI可讀性、Token效率
   - 軟性限制（觸發Review）：Components 300行、Pages 400行、APIs 300行
   - 強制限制（2x軟性限制 AND 複雜度>50 AND 多重責任）
   - 檢查：`npm run check:file-size` (in frontend/)
   - 文件：`frontend/docs/standards/file-size-standards.md`

## 🗄️ Database Architecture

**架構**: Prisma (Schema) + Raw SQL (Queries)

### Schema Management (Prisma)
```bash
npx prisma migrate dev --name description   # 開發環境
npx prisma migrate deploy                   # Production
npx prisma generate                         # 生成 Client
```

### Data Access (Raw SQL)
- 65+ API routes 使用 Repositories (`src/lib/repositories/`)
- 查詢執行：Raw SQL via `pool.query()` (NOT Prisma Client)
- 原因：效能、複雜 JOIN/Aggregation 的靈活性

### 重要架構決策
- ✅ ENUMs → TEXT (靈活性)
- ✅ Prisma for schema, Raw SQL for queries
- ✅ Repository Pattern compatibility
- ⚠️ **不要**合併到 Prisma Client

## 🔀 Per-Issue Preview Workflow (MANDATORY)

**關鍵**: 每個 Issue 必須使用獨立分支和 Preview 環境

### 絕對禁止
- ❌ 直接推送到 staging/main
- ❌ 多個 Issue 共用 Preview URL
- ❌ 跳過 Per-Issue Preview

### 正確流程
```bash
# 1. 建立專用分支
git checkout -b fix/issue-34

# 2. 修改並推送
git push origin fix/issue-34

# 3. 自動觸發：
#    - Deploy to: ai-square-preview-issue-34
#    - Preview URL: https://ai-square-preview-issue-34-...run.app
#    - 在 Issue #34 留言 URL

# 4. 測試通過後 PR → staging
# 5. Merge 後自動清理 Preview
```

**Preview URL 格式**:
```
https://ai-square-preview-issue-{N}-731209836128.asia-east1.run.app
```

## 🧠 Extended Thinking Mode

**觸發詞**（啟動深度分析）:
- "think about this deeply"
- "analyze all options"
- "consider all edge cases"
- "explore different approaches"

**使用場景**:
- 影響多系統的架構決策
- 需要根因分析的複雜 Debug
- 效能優化策略
- 安全漏洞評估

## Commands

```bash
cd frontend/

# Development
npm run dev

# Quality Checks
npm run typecheck
npm run lint
npm run test:unit:ci
npm run build
npm run schema:check
npm run check:file-size

# Database
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
```

## Related Docs

專案文件（詳細規範）:
- `.claude/agents/` - 13 個專案 agents
- `frontend/docs/standards/` - 程式碼標準
- Migration history: `prisma/migrations/`

---

**Version**: 2.0 (Refactored 2026-01-14)
**Lines**: ~200 (from 560)
**Global Config**: `~/.claude/CLAUDE.md` (1174 lines)
**Backup**: `CLAUDE.md.backup-2026-01-14`
