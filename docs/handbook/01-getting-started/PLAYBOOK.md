# AI Square Development Playbook

這是 AI Square 專案的開發指南，整合了 AI 協作模式、開發標準和專案知識庫。

## 📚 目錄

1. [專案概述](#專案概述)
2. [快速開始](#快速開始)
3. [AI 協作模式](#ai-協作模式)
4. [開發流程](#開發流程)
5. [時間追蹤系統](#時間追蹤系統)
6. [文檔架構](#文檔架構)
7. [品質標準](#品質標準)

## 專案概述

AI Square 是一個多智能體學習平台，目標是提升全球用戶的 AI 素養能力。

### 技術架構
- **前端**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **後端**: FastAPI + Python (規劃中)
- **部署**: Google Cloud Platform
- **AI 整合**: Google Gemini, OpenAI (規劃中)

### 專案階段
- Phase 1: 基礎平台與認證 ✅ (進行中)
- Phase 2: 智能練習系統
- Phase 3: AI 輔助學習
- Phase 4: 知識圖譜
- Phase 5-6: 企業版與外掛市集

## 快速開始

### 開發環境設置
```bash
# 前端開發
make frontend          # 啟動開發伺服器
make build-frontend    # 建置生產版本

# AI 協作開發
make dev-start         # 開始新功能開發
make dev-continue      # 繼續開發
make commit-smart      # 智能提交（推薦）
```

### 重要說明
- **CLAUDE.md 必須在根目錄** - Claude AI 會自動讀取
- **所有開發文檔在 docs/** - 包括本檔案

### 關鍵檔案
- `/CLAUDE.md` - AI 專案知識（根目錄）
- `docs/PLAYBOOK.md` - 本檔案，開發指南
- `docs/dev-logs/` - 開發日誌（功能/Bug/重構）
- `docs/decisions/` - 架構決策記錄
- `docs/handbook/guides/` - 技術指南（BDD、TDD、新人導覽）
- `docs/stories/` - 真實開發案例

## AI 協作模式

### 🎯 Quick Task (< 30分鐘)
```markdown
## Context
[1-2句話描述背景]

## Goal
[明確的產出目標]

## Constraints
[技術限制或要求]
```

### 📋 Feature Task (> 2小時)
```markdown
## Epic
[關聯的 Epic]

## User Story
作為 [角色]
我想要 [功能]
以便於 [價值]

## Acceptance Criteria
- [ ] 標準1
- [ ] 標準2

## Technical Approach
[技術實現方案]
```

### 🏗️ Architecture Task
```markdown
## Problem
[需要解決的架構問題]

## Decision
[採用的方案]

## Consequences
[影響和權衡]
```

## 開發流程

### 1️⃣ 快速模式 (Prototype)
```bash
make quick-dev FEATURE=feature-name
```
- 跳過部分檢查
- 適用於概念驗證
- 最小文檔要求

### 2️⃣ 標準模式 (Standard)
```bash
make dev-start
```
- 完整 TDD 流程
- 標準文檔要求
- 適用於一般功能

### 3️⃣ 嚴格模式 (Strict)
```bash
make strict-dev EPIC=epic-name
```
- 強化品質檢查
- 完整文檔要求
- 適用於核心功能

## 時間追蹤系統

### 開發日誌格式
```yaml
# docs/dev-logs/YYYY-MM-DD-{type}-{name}.yml
type: feature/bug/refactor/docs/test
title: 標題
date: 2025-06-22
developer: Human/AI
status: completed

timeline:
  - phase: 分析
    duration: 15
    ai_time: 5
    human_time: 10
    
  - phase: 設計
    duration: 30
    ai_time: 20
    human_time: 10
    
  - phase: 實作
    duration: 45
    ai_time: 40
    human_time: 5
    
  - phase: 測試
    duration: 10
    ai_time: 8
    human_time: 2

metrics:
  total_time: 100
  ai_percentage: 73
  human_percentage: 27
  lines_of_code: 150
  test_coverage: 95
  
cost_estimation:
  ai_cost: 0.50  # USD
  human_cost: 50.00  # USD (假設 $50/hour)
  total_cost: 50.50

deliverables:
  - type: code
    files: [src/components/NewFeature.tsx]
  - type: test
    files: [__tests__/NewFeature.test.tsx]
  - type: doc
    files: [docs/features/new-feature.md]

learnings:
  - AI 擅長快速生成樣板程式碼
  - 人類在架構決策上更有優勢
  - 配對編程模式效率最高
```

### 成本計算公式
```javascript
// AI 成本（基於 token 使用）
ai_cost = (input_tokens * 0.01 + output_tokens * 0.03) / 1000

// 人類成本（基於時薪）
human_cost = human_hours * hourly_rate

// ROI 計算
productivity_gain = (traditional_time - actual_time) / traditional_time * 100
```

## 文檔架構

### 文檔結構
```
/                      # 根目錄
├── CLAUDE.md         # AI 專案知識（必須在根目錄）
├── README.md         # 專案簡介
└── docs/             # 所有開發文檔
    ├── PLAYBOOK.md   # 開發指南（本檔案）
    ├── CHANGELOG.md  # 版本記錄
    ├── quick-reference.md # 快速參考卡
    ├── dev-logs/     # 開發日誌（功能/Bug/重構）
    ├── decisions/    # 架構決策記錄 (ADR)
    ├── scripts/      # 開發自動化腳本
    ├── handbook/     # 📚 開發者手冊
    │   ├── core-practices/   # 核心開發實踐
    │   ├── design-patterns/  # 設計模式
    │   ├── product/          # 產品規格與願景
    │   ├── guides/           # 操作指南
    │   └── improvements/     # 🔧 改進建議（自動生成）
    └── stories/      # 📖 開發故事（真實案例）
        ├── features/             # 功能開發故事
        ├── debugging/            # 問題解決故事
        ├── refactoring/          # 重構案例
        └── collaboration-insights/ # 人機協作洞察
```

### 核心架構決策 (ADR)
- **ADR-001**: AI-First 開發模式
- **ADR-002**: 測試策略與覆蓋率標準
- **ADR-003**: 需求變更管理流程
- **ADR-004**: 前端架構標準

### 文檔層級
- **L0**: README + PLAYBOOK (最小可行)
- **L1**: + 架構決策 (加入關鍵決策)
- **L2**: + 功能記錄 (加入開發歷程)
- **L3**: + 教學文件 (完整文檔)

## 品質標準

### 核心開發原則
```
✅ 一個完整的開發 = 文件 + 功能 + 測試 + 日誌 + 通過驗證
```

### TDD 開發流程
1. **🔴 紅燈**: 先寫失敗的測試
2. **🟢 綠燈**: 實作最小功能讓測試通過
3. **🔵 重構**: 優化代碼品質和結構
4. **📚 文檔**: 同步更新相關文檔

### 測試策略（基於 ADR-002）
- **單元測試**: 70-80% (Jest + React Testing Library)
- **整合測試**: 15-25% (Supertest)
- **E2E 測試**: 5-10% (Playwright)
- **覆蓋率目標**: ≥ 80% (核心功能 95%)

### 前端開發標準（基於 ADR-004）
- **組件分層**: UI → Features → Layouts
- **狀態管理**: Local → Complex → Global
- **效能優化**: Memo → Callback → Code Splitting
- **錯誤處理**: Error Boundary + Async Handling

### 提交檢查清單
```bash
✅ 功能完成且通過驗收標準
✅ 測試覆蓋率 ≥ 80% (核心功能 95%)
✅ TypeScript 編譯無錯誤
✅ ESLint 檢查通過
✅ 建置成功
✅ 開發日誌已更新 (YAML格式)
✅ 多語言支援完整
✅ 響應式設計適配
```

### 🤖 自動反思與改進
每次 `make commit-smart` 會自動：
1. **分析問題** - 檢查開發日誌中的問題
2. **識別模式** - 發現重複出現的問題
3. **生成建議** - 創建改進文檔
4. **產生故事** - 將重要洞察寫成故事

手動執行：
```bash
make reflect  # 執行反思分析
make improve  # 應用改進建議
```

### 程式碼品質指標
- 測試覆蓋率: ≥ 80%
- 建置成功率: 100%
- TypeScript 嚴格模式: 啟用
- 無 console.log 或 TODO
- 錯誤處理機制完善

## 資料分析與報告

### 月度報告模板
```markdown
# AI Square 開發報告 - YYYY年MM月

## 開發統計
- 完成功能數: X
- 總開發時間: Y 小時
- AI 貢獻比例: Z%
- 成本節省: $W

## 效率分析
- 平均功能開發時間: X 小時
- AI 加速比: Y 倍
- 最高效率功能類型: [類型]

## 學習與改進
- [關鍵學習1]
- [關鍵學習2]

## 下月計劃
- [計劃項目1]
- [計劃項目2]
```

---

## 🚀 持續更新

本 Playbook 會隨著專案發展持續更新。最新版本請查看 Git 記錄。

最後更新: 2025-06-22