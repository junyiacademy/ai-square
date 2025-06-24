# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 核心原則：所有開發必須走票券流程

### 三階段開發流程

```
1. 啟動 Ticket → 2. 進入開發 → 3. Commit 流程
```

---

## 📋 第一階段：啟動 Ticket

### 強制開票規則
**任何程式碼變更都必須有對應的 ticket**（除了純粹的檔案閱讀或分析）

### 開票指令
```bash
make dev-ticket TICKET=descriptive-name TYPE=feature [DESC="描述"]
# TYPE: feature|bug|refactor|hotfix
```

### 票券檔案結構
```
tickets/in_progress/
└── {date}-{time}-ticket-{name}.yml   # 單一 YAML 檔案包含：
    - 票券基本資訊（id, name, type, status）
    - spec 內容（goals, technical_specs, acceptance_criteria）
    - document_references（參考的 handbook 文件）
    - 其他元資料（timestamps, commit_hash 等）
```

### Ticket 類型模板

#### Feature（新功能）
- 明確的功能規格和驗收標準
- 使用者故事（User Story）
- 技術設計
- 測試場景

#### Bug（錯誤修復）
- 問題描述和重現步驟
- 根本原因分析
- 修復方案
- 回歸測試計畫

#### Refactor（重構）
- 重構目標和範圍
- 風險評估
- 效能基準比較
- 相容性檢查

#### Hotfix（緊急修復）
- 影響評估
- 快速修復方案
- 後續改進計畫

---

## 💻 第二階段：進入開發

### 開發前必讀
開始編碼前，**必須**查閱：
1. **產品願景**：`docs/handbook/01-context/product-vision.md` - 理解專案目標
2. **業務規則**：`docs/handbook/01-context/business-rules.md` - 必須遵守的規則
3. **領域知識**：`docs/handbook/01-context/domain-knowledge.md` - AI 素養概念
4. **相關指南**：`docs/handbook/02-development-guides/` - 開發規範

### 持續檢查機制
```bash
make check        # 檢查當前 ticket 狀態和文件完整性
make checkpoint   # 保存開發進度（自動記錄到 dev log）
```

### 開發階段必須記錄
1. **每個工作階段一個 dev log**
   - 開始時間、結束時間
   - 完成的工作
   - 遇到的問題
   - 下一步計畫
   - **參考的文件**（見下方說明）

2. **Pair Programming 記錄**
   - 與 AI 的重要決策討論
   - 技術選擇的理由
   - 問題解決過程

3. **Request Change 處理**
   ```bash
   make change-request DESC="新需求描述"
   # 自動更新 spec.md 並記錄變更歷史
   ```

4. **文件參考追蹤**（🔴 必須執行！）
   
   **AI 在開發時必須記錄參考了哪些 handbook 文件，以便統計使用率：**
   
   #### 何時記錄：
   - **票券創建時**：查閱的工作流程指南
   - **設計功能時**：參考的業務規則、領域知識
   - **編寫測試時**：查閱的測試策略、TDD 原則
   - **解決問題時**：參考的技術指南、設計模式
   - **重構代碼時**：查閱的最佳實踐
   
   #### 記錄方式：
   ```yaml
   # 在 dev-logs/*.yml 中添加：
   document_references:
     consulted_documents:
       - path: docs/handbook/01-context/business-rules.md
         reason: 確保支援 9 種語言的規則
       - path: docs/handbook/03-technical-references/core-practices/tdd.md
         reason: 應用 TDD 原則設計測試
   ```
   
   #### 統計分析：
   ```bash
   make doc-usage-report  # 生成文件使用統計報告
   ```

### Checkpoint 機制
- 每完成一個小功能就 checkpoint
- 遇到困難時 checkpoint 保存現場
- 切換任務前必須 checkpoint

---

## 🔒 第三階段：Commit 流程

### 統一入口（禁止直接使用 git 命令）
```bash
make commit-smart # 智能提交（自動生成 message）
make test-all     # 執行測試並生成報告
make merge-ticket TICKET=xxx  # 完成 ticket 並合併到 main
```

### Pre-commit 檢查清單
- [ ] Ticket 狀態有效
- [ ] 功能規格滿足
- [ ] 測試報告完整
- [ ] Dev log 時間結算
- [ ] Changelog 準備更新

### 智能 Commit Message 生成
系統會基於：
- Ticket 類型和描述
- 變更的檔案
- Dev log 內容
自動生成符合 conventional commits 的訊息

### Post-commit 自動處理
- 更新 commit hash 到相關文件
- 結算實際開發時間
- 更新 changelog（如果是 feat/fix/perf）

### 回滾機制
```bash
make rollback     # 回滾最後一次 commit
make rollback COMMIT=abc123  # 回滾到指定 commit
```

---

## 🚨 緊急處理流程

當需要處理 hotfix 時：
```bash
make pause-ticket      # 暫停當前工作
make dev-ticket TYPE=hotfix TICKET=urgent-fix
# ... 修復問題 ...
make merge-ticket TICKET=urgent-fix
make resume-ticket TICKET=原票券名  # 恢復之前的工作
```

---

## 🚫 AI 行為限制

### 絕對禁止
1. **自動 commit**：完成工作後只報告，不要 commit
2. **直接 git 命令**：所有操作必須透過 make
3. **跳過測試**：除非明確要求，否則必須通過測試

### 必須執行
1. **開票檢查**：任何檔案操作前先檢查 in_progress ticket
2. **規則查閱**：開發前必讀 `handbook/01-context/business-rules.md`
3. **進度記錄**：定期 checkpoint 保存進度
4. **測試優先**：commit 前必須執行測試
5. **文件追蹤**：記錄所有參考的 handbook 文件

---

## 📁 簡化的目錄結構

```
docs/
├── tickets/          # 所有票據（含 spec 內容）
│   ├── in_progress/  # 正在進行的
│   └── completed/    # 已完成的（按年月日歸檔）
├── dev-logs/         # 開發日誌（從 tickets 提取）
├── test-reports/     # 測試報告（從 tickets 提取）
├── decisions/        # ADR 決策記錄
├── handbook/         # 開發手冊（包含完整 workflow）
├── scripts/          # 自動化腳本
└── stories/          # 使用者故事和場景
```

---

## 🎯 簡化的命令集

### 核心命令（90% 使用場景）
```bash
make start TYPE=feature TICKET=name   # 開始新工作
make check                            # 檢查狀態
make checkpoint                       # 保存進度
make test                            # 執行測試
make commit                          # 智能提交
make done                            # 完成工作
```

### 輔助命令
```bash
make pause/resume                    # 暫停/恢復
make change-request                  # 需求變更
make rollback                        # 回滾
make status                          # 查看所有 tickets
```

---

## 🤖 AI 助手正確行為範例

### ✅ 正確
```
User: "實作登入功能"
AI: "這需要開發票券，讓我創建一個 feature ticket"
AI: [執行: make start TYPE=feature TICKET=login-implementation]
AI: "已創建票券和相關文件，現在開始實作..."
AI: [開發過程中定期 checkpoint]
AI: "登入功能已完成，包含以下變更..."
AI: [等待用戶指示]

User: "commit"
AI: [執行: make commit]
```

### ❌ 錯誤
```
User: "實作登入功能"
AI: [直接開始寫程式碼] ❌
AI: [完成後自動 commit] ❌
```

---

## 項目資訊

### Project Overview

AI Square is a multi-agent learning platform for AI literacy education. The project is a monorepo with a Next.js frontend and Python FastAPI backend, designed to be deployed on Google Cloud Platform.

**Key Features:**
- Multilingual AI literacy competency visualization (9 languages supported)
- Interactive accordion-based competency explorer with Knowledge, Skills, and Attitudes (KSA) mapping
- YAML-based content management for educational rubrics
- Internationalization with dynamic language switching

### Development Commands

#### Frontend (Next.js)
```bash
# Development server
cd frontend && npm run dev

# Build production
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# Run tests
cd frontend && npm run test
# or CI mode (no watch)
cd frontend && npm run test:ci

# Type checking
cd frontend && npm run typecheck
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