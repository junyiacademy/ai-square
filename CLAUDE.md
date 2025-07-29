# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨🚨🚨 最重要的規則 - 測試驅動開發 (TDD) 🚨🚨🚨

### 每次修復都必須：
1. **寫測試** - 先寫測試確認問題存在
2. **自己測試** - 實際執行代碼驗證修復
3. **模擬操作** - 從畫面模擬用戶操作流程
4. **驗證結果** - 確認看到正確的結果
5. **必要時登入登出** - 測試認證相關功能

### 測試流程：
```bash
# 1. 先用 curl 測試 API
curl -s "http://localhost:3001/api/..." | jq

# 2. 檢查資料庫
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d ai_square_db -c "SELECT ..."

# 3. 使用 Playwright 或 Browser MCP 測試實際畫面
npx playwright test --headed
# 或使用 Browser MCP 親自操作並驗證

# 4. 檢查瀏覽器 console 錯誤
# 5. 確認修復成功後才回報
```

### 強制要求：
- **必須使用 Playwright 或類似的瀏覽器工具親自看過結果**
- **不能只依賴 API 測試**
- **要模擬真實用戶操作流程**
- **確認畫面上顯示正確的內容**

**絕對不要讓用戶一直幫你抓錯！每個修復都要自己先測試過！**

## 🛠️ Claude Code Commands

### Slash Commands
```
/help      - View all available commands
/plan      - Enter planning mode (for complex tasks)
/search    - Search code or documentation
/scan      - Run security scan
/test      - Run tests
/commit    - Commit changes
/diff      - View file differences
/undo      - Undo last operation
```

### CLI Commands
```bash
claude                  # Start interactive session
claude -c               # Continue recent session
claude -r [sessionId]   # Resume specific session
claude --model opus     # Use Opus model (more powerful)
claude -p "prompt"      # Single query mode
```

Always follow the instructions in plan.md. When I say "go", find the next unmarked test in plan.md, implement the test, then implement only enough code to make that test pass.

## 🧪 TDD + Tidy First: Kent Beck Guidelines

### Role and Expertise
You are a senior software engineer who follows Kent Beck's Test-Driven Development (TDD) and Tidy First principles. Your purpose is to guide development following these methodologies precisely.

### Core Development Principles
- Always follow the TDD cycle: **Red → Green → Refactor**
- Write the **simplest failing test** first
- Implement the **minimum code** to make tests pass
- Refactor **only after** tests are passing
- Separate **structural** and **behavioral** changes (Tidy First)
- Maintain **high code quality** throughout

### TDD Methodology Guidance
- Write a failing test for a small behavior increment
- Name tests meaningfully (e.g., `shouldSumTwoPositiveNumbers`)
- Ensure failures are informative and clear
- Only write code to pass the test — no more
- Refactor if needed after test passes
- Repeat this cycle for each new behavior

**When fixing defects:**
- Start with a failing **API-level** test
- Add the **minimal reproducible** test
- Ensure **both** tests pass

### Tidy First Approach
- Always distinguish two change types:
  - **Structural Changes**: Refactor without behavior change (e.g., rename, move code)
  - **Behavioral Changes**: Add or modify features/logic
- Never mix both in one commit
- Do structural changes **before** behavioral ones when both are needed
- Validate behavior doesn't change with tests **before and after** structure edits

### Commit Discipline
Only commit if:
- ✅ All tests pass
- ✅ All lint/compiler warnings are resolved
- ✅ It represents one logical change
- ✅ Commit message specifies `structural` or `behavioral`
- ✅ It’s a small, atomic commit — not a big batch

### Code Quality Standards
- Ruthlessly remove duplication
- Express clear intent via naming/structure
- Make dependencies explicit
- Keep functions/methods small & single-responsibility
- Minimize state and side effects
- Use the **simplest solution** that works

### Refactoring Guidelines
- Refactor **only in Green phase** (tests passing)
- Use named refactoring patterns
- Only do **one refactor** at a time
- Run tests after **each step**
- Prioritize duplication removal and clarity

### Example Workflow
For a new feature:
1. Write a failing test for a small slice
2. Add minimal code to make it pass
3. Confirm test passes (Green)
4. Apply **Tidy First**: refactor, test after each change
5. Commit structure changes separately
6. Add another test for next increment
7. Repeat till complete — separate behavioral and structural commits

✅ One test at a time → Make it pass → Improve structure → Always run tests

## 🔧 TypeScript Error Fix Guidelines

### 🚨 Key Principle: Zero-Risk Fix Strategy
**Never break existing functionality. Every fix must be verifiable and reversible.**

### Pre-fix Checklist
1. **Error Classification**: Analyze error types and distribution
2. **Create Snapshot**: Record current state before fixing
3. **Baseline Tests**: Ensure all tests pass before starting

### Safe Fix Patterns

✅ **Use Type Guards**
```typescript
function hasCompletedAt(obj: unknown): obj is { completedAt: string } {
  return typeof obj === 'object' && obj !== null && 'completedAt' in obj;
}
```

✅ **Use Optional Chaining**
```typescript
const completedAt = program?.completedAt ?? null;
```

✅ **Create Type Mapping Functions**
```typescript
function mapDatabaseToInterface(dbRow: DatabaseRow): ProgramInterface {
  return {
    id: dbRow.id,
    completedAt: dbRow.completed_at,
    // ...
  };
}
```

### Forbidden Patterns

❌ **Never use `any` type**
❌ **Never use `@ts-ignore` or `@ts-nocheck`**
❌ **Never force type casting with `as any`**
❌ **Never batch-modify interfaces**

### Fix Process
1. Fix one file at a time
2. Test after each fix
3. Commit every 50-100 fixes
4. Always provide fallback values for optional methods


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

### 🚨 TypeScript & ESLint Strict Rules

#### Absolutely NO `any` Type
**This is the most important rule, no exceptions:**

1. **Completely forbidden `any` type**
   - ❌ Wrong: `const data: any = {}`
   - ✅ Right: `const data: Record<string, unknown> = {}`
   - ✅ Right: `const data: UserData = {}`

2. **Safe type conversions**
   - ❌ Wrong: `response as any`
   - ✅ Right: `response as unknown as SpecificType`
   - ✅ Better: Define correct types and validate

3. **Function parameters must have types**
   - ❌ Wrong: `function process(data) { }`
   - ✅ Right: `function process(data: ProcessData) { }`

4. **Arrays must have explicit types**
   - ❌ Wrong: `const items: any[] = []`
   - ✅ Right: `const items: string[] = []`

#### ESLint Rules - Zero Tolerance

**Never use ESLint disable comments:**
- ❌ Forbidden: `// eslint-disable-line`
- ❌ Forbidden: `// eslint-disable-next-line`
- ❌ Forbidden: `// @ts-ignore`
- ✅ Correct: Fix the code to comply with rules
- 📌 Exception: Only allowed in scripts (not in production code)

**Common fixes:**
- React Hooks: Use `useCallback` for dependencies
- Unused vars: Remove or prefix with `_`
- Type issues: Define proper interfaces

**Zero tolerance policy:**
- Must have zero ESLint warnings before commit
- Fix warnings immediately, don't accumulate debt

### Git Commit Guidelines

#### 🚨 Pre-commit Checklist
**Must complete ALL checks before commit:**

1. **ESLint Check**: 
   ```bash
   cd frontend && npx eslint $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')
   ```

2. **TypeScript Check**:
   ```bash
   cd frontend && npx tsc --noEmit
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

### Project Overview

AI Square 是一個「用 AI 學 AI 素養」的創新學習平台，基於國際 AI Literacy 框架，透過 AI 技術本身來提升學習者的 AI 素養能力。

**當前狀態 (2025/07)**:
- ✅ **Phase 1**: MVP 基礎完成 (100%)
- ✅ **Phase 1.5**: CMS 系統增強完成 (100%)
- 🚀 **Phase 2**: SaaS 平台開發中
- 📋 **Phase 3**: Agent 系統規劃中

**核心功能**:
- Problem-Based Learning (PBL) 系統：多任務情境學習、AI 導師輔導
- 多語言支援：14 種語言 (en, zhTW, zhCN, pt, ar, id, th, es, ja, ko, fr, de, ru, it)
- AI 素養能力視覺化：KSA (Knowledge, Skills, Attitudes) 映射
- 即時 AI 反饋：個人化評估與質性回饋
- CMS 內容管理：Git-based 版本控制、AI 輔助編輯、分支管理
- 學習進度追蹤：PostgreSQL 資料庫儲存用戶數據
- 統一抽象層架構：確保系統可擴展性

### 技術棧
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS v4, react-i18next, Monaco Editor
- **Backend**: FastAPI, Python 3.x, Vertex AI SDK
- **AI Services**: Google Vertex AI (Gemini 2.5 Flash), Claude API (翻譯), 規劃中: OpenAI
- **Database**: PostgreSQL (用戶數據、學習記錄)
- **Storage**: Google Cloud Storage (靜態檔案、圖片), GitHub (內容版本控制), Redis (分散式快取)
- **Caching**: 多層快取系統 (memory + localStorage + Redis with fallback)
- **Deployment**: Google Cloud Run, Docker, GitHub Actions CI/CD
- **Testing**: Jest (80%+ 覆蓋率), React Testing Library, Playwright
- **CMS**: GitHub API 整合, YAML 處理, AI Quick Actions
- **Translation**: 14 語言支援, LLM 自動化翻譯, 混合式架構

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

### Architecture

#### Unified Learning Architecture
AI Square 採用統一學習架構，所有模組（Assessment、PBL、Discovery）都遵循相同的資料流程：

**統一資料流程**：
```
YAML/API → Content Source → Scenario (UUID) → Program (UUID) → Tasks (UUID) → Evaluations (UUID)
```

**共同 Pattern**：
1. **Repository Pattern**: 所有模組都使用 PostgreSQL Repository 抽象層
2. **UUID 識別**: 所有實體都有唯一 UUID
3. **狀態管理**: pending → active → completed
4. **多語言支援**: 統一的翻譯機制
5. **快取策略**: 多層快取提升效能

詳細架構說明請參考：`frontend/docs/infrastructure/unified-learning-architecture.md`

#### Frontend Structure
- **Framework**: Next.js 15 with App Router, TypeScript, Tailwind CSS v4
- **Internationalization**: react-i18next with 14 language support (en, zhTW, zhCN, pt, ar, id, th, es, ja, ko, fr, de, ru, it)
- **Key Pages**:
  - `/` - Home page
  - `/relations` - AI literacy competency visualization interface
  - `/pbl` - Problem-Based Learning scenario list
  - `/pbl/scenarios/[id]` - Scenario details with KSA mapping
  - `/pbl/scenarios/[id]/program/[programId]/tasks/[taskId]/learn` - Interactive learning with AI tutor
  - `/pbl/scenarios/[id]/program/[programId]/complete` - Completion page with AI feedback
  - `/assessment/scenarios` - Assessment scenarios list
  - `/discovery` - Discovery career exploration
  - `/admin` - Admin dashboard for content management
- **API Routes**: 
  - `/api/relations` - Competency data with translations
  - `/api/pbl/scenarios` - PBL scenario management (hybrid translation support)
  - `/api/pbl/chat` - AI tutor conversation
  - `/api/pbl/evaluate` - Task performance evaluation
  - `/api/pbl/generate-feedback` - Multi-language feedback generation
  - `/api/assessment/scenarios` - Assessment scenarios with hybrid translation
  - `/api/monitoring/performance` - Real-time performance metrics
  - `/api/monitoring/cache` - Cache management and statistics

#### Backend Structure  
- **Framework**: FastAPI with Python 3.x
- **Key Dependencies**: Google Cloud AI Platform, Generative AI, OpenAI, YAML processing
- **Purpose**: Handles AI/LLM integrations and data processing

#### Data Architecture
- **Content Management**: 
  - **Rubrics**: YAML files in `frontend/public/rubrics_data/`
    - `ai_lit_domains.yaml` - Four core AI literacy domains with competencies
    - `ksa_codes.yaml` - Knowledge, Skills, Attitudes reference codes
  - **PBL Scenarios**: YAML files in `frontend/public/pbl_data/`
    - `*_scenario.yaml` - Scenario definitions with tasks and AI modules
    - Multi-language support through field suffixes
- **User Data**: PostgreSQL Database
  - Users, Programs, Tasks, Evaluations, Achievements tables
  - Relational data model with foreign key constraints
- **Static Files**: Google Cloud Storage
  - Images, documents, and other media files
  - Public bucket for static assets
- **Translation System**: Suffix-based field naming (e.g., `description_zh`, `description_es`)
- **Domain Structure**: Engaging_with_AI, Creating_with_AI, Managing_AI, Designing_AI

#### Component Architecture
- **Client-side rendering** with useState/useEffect patterns
- **Accordion interfaces** for domain and competency exploration  
- **Responsive design** with mobile-specific overlays
- **Dynamic content loading** via API with language parameter

#### Abstraction Layer Architecture (`frontend/src/lib/abstractions/`)
- **BaseApiHandler**: Unified API route handling with caching, error handling, and i18n
- **BaseStorageService**: Abstracted storage interface for file operations
- **BaseAIService**: Unified AI service interface for multiple providers
- **BaseYAMLLoader**: YAML content loading with validation and caching
- **BaseLearningService**: Unified learning service interface for all modules
- **Implementations**: Concrete implementations in `/implementations` directory

#### Service Layer Architecture (`frontend/src/lib/services/`)
- **UnifiedEvaluationSystem**: Centralized evaluation system with strategy pattern
- **HybridTranslationService**: Dual-track YAML + JSON translation system
- **ScenarioTranslationService**: Dynamic scenario content translation
- **EvaluationStrategies**: Module-specific evaluation implementations
- **Redis/DistributedCache**: Multi-level caching with automatic fallback

### Key Implementation Details

#### Translation System
The app uses a hybrid translation architecture:
1. **UI Labels**: react-i18next with JSON files in `public/locales/`
2. **Content Data**: 
   - YAML field suffixes for legacy content (e.g., `description_zh`)
   - Separate YAML files per language for new content (e.g., `scenario_ko.yml`)
3. **LLM Integration**: Claude API for automated translations
4. **Coverage**: 14 languages with 100% translation coverage

#### YAML Data Processing
- Domains contain competencies with KSA code references
- API route dynamically resolves translations and builds KSA maps
- Competencies link to knowledge (K), skills (S), and attitudes (A) indicators

#### Styling Approach
- **Tailwind CSS** for utility-first styling
- **Gradient backgrounds** and **responsive design** patterns
- **Custom animations** with CSS-in-JS for mobile interactions

### Database Architecture (Unified Schema V3)
AI Square 使用 **PostgreSQL** 作為主要資料庫，採用統一學習架構設計：

#### 統一學習架構資料流
```
Content Source → Scenario (UUID) → Program (UUID) → Task (UUID) → Evaluation (UUID)
```

#### 核心資料表結構

##### Scenarios 表（學習情境）
- **id**: UUID 主鍵
- **mode**: ENUM ('pbl', 'discovery', 'assessment') - 學習模式
- **status**: ENUM ('draft', 'active', 'archived') - 發布狀態
- **source_type**: ENUM ('yaml', 'api', 'ai-generated') - 來源類型
- **source_path/source_id**: 來源識別
- **source_metadata**: JSONB - 額外來源資訊
- **title/description**: JSONB - 多語言支援
- **objectives**: JSONB - 學習目標
- **task_templates**: JSONB - 任務模板定義
- **pbl_data/discovery_data/assessment_data**: JSONB - 模式特定資料
- **ai_modules/resources**: JSONB - AI 模組與資源配置

##### Programs 表（學習實例）
- **id**: UUID 主鍵
- **mode**: ENUM - 從 scenario 繼承的模式（使用 trigger 自動填充）
- **scenario_id**: 關聯的情境
- **user_id**: 學習者識別
- **status**: ENUM ('pending', 'active', 'completed', 'expired')
- **total_score/time_spent_seconds**: 學習成效追蹤
- **started_at/completed_at**: 時間戳記

##### Tasks 表（任務）
- **id**: UUID 主鍵
- **mode**: ENUM - 從 program 繼承的模式
- **program_id**: 關聯的學習實例
- **type**: ENUM ('question', 'chat', 'creation', 'analysis')
- **title/instructions**: JSONB - 多語言支援
- **context/metadata**: JSONB - 任務資料
- **interactions**: JSONB - 互動記錄
- **started_at/completed_at**: 任務時間追蹤

##### Evaluations 表（評估）
- **id**: UUID 主鍵
- **mode**: ENUM - 從 task 繼承的模式
- **task_id/user_id**: 關聯資訊
- **evaluation_type**: ENUM ('formative', 'summative', 'diagnostic', 'ai-feedback')
- **score/feedback**: 評估結果
- **criteria/rubric**: JSONB - 評估標準
- **ai_config/ai_response**: JSONB - AI 評估設定與回應

#### 重要設計特點
1. **Mode 欄位繼承**: programs、tasks、evaluations 都有 mode 欄位，透過 trigger 自動從上層繼承，避免過多 JOIN
2. **多語言支援**: 使用 JSONB 儲存 `{en: "English", zh: "中文", ...}` 格式
3. **彈性擴充**: 每個模式有專屬的 data 欄位（pbl_data、discovery_data、assessment_data）
4. **統一介面**: 所有模式使用相同的資料流程和 Repository Pattern
5. **時間戳記標準化**: 
   - `createdAt`: 記錄建立時間
   - `startedAt`: 實際開始時間（狀態從 pending → active）
   - `completedAt`: 完成時間
   - `updatedAt`: 最後更新時間

#### TypeScript 型別對應
```typescript
// 資料庫 ENUM 對應
export type LearningMode = 'pbl' | 'discovery' | 'assessment';
export type SourceType = 'yaml' | 'api' | 'ai-generated';
export type ScenarioStatus = 'draft' | 'active' | 'archived';
export type ProgramStatus = 'pending' | 'active' | 'completed' | 'expired';
export type TaskType = 'question' | 'chat' | 'creation' | 'analysis';
export type EvaluationType = 'formative' | 'summative' | 'diagnostic' | 'ai-feedback';

// 統一介面
export interface IScenario {
  id: string;
  mode: LearningMode;
  sourceType: SourceType;
  sourcePath?: string;
  sourceId?: string;
  sourceMetadata?: Record<string, unknown>;
  title: Record<string, string>;
  description: Record<string, string>;
  // ... 其他欄位
}
```

#### 資料儲存策略
- **PostgreSQL**: 所有動態用戶資料、學習記錄、進度追蹤
- **YAML 檔案**: 靜態內容定義（情境模板、KSA 映射、rubrics）
- **Google Cloud Storage**: 僅用於靜態檔案（圖片、文件、媒體）
- **Redis**: 分散式快取層，提升查詢效能

#### Repository Pattern 實作
- 所有資料存取都透過 Repository 抽象層
- 基礎介面定義在 `@/types/unified-learning.ts`
- PostgreSQL 實作在 `@/lib/repositories/postgresql/`
- 支援未來擴充其他資料庫（如 MongoDB）

### Configuration Files
- `eslint.config.mjs` - Next.js + TypeScript ESLint setup
- `tailwind.config.js` - Tailwind CSS configuration  
- `next.config.ts` - Next.js configuration with i18n
- `next-i18next.config.js` - Internationalization setup
- `tsconfig.json` - TypeScript configuration

### 最近成就 (2025/01)
- ✅ **TypeScript 型別安全**: 消除所有生產代碼的 any 類型 (102 → 0)
- ✅ **測試覆蓋率**: 核心模組達到 80%+ 覆蓋率
- ✅ **多語言支援完整度**: 14 種語言達到 100% 翻譯覆蓋率
- ✅ **混合式翻譯架構**: 實現 YAML + JSON 雙軌翻譯系統
- ✅ **API 效能優化**: 實現 5-10x 效能提升，含 Redis 快取支援
- ✅ **統一學習架構**: 完成 Assessment、PBL、Discovery 模組整合
- ✅ **LLM 翻譯系統**: 整合 Claude API 自動化翻譯流程
- ✅ **Tailwind CSS v4**: 升級並優化樣式系統

### 接下來的優先事項
1. **OAuth2 社交登入** (Google, GitHub) - 降低註冊門檻
2. **智能 Onboarding** - 解決「不知道從何開始」的痛點
3. **AI 資源使用追蹤** - Token 計算與成本控制
4. **PBL 修改歷程記錄** - 展示學習思考過程

### Project Context
AI Square 正處於從 MVP 轉向 SaaS 平台的關鍵階段。Phase 1 已完成基礎功能，現在專注於提升用戶體驗和平台智能化。

### Important Technical Specifications

#### 🚨 Cloud SQL Deployment - Regions Must Match
**Key lesson from painful staging deployment**

- **Problem**: "relation does not exist" errors were actually timeout issues
- **Cause**: Cloud SQL in `us-central1`, Cloud Run in `asia-east1`
- **Solution**: Both services must be in same region

```bash
# ❌ Wrong: Cross-region
Cloud SQL: us-central1
Cloud Run: asia-east1

# ✅ Correct: Same region
Cloud SQL: asia-east1
Cloud Run: asia-east1
```

#### Vertex AI Model Names
- **Correct model**: `gemini-2.5-flash` (not gemini-pro)
- **Usage**:
  ```typescript
  const model = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.5-flash',
  });
  
  const result = await model.generateContent(prompt);
  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || 'Default';
  ```

## 🏗️ Architecture Best Practices - Lessons from GCS-v2 Migration

### 🎯 Get Architecture Right from Day 1

#### Golden Rules for Infrastructure
```yaml
Must-have from Day 1:
- Database: PostgreSQL (never use filesystem as DB)
- Cache: Redis (design caching strategy early)
- File Storage: S3/GCS (static files only)
- Version Control: Git-based content management
```

#### Core Design Principles

1. **Unified Data Model**
   ```typescript
   interface UnifiedDataFlow {
     source: ContentSource;      // YAML, API, AI
     scenario: LearningScenario; // Unified learning unit
     program: UserProgram;       // User instance
     task: LearningTask;         // Task
     evaluation: Assessment;     // Assessment
   }
   ```

2. **Repository Pattern from Start**
   ```typescript
   interface IRepository<T> {
     findById(id: string): Promise<T>;
     create(item: T): Promise<T>;
     update(id: string, updates: Partial<T>): Promise<T>;
   }
   ```

3. **Proper Multi-language Support**
   ```typescript
   // ❌ Wrong: String suffixes
   interface WrongWay {
     title_en: string;
     title_zh: string;
   }
   
   // ✅ Right: Structured JSONB
   interface RightWay {
     title: {
       en: string;
       zh: string;
     };
   }
   ```

### 🚨 Red Flags to Avoid

1. **❌ Using filesystem as database**
2. **❌ String suffixes for i18n**
3. **❌ No abstraction layer**
4. **❌ "Temporary" solutions**
5. **❌ Ignoring data relationships**

### 💡 MVP Baseline

```yaml
OK to simplify in MVP:
✅ Feature count - fewer but focused
✅ UI polish - simple but usable
✅ Performance - basic is fine

Never skip in MVP:
❌ Proper database choice
❌ Error handling
❌ Data model design
❌ Repository Pattern
❌ Test framework
```

> "There is nothing more permanent than a temporary solution"

## 🗄️ 資料庫配置標準

### 🚨 絕對不能再出現的問題：DB_NAME 不一致

**標準配置**：
```bash
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=ai_square_db  # 統一使用這個！
DB_USER=postgres
DB_PASSWORD=postgres
```

**檢查清單**：
- [ ] `.env.local` 使用正確的 DB_NAME
- [ ] `repository-factory.ts` 預設值正確
- [ ] `docker-compose.postgres.yml` 配置正確
- [ ] 所有測試腳本使用統一配置

**如果遇到 "Scenario not found" 錯誤**：
1. 立即檢查 `DB_NAME` 配置
2. 重啟 Next.js 開發伺服器
3. 確認資料庫連線

**禁止使用的舊名稱**：
- ❌ `ai_square_dev` 
- ❌ `ai-square-development`
- ❌ `aisquare2025local` (密碼)

## 🔧 TypeScript Error Fix SOP

### 1. **Assess Current State**
```bash
# Count total errors
npm run typecheck 2>&1 | grep -E "error TS[0-9]+" | wc -l

# Check error distribution
npm run typecheck 2>&1 | grep -E "error TS[0-9]+" | sort | uniq -c | sort -nr | head -20
```

### 2. **Check Usage Before Fixing**
```bash
# Check if file is referenced
grep -r "from.*filename" --include="*.ts" --include="*.tsx" .

# Check if function is called
grep -r "functionName" --include="*.ts" --include="*.tsx" . | grep -v "function functionName"

# Safe deletion process
git rm path/to/unused-file.ts
git commit -m "chore: remove unused file [filename]"
```

### 3. **Priority Strategy**
1. **Batch fix same patterns** (most efficient)
2. **Fix high-impact errors** (interface definitions)
3. **Simple to complex** (property names → type mismatches)

### 4. **Fix Techniques**

#### Property Renames
```typescript
// Use grep to find all occurrences
grep -r "\.oldProperty" --include="*.ts" --include="*.tsx" .
```

#### Optional Method Calls
```typescript
// ✅ Correct
await taskRepo.updateStatus?.(id, status);
const result = await repo.findActive?.() || [];
```

#### Type Mismatches
```typescript
// ✅ Correct: multilingual object
title: { en: 'PBL Scenario' }
```

### 5. **Common Error Patterns**

| Error | Message | Solution |
|-------|---------|----------|
| TS2339 | Property doesn't exist | Check property name/interface |
| TS2322 | Type not assignable | Fix type definition |
| TS2722 | Possibly undefined | Use optional chaining |
| TS2345 | Argument mismatch | Match function signature |

### 6. **Key Principles**
1. **Understand > Fix**: Know why the error exists
2. **Test protection**: Test before and after
3. **Preserve logic**: Keep functionality intact
4. **Defensive coding**: Handle undefined/null
5. **Small steps**: Fix one issue at a time

**Remember: TypeScript errors are warnings about potential problems, not just noise to silence.**

## 📚 Cloud Run + Cloud SQL Deployment Guide

### 🚨 Key Principle: Regions Must Match
**Critical lesson from staging deployment**

#### Diagnostics

1. **Check Cloud SQL instance**:
   ```bash
   gcloud sql instances describe INSTANCE_NAME --format="table(name,region,state)"
   ```

2. **Check Cloud Run config**:
   ```bash
   gcloud run services describe SERVICE_NAME --region=REGION --format="json" | jq '.spec.template.metadata.annotations'
   ```

#### Connection Methods

**Method 1: Unix Socket (Recommended)**
```bash
gcloud run deploy SERVICE_NAME \
  --add-cloudsql-instances=PROJECT:REGION:INSTANCE \
  --set-env-vars DB_HOST="/cloudsql/PROJECT:REGION:INSTANCE"
```

**Method 2: Private IP + VPC (Most Secure)**
```bash
# Create VPC Connector
gcloud compute networks vpc-access connectors create CONNECTOR \
  --region=REGION --network=default --range=10.8.0.0/28

# Deploy with connector
gcloud run deploy SERVICE_NAME \
  --vpc-connector=CONNECTOR \
  --vpc-egress=all-traffic
```

#### Common Issues

1. **Password auth failed**: Use Secret Manager for special chars
2. **Connection timeout**: Check region matching
3. **Permission denied**: Add `cloudsql.client` role

#### Deployment Checklist

- [ ] Cloud SQL and Cloud Run in same region
- [ ] Environment variables set correctly
- [ ] Cloud SQL instance mounted
- [ ] Service account has permissions
- [ ] Database initialized
- [ ] Password managed properly

#### Repository Pattern Connection

```typescript
const dbHost = process.env.DB_HOST || 'localhost';
const isCloudSQL = dbHost.startsWith('/cloudsql/');

if (isCloudSQL) {
  poolConfig.host = dbHost;
  // Don't set port for unix socket
} else {
  poolConfig.host = dbHost;
  poolConfig.port = parseInt(process.env.DB_PORT || '5432');
}
```

---

Note: This CLAUDE.md file must remain in the project root directory to be automatically read by Claude AI.


