# AI Square 產品需求文檔 (PRD)

## 1. 專案概述

### 1.1 產品願景
AI Square 是一個革命性的多智能體學習平台，旨在通過創新的 AI 技術提升全球用戶的 AI 素養能力。平台結合了傳統學習管理系統（LMS）的優點與最新的 AI 技術，為用戶提供個性化、智能化的學習體驗。

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

## 2. 產品架構

### 2.1 系統架構圖
```
┌─────────────────────────────────────────────────────────┐
│                     前端應用層                           │
├─────────────┬─────────────┬─────────────┬───────────────┤
│  學習平台   │   CMS後台    │  用戶中心   │   插件市集    │
├─────────────┴─────────────┴─────────────┴───────────────┤
│                     API 網關層                           │
├─────────────┬─────────────┬─────────────┬───────────────┤
│  認證服務   │  學習服務    │   AI服務    │   分析服務    │
├─────────────┴─────────────┴─────────────┴───────────────┤
│                  智能體編排層 (Orchestrator)             │
├─────────────┬─────────────┬─────────────┬───────────────┤
│    MCP      │  LLM Agent   │ Knowledge   │   Plugin     │
│  Protocol   │   Manager    │   Graph     │   Engine     │
└─────────────┴─────────────┴─────────────┴───────────────┘
```

### 2.2 技術棧
- **前端**：Next.js 15, TypeScript, Tailwind CSS, React Query, D3.js
- **後端**：Python FastAPI
- **資料儲存**：
  - Phase 2: Google Cloud Storage (GCS) 作為主要資料庫
  - Phase 3: PostgreSQL (主資料庫), Redis (快取), Neo4j (知識圖譜)
  - 客戶端: IndexedDB (離線儲存)
- **AI 層**：LangChain, OpenAI API, Google Gemini, Claude 3, MCP Protocol
- **部署**：Google Cloud Platform, Docker, Kubernetes

## 3. 功能模組詳細說明

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
提供智能化、插件化的內容創建和管理平台，支援多種題型和評估方式。

#### 3.2.2 主要功能
- **Rubrics 建構器**
  - ❌ 視覺化拖拽介面（移至 Phase 3）
  - ❌ AI 輔助生成評估標準（待開發）
  - ✅ 多維度評分矩陣（YAML 格式）
  - ✅ 版本控制和協作（GCS 整合）
  
- **任務創建系統**
  - ✅ 標準題型：選擇題、判斷題、配對題
  - ❌ 開放題型：論述題、專案任務、程式設計題（待開發）
  - ❌ AI 生成題目建議（待開發）
  - ❌ 難度自動評估（待開發）
  
- **內容管理**
  - ✅ 分類和標籤系統（YAML 結構）
  - ✅ 多語言內容管理（9 種語言）
  - ❌ 媒體資源庫（待開發）
  - ✅ 內容審核流程（草稿/發布狀態）

#### 3.2.3 AI 輔助功能
- ❌ **智能題目生成**：基於學習目標自動生成題目（待開發）
- ❌ **內容優化建議**：分析現有內容並提供改進建議（待開發）
- ❌ **自動翻譯**：一鍵翻譯到支援的 9 種語言（待開發）

### 3.3 學習平台流程 (Learning Platform Flow)

#### 3.3.1 功能描述
提供完整的學習體驗，從課程選擇到完成認證的全流程支援。

#### 3.3.2 核心學習流程
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

#### 3.3.3 學習模式
- ✅ **自主學習**：按自己節奏學習
- ❌ **引導學習**：跟隨 AI 建議的路徑（待開發）
- ❌ **協作學習**：小組專案和討論（待開發）
- ❌ **競賽模式**：限時挑戰和排行榜（待開發）

### 3.4 AI 輔助任務執行 (Do Tasks with LLM AI)

#### 3.4.1 功能描述
整合多個 LLM 提供智能化的任務執行支援。

#### 3.4.2 主要功能
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

#### 3.4.3 LLM 整合
- ❌ OpenAI GPT-4（待開發）
- ❌ Google Gemini Pro（待開發）
- ❌ Claude 3（待開發）
- ❌ 本地部署模型（未來）

### 3.5 AI 評估與反饋 (Review and Feedback by LLM AI)

#### 3.5.1 功能描述
使用 AI 技術提供即時、個性化的評估和反饋。

#### 3.5.2 評估機制
- **標準答案評估**
  - ✅ 自動評分（選擇題）
  - ✅ 錯誤分析（顯示正確答案）
  - ❌ 知識點定位（待開發）
  
- **開放式評估**
  - ❌ 基於 Rubrics 的 AI 評分（待開發）
  - ❌ 多維度評估（創意、邏輯、完整性）（待開發）
  - ❌ 評分理由說明（待開發）
  
- **Log 分析評估**
  - ❌ 學習行為分析（待開發）
  - ❌ 思考過程評估（待開發）
  - ❌ 努力程度量化（待開發）

#### 3.5.3 反饋系統
- ✅ **即時反饋**：提交後立即獲得
- ✅ **詳細報告**：包含改進建議（解釋文字）
- ❌ **個性化建議**：基於歷史表現（待開發）
- ❌ **同儕比較**：匿名化的相對表現（待開發）

### 3.6 個人檔案與歷史儀表板 (Profile and History Dashboard)

#### 3.6.1 功能描述
提供全面的個人學習數據視覺化和歷史記錄。

#### 3.6.2 主要功能
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

### 3.7 動態語言系統 (Dynamic Language System)

#### 3.7.1 功能描述
提供超越預設 9 種語言的動態語言支援，使用 LLM 即時翻譯並智能管理翻譯快取。

#### 3.7.2 核心功能
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

#### 3.7.3 技術架構
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

#### 3.7.4 工作流程
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

### 3.8 知識圖譜系統 (Knowledge Graph System)

#### 3.8.1 功能描述
提供視覺化、互動式的知識結構展示，幫助學習者理解概念關係和規劃學習路徑。

#### 3.8.2 核心功能
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

#### 3.8.3 視覺化模式
- ✅ **力導向圖**：顯示概念間的關係強度
- ❌ **層級樹狀圖**：展示知識體系結構（待開發）
- ❌ **時間軸視圖**：呈現學習進度（待開發）
- ❌ **3D 網絡圖**：複雜關係的立體展示（待開發）

#### 3.8.4 互動功能
- ✅ 節點點擊查看詳情
- ✅ 縮放和平移
- ❌ 路徑高亮（待開發）
- ❌ 節點篩選（待開發）
- ❌ 自定義佈局（待開發）

### 3.9 PBL 情境式學習系統 (Problem-Based Learning System)

#### 3.9.1 功能描述
透過真實世界的情境模擬，提供任務導向的學習體驗。學習者在多階段任務中運用「聽說讀寫」不同能力，過程中的所有互動都被記錄並作為評估依據。每個情境都對應到特定的 KSA 能力指標和領域 Rubrics。

#### 3.9.2 核心概念
- **PBL 學習理念**
  - 從做中學（Learning by Doing）
  - 真實情境模擬（Real-world Scenarios）
  - 過程重於結果（Process over Product）
  - 多元能力整合（Multi-modal Skills）
  - 個性化回饋（Personalized Feedback）

#### 3.9.3 系統架構
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

#### 3.9.4 情境範例：AI 輔助求職

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

#### 3.9.5 關鍵功能特色

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

#### 3.9.10 AI Prompt Templates

##### 3.9.10.1 階段 1：搜尋助手

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

##### 3.9.10.2 階段 2：分析顧問

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

##### 3.9.10.3 階段 3：寫作教練

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

##### 3.9.10.4 階段 4：面試官

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

#### 3.9.11 評估機制詳細說明

##### 3.9.11.1 過程評分機制

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

##### 3.9.11.2 證據收集機制

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

##### 3.9.11.3 回饋生成策略

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

#### 3.10.3 實施策略
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

## 4. 技術實現細節

### 4.1 知識圖譜系統 (Knowledge Graph System)

#### 4.1.1 資料模型
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

#### 4.1.2 技術架構
- **Phase 2**: 
  - 知識結構儲存於 GCS (YAML/JSON)
  - 前端使用 D3.js 渲染
  - 基於規則的路徑推薦
- **Phase 3**: 
  - 升級至 Neo4j 圖資料庫
  - NetworkX 進階路徑演算法
  - 基於圖分析的個人化推薦

#### 4.1.3 核心功能
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

### 4.2 MCP (Model Context Protocol) 整合

#### 4.2.1 用途
- 標準化 AI 模型接入
- 上下文管理和傳遞
- 多模型協同工作

#### 4.2.2 實現方式
```python
# MCP 配置示例
class MCPConfig:
    models = {
        "primary": "gpt-4",
        "fallback": "gemini-pro",
        "specialized": {
            "code": "claude-3-opus",
            "creative": "gpt-4-creative"
        }
    }
    context_window = 128000
    temperature_defaults = {
        "evaluation": 0.2,
        "creative": 0.8,
        "assistance": 0.5
    }
```

### 4.3 智能體編排 (Agent Orchestrator)

#### 4.3.1 架構設計
```python
# 編排器核心結構
class AgentOrchestrator:
    def __init__(self):
        self.agents = {
            "tutor": TutorAgent(),
            "evaluator": EvaluatorAgent(),
            "content_creator": ContentAgent(),
            "analytics": AnalyticsAgent()
        }
    
    async def process_request(self, request):
        # 智能路由到合適的 agent
        agent = self.route_to_agent(request)
        # 執行並返回結果
        return await agent.execute(request)
```

#### 4.3.2 Agent 類型
1. **教學 Agent**：提供學習指導
2. **評估 Agent**：處理作業評分
3. **內容 Agent**：生成和優化內容
4. **分析 Agent**：提供學習分析

### 4.4 插件系統架構

#### 4.4.1 插件接口
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

#### 4.4.2 插件類型
- **內容插件**：新題型、學習資源
- **評估插件**：特殊評分邏輯
- **分析插件**：自定義報表
- **整合插件**：第三方服務

### 4.5 多模態任務支援系統 (Multi-modal Task Support)

#### 4.5.1 語音任務處理
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

#### 4.5.2 寫作任務處理
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

#### 4.5.3 專案任務管理
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

### 4.6 離線支援策略 (Offline Support Strategy)

#### 4.6.1 IndexedDB 離線快取
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

#### 4.6.2 同步機制（Phase 2 - GCS）
- **樂觀更新**：先更新 IndexedDB，後同步到 GCS
- **批次上傳**：累積多個操作後批次寫入 GCS
- **衝突解決**：使用時間戳和檔案版本
- **智能重試**：指數退避演算法

#### 4.6.3 資料同步流程
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

### 4.7 Chatbot 整合

#### 4.7.1 功能範圍
- ❌ 24/7 學習支援（待開發）
- ❌ 多語言對話（待開發）
- ❌ 上下文記憶（待開發）
- ❌ 情緒識別和回應（待開發）

#### 4.7.2 整合點
- ❌ 網頁內嵌 Widget（待開發）
- ❌ Mobile App SDK（待開發）
- ❌ 第三方平台（Slack, Teams）（待開發）
- ❌ API 接口（待開發）

## 5. 發展階段規劃

### Phase 1: 基礎平台與認證（✅ 已完成）
**期間：2025/06/15 - 2025/06/26（12 天）**
- ✅ 用戶認證系統（本地認證）
- ✅ 基礎 UI/UX（響應式設計）
- ✅ 多語言支援（9 種語言）
- ✅ 能力評估系統（四大領域評估）
- ✅ 基礎 Rubrics 系統
  - ✅ YAML 格式的評估標準定義
  - ✅ KSA（知識、技能、態度）對應關係
  - ✅ 多語言評估情境
- ✅ 基礎 CMS（YAML 編輯器、GCS 整合、版本控制）
  - ✅ YAML 內容管理
  - ✅ Monaco Editor 整合
  - ✅ 版本歷史追蹤
  - ❌ 視覺化 Rubrics 建構器（移至 Phase 3）

### Phase 2: PBL 情境式學習系統（進行中 - 目標：3 個月）

**核心目標：實現第一個完整的 PBL 情境學習 MVP - "AI 輔助求職訓練"**

#### 月份 1：基礎架構建設
- ✅ **PBL 系統框架**（2025/06/27 完成）
  - ✅ 情境程式（Program）資料模型
  - ✅ 階段（Stage）管理系統
  - ✅ 任務（Task）執行引擎
  - ✅ KSA-Rubrics 對應機制

- ✅ **過程記錄系統**（2025/06/27 基礎功能完成）
  - ✅ 互動日誌架構（GCS JSON 儲存）
  - ✅ 時間追蹤系統
  - ✅ 修改歷程記錄
  - ❌ 證據收集機制（音檔、截圖等存 GCS）
  - ❌ 效能優化（GCS 讀取速度需改善）

- ✅ **多 LLM 協作框架**（2025/06/27 完成）
  - ✅ LLM 角色管理（助手、評估者、演員）
  - ✅ 模型路由機制
  - ✅ 上下文管理系統
  - ✅ Token 使用追蹤

#### 月份 2：MVP 情境開發
- ✅ **"AI 輔助求職" 情境實作**（2025/06/27 基礎功能完成）
  - ✅ 階段 1：職缺搜尋系統
    - ✅ AI 搜尋助手整合（Vertex AI/Gemini 實作）
    - ❌ 搜尋策略評估（只有基礎對話，無特定搜尋功能）
    - ✅ KSA 對應：K1.2, S1.3, A1.1
  
  - ✅ 階段 2：職缺分析模組（實際為 Resume Optimization）
    - ✅ 需求解析工具（AI 對話式分析）
    - ✅ 批判思考評估
    - ✅ KSA 對應：K2.1, S2.1, A1.2
  
  - ✅ 階段 3：履歷創作系統
    - ✅ AI 寫作輔助
    - ❌ 版本控制與比較（待實作）
    - ✅ KSA 對應：K2.1, S2.2, A2.2
  
  - ✅ 階段 4：模擬面試平台
    - ❌ 語音對話系統（目前只有文字對話）
    - ✅ 即時回饋機制
    - ✅ KSA 對應：S1.3, S3.1, A1.1

- ✅ **評估引擎開發**（2025/06/27 完成）
  - ✅ 即時過程評分系統
  - ✅ 多維度能力分析
  - ✅ Rubrics 自動對應
  - ✅ 證據導向評估

#### 月份 3：報告與優化
- ✅ **綜合報告系統**（2025/06/27 基礎功能完成）
  - ✅ 視覺化分析儀表板
  - ✅ KSA 達成度雷達圖
  - ✅ 個人化回饋生成
  - ❌ 學習路徑推薦（只有基礎建議）

- ⚠️ **系統整合與優化**（部分完成）
  - ❌ 與現有評估系統整合（缺乏統一抽象層，Assessment 和 PBL 仍為分離系統）
  - ✅ 使用者體驗優化（基礎 UI/UX 完成）
  - ❌ 效能調校（GCS logs 調用時間過長，需實作快取機制）
  - ❌ A/B 測試框架（未實作）


### Phase 3: AI 輔助學習與進階功能（6 個月）

#### 從 Phase 2 延後的功能
- ❌ **動態語言系統**
  - ❌ LLM 即時翻譯
  - ❌ 智能快取管理
  - ❌ 自動 locale 更新
- ❌ **CMS 多語言增強**
  - ❌ AI 輔助翻譯
  - ❌ 多語言版本管理
- ❌ **視覺化 Rubrics 建構器**
  - ❌ 拖拽式介面設計
  - ❌ AI 輔助評估標準生成
  - ❌ 即時預覽功能
- ❌ **傳統題型的 AI 生成**
  - ❌ 選擇題自動生成
  - ❌ 難度自動調整

#### Phase 3 新功能
- ❌ **完整 AI 助教功能**
  - ❌ 24/7 網站 AI 助手
  - ❌ 多輪對話支援
  - ❌ 學習問題解答
- ❌ **開放式問答評估**
- ❌ **協作學習工具**
- ❌ **進階個性化**
- ❌ **統一學習活動抽象層**
  - ❌ Assessment 和 PBL 系統整合
  - ❌ 統一進度追蹤
  - ❌ 統一評估機制

### Phase 4: 知識圖譜（9 個月）
- ✅ 基礎知識圖譜視覺化（已在 Phase 1 完成）
  - ✅ KSA 能力關係圖
  - ✅ 領域導航圖
- ❌ 進階知識圖譜功能（待開發）
  - ❌ 知識點關聯
    - 概念間的前置關係
    - 相關性連結
    - 難度層級
  - ❌ 學習路徑優化
    - 個人化學習路線生成
    - 最短路徑演算法
    - 進度視覺化
  - ❌ 概念視覺化
    - 多視角切換（層級、網絡、時間軸）
    - 概念地圖編輯器
    - 知識密度熱圖
  - ❌ 智能推薦升級
    - 基於圖分析的推薦
    - 知識缺口識別
    - 學習順序建議

### Phase 5: 企業版（12 個月）
- ❌ 企業管理後台（待開發）
- ❌ 團隊協作功能（待開發）
  - ❌ 班級管理系統
  - ❌ 師生關係建立
  - ❌ 班內任務指派
  - ❌ 學習進度追蹤
- ❌ 客製化部署（待開發）
- ❌ 進階分析報表（待開發）

### Phase 6: 外掛市集（15 個月）
- 開發者平台
- 插件商店
- 收益分享機制
- 社群生態系統

## 6. 成功指標 (KPIs)

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

## 7. 風險與挑戰

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

## 8. 結論

AI Square 定位為下一代 AI 素養學習平台，通過整合最新的 AI 技術和教育理念，為全球用戶提供革命性的學習體驗。透過分階段實施和持續優化，我們有信心打造一個真正改變 AI 教育格局的產品。

---

*文檔版本: 1.8*  
*更新日期: 2025-06-26*  
*下次審查: 2025-07-26*