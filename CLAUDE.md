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
2. **定期執行 `make ai-save`** - 保存進度並記錄 AI 使用
3. **完成後等待指示** - 不要自動執行 `make ai-done`
4. **記錄 AI 複雜度** - 透過環境變數傳遞

### ❌ 不應該做的
1. **自動 commit** - 除非用戶明確要求
2. **使用舊命令** - 如 dev-start、dev-commit 等
3. **創建冗長文件** - 保持極簡原則
4. **分散資訊到多個檔案** - 使用整合式票券

---

## 📁 簡化後的專案結構

```
frontend/           # Next.js + TypeScript + Tailwind
backend/            # FastAPI + Python  
docs/
├── tickets/        
│   ├── active/     # 進行中的票券（整合式 YAML）
│   └── archive/    # 已完成的票券（平面結構）
├── handbook/       # AI-QUICK-REFERENCE.md（單一參考文件）
├── scripts/        # 13 個核心自動化工具
├── reports/        # 每日/週報
└── stories/        # 開發故事與經驗
```

---

## 🎯 開發範例

### 正確流程
```
User: "實作登入功能"
AI: "我來創建一個新的工作票券"
AI: [執行: make ai-new TYPE=feature TICKET=login]
AI: "票券已創建，請先編輯 spec 部分..."
AI: [開發過程中: AI_TASK="實作登入" AI_COMPLEXITY=medium make ai-save]
AI: "登入功能已完成，包含以下變更..."
AI: [等待用戶指示]

User: "好，提交吧"
AI: [執行: make ai-done]
```

---

## 💡 快速參考

查看 `docs/handbook/AI-QUICK-REFERENCE.md` 獲取：
- 常用程式碼模式
- API 結構
- 測試命令
- Git commit 格式

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