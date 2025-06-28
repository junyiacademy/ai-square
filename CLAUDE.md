# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### ❌ 不應該做的
1. **自動 commit** - 除非用戶明確要求
2. **使用舊命令** - 如 dev-start、dev-commit 等
3. **創建冗長文件** - 保持極簡原則
4. **分散資訊到多個檔案** - 使用整合式票券
5. **過早優化** - 在驗證核心價值前避免過度工程化
6. **隨意創建新目錄** - 保持 docs/ 架構簡潔，優先使用現有文件

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

### 文檔結構
- **CLAUDE.md** (本文件) - AI 行為準則與項目概覽
- **docs/handbook/AI-QUICK-REFERENCE.md** - 實用開發模式與技巧
- **docs/handbook/proposals/** - 設計提案與架構文件

包含內容：
- 常用程式碼模式
- API 結構  
- 測試命令
- Git commit 格式
- MVP 策略指導
- 高效 AI 協作技巧

---

## 項目資訊

### Project Overview

AI Square is a multi-agent learning platform for AI literacy education. The project is a monorepo with a Next.js frontend and Python FastAPI backend, designed to be deployed on Google Cloud Platform.

**Key Features:**
- Multilingual AI literacy competency visualization (9 languages supported)
- Interactive accordion-based competency explorer with Knowledge, Skills, and Attitudes (KSA) mapping
- YAML-based content management for educational rubrics
- Internationalization with dynamic language switching

### 技術棧
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, react-i18next
- **Backend**: FastAPI, Python 3.x
- **Data**: YAML 檔案管理內容
- **部署**: Google Cloud Run, Docker

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
  - `/` - Home page with Tailwind CSS demo
  - `/relations` - Main competency visualization interface
- **API Routes**: `/api/relations` - Serves YAML data with language-specific translations

#### Backend Structure  
- **Framework**: FastAPI with Python 3.x
- **Key Dependencies**: Google Cloud AI Platform, Generative AI, OpenAI, YAML processing
- **Purpose**: Handles AI/LLM integrations and data processing

#### Data Architecture
- **Content Management**: YAML files in `frontend/public/rubrics_data/`
  - `ai_lit_domains.yaml` - Four core AI literacy domains with competencies
  - `ksa_codes.yaml` - Knowledge, Skills, Attitudes reference codes
- **Translation System**: Suffix-based field naming (e.g., `description_zh`, `description_es`)
- **Domain Structure**: Engaging_with_AI, Creating_with_AI, Managing_with_AI, Designing_with_AI

#### Component Architecture
- **Client-side rendering** with useState/useEffect patterns
- **Accordion interfaces** for domain and competency exploration  
- **Responsive design** with mobile-specific overlays
- **Dynamic content loading** via API with language parameter

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

### Project Context
This is Phase 1 of a 6-phase roadmap to build a comprehensive AI learning platform. Current focus is on authentication, internationalization, and basic practice functionality with Google Gemini API integration planned.

Note: This CLAUDE.md file must remain in the project root directory to be automatically read by Claude AI.