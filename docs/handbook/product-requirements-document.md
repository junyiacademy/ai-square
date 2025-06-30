# AI Square 產品需求文檔 (PRD)

## 1. 專案概述

### 🚀 當前開發狀態 (2025/01)
- ✅ **Phase 1 完成**: 專業級 CMS 系統已上線，具備 AI 輔助編輯功能
- 🚀 **Phase 2 進行中**: SaaS 學習平台開發中，PBL 情境系統建設中
- 📋 **Phase 3 規劃中**: Agent 系統與動態內容生成 (2025/07-12)
- 🔮 **Phase 4 願景**: 完全個人化學習體驗 (2026+)

### 1.1 產品願景
AI Square 是一個 Git-Based 學習平台，核心目標是使用 GitHub 作為唯一內容來源，從文字檔中維護教材、講義、練習題、評量規準等資源，並逐步擴充成一套完整的 AI 輔助學習平台。

平台採用分層架構設計：
1. **Content File Layer（內容層）**：用 Git 管理教材與題目等結構化文字檔
2. **CMS Service Layer（服務層）**：將文字檔解析為 API 並提供可編輯的後台  
3. **SaaS App Layer（應用層）**：面對使用者的學習服務（前端UI + 後端API）
4. **MCP/Agent Layer（智能層）**：統一的 AI Agent 管理與協調（Phase 3+）

目前 MVP 目標：使用 GitHub Pages 作為內容來源，SaaS 直接讀取並渲染。未來將逐步加入 CMS 服務層和 MCP 智能層。

### 1.2 目標用戶
- **主要用戶**：希望提升 AI 素養的個人學習者
- **次要用戶**：教育機構、企業培訓部門
- **潛在用戶**：AI 教育內容創作者、專業培訓師

### 1.3 核心價值主張
1. **智能化學習路徑**：基於 AI 的個性化學習推薦
2. **實時 AI 輔導**：24/7 AI 助教提供即時反饋
3. **開放式學習**：支援標準化題目與開放式問答
4. **多語言支持**：覆蓋 9 種主要語言
5. **企業級解決方案**：可擴展的插件化架構

### 1.4 市場洞察 (Market Insights)

#### 1.4.1 線上學習的核心痛點
1. **孤獨感與缺乏動力**
   - 線上學習最大問題是「孤獨」和「沒動力」
   - 缺乏同儕壓力和支持，容易放棄
   - 需要社交元素來維持學習動機

2. **Discord 學習社群現象**
   - Discord 學習群組非常活躍，顯示學習者渴望社群連結
   - 但缺乏結構化引導，多為鬆散討論
   - 機會：結合社群活力與結構化學習

3. **Study With Me 趨勢**
   - Study with me 直播/影片廣受歡迎
   - 虛擬陪伴能顯著提升專注力
   - 不需要真實互動，只要「有人在」的感覺

#### 1.4.2 AI 學習工具使用現況
1. **工具使用門檻**
   - 多數人知道 ChatGPT，但不知道怎麼用得好
   - 缺乏系統性的 AI 工具使用教學
   - 需要場景化、任務導向的學習方式

2. **企業培訓需求**
   - 企業急需提升員工 AI 素養
   - 但缺乏結構化的培訓方案
   - B2B 市場潛力大

#### 1.4.3 產品機會
1. **社交學習功能**
   - 影子同學（AI 生成的虛擬同學）
   - 匿名進度分享
   - 共學房間機制

2. **結構化 AI 技能培訓**
   - PBL 情境學習取代零散教學
   - 從任務中學習，而非學習後應用
   - 即時回饋與個人化調整

3. **企業解決方案**
   - 團隊學習追蹤
   - 客製化培訓內容
   - ROI 可量化（AI 使用效率提升）

### 1.5 產品定位與價值

#### 1.5.1 核心問題與解決方案
1. **解決真實痛點**
   - **Onboarding 痛點**：不知道從何開始 → **智能櫃檯**：隨時接待的個人化引導
   - **PBL 痛點**：制式課程無聊 → **客製化教室**：固定目標但彈性體驗
   - **Social 痛點**：線上學習太孤獨 → **學習社群**：共學、競爭、分享

2. **技術可行性**
   - 不需要 AGI，規則 + LLM 即可實現
   - 漸進式開發，快速驗證市場反應
   - 基於現有技術棧，降低開發風險

3. **商業價值**
   - 提高完成率 = 提高付費轉換
   - 個人化體驗 = 差異化競爭優勢
   - 社交功能 = 自然傳播與用戶留存

#### 1.5.2 產品體驗設計

**智能 Onboarding - 隨時接待的櫃檯**
- 不是冰冷的註冊表單，而是溫暖的對話
- 理解用戶需求，推薦個人化學習路徑
- 持續關懷，不是一次性的歡迎

**PBL 道場 - 客製化教室**
- 固定的學習目標和方向
- 彈性的學習體驗和節奏
- 動態難度調整，保持挑戰性
- 像遊戲關卡，可重複挑戰

**社交學習 - 團體模式**
- 可以看到別人的成就和進度
- 可以分享自己的解法和心得
- 可以從別人的錯誤中學習
- 健康的競爭激發動力

#### 1.5.3 長期願景：終身學習母校

**不只是學校，更是母校**
- 學習者可以隨時回來
- 帶著真實世界的問題尋求幫助
- 平台提供工具和訓練環境

**未來可能性**（Phase 4+）
- 隨問隨答的 AI 導師
- 即時生成的客製化教材
- 基於真實案例的學習內容
- 校友網絡與經驗分享

**實現路徑**
- ✅ Phase 1: CMS 基礎建設 + AI 輔助編輯 (已完成 2025/01)
- 🚀 Phase 2: SaaS 學習平台 + PBL 情境系統 (進行中 2025/01-06)
- 📋 Phase 3: Agent 系統 + 動態內容生成 (2025/07-12)  
- 🔮 Phase 4: 完全個人化學習體驗 + 知識圖譜 (2026+)

#### 1.5.4 設計原則

1. **以人為本，不炫技**
   - Agent 不是為了展示 AI 技術
   - 而是真正改善學習體驗
   - 技術服務於教育目標

2. **漸進式創新**
   - 從簡單可行的功能開始
   - 根據用戶反饋迭代
   - 保持產品的穩定性

3. **價值導向**
   - 每個功能都要解決具體問題
   - 可量化的學習成效
   - 明確的投資回報

## 2. 產品架構

### 2.1 系統架構設計
```
┌─────────────────────────────────────────────────────────┐
│                  SaaS App Layer                          │
│         (Next.js Frontend + FastAPI Backend)             │
│  • 學習平台 UI  • 用戶認證  • 學習進度  • 評估介面     │
├─────────────────────────────────────────────────────────┤
│           MCP / Agent Layer (Phase 3+)                   │
│      (Model Context Protocol + Agent系統)               │
│  • Agent註冊  • 上下文管理  • 協調器  • LLM路由        │
├─────────────────────────────────────────────────────────┤
│              Content Service Layer (CMS)                 │
│                  (FastAPI + Git)                         │
│  • Content API  • YAML/JSON 解析  • 版本控制  • 編輯器  │
├─────────────────────────────────────────────────────────┤
│               Content File Layer                         │
│              (GitHub Repository)                         │
│  • 教材 YAML  • 題庫 JSON  • Rubrics  • GitHub Pages   │
└─────────────────────────────────────────────────────────┘

現況（Phase 1-2）：CMS 完成，SaaS 開發中
未來（Phase 3+）：透過 MCP Layer 統一管理
```

### 2.2 資料流架構
#### 2.2.1 當前階段（Phase 1-2）
```
✅ CMS Layer: 內容編輯者 → CMS Web App → GitHub API → GitHub Repo
                             ↓
                       AI 輔助編輯 (Vertex AI)

🚀 SaaS Layer: 學習者 → SaaS Frontend → SaaS Backend → GitHub Pages
                          ↓                ↓              ├── tree.json  
                    Local Storage    Direct LLM Call     ├── quizzes/*.json
                                     (Vertex AI)         └── rubrics/*.yml
```

#### 2.2.2 目標架構（Phase 3+）
```
使用者 → SaaS Frontend → SaaS Backend → MCP Layer → Multi-Agent
           ↓                ↓              ↓            ├── Tutor Agent
      IndexedDB        User API      Content API       ├── Evaluator Agent
                           ↓              ↓            └── Content Agent
                    PostgreSQL      Redis Cache
```

### 2.3 技術棧

#### 2.3.1 SaaS App 層
- **前端**：
  - Framework: Next.js 15 + TypeScript
  - UI: Tailwind CSS + Radix UI
  - 狀態管理: Zustand + React Query
  - 視覺化: D3.js + Recharts
  - 離線支援: IndexedDB + Service Worker
- **後端**：
  - User API: Python FastAPI (backend/)
  - 認證: JWT + Local Storage (Phase 1)
  - 即時通訊: WebSocket (PBL 功能)

#### 2.3.2 MCP/Agent 層 (Phase 3+)
- **協議**: Model Context Protocol
- **框架**: LangChain + Custom Agent Framework
- **模型整合**: 
  - Google Vertex AI (現況)
  - OpenAI GPT-4
  - Anthropic Claude
- **上下文儲存**: Vector DB (Phase 4+)

#### 2.3.3 CMS 層
- **前端**: Next.js 15 + TypeScript
- **編輯器**: Monaco Editor + React Resizable Panels
- **AI 整合**: Google Vertex AI (Gemini)
- **API**: GitHub API (Octokit) + RESTful endpoints
- **內容格式**: YAML/JSON + JSON Schema 驗證
- **版本控制**: Git + 自動化分支管理
- **部署**: 無狀態設計 (Cloud Run ready)

#### 2.3.4 資料儲存演進
- **Phase 1**: Local Storage + GitHub Pages
- **Phase 2**: +GCS (學習記錄) + Redis (快取)
- **Phase 3**: +PostgreSQL (主資料庫)
- **Phase 4**: +Neo4j (知識圖譜) + Vector DB

#### 2.3.5 測試架構
- **單元測試**: Jest + React Testing Library
  - 測試覆蓋率目標: 70%+
  - API 端點測試
  - React 組件測試
  - 工具函數測試
- **端到端測試**: Playwright
  - 跨瀏覽器測試 (Chromium, Firefox, WebKit)
  - 關鍵用戶流程測試
  - 視覺迴歸測試
- **測試策略**:
  - TDD (Test-Driven Development) 為主
  - 每個 PR 必須包含相關測試
  - CI/CD 自動執行測試
  - 測試檔案位置:
    - 單元測試: `__tests__` 資料夾
    - E2E 測試: `e2e` 資料夾

#### 2.3.6 部署架構
- **容器化**: Docker + Docker Compose
- **雲端平台**: Google Cloud Platform
  - Cloud Run (應用部署)
  - Cloud Storage (檔案儲存)
  - Vertex AI (LLM 服務)
- **CDN**: GitHub Pages + Cloudflare (Phase 2+)

## 3. 功能模組詳細說明

### 3.0 CMS 開發現狀總覽

#### 3.0.1 已完成功能 (✅)
**核心編輯功能**
- 三欄式 CMS 介面 (檔案樹、Monaco 編輯器、AI 助手)
- YAML/JSON 語法高亮與驗證
- 可調整與收合的面板設計
- GitHub-based 檔案管理 (讀取、編寫、列表)

**AI 輔助編輯**
- Google Vertex AI (Gemini-2.5-flash) 整合
- 四種 Quick Actions：補完、翻譯、改進、KSA 對應
- JSON Schema 模式輸出 (結構化生成)
- YAML 鍵值順序維護
- KSA 碼自動載入與對應

**Git 工作流程自動化**
- 統一的儲存與 PR 創建流程
- AI 生成的 commit 訊息 (詳細的中文描述)
- AI 生成的 PR 描述 (分析所有 commits)
- 自動化 PR 標籤管理 (cms-content-change)
- 分支狀態管理 (cookie-based，支援 Cloud Run)

**分支管理系統**
- 視覺化分支管理頁面
- PR 狀態追蹤與篩選
- 檔案差異檢視器 (紅綠高亮)
- Commit 歷史顯示
- 一鍵合併功能 (包含檔案審核流程)
- 分支切換與繼續編輯

**使用者體驗**
- 處理進度彈窗 (顯示 AI 生成內容)
- 成功/錯誤通知系統
- 響應式設計與現代化 UI
- 鍵盤快捷鍵支援

#### 3.0.2 技術架構特色
- **無狀態設計**: 支援 Google Cloud Run 部署
- **GitHub 唯一數據源**: 所有內容儲存在 GitHub repository
- **AI-First 工作流程**: 每個操作都有 AI 輔助
- **專業級編輯體驗**: VS Code 等級的編輯器整合

#### 3.0.3 下一階段規劃 (Phase 2)
- 權限管理與多用戶協作
- 內容發布到 GitHub Pages
- 自動化測試與驗證
- 性能優化與快取機制
- 更多 AI 模型整合 (OpenAI, Anthropic)

#### 3.0.4 相關文檔
- **開發指南**: `/cms/README.md` - CMS 系統架構與使用說明
- **API 文檔**: 各個 API endpoint 在 `/cms/src/app/api/` 目錄
- **組件文檔**: React 組件說明在 `/cms/src/components/cms/`
- **AI 整合**: Vertex AI 使用方式請參考 `/cms/src/lib/vertex-ai.ts`

### 3.1 用戶入門模組 (Onboarding)

#### 3.1.1 功能描述
為新用戶提供流暢的註冊和初始化體驗，包括能力評估和個性化設置。

#### 3.1.2 主要功能
- **多方式註冊**
  - ✅ Email/密碼註冊（本地認證）
  - ❌ 社交媒體登錄（Google OAuth2）（待開發）
  - ❌ GitHub 登錄（待開發）
  - ❌ 企業 SSO 整合（待開發）
  
- **AI 素養評估**
  - ✅ 初始能力測試（25 題）
  - ✅ 四大領域評估：Engaging, Creating, Managing, Designing with AI
  - ✅ 即時生成能力雷達圖
  
- **個性化設置**
  - ❌ 學習目標設定（待開發）
  - ❌ 時間安排偏好（待開發）
  - ✅ 語言選擇（9 種預設語言）
  - ❌ 自定義語言支援（LLM 即時翻譯）（待開發）
  - ❌ 學習風格選擇（待開發）

#### 3.1.3 用戶流程
```
註冊 → 驗證 → 能力評估 → 個性化設置 → 進入學習平台
```

### 3.2 內容管理系統 (CMS)

#### 3.2.1 功能描述
基於 Git 的內容管理系統，將所有學習內容以文字檔形式儲存在 GitHub，並透過 API 服務層提供結構化存取。

#### 3.2.2 主要功能
- **Git-Based 內容管理**
  - ✅ 所有內容用 YAML/JSON 純文字檔管理
  - ✅ GitHub 作為唯一事實來源 (Single Source of Truth)
  - ✅ PR 機制進行內容審查
  - ✅ GitHub Actions 自動發布到 GitHub Pages
  - ✅ 自動化 PR 標籤管理 (cms-content-change)
  
- **Web-Based 編輯器**
  - ✅ Monaco Editor 整合 (VS Code 等級的編輯體驗)
  - ✅ YAML 語法高亮與自動完成
  - ✅ 即時預覽與驗證
  - ✅ 三欄式介面 (檔案樹、編輯器、AI 助手)
  - ✅ 可調整的面板大小與收合功能
  
- **AI 輔助編輯**
  - ✅ Google Vertex AI (Gemini) 整合
  - ✅ 智能內容補完 (Quick Action: 補完)
  - ✅ 多語言翻譯 (Quick Action: 翻譯)
  - ✅ 內容改進建議 (Quick Action: 改進)
  - ✅ KSA 能力對應自動生成 (Quick Action: KSA)
  - ✅ 結構化 JSON Schema 模式產生
  - ✅ YAML 鍵值順序維護
  
- **分支管理系統**
  - ✅ 統一的儲存與 PR 創建工作流程
  - ✅ 可視化的分支管理介面
  - ✅ 檔案差異檢視 (Diff Viewer)
  - ✅ PR 狀態追蹤與管理
  - ✅ 一鍵合併功能
  - ✅ 分支切換與繼續編輯
  
- **Content Service API**
  - ✅ GitHub API 整合
  - ✅ 檔案讀取與寫入 API
  - ✅ 分支操作 API
  - ✅ PR 創建與管理 API
  - ✅ 檔案差異比較 API
  - ❌ 快取機制（Phase 2）
  - ❌ 權限控制（Phase 3）

- **檔案結構設計**
  ```
  cms/content/
  ├── pbl_data/                    # PBL 情境資料
  │   ├── _scenario_template.yaml
  │   ├── high_school_smart_city_scenario.yaml
  │   ├── ai_education_design_scenario.yaml
  │   └── scenarios/               # 已完成情境
  ├── assessment_data/             # 評量資料
  │   └── ai_literacy_questions.yaml
  ├── rubrics_data/               # 評量規準
  │   ├── ai_lit_domains.yaml
  │   └── ksa_codes.yaml
  └── _meta.yaml                  # 節點元資料
  ```

- **工作流程設計**
  ```
  內容編輯者 → CMS 編輯器 → AI 輔助改進 → 儲存到分支 → 
  創建 PR → 檔案差異檢視 → 審核合併 → 自動發布
  ```

- **CI/CD 流程**
  - ✅ 分支自動創建與管理
  - ✅ AI 生成的 commit 訊息
  - ✅ AI 生成的 PR 描述
  - ✅ 自動化 PR 標籤 (cms-content-change)
  - ✅ 檔案差異可視化
  - ✅ 一鍵合併機制
  - ❌ 自動化測試與驗證（Phase 2）
  - ❌ 發布到 GitHub Pages（Phase 2）

#### 3.2.3 使用者體驗設計
- **直觀的編輯介面**
  - 三欄式佈局：檔案瀏覽器、編輯器、AI 助手
  - VS Code 等級的編輯體驗
  - 即時語法檢查與自動完成
  
- **智能工作流程**
  - 統一的「儲存」按鈕處理完整流程
  - 進度追蹤的處理彈窗
  - AI 生成的提交訊息預覽
  
- **協作友善**
  - 分支狀態可視化
  - 檔案變更差異檢視
  - 簡化的審核與合併流程

#### 3.2.4 技術架構詳細
- **前端技術棧**
  - Next.js 15 + TypeScript
  - React Resizable Panels
  - Monaco Editor
  - Tailwind CSS

- **後端整合**
  - GitHub API (Octokit)
  - Google Vertex AI API
  - 無狀態設計 (支援 Cloud Run)
  - Cookie-based 分支狀態管理

- **AI 功能實作**
  - JSON Schema 驗證模式
  - 結構化輸出生成
  - 多語言內容翻譯
  - PBL 情境結構最佳化

### 3.3 Rubrics 專家協作系統 (Rubrics Expert Collaboration System)

#### 3.3.1 功能描述
提供專家協作編輯、審核和管理評量規準（Rubrics）的完整工作流程，確保評量標準的專業性和一致性。

#### 3.3.2 Rubrics 資料結構設計
```yaml
# rubrics/ai_literacy_rubrics.yaml
rubrics:
  [rubric_id]:  # 如: E1_rubric
    competency_ref: "E1"  # 關聯到能力
    title: "Using AI Tools Effectively"
    title_zh: "有效使用 AI 工具"
    
    # 評分維度
    dimensions:
      - dimension_id: "understanding"
        name: "概念理解"
        weight: 0.3  # 權重
        
        # 評分等級（通常 3-5 級）
        levels:
          - level: 1
            label: "初級"
            label_en: "Novice"
            score_range: [0, 60]
            criteria: "能識別基本 AI 工具"
            criteria_en: "Can identify basic AI tools"
            indicators:
              - "知道 ChatGPT 是什麼"
              - "能區分 AI 和傳統軟體"
            
          - level: 2
            label: "進階"
            label_en: "Proficient"
            score_range: [61, 80]
            criteria: "能選擇合適的 AI 工具解決問題"
            
    # 版本控制
    version: "1.2.0"
    last_updated: "2024-01-15"
    authors: ["expert1@email.com", "expert2@email.com"]
    status: "published"  # draft, review, published
```

#### 3.6.3 專家協作工作流程

**Phase 1: GitHub-Based 協作（MVP）**
```
專家 → Fork → 編輯 YAML → Pull Request → 審核 → 合併 → 自動發布
```

實作要點：
- 建立專家協作指南（RUBRICS_GUIDE.md）
- GitHub Actions 自動化驗證
- PR 模板與審核流程
- YAML 格式與多語言檢查

**Phase 2: Web-Based 編輯器（3-6個月）**
```typescript
interface RubricsEditor {
  // 視覺化編輯
  editDimensions(): void
  previewRubric(): void
  compareVersions(): Diff
  
  // 協作功能
  createDraft(): Draft
  submitForReview(): PR
  addComment(): Comment
  
  // AI 輔助
  suggestCriteria(): Suggestion[]
  autoTranslate(): Translation
}
```

**Phase 3: 完整 CMS 整合（6-9個月）**
- 視覺化 Rubrics 矩陣編輯器
- 即時協作與評論系統
- 版本管理與變更追蹤
- 權限管理與審核流程

#### 3.3.4 品質保證機制

**自動化檢查：**
- YAML 格式驗證
- 評分等級連續性檢查
- 多語言完整性驗證
- KSA 引用有效性確認
- 權重總和驗證（應為 1.0）

**人工審核要求：**
- 至少 2 位領域專家審核
- 教育理論符合性評估
- 實務可行性驗證
- 跨文化適用性檢查

**版本追蹤範例：**
```yaml
changelog:
  - version: "1.2.0"
    date: "2024-01-15"
    changes:
      - "調整 E1 評分標準，細化初級指標"
      - "新增日文翻譯"
      - "修正權重分配"
    reviewers: ["expert1@edu", "expert2@org"]
    approval_date: "2024-01-16"
```

#### 3.3.5 專家權限管理

```yaml
# config/rubrics_experts.yaml
experts:
  - email: "professor@university.edu"
    role: "lead_reviewer"
    expertise:
      domains: ["Engaging_with_AI", "Creating_with_AI"]
      languages: ["en", "zh-TW"]
    permissions:
      - create_rubric
      - approve_changes
      - publish
      - manage_reviewers
    
  - email: "practitioner@company.com"
    role: "contributor"
    expertise:
      domains: ["Managing_with_AI"]
      languages: ["en", "ja"]
    permissions:
      - create_draft
      - suggest_changes
      - translate
```

#### 3.3.6 技術實作路徑

**立即可做（無需開發）：**
```bash
# 1. 建立 Rubrics 工具包
tools/rubrics/
├── templates/
│   ├── rubric_template.yaml
│   ├── dimension_types.yaml
│   └── level_descriptors.yaml
├── validate.py      # YAML 驗證腳本
├── preview.py       # 生成預覽 HTML
└── excel2yaml.py    # Excel 轉換工具

# 2. 建立協作文檔
docs/rubrics/
├── CONTRIBUTING.md
├── REVIEW_CHECKLIST.md
└── DESIGN_PRINCIPLES.md
```

**Phase 2 開發重點：**
```typescript
// Rubrics API 端點
GET /api/rubrics              // 列出所有 Rubrics
GET /api/rubrics/{id}         // 取得特定 Rubric
POST /api/rubrics/validate    // 驗證 Rubric 結構
GET /api/rubrics/diff/{v1}/{v2}  // 版本比較
POST /api/rubrics/preview     // 生成預覽

// 前端元件
const RubricMatrix: React.FC = ({ rubricId }) => {
  return (
    <div className="rubric-matrix">
      <DimensionGrid dimensions={rubric.dimensions} />
      <ScoreCalculator weights={rubric.weights} />
      <ExampleViewer examples={rubric.examples} />
    </div>
  )
}
```

**Phase 3 進階功能：**
- AI 輔助生成評分標準
- 自動化跨語言一致性檢查
- 評分者間信度分析工具
- Rubrics 使用情況分析

### 3.4 學習平台流程 (Learning Platform Flow)

#### 3.4.1 功能描述
提供完整的學習體驗，從課程選擇到完成認證的全流程支援。

#### 3.4.2 核心學習流程
1. **課程發現**
   - ❌ AI 推薦課程（待開發）
   - ✅ 分類瀏覽（四大領域）
   - ❌ 搜尋和篩選（待開發）
   
2. **學習路徑**
   - ❌ 自適應學習路徑（待開發）
   - ✅ 進度追蹤（評估完成狀態）
   - ❌ 里程碑設置（待開發）
   
3. **互動學習**
   - ❌ 即時 AI 助教（待開發）
   - ❌ 同儕學習小組（待開發）
   - ❌ 討論區（待開發）

#### 3.6.3 學習模式
- ✅ **自主學習**：按自己節奏學習
- ❌ **引導學習**：跟隨 AI 建議的路徑（待開發）
- ❌ **協作學習**：小組專案和討論（待開發）
- ❌ **競賽模式**：限時挑戰和排行榜（待開發）

### 3.5 AI 輔助任務執行 (Do Tasks with LLM AI)

#### 3.5.1 功能描述
整合多個 LLM 提供智能化的任務執行支援。

#### 3.5.2 主要功能
- **即時提示**
  - ❌ 上下文感知提示（待開發）
  - ❌ 漸進式提示（不直接給答案）（待開發）
  - ❌ 多輪對話支援（待開發）
  
- **程式碼助手**
  - ❌ 程式碼解釋（待開發）
  - ❌ 除錯建議（待開發）
  - ❌ 最佳實踐推薦（待開發）
  
- **創意任務支援**
  - ❌ 腦力激盪輔助（待開發）
  - ❌ 內容生成指導（待開發）
  - ❌ 創意評估（待開發）

#### 3.6.3 LLM 整合
- ❌ OpenAI GPT-4（待開發）
- ❌ Google Gemini Pro（待開發）
- ❌ Claude 3（待開發）
- ❌ 本地部署模型（未來）

### 3.6 AI 評估與反饋 (Review and Feedback by LLM AI)

#### 3.6.1 功能描述
使用 AI 技術提供即時、個性化的評估和反饋。

#### 3.6.2 評估機制
- **標準答案評估**
  - ✅ 自動評分（選擇題）
  - ✅ 錯誤分析（顯示正確答案）
  - ❌ 知識點定位（待開發）
  
- **開放式評估（整合 Rubrics）**
  - ❌ 基於 Rubrics 的 AI 評分（待開發）
    - 連結到 3.3 專家設計的評分標準
    - AI 根據 Rubrics 維度自動評分
    - 支援多等級評分（初級/進階/精熟）
  - ❌ 多維度評估（創意、邏輯、完整性）（待開發）
    - 每個維度對應 Rubrics 定義
    - 權重化綜合分數計算
  - ❌ 評分理由說明（待開發）
    - 引用 Rubrics 具體指標
    - 提供改進建議路徑
  
- **Log 分析評估**
  - ❌ 學習行為分析（待開發）
  - ❌ 思考過程評估（待開發）
  - ❌ 努力程度量化（待開發）

#### 3.6.3 反饋系統
- ✅ **即時反饋**：提交後立即獲得
- ✅ **詳細報告**：包含改進建議（解釋文字）
- ❌ **個性化建議**：基於歷史表現（待開發）
- ❌ **同儕比較**：匿名化的相對表現（待開發）

### 3.7 個人檔案與歷史儀表板 (Profile and History Dashboard)

#### 3.7.1 功能描述
提供全面的個人學習數據視覺化和歷史記錄。

#### 3.7.2 主要功能
- **能力雷達圖**
  - ✅ 四大 AI 素養領域視覺化
  - ❌ 時間序列變化（待開發）
  - ❌ 與平均水平比較（待開發）
  
- **學習歷程**
  - ✅ 完成的課程和任務（評估記錄、PBL 學習記錄）
  - ❌ 獲得的認證和徽章（待開發）
  - ✅ 學習時間統計（PBL 歷程追蹤）
  
- **成就系統**
  - ❌ 里程碑達成（待開發）
  - ❌ 連續學習記錄（待開發）
  - ❌ 社交分享功能（待開發）
  
- **個人分析**
  - ❌ 學習模式分析（待開發）
  - ✅ 強弱項識別（領域分數）
  - ❌ 個性化建議（待開發）

### 3.8 動態語言系統 (Dynamic Language System)

#### 3.8.1 功能描述
提供超越預設 9 種語言的動態語言支援，使用 LLM 即時翻譯並智能管理翻譯快取。

#### 3.8.2 核心功能
- **語言選擇**
  - ✅ 預設語言支援（9 種）：en, zh, es, ja, ko, fr, de, ru, it
  - ❌ 自定義語言輸入（待開發）
  - ❌ 語言自動偵測（待開發）
  - ❌ 方言支援（如：zh-HK, zh-SG）（待開發）

- **LLM 即時翻譯**
  - ❌ 即時翻譯引擎整合（待開發）
    - OpenAI GPT-4
    - Google Translate API
    - DeepL API
  - ❌ 翻譯品質評分（待開發）
  - ❌ 上下文感知翻譯（待開發）
  - ❌ 專業術語詞庫（待開發）

- **翻譯快取管理**
  - ❌ GCS 翻譯儲存（待開發）
    - 自動存儲新翻譯到 GCS
    - 翻譯版本控制
    - 使用頻率追蹤
  - ❌ 定期同步機制（待開發）
    - 將高頻翻譯更新到 locale 檔案
    - 自動生成 i18n 資源檔
    - Git PR 自動創建

#### 3.4.3 技術架構
```typescript
interface DynamicLanguageConfig {
  defaultLanguages: string[]; // 預設 9 種
  customLanguage?: {
    code: string;        // 如 'th', 'vi', 'ar'
    name: string;        // 如 'ไทย', 'Tiếng Việt'
    direction: 'ltr' | 'rtl';
  };
  translationProvider: 'openai' | 'google' | 'deepl';
  cacheStrategy: {
    gcsPath: string;
    syncInterval: number; // 小時
    minUsageCount: number; // 最小使用次數
  };
}
```

#### 3.8.4 工作流程
1. **用戶選擇非預設語言**
   - 檢查 GCS 快取
   - 若無快取，呼叫 LLM API
   - 儲存翻譯結果到 GCS

2. **快取管理**
   - 追蹤每個翻譯的使用頻率
   - 定期分析高頻翻譯（每週）
   - 自動生成 locale 更新檔案

3. **同步更新**
   - 創建 locale/[lang].json 檔案
   - 提交 Git PR 供審核
   - 合併後成為預設語言的一部分

### 3.9 知識圖譜系統 (Knowledge Graph System)

#### 3.9.1 功能描述
提供視覺化、互動式的知識結構展示，幫助學習者理解概念關係和規劃學習路徑。

#### 3.9.2 核心功能
- **知識結構視覺化**
  - ✅ KSA 能力關係圖（D3.js 實作）
  - ✅ 四大領域導航圖
  - ❌ 概念層級圖（待開發）
  - ❌ 學習依賴圖（待開發）

- **學習路徑規劃**
  - ❌ 自動路徑生成（待開發）
  - ❌ 多目標路徑優化（待開發）
  - ❌ 時間預估（待開發）
  - ❌ 難度平衡（待開發）

- **知識關聯分析**
  - ❌ 前置知識檢查（待開發）
  - ❌ 相關概念推薦（待開發）
  - ❌ 知識缺口識別（待開發）
  - ❌ 學習順序建議（待開發）

#### 3.5.3 視覺化模式
- ✅ **力導向圖**：顯示概念間的關係強度
- ❌ **層級樹狀圖**：展示知識體系結構（待開發）
- ❌ **時間軸視圖**：呈現學習進度（待開發）
- ❌ **3D 網絡圖**：複雜關係的立體展示（待開發）

#### 3.9.4 互動功能
- ✅ 節點點擊查看詳情
- ✅ 縮放和平移
- ❌ 路徑高亮（待開發）
- ❌ 節點篩選（待開發）
- ❌ 自定義佈局（待開發）

### 3.10 PBL 情境式學習系統 (Problem-Based Learning System)

#### 3.10.1 功能描述
透過真實世界的情境模擬，提供任務導向的學習體驗。學習者在多階段任務中運用「聽說讀寫」不同能力，過程中的所有互動都被記錄並作為評估依據。每個情境都對應到特定的 KSA 能力指標和領域 Rubrics。

#### 3.10.2 核心概念
- **PBL 學習理念**
  - 從做中學（Learning by Doing）
  - 真實情境模擬（Real-world Scenarios）
  - 過程重於結果（Process over Product）
  - 多元能力整合（Multi-modal Skills）
  - 個性化回饋（Personalized Feedback）

#### 3.8.3 系統架構
```typescript
interface ScenarioProgram {
  id: string;
  title: string; // 如："AI 輔助求職訓練"
  description: string;
  targetDomain: DomainType[]; // 對應四大領域
  ksaMapping: {
    knowledge: string[]; // K1.1, K2.3 等
    skills: string[]; // S1.2, S3.1 等
    attitudes: string[]; // A1.1, A2.2 等
  };
  stages: Stage[];
  estimatedDuration: number; // 分鐘
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface Stage {
  id: string;
  name: string; // 如："搜尋合適職缺"
  description: string;
  stageType: 'research' | 'analysis' | 'creation' | 'interaction';
  modalityFocus: 'reading' | 'writing' | 'listening' | 'speaking' | 'mixed';
  
  // KSA 評估重點
  assessmentFocus: {
    primary: string[]; // 主要評估的 KSA codes
    secondary: string[]; // 次要評估的 KSA codes
  };
  
  // Rubrics 對應
  rubricsCriteria: {
    criterion: string;
    weight: number;
    levels: RubricLevel[];
  }[];
  
  // AI 模組配置
  aiModules: {
    role: 'assistant' | 'evaluator' | 'actor'; // 助手/評估者/角色扮演
    model: string;
    persona?: string; // 如：面試官、客戶、導師
  }[];
  
  // 階段任務
  tasks: Task[];
  timeLimit?: number;
  
  // 過程記錄
  loggingConfig: {
    trackInteractions: boolean;
    trackThinkingTime: boolean;
    trackRevisions: boolean;
    trackResourceUsage: boolean;
  };
}

interface ProcessLog {
  timestamp: Date;
  stageId: string;
  actionType: 'search' | 'write' | 'speak' | 'revise' | 'submit';
  
  // 詳細記錄
  detail: {
    userInput?: string;
    aiInteraction?: {
      model: string;
      prompt: string;
      response: string;
      tokensUsed: number;
    };
    resourceAccessed?: string[];
    timeSpent: number;
  };
  
  // 即時評估
  evaluation?: {
    ksaCode: string;
    score: number;
    feedback: string;
  };
}

interface StageResult {
  stageId: string;
  completed: boolean;
  performanceMetrics: {
    completionTime: number;
    interactionCount: number;
    revisionCount: number;
    resourceUsage: number;
  };
  
  // KSA 達成度
  ksaAchievement: {
    [ksaCode: string]: {
      score: number; // 0-100
      evidence: ProcessLog[];
    };
  };
  
  // Rubrics 評分
  rubricsScore: {
    [criterion: string]: {
      level: number;
      justification: string;
    };
  };
  
  feedback: {
    strengths: string[];
    improvements: string[];
    nextSteps: string[];
  };
}
```

#### 3.10.4 情境範例：AI 輔助求職

```yaml
程式名稱: AI 輔助求職訓練
目標領域: [Engaging with AI, Creating with AI, Managing with AI]
對應 KSA:
  Knowledge: [K1.2, K2.1, K3.3] # AI 搜尋、內容創作、隱私意識
  Skills: [S1.3, S2.2, S3.1] # 提示工程、文書撰寫、批判思考
  Attitudes: [A1.1, A2.2, A3.2] # 開放心態、創意思維、倫理考量

階段 1: 職缺搜尋與篩選
  類型: research
  重點: reading + AI interaction
  評估 KSA: [K1.2, S1.3, A1.1]
  任務:
    - 使用 AI 搜尋引擎找到 5 個合適職缺
    - 學習有效的搜尋提示技巧
    - 建立職缺評估標準
  AI 角色: 搜尋助手
  記錄重點: 搜尋策略、提示優化過程、篩選邏輯

階段 2: 職缺需求分析
  類型: analysis
  重點: reading + critical thinking
  評估 KSA: [K3.3, S3.1, A3.2]
  任務:
    - 深入分析 3 個目標職缺
    - 識別關鍵技能要求
    - 評估自身條件匹配度
  AI 角色: 分析顧問
  記錄重點: 分析深度、批判性思考、自我認知

階段 3: 履歷客製化
  類型: creation
  重點: writing + AI collaboration
  評估 KSA: [K2.1, S2.2, A2.2]
  任務:
    - 為目標職缺撰寫客製化履歷
    - 使用 AI 優化用詞和格式
    - 突出相關經驗和技能
  AI 角色: 寫作教練
  記錄重點: 寫作過程、AI 使用方式、修改迭代

階段 4: 模擬面試
  類型: interaction
  重點: speaking + listening
  評估 KSA: [S1.3, S3.1, A1.1]
  任務:
    - 與 AI 面試官進行模擬面試
    - 回答行為面試問題
    - 展現溝通和思考能力
  AI 角色: 面試官
  記錄重點: 表達能力、回應品質、壓力管理

綜合評估報告:
  - 各階段 KSA 達成度雷達圖
  - 四大領域能力提升分析
  - 個人化改進建議
  - 下一步學習路徑推薦
```

#### 3.10.5 關鍵功能特色

1. **多模態能力評估**
   - ✅ 聽：理解指令、接收回饋（文字模式）
   - ❌ 說：口語表達、即時對話（語音功能未實作）
   - ✅ 讀：資訊分析、批判閱讀
   - ✅ 寫：文件創作、結構化表達

2. **過程追蹤系統**
   - ✅ 完整互動日誌
   - ✅ 思考時間分析
   - ❌ 修改歷程記錄（只記錄最終版本）
   - ❌ 資源使用追蹤（未實作）

3. **智能評估引擎**
   - ✅ 即時過程評分
   - ✅ 多維度能力分析
   - ✅ 證據導向評估
   - ✅ 個性化回饋生成

4. **AI 角色系統**
   - ✅ 多樣化 AI 角色（導師、面試官、客戶等）
   - ✅ 情境化對話能力
   - ✅ 適應性難度調整
   - ✅ 個性化互動風格

5. **綜合報告系統**
   - ✅ 視覺化能力分析
   - ✅ 質性評語生成
   - ✅ 量化指標呈現
   - ✅ 學習路徑建議

#### 3.9.6 實施優勢

1. **真實性**：模擬真實世界的任務和挑戰
2. **整合性**：結合多種能力的綜合運用
3. **過程性**：重視學習過程而非僅看結果
4. **個性化**：根據表現提供客製化回饋
5. **可擴展**：易於新增不同類型的情境

#### 3.9.7 UI/UX 設計

##### 3.9.7.1 導航入口
- ✅ 在頂部導航列新增「PBL 學習」選項（已實作）
- ✅ 位置：在「評估」和「歷史」之間（已完成）
- ✅ 任何人都可以直接開始 PBL，無需先完成評估（已實現）

##### 3.9.7.2 PBL 首頁設計
```
[標題區]
PBL 情境式學習
透過真實世界的任務，提升您的 AI 素養能力

[情境卡片區]
┌────────────────────────────────────────────┐
│ 💼 AI 輔助求職訓練                        │
│ 難度：⭐⭐⭐ 中級 | 時間：90分鐘           │
│ 學習如何使用 AI 工具優化求職流程          │
│ [開始學習] [查看詳情]                    │
└────────────────────────────────────────────┘

[更多情境即將推出...]
```

##### 3.9.7.3 情境學習主介面
```
[進度條]
●───○───○───○  階段 1/4：職缺搜尋與篩選

[主要內容區]
┌──────────────────────────────────────────────────┐
│ [任務說明]                                      │
│ 您是一位正在尋找資料分析師職位的求職者。       │
│ 請使用 AI 搜尋工具找到 5 個合適的職缺。       │
│                                                │
│ [互動區]                                       │
│ ┌──────────────────────────────────────────┐ │
│ │ AI 助手：您好！我可以幫助您搜尋職缺...      │ │
│ │                                          │ │
│ │ [輸入您的搜尋指令...]                     │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘

[左側工具列]          [右側資訊面板]
▢ 記事本            評估重點：
▢ 我的收藏           - AI 搜尋技巧 (K1.2)
▢ 提示范例           - 批判性思考 (S3.1)
                      - 開放心態 (A1.1)
```

##### 3.9.7.4 多模態任務介面

**語音任務介面：**
```
[錄音控制區]
     🎤
  [開始錄音]
  
[波形顯示區]
││││┃┃┃███┃┃│││

錄音時間： 0:15 / 2:00
```

**寫作任務介面：**
```
[Monaco Editor]
支援拖放上傳檔案
字數統計： 156 字
[AI 寫作建議] [版本歷史]
```

#### 3.9.8 API 規格

##### 3.9.8.1 RESTful API 端點

```typescript
// PBL 情境管理
GET    /api/pbl/scenarios              // 取得所有情境列表
GET    /api/pbl/scenarios/:id          // 取得情境詳情
POST   /api/pbl/scenarios/:id/start    // 開始新情境

// Session 管理
GET    /api/pbl/sessions/active        // 取得進行中的 sessions
GET    /api/pbl/sessions/:id           // 取得 session 詳情
PUT    /api/pbl/sessions/:id/progress  // 更新進度
POST   /api/pbl/sessions/:id/pause     // 暫停
POST   /api/pbl/sessions/:id/resume    // 繼續
POST   /api/pbl/sessions/:id/complete  // 完成

// 任務執行
POST   /api/pbl/tasks/submit           // 提交任務答案
POST   /api/pbl/tasks/upload           // 上傳檔案（音檔、圖片）
GET    /api/pbl/tasks/:id/hints        // 取得提示

// 評估與回饋
POST   /api/pbl/evaluate/stage         // 階段評估
GET    /api/pbl/reports/:sessionId     // 取得完整報告
```

##### 3.9.8.2 WebSocket 事件

```typescript
// WebSocket 連線
ws://api/pbl/stream?sessionId={sessionId}

// 事件類型
interface WSMessage {
  type: 'user_input' | 'ai_response' | 'evaluation' | 'progress_update'
  payload: any
  timestamp: string
}

// 使用者輸入
{
  "type": "user_input",
  "payload": {
    "stageId": "stage_1",
    "input": "我想找台北的資料分析師職缺",
    "inputType": "text"
  }
}

// AI 回應（串流）
{
  "type": "ai_response",
  "payload": {
    "content": "好的，我來幫您搜尋...",
    "isComplete": false,
    "tokens": 15
  }
}
```

##### 3.9.8.3 資料結構

```typescript
// API 回應格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: {
    timestamp: string
    version: string
  }
}

// Session 資料
interface SessionData {
  id: string
  userId: string
  scenarioId: string
  status: SessionState
  currentStage: number
  progress: {
    percentage: number
    completedStages: number[]
    timeSpent: number
  }
  startedAt: string
  lastActiveAt: string
}
```

#### 3.9.9 實作計劃

##### 3.9.9.1 Phase 2.1 - 基礎架構 (Week 1-2)

**前端工作：**
1. 建立 PBL 路由和基本頁面
2. 實作情境列表和詳情頁
3. 建立基本的進度管理系統
4. 實作 WebSocket 連線管理

**後端工作：**
1. 建立 PBL API 路由
2. 實作 GCS 儲存服務
3. 建立 WebSocket 伺服器
4. 實作基本的 session 管理

##### 3.9.9.2 Phase 2.2 - 核心功能 (Week 3-4)

**任務系統：**
1. 實作文字輸入任務元件
2. 實作語音錄製元件
3. 實作 Monaco Editor 寫作任務
4. 檔案上傳與 GCS 整合

**AI 整合：**
1. 建立 LLM 服務抽象層
2. 實作不同 AI 角色
3. 串流回應機制
4. Token 使用追蹤

##### 3.9.9.3 Phase 2.3 - 第一個情境 (Week 5-8)

**「AI 輔助求職」各階段實作：**
- Week 5: 階段 1 - 職缺搜尋
- Week 6: 階段 2 - 需求分析
- Week 7: 階段 3 - 履歷創作
- Week 8: 階段 4 - 模擬面試

#### 3.10.10 實作進度更新 (2025年1月)

##### 已完成功能

**PBL 系統核心功能**
- ✅ 完整的 PBL 學習流程（從情境選擇到完成報告）
- ✅ Journey-based 架構（無 stages，直接使用 tasks）
- ✅ 草稿程序重用機制（防止空程序累積）
- ✅ 任務評估與即時反饋系統
- ✅ 個人化質性回饋生成（使用 Gemini API）
- ✅ 完整的多語言支援（9種語言）

**UI/UX 改進**
- ✅ 完成頁面任務摘要雙欄布局（Domain & KSA）
- ✅ 所有分數加入進度條視覺化
- ✅ 固定 Domain 顯示順序
- ✅ 任務進度追蹤與視覺化指示器

**多語言支援優化**
- ✅ PBL 情境列表 API 從 YAML 載入實際資料
- ✅ 學習頁面完整多語言支援（含 helper functions）
- ✅ 所有 locale 檔案補齊（pbl.json 完整翻譯）
- ✅ 修復歷程頁面多語言顯示問題

**API 與資料管理**
- ✅ 實作 /api/pbl/scenarios 支援所有語言
- ✅ 實作 /api/pbl/draft-program 草稿檢查
- ✅ 實作 /api/pbl/completion 完成資料管理
- ✅ 實作 /api/pbl/generate-feedback 質性回饋生成

**技術債務清理**
- ✅ 移除硬編碼的英文模擬資料
- ✅ 統一使用 getLocalizedField 處理多語言
- ✅ 修復 navigation.json 重複鍵值
- ✅ 確保所有翻譯檔案格式一致

##### 待開發功能

**Phase 2.4 計劃**
- ❌ 語音輸入功能（說話模態）
- ❌ 修改歷程記錄（目前只記錄最終版本）
- ❌ 資源使用追蹤
- ❌ 更多 PBL 情境（創意寫作、數據分析）
- ❌ 批量評估功能
- ❌ 學習路徑推薦系統

**技術優化**
- ❌ WebSocket 即時通訊
- ❌ 離線功能支援
- ❌ 效能優化（懶加載、快取策略）
- ❌ 完整的錯誤追蹤系統

#### 3.10.11 AI Prompt Templates

##### 3.10.10.1 階段 1：搜尋助手

```python
# System Prompt
system_prompt = """
你是一位專業的職涯諮詢師，正在幫助使用者學習如何有效地使用 AI 工具進行職缺搜尋。

你的任務：
1. 引導使用者學習有效的搜尋策略
2. 教導如何撰寫好的搜尋提示
3. 提供建設性的回饋，但不直接給答案
4. 鼓勵使用者思考和嘗試

記住：這是一個學習過程，不要直接提供職缺列表。
"""

# 使用者輸入處理
user_input_handler = """
使用者說：{user_input}

請分析使用者的搜尋策略，並提供引導：
1. 肯定他們做得好的地方
2. 提出可以改進的建議
3. 給予一個具體的下一步行動

回應限制在 150 字內。
"""
```

##### 3.10.10.2 階段 2：分析顧問

```python
# System Prompt
system_prompt = """
你是一位資深的職涯分析師，專門幫助人們分析職缺需求。

你的角色：
1. 引導使用者深入分析職缺要求
2. 教導如何識別關鍵技能
3. 幫助評估自身條件的匹配度
4. 培養批判性思考能力

不要直接告訴答案，而是通過提問引導思考。
"""

# 分析框架
analysis_framework = """
當使用者提供職缺資訊時，請：

1. 先肯定他們的選擇
2. 提出 2-3 個關鍵問題讓他們思考
   例如：「這個職位的核心責任是什麼？」
3. 提供一個分析框架或工具

保持友善和鼓勵的語氣。
"""
```

##### 3.10.10.3 階段 3：寫作教練

```python
# System Prompt
system_prompt = """
你是一位專業的履歷寫作教練，善於使用 AI 工具協助寫作。

你的教學方法：
1. 分析現有內容的優缺點
2. 提供具體的改進建議
3. 示範如何使用 AI 優化文字
4. 保留個人風格和真實性

記住：教導方法，而非直接重寫。
"""

# 寫作回饋模板
writing_feedback = """
對於使用者的履歷內容：

【優點】
- {strengths}

【建議改進】
- {improvements}

【AI 使用技巧】
試試這樣的提示："{sample_prompt}"

【下一步】
{next_action}
"""
```

##### 3.10.10.4 階段 4：面試官

```python
# System Prompt
system_prompt = """
你是一位經驗豐富的面試官，正在進行資料分析師的面試。

面試風格：
1. 專業但友善
2. 循序漸進，從簡單到複雜
3. 注重思考過程
4. 給予正面鼓勵

面試結構：
1. 自我介紹 (1-2 題)
2. 技術問題 (2-3 題)
3. 情境題 (1-2 題)
4. 提問時間
"""

# 面試評估
interviewer_evaluation = """
回答評估：

1. 內容完整性：{completeness_score}/10
2. 邏輯清晰度：{logic_score}/10
3. 溝通表達力：{communication_score}/10

回饋："{feedback}"

[下一個問題] 或 [結束面試]
"""
```

#### 3.10.11 評估機制詳細說明

##### 3.10.11.1 過程評分機制

```typescript
// 評分時機
enum EvaluationTiming {
  IMMEDIATE = 'immediate',     // 立即評分（內部記錄）
  STAGE_END = 'stage_end',     // 階段結束顯示
  FINAL = 'final'              // 最終綜合評估
}

// 評分維度
interface EvaluationDimensions {
  // 基礎評分（每個階段都有）
  taskCompletion: number      // 任務完成度 (0-100)
  processQuality: number      // 過程品質 (0-100)
  
  // KSA 對應評分
  ksaScores: {
    [ksaCode: string]: {
      score: number           // 分數 (0-100)
      evidence: string[]      // 證據列表
    }
  }
  
  // Rubrics 評分
  rubricScores: {
    [criterion: string]: {
      level: 1 | 2 | 3 | 4   // 等級
      justification: string   // 說明
    }
  }
}
```

##### 3.10.11.2 證據收集機制

```typescript
interface EvidenceCollector {
  // 文字證據
  collectTextEvidence(input: string, context: any): Evidence
  
  // 語音證據
  collectAudioEvidence(audioUrl: string, transcript: string): Evidence
  
  // 寫作證據
  collectWritingEvidence(content: string, revisions: string[]): Evidence
  
  // 互動證據
  collectInteractionEvidence(logs: ConversationTurn[]): Evidence
}

// 證據結構
interface Evidence {
  type: 'text' | 'audio' | 'writing' | 'interaction'
  content: string
  metadata: {
    timestamp: Date
    stageId: string
    taskId: string
    [key: string]: any
  }
  analysis?: {
    keywords: string[]
    sentiment: number
    quality: number
  }
}
```

##### 3.10.11.3 回饋生成策略

```typescript
// 回饋類型
enum FeedbackType {
  ENCOURAGEMENT = 'encouragement',     // 鼓勵性
  GUIDANCE = 'guidance',               // 引導性
  CORRECTION = 'correction',           // 糾正性
  ACHIEVEMENT = 'achievement'          // 成就認可
}

// 回饋生成器
class FeedbackGenerator {
  // 過程中的鼓勵性回饋
  generateProcessFeedback(action: UserAction): string {
    const templates = {
      good_attempt: "很好的嘗試！{specific_praise}",
      improvement: "我注意到您{improvement_area}，繼續加油！",
      milestone: "太棒了！您已經{achievement}"
    }
    return this.fillTemplate(templates, action)
  }
  
  // 階段結束的綜合回饋
  generateStageFeedback(stageResult: StageResult): StageFeedback {
    return {
      summary: this.generateSummary(stageResult),
      strengths: this.identifyStrengths(stageResult),
      improvements: this.suggestImprovements(stageResult),
      nextSteps: this.recommendNextSteps(stageResult)
    }
  }
}
```

### 3.10 統一學習活動架構 (Unified Learning Activity Architecture)

#### 3.10.1 功能描述
提供統一的抽象層，支援傳統評測和互動式學習，確保系統的可擴展性和維護性。

#### 3.10.2 核心架構
```typescript
// 最高層抽象
interface LearningActivity {
  id: string
  type: 'assessment' | 'practice' | 'project'
  title: string
  description: string
  estimatedDuration: number
  domains: DomainType[]
  ksaMapping: KSAMapping
  
  // 生命週期方法
  start(): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  complete(): Promise<ActivityResult>
}

// 統一的任務介面
interface Task {
  id: string
  order: number
  type: TaskType
  content: any
  requirements: string[]
  rubrics: RubricCriteria[]
  ksaMapping: KSAMapping
  
  present(): ReactNode
  evaluate(response: TaskResponse): Promise<TaskResult>
  getProgress(): TaskProgress
}

// 擴展的任務類型
enum TaskType {
  MULTIPLE_CHOICE = 'multiple_choice',
  LISTENING = 'listening',
  SPEAKING = 'speaking',
  READING = 'reading',
  WRITING = 'writing',
  PROJECT = 'project',
  OPEN_ENDED = 'open_ended'
}
```

#### 3.9.3 實施策略
- **Phase 2.1**: 擴展現有 Assessment 系統支援新任務類型
- **Phase 2.2**: 建立統一的抽象層和介面
- **Phase 2.3**: 實作 PBL 專屬功能模組

### 3.11 進度追蹤與資料管理系統 (Progress Tracking & Data Management)

#### 3.11.1 功能描述
提供完整的學習進度追蹤、互動記錄儲存和智能恢復功能，確保學習連續性。Phase 2 先使用 GCS 作為資料儲存，Phase 3 再遷移至 PostgreSQL。

#### 3.11.2 GCS 資料結構（Phase 2）
```yaml
# GCS 儲存路徑結構
pbl/
  sessions/
    {user_id}/
      {session_id}/
        metadata.json      # Session 基本資訊
        progress.json      # 當前進度狀態
        logs/
          {timestamp}.json # 活動日誌
        snapshots/
          {timestamp}.json # 狀態快照

# Session Metadata 結構
{
  "session_id": "sess_123",
  "user_id": "user_456",
  "activity_type": "pbl_practice",
  "activity_id": "ai_job_search",
  "status": "in_progress",
  "created_at": "2025-06-26T10:00:00Z",
  "last_active_at": "2025-06-26T11:30:00Z",
  "version": 1
}

# Progress 結構
{
  "current_stage": 2,
  "current_task": 1,
  "completed_stages": [0, 1],
  "stage_results": {...},
  "total_time_spent": 5400,
  "progress_percentage": 45
}
```

#### 3.11.3 PostgreSQL 架構（Phase 3 - 未來升級）
```sql
-- 學習活動 session 表
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  activity_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'in_progress',
  started_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW(),
  current_position JSONB DEFAULT '{}',
  progress_percentage INTEGER DEFAULT 0
);

-- 詳細活動記錄表
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES learning_sessions(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  log_type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  evaluation JSONB
);

-- 快照表（定期儲存完整狀態）
CREATE TABLE session_snapshots (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES learning_sessions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  state JSONB NOT NULL,
  snapshot_type VARCHAR(50) NOT NULL
);
```

#### 3.11.4 互動資料記錄
```typescript
interface InteractiveAnswer extends UserAnswer {
  interactionType: 'multiple_choice' | 'speaking' | 'writing' | 'project'
  conversationLog: ConversationTurn[]
  evaluation: {
    score: number
    rubricScores: Record<string, number>
    llmFeedback: string
  }
  evidence: Evidence[]
}

interface ConversationTurn {
  timestamp: Date
  role: 'user' | 'ai' | 'system'
  content: string
  metadata?: {
    audioUrl?: string
    duration?: number
    corrections?: string[]
  }
}
```

#### 3.11.5 GCS 儲存服務（Phase 2）
```typescript
class PBLStorageService {
  private bucket: Storage.Bucket
  
  // Session 管理
  async createSession(userId: string, activityId: string): Promise<string>
  async updateProgress(sessionId: string, progress: Progress): Promise<void>
  async getSession(sessionId: string): Promise<Session>
  
  // 活動日誌
  async appendLog(sessionId: string, log: ActivityLog): Promise<void>
  async getLogs(sessionId: string, limit?: number): Promise<ActivityLog[]>
  
  // 快照管理
  async createSnapshot(sessionId: string, state: any): Promise<void>
  async getLatestSnapshot(sessionId: string): Promise<Snapshot>
  
  // 批次操作（效能優化）
  async batchWriteLogs(sessionId: string, logs: ActivityLog[]): Promise<void>
}
```

#### 3.11.6 智能恢復機制
- **Phase 2 架構**：Memory → GCS
  - 記憶體快取即時資料
  - 每 10 秒批次寫入 GCS
  - 每 5 分鐘創建快照
  
- **Phase 3 架構**：Memory → PostgreSQL → GCS
  - PostgreSQL 作為主要資料庫
  - GCS 作為長期歸檔
  - 即時同步和智能快取

### 3.12 即時評估與回饋系統 (Real-time Evaluation & Feedback)

#### 3.12.1 功能描述
提供串流式的即時評估和個性化回饋，支援多種評估模式。

#### 3.12.2 評估架構
```typescript
class InteractiveEvaluationService {
  // 即時串流評估
  async evaluateStreaming(
    taskType: string,
    userInput: string,
    context: TaskContext
  ): AsyncGenerator<EvaluationChunk>
  
  // 最終綜合評估
  async finalEvaluate(
    answer: InteractiveAnswer
  ): Promise<EvaluationResult>
}

// 統一評估介面
interface Evaluator {
  evaluate(response: any): Promise<EvaluationResult>
}

const evaluators: Record<TaskType, Evaluator> = {
  multiple_choice: new MCEvaluator(),
  speaking: new LLMEvaluator('speech'),
  writing: new LLMEvaluator('text')
}
```

#### 3.12.3 回饋機制
- **即時回饋**：使用 SSE/WebSocket 提供串流回饋
- **多維度評分**：基於 Rubrics 的細項評分
- **證據導向**：每個評分都有對應的證據支撐
- **個性化建議**：根據表現生成改進建議

## 4. 技術決策與架構演進

### 4.1 儲存方案演進策略

#### 4.1.1 現階段方案（Phase 0-1）
**為何不用資料庫？**
- **降低複雜度**：專注於核心功能開發
- **快速迭代**：減少基礎設施維護
- **成本控制**：避免早期過度投資
- **靈活性高**：易於調整資料結構

**現有儲存方案：**
```
├── 用戶資料 → Local Storage (瀏覽器)
├── 學習內容 → GitHub Pages (靜態 JSON/YAML)
├── 學習歷史 → GCS (JSON 檔案)
└── 暫存資料 → IndexedDB (離線快取)
```

#### 4.1.2 資料庫升級時機指標
**量化指標：**
- 日活躍用戶 (DAU) > 100
- 並發用戶數 > 20
- GCS API 費用 > $50/月
- 平均回應時間 > 1 秒
- 資料查詢需求變複雜

**質化指標：**
- 需要即時協作功能
- 需要複雜查詢（JOIN、聚合）
- 需要事務一致性
- 需要資料分析功能

#### 4.1.3 漸進式升級路徑
```
Phase 2 (3-6個月)：加入快取層
├── Redis：熱點資料快取
├── 目的：減少 GCS 呼叫
└── 成本：~$20/月

Phase 3 (6-9個月)：加入關聯式資料庫
├── PostgreSQL：用戶、進度、評估資料
├── 目的：支援複雜查詢和事務
└── 成本：~$50/月

Phase 4 (9-12個月)：專用資料庫
├── Neo4j：知識圖譜
├── TimescaleDB：時序資料分析
└── 成本：~$200/月
```

#### 4.1.4 技術債務管理
**現階段技術債：**
- Local Storage 無法跨裝置同步
- GCS 查詢效能受限
- 缺乏即時更新機制

**償還計畫：**
1. 建立資料抽象層（Repository Pattern）
2. 統一資料存取介面
3. 逐步遷移，不影響功能

### 4.2 內容管理架構決策

#### 4.2.1 為何選擇 Git-Based？
**優勢：**
- 版本控制內建
- 協作機制成熟（PR、Review）
- 靜態託管免費（GitHub Pages）
- 開發者友善

**限制：**
- 非技術用戶門檻高
- 即時編輯受限
- 大檔案處理困難

#### 4.2.2 內容服務層演進
```
Phase 1：純靜態檔案
└── 直接從 GitHub Pages 讀取

Phase 2：API 包裝層
├── 快取機制
├── 查詢優化
└── 權限控制

Phase 3：CMS UI
├── 視覺化編輯器
├── 自動產生 PR
└── 預覽功能
```

### 4.3 內部抽象層演進策略

#### 4.3.1 抽象層時機與觸發條件

**原則：Market-Driven + Tech Debt Balance**
- 市場需求驅動功能
- 功能複雜度觸發抽象
- 技術債務適時償還

#### 4.3.2 認證抽象層 (Auth Provider)
**現狀（MVP）：**
```typescript
// 直接使用 Local Storage
localStorage.setItem('user', JSON.stringify(userData))
```

**觸發時機：**
- 🎯 **準備公開上線時** → 需要真實用戶系統
- 🎯 **企業客戶需求** → 需要 SSO 整合
- 🎯 **安全合規要求** → 需要 OAuth2/SAML

**演進路徑：**
```typescript
// Phase 2: 抽象介面
interface AuthProvider {
  login(credentials): Promise<User>
  logout(): Promise<void>
  validateToken(): Promise<boolean>
}

// 實作切換
LocalAuthProvider → JWTAuthProvider → OAuth2Provider → SSOProvider
```

#### 4.3.3 檔案儲存抽象層 (Storage Service)
**現狀（MVP）：**
```python
# 直接呼叫 GCS
from google.cloud import storage
bucket.upload_blob(...)
```

**觸發時機：**
- 🎯 **多雲部署需求** → 客戶要求 AWS/Azure
- 🎯 **成本優化** → 需要切換更便宜的方案
- 🎯 **合規要求** → 資料必須存在特定地區

**演進路徑：**
```python
# Phase 2: Storage 介面
class StorageBackend(ABC):
    async def upload(self, file: bytes, path: str) -> str
    async def download(self, path: str) -> bytes
    
# 逐步支援
GCSBackend → S3Backend → AzureBlobBackend → LocalBackend
```

#### 4.3.4 快取抽象層 (Cache Service)
**現狀（MVP）：**
```typescript
// 簡單的 Map 快取
const cache = new Map<string, any>()
```

**觸發時機：**
- 🎯 **DAU > 100** → 記憶體不足
- 🎯 **多伺服器部署** → 需要共享快取
- 🎯 **效能瓶頸** → 需要分散式快取

**演進路徑：**
```
Phase 1: Memory Cache (Map)
Phase 2: Redis Cache (DAU > 100)
Phase 3: Multi-tier Cache (DAU > 1000)
```

#### 4.3.5 事件系統 (Event Bus)
**現狀（MVP）：**
```typescript
// 直接呼叫
onAssessmentComplete() {
  updateProgress()
  saveToGCS()
  showNotification()
}
```

**觸發時機：**
- 🎯 **功能解耦需求** → 程式碼太複雜
- 🎯 **即時通知** → 需要 WebSocket/SSE
- 🎯 **資料分析** → 需要事件串流

**演進路徑：**
```
Phase 1: 直接呼叫
Phase 2: 簡單 EventEmitter
Phase 3: Redis Pub/Sub
Phase 4: Kafka/RabbitMQ (企業版)
```

#### 4.3.6 決策矩陣
| 抽象層 | 觸發條件 | 預估時機 | 工作量 |
|--------|----------|----------|--------|
| Auth Provider | 公開上線 | Phase 2 | 1週 |
| Storage Service | 多雲需求 | Phase 3 | 3天 |
| Cache Service | DAU > 100 | Phase 2 | 2天 |
| Event Bus | 功能 > 10個 | Phase 3 | 1週 |
| API Gateway | 微服務化 | Phase 4 | 2週 |

### 4.4 MVP 技術優化建議

#### 4.4.1 API 整合優化
**問題：** 前端直接呼叫多個來源，缺乏統一管理
**解決方案：**
```typescript
// 建立統一的 Content Service
class ContentService {
  private cache = new Map()
  
  async getTree(): Promise<TreeData> {
    return this.fetchWithCache('/tree.json')
  }
  
  private async fetchWithCache(path: string) {
    // 1. 檢查記憶體快取
    // 2. Fetch from GitHub Pages
    // 3. 統一錯誤處理
    // 4. 自動重試機制
  }
}
```

#### 4.4.2 開發體驗優化
**目標：** 一鍵啟動所有服務
**解決方案：** Docker Compose
```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    volumes: ["./frontend:/app"]
    
  backend:
    build: ./backend
    ports: ["8000:8000"]
    
  cms:
    build: ./cms
    ports: ["8001:8001"]
    volumes: ["./content:/app/content"]
```

#### 4.4.3 內容編輯優化
**問題：** 需要直接編輯 YAML/JSON
**解決方案：**
- Phase 1: Monaco Editor 網頁版
- Phase 2: GitHub API 自動 PR
- Phase 3: 視覺化編輯器

#### 4.4.4 錯誤監控與追蹤
**問題：** MVP 階段缺乏錯誤監控機制
**解決方案：**
- ✅ Phase 0: 簡單錯誤記錄器（已實作）
  - Console + localStorage 記錄
  - 開發階段除錯用
- ❌ Phase 1: 整合 Sentry（待實作）
  - 自動錯誤收集
  - 錯誤分組與趨勢分析
  - 用戶影響範圍追蹤
  - 免費方案：5,000 事件/月
- ❌ Phase 2: 效能監控
  - API 回應時間
  - 頁面載入速度
  - Core Web Vitals 指標

## 5. 技術實現細節

### 5.1 知識圖譜系統 (Knowledge Graph System)

#### 5.1.1 資料模型
```typescript
// 概念節點
interface ConceptNode {
  id: string;
  type: 'domain' | 'competency' | 'concept' | 'skill' | 'knowledge';
  name: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedTime: number; // 分鐘
  tags: string[];
  mastery?: number; // 0=紅, 1=黃, 2=綠
}

// 關係邊
interface RelationshipEdge {
  source: string;
  target: string;
  type: 'prerequisite' | 'related' | 'extends' | 'contrasts';
  strength: number; // 0-1
}

// 學習路徑
interface LearningPath {
  nodes: string[]; // 有序節點
  estimatedTime: number;
  optimizationScore: number;
}
```

#### 5.1.2 技術架構
- **Phase 2**: 
  - 知識結構儲存於 GCS (YAML/JSON)
  - 前端使用 D3.js 渲染
  - 基於規則的路徑推薦
- **Phase 3**: 
  - 升級至 Neo4j 圖資料庫
  - NetworkX 進階路徑演算法
  - 基於圖分析的個人化推薦

#### 5.1.3 核心功能
1. **知識關聯查詢**
   - 前置知識識別
   - 相關概念發現
   - 學習路徑計算

2. **視覺化模式**
   - 層級視圖（樹狀結構）
   - 網絡視圖（力導向圖）
   - 時間軸視圖（學習進度）

3. **智能推薦**
   - 最短學習路徑
   - 個人化路線
   - 知識缺口分析

### 5.2 MCP (Model Context Protocol) 整合策略

#### 5.2.1 現況與演進
**現況（Phase 0-2）：**
- 直接在功能中呼叫 LLM API
- 每個功能寫死特定模型
- 缺乏統一的上下文管理

**未來目標（Phase 3+）：**
- 標準化的 Agent 接入協定
- 統一的上下文管理層
- 多 Agent 協同工作能力

#### 5.2.2 漸進式 MCP 整合路徑
```
Phase 1：直接 LLM 呼叫（現況）
├── PBL 系統：直接呼叫 Vertex AI
├── 評估系統：硬編碼 Gemini API
└── 各功能獨立管理 prompt

Phase 2：抽象層封裝
├── 建立 LLM Service 抽象層
├── 統一 prompt 管理
└── 基礎上下文傳遞

Phase 3：MCP 標準化
├── 實作 MCP Protocol
├── Agent 註冊機制
└── 上下文編排器

Phase 4：完整 Agent 系統
├── 多 Agent 協作
├── 智能路由
└── 分散式 Agent
```

#### 5.2.3 MCP 核心概念
```typescript
// 未來的 MCP 介面設計
interface MCPAgent {
  id: string
  capabilities: string[]
  contextRequirements: ContextSchema
  
  // Agent 生命週期
  initialize(context: Context): Promise<void>
  execute(task: Task): Promise<Result>
  updateContext(delta: ContextDelta): void
}

// 統一的上下文管理
interface ContextManager {
  // 跨 Agent 共享上下文
  globalContext: GlobalContext
  // Agent 專屬上下文
  agentContexts: Map<string, AgentContext>
  // 上下文同步機制
  syncContext(agentId: string): Promise<void>
}
```

### 5.3 從現有功能到 Agent 系統的演進

#### 5.3.1 現有 LLM 使用情況
```python
# 現況：直接呼叫（分散在各功能）
# backend/routers/pbl.py
async def chat_with_ai(stage_config, user_input):
    # 直接呼叫 Vertex AI
    response = await vertex_ai.generate(
        prompt=stage_config['prompt'],
        user_input=user_input
    )
    return response

# 問題：
# 1. 各功能重複程式碼
# 2. 無法共享上下文
# 3. 難以切換模型
```

#### 5.3.2 Phase 2：建立 LLM Service 層
```python
# 第一步：統一 LLM 呼叫
class LLMService:
    def __init__(self):
        self.models = {
            'vertex': VertexAIClient(),
            'openai': OpenAIClient(),
            'gemini': GeminiClient()
        }
    
    async def generate(self, 
                      task_type: str,
                      context: dict,
                      model: str = 'vertex'):
        # 統一介面，但還不是 Agent
        prompt = self.get_prompt(task_type, context)
        return await self.models[model].generate(prompt)
```

#### 5.3.3 Phase 3：Agent 抽象層
```python
# 將功能包裝成 Agent
class BaseAgent:
    def __init__(self, agent_id: str, capabilities: List[str]):
        self.id = agent_id
        self.capabilities = capabilities
        self.context = {}
    
    async def execute(self, task: Task) -> Result:
        # Agent 標準介面
        pass

class TutorAgent(BaseAgent):
    def __init__(self):
        super().__init__('tutor', ['teach', 'explain', 'guide'])
    
    async def execute(self, task: Task) -> Result:
        # 現有 PBL 教學邏輯
        # 但包裝成 Agent 介面
        pass
```

#### 5.3.4 Phase 4：完整 MCP 實作
```python
# 未來：標準 MCP Protocol
class MCPOrchestrator:
    def __init__(self):
        self.registry = AgentRegistry()
        self.context_manager = ContextManager()
        self.message_bus = MessageBus()
    
    async def process(self, request: MCPRequest):
        # 1. 解析需求
        agents = self.select_agents(request)
        
        # 2. 協調多 Agent
        for agent in agents:
            context = self.context_manager.get_context(agent.id)
            result = await agent.execute(request, context)
            self.context_manager.update(agent.id, result)
        
        # 3. 整合結果
        return self.aggregate_results(results)
```

### 5.4 插件系統架構

#### 5.4.1 插件接口
```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  type: 'content' | 'assessment' | 'analytics' | 'integration';
  
  // 生命週期方法
  onInstall(): Promise<void>;
  onActivate(): Promise<void>;
  onDeactivate(): Promise<void>;
  
  // 功能接口
  execute(context: PluginContext): Promise<any>;
}
```

#### 5.4.2 插件類型
- **內容插件**：新題型、學習資源
- **評估插件**：特殊評分邏輯
- **分析插件**：自定義報表
- **整合插件**：第三方服務

### 5.5 多模態任務支援系統 (Multi-modal Task Support)

#### 5.5.1 語音任務處理
```typescript
class SpeakingTaskHandler {
  // 語音轉文字
  async speechToText(audio: Blob): Promise<string>
  
  // 語音分析（發音、流暢度）
  async analyzeSpeech(audio: Blob): Promise<SpeechAnalysis>
  
  // AI 對話回應
  async generateResponse(context: DialogContext): Promise<AIResponse>
}
```

#### 5.5.2 寫作任務處理
```typescript
class WritingTaskHandler {
  // 即時寫作輔助
  async provideWritingSuggestions(text: string): Promise<Suggestions>
  
  // 文章結構分析
  async analyzeStructure(text: string): Promise<StructureAnalysis>
  
  // 文法和風格檢查
  async checkGrammarStyle(text: string): Promise<GrammarCheck>
}
```

#### 5.5.3 專案任務管理
```typescript
class ProjectTaskHandler {
  // 專案進度追蹤
  trackProgress(projectId: string): ProjectProgress
  
  // 協作支援
  enableCollaboration(participants: User[]): CollaborationSpace
  
  // 成果評估
  async evaluateDeliverable(artifact: any): Promise<ProjectEvaluation>
}
```

### 5.6 離線支援策略 (Offline Support Strategy)

#### 5.6.1 IndexedDB 離線快取
```typescript
class OfflineCache {
  private db: IDBDatabase
  
  // 儲存待同步的活動日誌
  async queueLog(log: ActivityLog): Promise<void>
  
  // 網路恢復時自動同步到 GCS
  async syncPendingLogs(): Promise<void>
  
  // 快取學習內容供離線使用
  async cacheContent(content: any): Promise<void>
}
```

#### 5.6.2 同步機制（Phase 2 - GCS）
- **樂觀更新**：先更新 IndexedDB，後同步到 GCS
- **批次上傳**：累積多個操作後批次寫入 GCS
- **衝突解決**：使用時間戳和檔案版本
- **智能重試**：指數退避演算法

#### 5.6.3 資料同步流程
```typescript
// Phase 2: IndexedDB → GCS
const syncToGCS = async () => {
  const pendingLogs = await offlineCache.getPendingLogs()
  if (pendingLogs.length > 0) {
    const batchFile = `logs/batch_${Date.now()}.json`
    await gcsStorage.uploadJSON(batchFile, pendingLogs)
    await offlineCache.clearSyncedLogs(pendingLogs)
  }
}

// Phase 3: IndexedDB → PostgreSQL → GCS (長期歸檔)
```

### 5.7 Chatbot 整合

#### 5.7.1 功能範圍
- ❌ 24/7 學習支援（待開發）
- ❌ 多語言對話（待開發）
- ❌ 上下文記憶（待開發）
- ❌ 情緒識別和回應（待開發）

#### 5.7.2 整合點
- ❌ 網頁內嵌 Widget（待開發）
- ❌ Mobile App SDK（待開發）
- ❌ 第三方平台（Slack, Teams）（待開發）
- ❌ API 接口（待開發）

## 6. 發展階段規劃

### 6.1 發展進度總覽

| 階段 | 狀態 | 時程 | 核心目標 | 關鍵成果 |
|------|------|------|----------|----------|
| **Phase 1** | ✅ **完成** | 2024/11-2025/01 | 專業級 CMS 系統 | Git-based 內容管理，AI 輔助編輯 |
| **Phase 2** | 🚀 **進行中** | 2025/01-06 | SaaS 學習平台 | PBL 情境系統，多語言支援 |
| **Phase 3** | 📋 **規劃中** | 2025/07-12 | Agent 智能系統 | 動態內容生成，個人化學習 |
| **Phase 4** | 🔮 **願景** | 2026+ | 完全個人化體驗 | AGI 整合，自適應學習生態 |

---

### 6.2 Phase 1: 專業級 CMS 系統 ✅ **已完成**

> **目標達成**：建立穩定的內容管理基礎設施

**✅ 核心功能已實現**：
- **Git-based 版本控制**：完整分支管理、PR 工作流程
- **AI 輔助編輯**：翻譯、內容改進、KSA 能力映射  
- **智能工作流程**：Save + PR 統一流程，自動化部署
- **GitHub 深度整合**：無狀態 Cloud Run 架構

**✅ 技術基礎已建立**：
- Next.js 15 + TypeScript 前端
- GitHub API 作為存儲後端
- Vertex AI (Gemini) AI 服務
- 響應式 UI 與可調整面板

**✅ 成果驗證**：CMS 已完整部署並為 Phase 2 提供內容管理支援

---

### 6.3 Phase 2: SaaS 學習平台 🚀 **開發中**

> **當前重點**：將內容轉換為互動式學習體驗

**🔨 正在開發**：
- **PBL 情境學習系統** - 基於真實場景的問題解決學習
- **多語言支援** - 9 種語言的完整本地化體驗
- **AI 輔導對話** - 任務導向的智能對話系統
- **學習追蹤** - 用戶進度與成效分析

**📋 規劃中**：
- 使用者認證與權限系統
- 社交學習功能基礎
- 基礎個人化推薦

**技術架構擴展**：
- FastAPI 後端處理 AI 邏輯
- Google Cloud Storage 用戶數據
- 多層快取系統優化
- 響應式前端體驗

**關鍵里程碑**：
- 完成第一個 PBL 情境 "AI 輔助求職"
- 支援 100+ 並發學習者
- 頁面載入時間 < 3 秒

---

### 6.4 Phase 3: Agent 智能系統 📋 **2025 下半年**

> **目標**：實現動態內容生成與智能個人化

**規劃功能**：
- **MCP 整合** - 統一 AI Agent 管理與協調
- **動態內容生成** - 實時產生個人化練習與評量
- **智能學習路徑** - 基於表現調整學習順序與難度
- **多 Agent 協作** - 不同專業領域的 AI 助手協同

**技術願景**：
- 統一 Agent 管理層
- 動態內容生成管道  
- 個人化推薦演算法
- 跨平台 Agent 部署

---

### 6.5 Phase 4: 完全個人化體驗 🔮 **2026+ 長期願景**

> **願景**：建立自適應學習生態系統

**長期目標**：
- **AGI 深度整合** - 接入最新 AGI 技術提供更智能服務
- **虛擬學習夥伴** - 個人化 AI 助手陪伴整個學習旅程
- **企業解決方案** - 針對企業需求的客製化培訓平台
- **開放生態系統** - 支援第三方開發者與內容創作者

**市場拓展**：
- B2B 企業培訓市場
- 教育機構合作夥伴計畫  
- 開發者 API 與插件生態
- 國際市場擴展


---

## 7. 成功指標 (KPIs)

### 6.1 用戶指標
- 月活躍用戶（MAU）
- 用戶留存率（7日、30日）
- 平均學習時長
- 課程完成率

### 6.2 學習成效指標
- 能力提升率
- 評估通過率
- 用戶滿意度（NPS）
- 知識應用率

### 6.3 平台指標
- 內容創建量
- AI 互動次數
- 插件安裝量
- API 調用量

### 6.4 商業指標
- 付費轉換率
- 客戶生命週期價值（LTV）
- 客戶獲取成本（CAC）
- 月經常性收入（MRR）

## 8. 風險與挑戰

### 7.1 技術風險
- **AI 模型成本**：需要優化使用策略
- **擴展性**：架構需支援大規模用戶
- **延遲問題**：確保即時回應

### 7.2 市場風險
- **競爭對手**：教育科技市場競爭激烈
- **用戶接受度**：AI 教育仍屬新概念
- **地區差異**：不同地區需求差異大

### 7.3 營運風險
- **內容品質**：需要嚴格的品質控制
- **隱私合規**：符合各地區法規
- **服務穩定性**：確保 24/7 可用性

## 9. 開發優先級與任務追蹤

### 9.1 Phase 1-2 MVP 關鍵路徑 (2025年1-6月)

#### 🔴 已完成的關鍵任務
1. **認證系統修復** ✅
   - 修復登出功能 (AUTH-001)
   - 實作 session 持久化 (AUTH-002)
   - 新增 Remember Me 功能 (AUTH-003)
   - JWT token 自動更新機制

2. **PBL 系統完善** ✅
   - 修復回應驗證邏輯 (PBL-001)
   - 實作進度自動儲存 (PBL-002)
   - 支援不同任務類型的評分標準
   - 24小時進度恢復機制
   - 草稿程式重用機制 (PBL-003)
   - 完成頁面任務摘要重新設計 (PBL-004)

3. **多語言支援完善** ✅ (2025/06/30)
   - 完成所有 9 種語言的完整翻譯
   - 修復 PBL 系統所有頁面的多語言顯示
   - 實作動態載入 YAML 場景標題
   - 統一化所有 API 的語言參數處理
   - 修復歷史頁面的場景標題本地化

#### 🟡 進行中的任務
1. **內容驗證系統** (CONTENT-001, CONTENT-002)
   - YAML schema 驗證實作 ✅
   - PR 模板建立 ✅
   - 自動化內容測試 (待完成)
   - 錯誤報告機制 (待完成)

2. **基礎設施優化** (INFRA-001)
   - 錯誤追蹤設置 (Sentry 延後至 Phase 1)
   - 簡易錯誤記錄器已實作 ✅

#### 📋 待辦任務
1. **效能優化**
   - 實作快取策略 (PERF-001)
   - 優化 bundle 大小 (PERF-002)
   - 加入載入狀態 (PERF-003)
   - 目標: LCP < 2.5s, FID < 100ms

2. **測試覆蓋**
   - 認證流程 E2E 測試 (TEST-001)
   - PBL 系統單元測試 (TEST-002)
   - 內容驗證測試 (TEST-003)
   - 目標覆蓋率: 70%+

### 9.2 技術債務管理

#### 高優先級債務
1. **認證狀態管理**: 需要集中化的 auth context
2. **型別安全**: 消除 `any` 型別使用
3. **測試覆蓋率**: 從 30% 提升至 70%

#### 中優先級債務
1. **元件結構**: 部分元件過大需要拆分
2. **API 客戶端**: 需要統一的錯誤處理和重試邏輯
3. **建置配置**: 環境變數管理需要改進

### 9.3 成功指標

#### Phase 1-2 目標
- [ ] 100+ 日活躍用戶
- [ ] < 3 秒頁面載入時間
- [ ] 95%+ 系統可用性
- [ ] 50+ 完成的 PBL 學習場次

#### 品質關卡
進入 Phase 2 前必須達成：
- [ ] 所有關鍵錯誤修復
- [ ] 核心功能穩定運作
- [ ] 基礎監控機制就位
- [ ] 部署流程文件化

### 9.4 資源配置建議

**團隊焦點分配**：
- 前端開發 (2人): 70% 功能開發, 30% UI 優化
- 後端開發 (1人): 60% API 開發, 40% 基礎設施
- 全端開發 (1人): 50% 整合測試, 50% 功能開發

**建議調整**：
- 增加測試工作至 20%
- 加入專門的 DevOps 時間 (10%)
- 每月一次技術債務清理衝刺

## 10. 結論

AI Square 定位為下一代 AI 素養學習平台，通過整合最新的 AI 技術和教育理念，為全球用戶提供革命性的學習體驗。透過分階段實施和持續優化，我們有信心打造一個真正改變 AI 教育格局的產品。

---

*文檔版本: 2.3*  
*更新日期: 2025-06-30*  
*下次審查: 2025-07-30*