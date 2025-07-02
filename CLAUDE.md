# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🛠️ Claude Code 實用指令

### Slash Commands (在對話中使用)
```
/help          查看所有可用指令
/plan          進入規劃模式（適合複雜任務）
/search        搜尋程式碼或文件
/scan          執行安全掃描
/test          執行測試
/commit        提交變更
/diff          查看檔案差異
/undo          復原上一個操作
```

### CLI 指令
```bash
claude                           # 啟動互動式對話
claude -c                        # 繼續最近的對話
claude -r [sessionId]            # 恢復特定對話
claude --model opus              # 使用 Opus 模型（更強大）
claude -p "prompt"               # 單次查詢模式
```

## 🚀 現代化 AI 開發流程

### 核心原則：極簡、高效、AI 友善

我們使用極簡化的開發流程，專注於效率和 AI 協作：

```
1. 開始工作 (make new) → 2. 智能保存 (make save) → 3. 完成工作 (make done)
```

---

## 📋 快速開始

### 核心命令（覆蓋 80% 場景）
```bash
make ai-new TYPE=feature TICKET=name   # 開始新工作
make ai-save                          # 智能保存進度（記錄 AI 複雜度）
make ai-done                          # 完成工作（測試+提交+合併）
```

### AI 輔助命令（20% 特殊場景）
```bash
make ai-fix                           # AI 自動修復問題
make ai-review                        # AI Code Review  
make ai-report                        # 查看效率報告
```

---

## 🎯 票券格式（整合版）

新架構將所有資訊整合到單一票券檔案中：

```yaml
# tickets/active/20250625_141005-feature-name.yml
spec:
  feature: OAuth2 Google 登入
  purpose: 讓使用者快速登入
  acceptance_criteria:
    - 支援 Google OAuth2
    - 顯示使用者資訊

dev_log:
  sessions:
    - session_id: 1
      activities: []
      
test_report:
  test_runs: []
  
ai_usage:
  interactions: []
  estimated_cost_usd: 0.0
```

**票券檔案是 Single Source of Truth，包含 spec、dev-log、test-report 所有資訊**

---

## 📊 AI 使用追蹤（Claude Code 適用）

### 記錄 AI 複雜度（不是 token）
```bash
# Claude Code 環境使用複雜度估算
AI_TASK="實作登入功能" AI_COMPLEXITY=complex make ai-save
```

複雜度等級：
- `simple`: 簡單查詢、小修改
- `medium`: 一般功能開發（預設）
- `complex`: 複雜功能、大重構
- `debug`: 除錯、問題解決

### 查看 AI 使用報告
```bash
make ai-report
```

---

## 🤖 AI 行為準則

### ✅ 應該做的
1. **開始前執行 `make ai-new`** - 創建整合式票券
2. **MVP 優先思維** - 先實作核心用戶價值，再完善基礎設施
3. **開發功能時同步撰寫測試** - TDD (Test-Driven Development) 優先
4. **定期執行 `make ai-save`** - 保存進度並記錄 AI 使用
5. **執行測試確保品質** - 單元測試和 E2E 測試都要通過
6. **完成後等待指示** - 不要自動執行 `make ai-done`
7. **記錄 AI 複雜度** - 透過環境變數傳遞
8. **所有 commit messages 必須使用英文** - 保持一致性和國際化

### ❌ 不應該做的
1. **自動 commit** - 除非用戶明確要求
2. **使用舊命令** - 如 dev-start、dev-commit 等
3. **創建冗長文件** - 保持極簡原則
4. **分散資訊到多個檔案** - 使用整合式票券
5. **過早優化** - 在驗證核心價值前避免過度工程化
6. **隨意創建新目錄** - 保持 docs/ 架構簡潔，優先使用現有文件
7. **開發到一半就自行 commit** - 必須等待用戶確認後才能 commit

---

## 📁 簡化後的專案結構

```
frontend/           # Next.js + TypeScript + Tailwind
backend/            # FastAPI + Python  
docs/
├── tickets/        
│   └── archive/    # 已完成的票券（平面結構）
├── handbook/       # 開發指南文件
│   ├── AI-QUICK-REFERENCE.md  # 實用開發模式
│   └── proposals/  # 提案和設計文件
└── *.md            # 項目級文檔（如 content-validation-report.md）
```

### 📁 檔案結構原則
- **保持極簡** - 不隨意創建新目錄
- **善用現有檔案** - 優先在現有文件中添加內容  
- **單一參考文件** - CLAUDE.md 為主要 AI 指南
- **避免文件碎片化** - 相關資訊集中管理
- **現有結構優先** - 新內容加入現有文件而非創建新目錄

---

## 🎯 開發範例

### 正確流程
```
User: "實作登入功能"
AI: "我來創建一個新的工作票券"
AI: [執行: make ai-new TYPE=feature TICKET=login]
AI: "票券已創建，開始開發並撰寫測試..."
AI: [建立測試檔案: src/components/auth/__tests__/LoginForm.test.tsx]
AI: [實作功能: src/components/auth/LoginForm.tsx]
AI: [執行: npm run test -- src/components/auth]
AI: [開發過程中: AI_TASK="實作登入含測試" AI_COMPLEXITY=medium make ai-save]
AI: "登入功能已完成，測試全部通過，包含以下變更..."
AI: [等待用戶指示]

User: "好，提交吧"
AI: [執行: make ai-done]
```

---

## 🧪 測試最佳實踐

### 測試原則
1. **TDD 優先**：先寫測試，再寫程式碼
2. **測試覆蓋率**：目標 70%+ 覆蓋率
3. **測試分離**：單元測試和 E2E 測試分開
4. **模擬外部依賴**：使用 mock 隔離測試

### 何時寫單元測試 vs E2E 測試
- **單元測試**：
  - API 路由邏輯
  - React 組件行為
  - 工具函數
  - 狀態管理邏輯
  
- **E2E 測試**：
  - 完整用戶流程（登入、註冊、購買等）
  - 跨頁面互動
  - 瀏覽器特定行為（cookies、localStorage）
  - 關鍵業務流程

### 測試檔案命名
- 單元測試：`ComponentName.test.tsx` 或 `functionName.test.ts`
- E2E 測試：`feature-name.spec.ts`

## 🎯 MVP 開發策略

### MVP 優先級順序
1. **核心用戶價值** - 先驗證產品假設
2. **基本功能完整性** - 確保主要流程可用
3. **品質保證** - 適度的測試覆蓋（70%+）
4. **基礎設施完善** - 等有實際需求再優化

### 避免過早優化
- ❌ 複雜的錯誤監控系統（用第三方服務）
- ❌ 過度的性能優化（等遇到瓶頸）
- ❌ 100% 測試覆蓋（聚焦關鍵路徑）
- ❌ 完美的基礎設施（漸進式改善）

### 技術債務管理
- 記錄但不立即修復的技術債務
- 當功能穩定後再重構優化
- 用戶反饋驅動的改善優先

## 💡 開發參考

### 文檔結構管理
- **CLAUDE.md** (本文件) - AI 行為準則與項目概覽
- **docs/handbook/** - 開發指南文件
  - `AI-QUICK-REFERENCE.md` - 實用開發模式與技巧
  - `proposals/` - 設計提案與架構文件
- **docs/tickets/** - 工作票券管理
  - `archive/` - 已完成的票券

### 文件管理原則
1. **不要破壞現有架構** - 保持 docs/ 和 docs/handbook/ 的目錄結構
2. **生成文件前先確認位置** - 檢查應該放在哪個現有目錄
3. **優先更新現有文件** - 而非創建新文件
4. **避免文件碎片化** - 相關內容集中在同一文件

### Git Commit 準則
1. **所有 commit messages 必須使用英文**
2. **遵循 conventional commits 格式**:
   - `feat:` 新功能
   - `fix:` 修復問題
   - `docs:` 文檔更新
   - `style:` 代碼格式（不影響功能）
   - `refactor:` 重構
   - `test:` 測試相關
   - `chore:` 維護性工作
3. **不要在開發過程中自行 commit** - 必須等待用戶確認
4. **AI 增強的 commit message 格式**:
   ```
   <type>: <subject>
   
   <body>
   
   🤖 AI Assistant: Claude Opus 4 (claude-opus-4-20250514)
   📊 Session context: ~<estimated_tokens> tokens (estimated)
   🎯 Task complexity: <simple|medium|complex|debug>
   📁 Files changed: <number>
   ```
   - 在 commit message 底部加入 AI 使用資訊
   - Token 估算基於對話長度和任務複雜度
   - 清楚標示任務複雜度等級

### Git 同步工作流程
**重要**：在執行 commit 前，必須先同步遠端變更以避免衝突

1. **Commit 前的標準流程**：
   ```bash
   # 1. 先檢查狀態
   git status
   
   # 2. 拉取並 rebase 最新變更
   git pull --rebase origin main
   
   # 3. 如果有衝突，提示用戶手動解決
   # 4. 確認無衝突後才進行 commit
   ```

2. **為什麼要這樣做**：
   - 避免本地與 CMS 編輯的內容產生衝突
   - 保持線性的 commit 歷史
   - 減少不必要的 merge commits

3. **執行順序**：
   - 當用戶要求 `commit` 時
   - 先執行 `git pull --rebase`
   - 成功後才執行 `git add` 和 `git commit`
   - 如果 pull 失敗，提示用戶需要手動解決衝突

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
- 多語言支援：9 種語言 (en, zh-TW, es, ja, ko, fr, de, ru, it)
- AI 素養能力視覺化：KSA (Knowledge, Skills, Attitudes) 映射
- 即時 AI 反饋：個人化評估與質性回饋
- CMS 內容管理：Git-based 版本控制、AI 輔助編輯、分支管理
- 學習進度追蹤：Google Cloud Storage 儲存用戶數據
- 統一抽象層架構：確保系統可擴展性

### 技術棧
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, react-i18next, Monaco Editor
- **Backend**: FastAPI, Python 3.x, Vertex AI SDK
- **AI Services**: Google Vertex AI (Gemini models), 規劃中: OpenAI
- **Storage**: Google Cloud Storage (用戶數據), GitHub (內容版本控制), Local Cache
- **Caching**: 多層快取系統 (memory + localStorage)
- **Deployment**: Google Cloud Run, Docker, GitHub Actions CI/CD
- **Testing**: Jest (80%+ 覆蓋率), React Testing Library, Playwright
- **CMS**: GitHub API 整合, YAML 處理, AI Quick Actions

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

#### Frontend Structure
- **Framework**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Internationalization**: react-i18next with 9 language support (en, zh-TW, es, ja, ko, fr, de, ru, it)
- **Key Pages**:
  - `/` - Home page
  - `/relations` - AI literacy competency visualization interface
  - `/pbl` - Problem-Based Learning scenario list
  - `/pbl/scenarios/[id]` - Scenario details with KSA mapping
  - `/pbl/scenarios/[id]/program/[programId]/tasks/[taskId]/learn` - Interactive learning with AI tutor
  - `/pbl/scenarios/[id]/program/[programId]/complete` - Completion page with AI feedback
- **API Routes**: 
  - `/api/relations` - Competency data with translations
  - `/api/pbl/scenarios` - PBL scenario management
  - `/api/pbl/chat` - AI tutor conversation
  - `/api/pbl/evaluate` - Task performance evaluation
  - `/api/pbl/generate-feedback` - Multi-language feedback generation

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
- **User Data**: Google Cloud Storage (`ai-square-db` bucket)
  - Program metadata, task logs, evaluations, completion data
  - Organized by user email and scenario
- **Translation System**: Suffix-based field naming (e.g., `description_zh`, `description_es`)
- **Domain Structure**: Engaging_with_AI, Creating_with_AI, Managing_with_AI, Designing_with_AI

#### Component Architecture
- **Client-side rendering** with useState/useEffect patterns
- **Accordion interfaces** for domain and competency exploration  
- **Responsive design** with mobile-specific overlays
- **Dynamic content loading** via API with language parameter

#### Abstraction Layer Architecture (`frontend/src/lib/abstractions/`)
- **BaseApiHandler**: Unified API route handling with caching, error handling, and i18n
- **BaseStorageService**: Abstracted storage interface supporting GCS and local storage
- **BaseAIService**: Unified AI service interface for multiple providers
- **BaseYAMLLoader**: YAML content loading with validation and caching
- **Implementations**: Concrete implementations in `/implementations` directory

### Key Implementation Details

#### Translation System
The app uses a dual translation approach:
1. **UI Labels**: react-i18next with JSON files in `public/locales/`
2. **Content Data**: YAML field suffixes processed by `getTranslatedField()` utility

#### YAML Data Processing
- Domains contain competencies with KSA code references
- API route dynamically resolves translations and builds KSA maps
- Competencies link to knowledge (K), skills (S), and attitudes (A) indicators

#### Styling Approach
- **Tailwind CSS** for utility-first styling
- **Gradient backgrounds** and **responsive design** patterns
- **Custom animations** with CSS-in-JS for mobile interactions

### Configuration Files
- `eslint.config.mjs` - Next.js + TypeScript ESLint setup
- `tailwind.config.js` - Tailwind CSS configuration  
- `next.config.ts` - Next.js configuration with i18n
- `next-i18next.config.js` - Internationalization setup
- `tsconfig.json` - TypeScript configuration

### 最近成就 (2025/07)
- ✅ **TypeScript 型別安全**: 消除所有生產代碼的 any 類型 (102 → 0)
- ✅ **測試覆蓋率**: 核心模組達到 80%+ 覆蓋率
- ✅ **CMS 系統增強**: 分支管理、現代化 UI/UX、AI Quick Actions
- ✅ **安全性更新**: Next.js 升級到 14.2.30

### 接下來的優先事項
1. **OAuth2 社交登入** (Google, GitHub) - 降低註冊門檻
2. **智能 Onboarding** - 解決「不知道從何開始」的痛點
3. **AI 資源使用追蹤** - Token 計算與成本控制
4. **PBL 修改歷程記錄** - 展示學習思考過程

### Project Context
AI Square 正處於從 MVP 轉向 SaaS 平台的關鍵階段。Phase 1 已完成基礎功能，現在專注於提升用戶體驗和平台智能化。

### 重要技術規範

#### Vertex AI Model Names
- **正確的模型名稱**: `gemini-2.5-flash` (不是 gemini-pro, 不是 gemini-2.0-flash-exp)
- **使用方式**: 
  ```typescript
  const model = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.5-flash',
    // ...
  });
  
  // 正確的 response 處理方式 (Vertex AI SDK)
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Default response';
  
  // 或者使用 chat.sendMessage
  const result = await chat.sendMessage(message);
  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Default response';
  ```

---

Note: This CLAUDE.md file must remain in the project root directory to be automatically read by Claude AI.