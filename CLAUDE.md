# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔧 Google Cloud 帳號配置 - AI Square 專案

### 重要：使用正確的 Google Cloud 帳號
AI Square 專案必須使用以下配置：
- **Project ID**: `ai-square-463013`
- **Account**: `youngtsai@junyiacademy.org`
- **Region**: `asia-east1`

### 設定 gcloud 配置
```bash
# 如果尚未建立 ai-square 配置
gcloud config configurations create ai-square
gcloud config set account youngtsai@junyiacademy.org
gcloud config set project ai-square-463013

# 每次開發前確認配置
gcloud config configurations activate ai-square
gcloud config list  # 應顯示 project = ai-square-463013
```

### 多專案開發提示
如果同時開發其他專案（如 Duotopia），使用環境變數隔離：
```bash
# Terminal for AI Square
export CLOUDSDK_ACTIVE_CONFIG_NAME=ai-square

# Terminal for other projects
export CLOUDSDK_ACTIVE_CONFIG_NAME=other-config
```

**部署前必須檢查**：`gcloud config get-value project` 應顯示 `ai-square-463013`

詳細部署指南請參考：`docs/deployment/CICD.md`

---

## 🤖 Sub-Agent 使用規則

### 🎯 核心原則
**主動分析需求，選擇正確的 Sub-Agent**

### 📋 主要 Sub-Agents
- **typescript-eslint-fixer**: TypeScript/ESLint 錯誤修復
- **deployment-qa**: 部署驗證與 QA 檢查
- **slack-tracker-integration**: Slack 報告與追蹤
- **progress-memory-coach**: 進度與記憶管理
- **git-commit-push**: Git 智能提交決策
- **terraform-deploy**: Terraform 部署
- **general-purpose**: 複雜搜尋與多步驟任務

### 🔍 選擇邏輯
1. **錯誤訊息** → typescript-eslint-fixer
2. **部署/測試** → deployment-qa
3. **Slack/報告** → slack-tracker-integration
4. **記憶/進度** → progress-memory-coach
5. **Git 操作** → git-commit-push
6. **Terraform** → terraform-deploy
7. **複雜任務** → general-purpose

### 📁 Agent 定義位置
`.claude/agents/` 目錄包含各 agent 的詳細定義和使用說明

---

## 🏗️ 平台開發核心原則 - 不要繞遠路

### 🎯 核心教訓：直接用生產級方案，避免技術債

> **"There is nothing more permanent than a temporary solution"**
> 臨時解決方案會變成永久的技術債

### 🚀 一步到位原則：使用現有系統化自動化方案

**永遠優先使用已經存在的成熟解決方案，不要創建臨時腳本！**

#### ✅ 正確做法：使用現有系統
```yaml
部署方式優先順序：
1. GitHub Actions (CI/CD) - 最自動化
2. Terraform + Makefile - 基礎設施即代碼
3. 現有部署腳本 - 如 deploy-staging.sh
4. gcloud 命令 - 直接使用 GCP CLI

絕對不要：
❌ 寫新的 shell script 來「解決」部署問題
❌ 創建「臨時」的自動化腳本
❌ 重複造輪子
```

> **🚀 CI/CD 與部署指南已移至專門文件**
> 
> **CI/CD 部署指南**: 請參考 [`docs/deployment/CICD.md`](docs/deployment/CICD.md)
> - Terraform vs GitHub Actions 責任分工
> - 部署監控與驗證流程
> - Cloud Run + Cloud SQL 部署指南
> - 部署後強制測試規則
> - 部署初始化關鍵步驟

### 📊 平台開發鐵則

#### 1. **基礎設施優先 (Infrastructure First)**
```yaml
正確做法 (Day 1)：
✅ Cloud SQL + Cloud Run 從第一天開始
✅ Terraform 管理所有基礎設施
✅ CI/CD pipeline 第一週建立
✅ Secret Manager 管理所有密碼
✅ 監控告警從第一天開始

錯誤做法（避免）：
❌ 用檔案系統當資料庫（如 GCS 存 YAML）
❌ 手寫部署腳本（deploy.sh）
❌ 手動管理環境變數
❌ "先簡單後複雜" 的漸進式架構
```

#### 2. **資料架構不妥協 (Data Architecture Non-negotiable)**
```yaml
正確做法：
✅ PostgreSQL 作為 Single Source of Truth
✅ 正確的關聯式設計（外鍵、CASCADE DELETE）
✅ JSONB 處理彈性資料
✅ Redis 作為快取層
✅ 使用成熟的 ORM（如 Prisma）

錯誤做法：
❌ YAML/JSON 檔案當資料庫
❌ 混用多種儲存方式
❌ 沒有外鍵約束
❌ Schema 多次重構（V1→V2→V3→V4）
```

#### 3. **DevOps 文化 (Everything as Code)**
```yaml
正確做法：
✅ Infrastructure as Code (Terraform)
✅ Configuration as Code (環境變數)
✅ Deployment as Code (CI/CD)
✅ Immutable Infrastructure
✅ Blue-Green Deployment

錯誤做法：
❌ 手動配置伺服器
❌ SSH 進去修改設定
❌ 部署後手動測試
❌ 沒有回滾機制
```

#### 4. **監控先行 (Observability First)**
```yaml
從 Day 1 就要有：
✅ Structured Logging (Cloud Logging)
✅ Metrics Collection (Cloud Monitoring)
✅ Error Tracking (Sentry)
✅ Performance Monitoring (APM)
✅ Alert Rules (PagerDuty/Slack)

不要等出問題才加！
```

#### 5. **安全內建 (Security by Design)**
```yaml
必須內建的安全措施：
✅ Secret Manager for ALL secrets
✅ Service Account + IAM (最小權限原則)
✅ SSL/TLS everywhere
✅ Audit Logging
✅ Security Scanning in CI

絕對禁止：
❌ 明文密碼在程式碼中
❌ 使用 root/admin 權限
❌ 公開的資料庫連線
❌ 沒有 SSL 的 API
```

### 🚀 新專案 Day 1 Checklist

```bash
# Day 1 必須完成（8小時內）：
□ Terraform 專案初始化
□ PostgreSQL + Redis 設定
□ GitHub Actions CI/CD Pipeline
□ 環境分離 (dev/staging/prod)
□ Secret Manager 設定
□ 基本健康檢查 API (/api/health)
□ 監控告警設定
□ 第一個 E2E 測試

# 絕對不要做的事：
✗ 用檔案系統儲存業務資料
✗ 手寫 shell scripts 部署
✗ "暫時" 的解決方案
✗ "之後再加" 的安全措施
✗ 沒有測試就上線
```

### 💡 Terraform 優先策略

```yaml
遇到部署問題的 SOP：
1. 檢查是否已有 Terraform 配置
2. 沒有？立即建立！
3. terraform import 現有資源
4. terraform plan 檢查
5. terraform apply 執行

不要再 debug 神秘的 shell script！
```

### 📝 實際案例：AI Square 的教訓

```yaml
繞遠路的決策：
1. GCS 當資料庫 → 應該直接用 PostgreSQL
2. deploy.sh 腳本 → 應該直接用 Terraform  
3. Schema V1→V2→V3→V4 → 應該一開始就設計完整
4. 漸進式測試覆蓋 → 應該 TDD from Day 1

正確的決策：
✅ Next.js 15 (最新框架)
✅ TypeScript (型別安全)
✅ 統一學習架構
✅ 多語言支援設計
```

### 🎯 記住：規模化思維

- **不要小規模試探** → 直接用生產級方案
- **不要漸進式改進** → 一開始就做對
- **不要省基礎建設** → 基礎決定上層建築
- **不要技術債** → 沒有"暫時"的程式碼

---

## 🚨 測試驅動開發 (TDD) 核心原則

### 修復流程
1. **寫測試** - 先寫測試確認問題存在
2. **實際測試** - 使用 Playwright 或 Browser MCP 測試真實畫面
3. **驗證結果** - 確認修復成功後才回報

### 測試工具
```bash
# API 測試
curl -s "http://localhost:3001/api/..." | jq

# 資料庫檢查
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d ai_square_db -c "SELECT ..."

# 瀏覽器測試
npx playwright test --headed
```

**強制要求：必須使用瀏覽器工具親自驗證結果，不能只依賴 API 測試！**



### 🚨 重要教訓

**Token 格式一致性**：
- Token 生成與驗證格式必須一致
- 生成 hex token 就要用 hex 驗證，不能用 base64








## 📊 Slack 動態報告系統

### 🚨 三大鐵則
1. **狀態必須正確** - 檢查 `.project-status.json` 是否最新
2. **Dry Run 優先** - 先執行 `--dry-run` 預覽，等待用戶確認
3. **理解用戶意圖** - 「dry run」不發送，「發送」才執行

### 可用命令
```bash
# CEO 報告
npm run report:ceo -- --dry-run  # 預覽
npm run report:ceo               # 發送

# 開發追蹤
npm run report:dev
npm run dev:session:start
npm run dev:session:end
```

### 環境設定
在 `.env.local` 中設定 Slack webhook：
```bash
SLACK_AISQUARE_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_AISQUARE_DEV_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## 🧪 TDD + Tidy First 原則

### 核心開發原則
- **TDD 循環**: Red → Green → Refactor
- **寫最簡單的失敗測試** → 實現最小代碼 → 重構
- **分離結構性和行為性變更** (Tidy First)
- **一次一個測試** → 讓它通過 → 改善結構 → 總是運行測試

### 提交紀律
只有當以下條件都滿足時才提交：
- ✅ 所有測試通過
- ✅ 所有 lint/編譯器警告已解決
- ✅ 代表一個邏輯變更
- ✅ 提交訊息標明 `structural` 或 `behavioral`
- ✅ 小原子提交，不是大批量


## 🔧 TypeScript 錯誤修復核心原則

### 🚨 修復策略
**零風險修復：永遠不破壞現有功能，每次修復都必須可驗證和可逆轉。**

### 核心原則
1. **永遠不使用 `any` 類型** - 使用 `Record<string, unknown>` 或具體類型
2. **使用 Optional Chaining** - `program?.completedAt ?? null`
3. **一次修復一個檔案** - 修復後立即測試
4. **永遠不使用 `@ts-ignore`** - 修復根本問題而非掩蓋


## 🚀 Modern AI Development Workflow

### Core Principle: Minimal, Efficient, AI-Friendly

```
1. Start work (make new) → 2. Smart save (make save) → 3. Complete work (make done)
```

### Core Commands (80% of use cases)
```bash
make ai-new TYPE=feature TICKET=name   # Start new work
make ai-save                          # Smart save progress (record AI complexity)
make ai-done                          # Complete work (test+commit+merge)
```

### AI Behavior Guidelines

**DO:**
1. Execute `make ai-new` before starting work
2. MVP-first mindset - core user value before infrastructure
3. Write tests alongside features (TDD)
4. Regular `make ai-save` to track progress
5. Wait for user confirmation before `make ai-done`
6. All commit messages in English
7. Strict TypeScript types (no `any`)
8. Follow all ESLint rules

**DON'T:**
1. Auto-commit without user request
2. Use legacy commands
3. Create verbose documentation
4. Use `any` type
5. Ignore ESLint warnings
6. Commit mid-development

### AI Complexity Tracking
```bash
# Record complexity (not tokens)
AI_TASK="implement login" AI_COMPLEXITY=complex make ai-save
```

Complexity levels: `simple`, `medium`, `complex`, `debug`

---

## 🧪 Testing Best Practices

### Testing Principles
1. **TDD First**: Write tests before code
2. **Coverage Target**: 70%+ coverage
3. **Test Separation**: Unit and E2E tests separate
4. **Mock Dependencies**: Isolate tests with mocks

### Unit vs E2E Tests
- **Unit Tests**: API routes, React components, utilities, state management
- **E2E Tests**: User flows, cross-page interactions, browser behavior, critical paths

### Test Naming
- Unit: `ComponentName.test.tsx` or `functionName.test.ts`
- E2E: `feature-name.spec.ts`

### Handling Obsolete Snapshots
When tests pass but CI fails due to obsolete snapshots:
```bash
# Check for obsolete snapshots
npm run test:ci

# If you see "X snapshots obsolete", remove them:
npm run test:ci -- -u

# This removes obsolete snapshots without affecting passing tests
```

**Note**: Obsolete snapshots are NOT test failures - they're just leftover snapshots from tests that no longer exist or no longer use snapshots.

## 🎯 MVP Development Strategy

### Priority Order
1. Core user value - validate assumptions
2. Basic functionality - ensure main flows work
3. Quality assurance - adequate testing (70%+)
4. Infrastructure - optimize when needed

### Avoid Premature Optimization
- ❌ Complex monitoring (use 3rd party)
- ❌ Over-optimization (wait for bottlenecks)
- ❌ 100% coverage (focus critical paths)
- ❌ Perfect infrastructure (incremental improvement)

### 🏗️ Data Model & Naming Standards

#### Timestamp Field Naming
1. **createdAt**: Record creation time
   - PostgreSQL: `created_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `createdAt: Date`

2. **startedAt**: Actual start time (optional)
   - PostgreSQL: `started_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `startedAt?: Date`

3. **completedAt**: Completion time (optional)
   - PostgreSQL: `completed_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `completedAt?: Date`

4. **updatedAt**: Last update time
   - PostgreSQL: `updated_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `updatedAt: Date`

#### DDD Terminology

**`content`** - Task Content
- **Purpose**: User-facing content and materials
- **Includes**: instructions, question, options, description, hints, resources

**`context`** - Task Context  
- **Purpose**: Environment and background information
- **Includes**: scenarioId, difficulty, ksaCodes, metadata, taskType, estimatedTime

#### Mandatory Checklist
- [ ] content contains only user content
- [ ] context contains only system metadata  
- [ ] No nested content.context or context.content
- [ ] All modules (PBL/Assessment/Discovery) use same structure

### 🚨 TypeScript & ESLint 核心規則

#### 檢查優先順序
```bash
# 1. 先檢查 TypeScript 錯誤（最優先）
npx tsc --noEmit

# 2. 修復所有 TypeScript 錯誤後，再處理 ESLint
npm run lint
```

#### 核心規則
1. **永遠不使用 `any` 類型** - 使用 `Record<string, unknown>` 或具體類型
2. **Next.js 15 路由參數** - 必須使用 `Promise<{ params }>` 並 `await`
3. **多語言欄位** - 必須使用 `Record<string, string>` 格式
4. **Repository 方法** - 可選方法必須使用 `?.` 操作符
5. **測試檔案** - 必須嚴格遵守所有 TypeScript 規則，零例外
6. **Pre-commit 檢查** - 必須通過所有檢查才能提交

#### 常見錯誤模式
- **多語言欄位不匹配**: `string` vs `Record<string, string>`
- **Next.js 15 路由參數**: 忘記 `await params`
- **Repository 方法調用**: 忘記使用 `?.` 操作符
- **測試檔案型別錯誤**: 使用 `any` 或不符合介面定義

### 🛡️ 錯誤修復流程

#### TDD 修復流程
1. **先寫測試確認錯誤存在** - 建立重現錯誤的測試
2. **修復錯誤** - 一次只修復一個錯誤
3. **驗證修復** - 確保所有測試通過
4. **實際測試** - 使用 Playwright 或 Browser 工具測試

#### 常見錯誤模式與解決方案
- **多語言欄位不匹配**: 使用 `{ en: value }` 格式
- **型別定義衝突**: 從單一來源導入，不重複定義
- **不安全的型別轉換**: 使用 `as unknown as Type`
- **Next.js 15 路由參數**: 使用 `Promise<{ params }>` 並 `await`

#### 快速修復檢查清單
   ```bash
# 1. 檢查 TypeScript 錯誤
npx tsc --noEmit

# 2. 搜尋型別衝突
grep -r "interface TypeName" src/

# 3. 驗證修復
npm run typecheck && npm run lint && npm run test:ci
```

### Git Commit Guidelines

#### 🚨 Pre-commit Checklist
**Must complete ALL checks before commit:**

1. **TypeScript Check (永遠最先檢查)**:
   ```bash
   cd frontend && npx tsc --noEmit
   ```
   **如果有任何 TypeScript 錯誤（包含測試檔案），必須先修復才能繼續！**
   
   檢查測試檔案錯誤：
   ```bash
   npx tsc --noEmit 2>&1 | grep -E "test\.(ts|tsx)"
   ```

2. **ESLint Check (TypeScript 通過後才檢查)**: 
   ```bash
   cd frontend && npx eslint $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')
   ```

3. **Test Check**:
   ```bash
   cd frontend && npm run test:ci
   ```

4. **Build Check**:
   ```bash
   cd frontend && npm run build
   ```

5. **Automated pre-commit command**:
   ```bash
   make pre-commit-check
   ```

#### Commit Message Format
1. **All commit messages in English**
2. **Follow conventional commits**:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `refactor:` code refactoring
   - `test:` testing
   - `chore:` maintenance
3. **Never auto-commit** - wait for user confirmation
4. **AI-enhanced format**:
   ```
   <type>: <subject>
   
   <body>
   
   🤖 AI Assistant: Claude Opus 4
   📊 Session context: ~<tokens> tokens (estimated)
   🎯 Task complexity: <level>
   📁 Files changed: <number>
   ```

#### Git Sync Workflow
**Always sync before commit:**
```bash
# 1. Check status
git status

# 2. Pull and rebase
git pull --rebase origin main

# 3. Resolve conflicts if any
# 4. Then commit
```

---

## 項目資訊

> **📋 產品需求與技術規格已移至專門文件**
> 
> **產品需求文檔 (PRD)**: 請參考 [`docs/handbook/PRD.md`](docs/handbook/PRD.md)
> - 產品願景與核心功能
> - 技術棧選型與架構
> - 發展路線圖與優先事項
> - 成功指標與風險管理
> 
> **技術架構文檔**: 請參考 [`docs/technical/infrastructure/unified-learning-architecture.md`](docs/technical/infrastructure/unified-learning-architecture.md)
> - 統一學習架構設計
> - 資料庫架構與 Repository Pattern
> - API 設計與服務層架構

### Development Commands

#### Frontend (Next.js)
```bash
# Development server
cd frontend && npm run dev

# Build production
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# Type checking
cd frontend && npm run typecheck
```

#### Testing Commands
```bash
# Unit Tests (Jest + React Testing Library)
cd frontend && npm run test                    # Watch mode
cd frontend && npm run test:ci                  # CI mode (no watch)
cd frontend && npm run test -- --coverage       # With coverage report
cd frontend && npm run test -- src/components   # Test specific folder

# E2E Tests (Playwright)
cd frontend && npx playwright install           # Install browsers (first time)
cd frontend && npm run test:e2e                 # Run all E2E tests
cd frontend && npm run test:e2e -- --project=chromium  # Chrome only
cd frontend && npm run test:e2e -- --grep "Login"      # Specific test
```

#### Test File Structure
```
frontend/
├── src/
│   ├── components/
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       └── __tests__/
│   │           └── LoginForm.test.tsx    # Unit test
│   ├── app/
│   │   └── api/
│   │       └── auth/
│   │           ├── login/
│   │           │   └── route.ts
│   │           └── __tests__/
│   │               └── login.test.ts     # API test
├── e2e/
│   └── login.spec.ts                     # E2E test
└── __mocks__/                            # Test mocks
```

#### Backend (Python FastAPI)
```bash
# Development server
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Run tests (if pytest is installed)
cd backend && python -m pytest

# Linting (if ruff is installed)
cd backend && python -m ruff check .
```

#### Docker & Cloud Deployment
```bash
# Build Docker image
make build-frontend-image

# Deploy to Google Cloud Run
make gcloud-build-and-deploy-frontend
```

> **📋 詳細部署指南**: 請參考 [`docs/deployment/CICD.md`](docs/deployment/CICD.md)

### Architecture

> **📋 詳細架構說明**: 請參考 [`docs/technical/infrastructure/unified-learning-architecture.md`](docs/technical/infrastructure/unified-learning-architecture.md)

**核心架構**：
- **統一學習架構**: 所有模組（Assessment、PBL、Discovery）遵循相同資料流程
- **Repository Pattern**: PostgreSQL Repository 抽象層
- **多語言支援**: 14 種語言，混合式翻譯架構
- **快取策略**: 多層快取提升效能

### Database Architecture

> **📋 詳細資料庫架構**: 請參考 [`docs/technical/infrastructure/unified-learning-architecture.md`](docs/technical/infrastructure/unified-learning-architecture.md)

**核心設計**：
- **PostgreSQL**: 主要資料庫，統一學習架構
- **資料流程**: Content Source → Scenario → Program → Task → Evaluation
- **多語言支援**: JSONB 格式儲存
- **Repository Pattern**: 抽象層設計，支援未來擴充

### Configuration Files
- `eslint.config.mjs` - Next.js + TypeScript ESLint setup
- `tailwind.config.js` - Tailwind CSS configuration  
- `next.config.ts` - Next.js configuration with i18n
- `tsconfig.json` - TypeScript configuration

### Important Technical Specifications

#### 🚨 Cloud SQL Deployment - Regions Must Match
**Key lesson from painful staging deployment**

- **Problem**: "relation does not exist" errors were actually timeout issues
- **Cause**: Cloud SQL in `us-central1`, Cloud Run in `asia-east1`
- **Solution**: Both services must be in same region

#### Vertex AI Model Names
- **Correct model**: `gemini-2.5-flash` (not gemini-pro)

### 🏗️ 架構最佳實踐

**Day 1 必須有**：
- PostgreSQL（不用檔案系統當資料庫）
- Redis（早期設計快取策略）
- Repository Pattern（從開始就建立抽象層）
- 正確的多語言支援（JSONB 格式）

**絕對避免**：
- 檔案系統當資料庫
- 字串後綴做 i18n
- "臨時"解決方案
- 忽略資料關聯

**記住：沒有什麼比臨時解決方案更永久**






### 🚨 評估命名規範統一

**變更內容**：
- ❌ 舊命名：`summative`, `formative`, `diagnostic`, `ai-feedback`
- ✅ 新命名：`assessment_complete`, `pbl_complete`, `discovery_complete`

**實作原則**：
- 使用簡單描述性命名，避免學術術語
- 一個 `evaluation_type` 欄位即可
- 保持 API 簡潔

**關鍵教訓**：
- Next.js 升級會帶來重大 API 變更
- 整個專案要保持型別定義一致性
- 漸進式修復，需要耐心逐一解決

---

Note: This CLAUDE.md file must remain in the project root directory to be automatically read by Claude AI.


