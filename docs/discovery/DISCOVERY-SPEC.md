# Spec: Discovery Module — 職涯探索沉浸式學習

**Date**: 2026-04-05 | **Status**: Spec Review
**Author**: Young (human) + Claude (agent gap analysis)
**Branch**: `feat/issue-106`

---

## 差異化定位：Discovery vs PBL

> Related: [Issue #109 — feat: Discovery 差異化設計](https://github.com/junyiacademy/ai-square/issues/109)

**Discovery 的核心定位：「一日職場體驗」**

Discovery 不是 PBL 的縮小版。它是一個讓學生在 30-60 分鐘內體驗一個職業的沉浸式平台。

| 面向 | PBL（專案式學習） | Discovery（職涯探索） |
|------|-----------------|---------------------|
| 目標 | 做出一個作品 | 認識一個職業 |
| 時間 | 數週（長期） | 30-60 分鐘（一次體驗） |
| 評估 | 作品品質 | 思考深度 + 職涯認知 |
| 體驗 | 像做 side project | 像一日職場體驗 |
| AI 角色 | 教練（教你怎麼做） | 同事/導師（帶你看、帶你想） |
| 產出 | 具體作品（報告/設計/程式） | 職涯認知（我適不適合這個？） |
| 深度 | 深入某領域技能 | 廣泛認識多個領域 |
| 回訪 | 持續完善作品 | 嘗試不同職業 |

### Discovery 核心用戶旅程（唯一標準）

```
選擇職業 → 進入情境 → 完成挑戰 → 職涯反思 → 探索下一個
```

### DO — Discovery 真正需要的功能

1. 沉浸式職場情境（世界觀 + NPC + 任務）
2. 4 維度 AI 評估（思考深度 + 職涯認知）
3. 技能樹視覺化（探索廣度，非深度）
4. 職涯 Reality Check（薪資、日常、所需技能、市場需求）
5. AI 導師深度對話（做完任務後的職涯問答）
6. 職涯適性反思（「你覺得自己適合嗎？為什麼？」）
7. Milestone Quests（更深的職涯挑戰）
8. 多職業比較（「你已探索 3 個職業，差異是...」）

### DON'T — 不屬於 Discovery 的功能

| 功能 | 原因 | 應移至 |
|------|------|--------|
| Leaderboard | 探索不是競爭 | PBL 或移除 |
| Portfolio | PBL 的作品產出概念 | PBL |
| Peer Review | 探索是個人體驗 | PBL |
| Daily Challenges | 探索不需要每日任務機制 | 移除 |
| 複雜 XP 經濟 | 簡單進度指示即可 | 簡化 |

---

## Problem Statement

Discovery 模組是 AI Square 的核心學習體驗——讓 15-18 歲學生沉浸式體驗 18 種職涯路徑，透過 AI 導師引導、自適應任務、遊戲化系統來探索未來方向。模組已有大量實作但缺乏完整規格文件，導致功能邊界不清、驗收標準模糊、部分功能只有前端殼沒有後端串接

## User Story

As a **15-18 歲的學生**, I want to **在遊戲化的沉浸式環境中探索不同職業**, so that **我能找到適合自己的方向並培養相關技能**

---

## 一、現況盤點（已實作功能）

### 1.1 前端頁面（9 個 routes）

| Route | 用途 | 狀態 |
|-------|------|------|
| `/discovery` | Redirect → `/discovery/overview` | ✅ |
| `/discovery/overview` | 個人面板：等級、XP、技能樹、成就 | ✅ |
| `/discovery/scenarios` | 職涯列表 + 興趣測驗 | ✅ |
| `/discovery/scenarios/[id]` | 單一職涯詳情 | ✅ |
| `/discovery/scenarios/[id]/programs/[programId]` | Program 詳情 | ✅ |
| `/discovery/scenarios/[id]/programs/[programId]/tasks/[taskId]` | 任務執行頁（AI 互動核心） | ✅ |
| `/discovery/scenarios/[id]/programs/[programId]/complete` | Program 完成頁 | ✅ |
| `/discovery/achievements` | 成就列表頁 | ✅ |
| `/discovery/evaluation` | 評估結果頁 | ✅ |

### 1.2 API Routes（25+ endpoints）

| Category | Endpoints | 狀態 |
|----------|-----------|------|
| Scenarios CRUD | `/api/discovery/scenarios`, `[id]`, `my`, `find-by-career` | ✅ |
| Programs CRUD | `/api/discovery/programs`, `[programId]` | ✅ |
| Task lifecycle | `tasks`, `tasks/[taskId]`, `next-task` | ✅ |
| Task submit/eval | `tasks/[taskId]` POST (submit + AI eval) | ✅ |
| Program complete | `programs/[programId]/complete` | ✅ |
| Program evaluation | `programs/[programId]/evaluation` | ✅ |
| Regenerate tasks | `programs/[programId]/regenerate` | ✅ |
| Translate feedback | `programs/[programId]/translate-feedback` | ✅ |
| AI Chat | `/api/discovery/chat` | ✅ |
| User profile | `/api/discovery/user/profile` | ✅ |
| Skill tree | `/api/discovery/user/skill-tree/[careerId]` | ✅ |
| Token budget | `/api/discovery/user/budget` | ✅ |
| Career paths (YAML) | `/api/discovery/paths` | ✅ |
| My programs | `/api/discovery/my-programs` | ✅ |
| Translate | `/api/discovery/translate` | ✅ |
| Scenario start | `/api/discovery/scenarios/[id]/start` | ✅ |
| Legacy nested | `/api/discovery/scenarios/[id]/programs/...` | ✅ |

### 1.3 Services（12 個）

| Service | 用途 | 狀態 |
|---------|------|------|
| `discovery-service.ts` | 主服務：scenario/program/task CRUD | ✅ |
| `discovery-learning-service.ts` | 學習流程管理 | ✅ |
| `discovery-scenario-service.ts` | Scenario 相關邏輯 | ✅ |
| `discovery-yaml-loader.ts` | YAML 職涯資料載入 | ✅ |
| `gamification-service.ts` | Gamification orchestrator | ✅ |
| `achievement-engine.ts` | 成就檢查與授予 | ✅ |
| `achievement-checker.ts` | 成就條件評估 | ✅ |
| `skill-progress-service.ts` | 技能進度追蹤 | ✅ |
| `learner-model-service.ts` | 學習者模型（難度調整） | ✅ |
| `adaptive-task-generator.ts` | AI 自適應任務生成 | ✅ |
| `task-evaluation-service.ts` | AI 任務評估 | ✅ |
| `feedback-generation-service.ts` | 綜合回饋生成 | ✅ |
| `discovery-task-completion-service.ts` | 任務完成 pipeline | ✅ |
| `discovery-task-progress-service.ts` | 任務進度追蹤 | ✅ |
| `evaluation-translation-service.ts` | 評估翻譯 | ✅ |
| `multilingual-helper.ts` | 多語言輔助 | ✅ |

### 1.4 Data Layer

| Item | 狀態 |
|------|------|
| 18 Career paths (YAML, 14 languages each) | ✅ |
| PostgreSQL: users, programs, tasks, evaluations | ✅ |
| JSON columns: `users.skills`, `users.achievements`, `users.metadata` | ✅ |
| `GamificationRepository` | ✅ |
| `DiscoveryRepository` | ✅ |
| Per-user rate limit (10 req/min chat) | ✅ |
| Per-user daily token budget (200K tokens) | ✅ |

### 1.5 UI Components（20+ discovery-specific）

| Component | 用途 | 狀態 |
|-----------|------|------|
| `WelcomeScreen` (5 sub-components) | 首次進入動畫 | ✅ |
| `InterestAssessment` (7 sub-components) | 興趣測驗 | ✅ |
| `ScenarioCard` | 職涯卡片 | ✅ |
| `DiscoveryPageLayout` | 共用 layout | ✅ |
| `DiscoveryHeader` | Header | ✅ |
| `DiscoveryNavigation` | 側邊導航 | ✅ |
| `GamificationBar` | XP/等級條 | ✅ |
| `SkillTree` | 技能樹視覺化 | ✅ |
| `AchievementsView` | 成就展示 | ✅ |
| `AchievementToast` | 成就 toast 通知 | ✅ |
| `LevelUpModal` | 升級彈窗 | ✅ |
| `StreakBadge` | 連續天數徽章 | ✅ |
| `XpFloatingAnimation` | XP 浮動動畫 | ✅ |
| `QuestLog` | 任務日誌 | ✅ |
| `WorldOverview` | 世界觀概覽 | ✅ |
| `TaskInteractionHistory` | 任務互動歷程 | ✅ |
| `TaskSubmitSection` | 任務提交區塊 | ✅ |

---

## 二、Gap Analysis（缺失與不完整）

### GAP-1: 興趣測驗結果 → 職涯推薦 缺乏個性化排序

**現況**: `InterestAssessment` 計算 tech/creative/business 三維分數，但 scenarios 列表未依此排序
**缺失**: 測驗結果存在 state 中，重新整理即消失；未持久化到 DB；未影響 scenario 排序

### GAP-2: Program 之間無進度關聯

**現況**: 每個 program 獨立，完成 program A 不影響 program B 的解鎖或內容
**缺失**: 無 program prerequisite 機制；skill tree 的 `requires` 欄位定義了相依但未用於 program 解鎖

### GAP-3: AI Chat 缺乏對話記憶

**現況**: Chat API 每次呼叫只帶當前 context，不帶之前的對話紀錄
**缺失**: 學生重新開啟對話時 AI 無法記得先前討論過的內容

### GAP-4: Portfolio / 作品集功能未實作 — DEFERRED (belongs to PBL, not Discovery)

> **決策（Issue #109）**: Portfolio 是 PBL 的核心產出概念，Discovery 的產出是「職涯認知」而非「作品」。此功能應移至 PBL 模組，Discovery 中不實作。

**現況**: `IPortfolioItem` 型別已定義，`IDiscoveryRepository` 有 CRUD 方法簽章
**缺失**: 無任何 API endpoint、無 UI、repository 方法未實作
**決定**: 不在 Discovery 實作。型別定義可保留供未來 PBL 移植參考

### GAP-5: 同儕評價（Peer Review）未實作 — DEFERRED (belongs to PBL, not Discovery)

> **決策（Issue #109）**: Peer Review 屬於協作學習機制，適合 PBL 的長期作品評審，不適合 Discovery 的個人探索體驗。此功能應移至 PBL 模組。

**現況**: `IPeerReview` 型別已定義
**缺失**: 無 API、無 UI、無任何實作
**決定**: 不在 Discovery 實作

### GAP-6: Career Recommendation API 未串接

**現況**: `ICareerRecommendation` 型別已定義、`getCareerRecommendations()` 介面已宣告
**缺失**: 無實作、無 API endpoint

### GAP-7: Quest System UI 不完整

**現況**: `QuestLog` 元件存在；`QuestProgress` 型別定義了 locked/available/active/completed 狀態
**缺失**: YAML `milestone_quests` 有定義但 quest UI 未串接到 overview page

### GAP-8: Evaluation Rubrics 未與 AI 評估整合

**現況**: `DISCOVERY-RUBRICS.md` 定義了 4 維度評分標準（理解力/分析力/實踐力/表達力各 25 分）
**缺失**: `TaskEvaluationService` 的 AI prompt 未引用 rubrics；AI 自行決定評分而非依據 rubrics

### GAP-9: Streak 連續登入獎勵無前端通知

**現況**: 後端 `updateStreak()` 正確計算；`StreakBadge` 顯示天數
**缺失**: 沒有「你今天繼續學習了！連續 N 天！」的進場通知；斷連也無提醒

### GAP-10: 多職涯切換體驗不順

**現況**: Overview 顯示所有已探索職涯的技能樹
**缺失**: 從一個職涯任務跳到另一個職涯時，沒有 context 切換提示；AI chat context 可能混淆

### GAP-11: 離線/錯誤恢復不足

**現況**: Chat API 回傳 200 + 友善訊息作為 error fallback
**缺失**: 任務提交中斷時無 retry 機制；已輸入的文字會遺失

### GAP-12: 測試覆蓋不完整

**現況**: 有 unit tests 但以 mock 為主
**缺失**: 無 E2E test 覆蓋完整用戶旅程；無 AI response 的 contract test

### GAP-13: Leaderboard — DEFERRED (belongs to PBL, not Discovery)

> **決策（Issue #109）**: Leaderboard 是競爭排名機制，與 Discovery「個人職涯探索」的定位相違背。探索不是競爭，不應以排名評比學生的探索歷程。此功能若有需要應移至 PBL。

**現況**: `/api/discovery/leaderboard` 目錄存在（未完整實作）
**缺失**: 無前端 UI 串接
**決定**: 不在 Discovery 實作。相關 API route 可移除或封存

---

## 三、完整用戶旅程規格

### Journey 1: 首次進入

```
首頁 → /discovery → redirect /discovery/overview → 偵測新用戶（無 XP）
  → 顯示 WelcomeScreen（動畫 + 功能介紹）
  → 用戶點「開始探索」
  → InterestAssessment（5 題多選興趣測驗）
  → 計算 tech/creative/business 分數
  → 跳轉 /discovery/scenarios（按推薦排序）
```

### Journey 2: 選擇職涯 → 開始探索

```
/discovery/scenarios → 用戶點選職涯卡片
  → /discovery/scenarios/[id]（職涯詳情：世界觀、技能樹、里程碑預覽）
  → 用戶點「開始探索」→ POST /api/discovery/scenarios/[id]/start
  → 系統建立 program + 生成首批 tasks
  → 跳轉 /discovery/scenarios/[id]/programs/[programId]
```

### Journey 3: 執行任務

```
Program 頁 → 選擇 task → /tasks/[taskId]
  → 顯示任務說明（instructions + objectives + hints）
  → 用戶在文字區域撰寫回答
  → 點擊「提交」→ POST /tasks/[taskId]
  → AI 評估（TaskEvaluationService）
  → 顯示即時回饋（strengths + improvements + xpEarned）
  → 若未通過 → 可修改重新提交
  → 若通過 → 任務標記 completed + gamification pipeline 觸發
```

### Journey 4: 任務完成後

```
Task completed → Gamification Pipeline:
  1. addXpAndUpdateLevel() → 加 XP、檢查升級
  2. updateSkillProgress() → 更新技能等級
  3. updateStreak() → 更新連續天數
  4. updateAfterTaskCompletion() → 更新 learner model
  5. checkAndAward() → 檢查成就
  → 前端顯示：
    - XpFloatingAnimation（XP 數字飄動）
    - LevelUpModal（如果升級）
    - AchievementToast（如果獲得新成就）
  → 返回 program 頁 → 顯示下一個任務
```

### Journey 5: 完成 Program

```
最後一個 task completed → POST /programs/[programId]/complete
  → FeedbackGenerationService 生成綜合回饋
  → 跳轉 /complete 頁面
  → 顯示導師回饋（markdown 格式、角色代入）
  → 顯示學習統計（嘗試次數、通過次數、最高 XP）
  → 按鈕：「繼續探索」→ 回 scenarios 列表
```

### Journey 6: AI 導師對話

```
任務頁 → 點擊 chat icon → 打開聊天面板
  → 用戶發送訊息 → POST /api/discovery/chat
  → AI 以導師角色回覆（繁體中文、友善鼓勵）
  → Rate limit: 10 req/min, 200K tokens/day
  → 超過限額 → 顯示友善提示
```

### Journey 7: Overview 面板

```
/discovery/overview
  → 等級 + XP 進度條
  → 4 stat cards（XP、等級、成就數、連續天數）
  → 已探索職涯列表（可展開看技能樹）
  → 最近成就（最多 9 個）
  → 若無任何進度 → 引導前往 scenarios
```

---

## 四、資料流 Contract

### 4.1 Task Submit → Evaluate → Gamify

```
POST /api/discovery/programs/[programId]/tasks/[taskId]

Request:
{
  "response": string,       // 學生的回答
  "timeSpent": number       // 秒數（optional）
}

Response (success):
{
  "success": true,
  "feedback": string,        // AI 評估回饋
  "strengths": string[],     // 優點
  "improvements": string[],  // 改進建議
  "completed": boolean,      // 是否通過
  "xpEarned": number,        // 獲得的 XP
  "skillsImproved": string[] // 提升的技能 ID
}
```

### 4.2 Task Complete → Gamification Pipeline

```
POST /api/discovery/programs/[programId]/complete

Response:
{
  "success": true,
  "evaluation": {
    "id": string,
    "score": number,
    "feedbackText": string
  },
  "xpEarned": number,
  "feedback": string,               // 綜合回饋（markdown）
  "feedbackVersions": {
    "zhTW": string,
    "en": string
  },
  "gamification": {
    "leveledUp": boolean,
    "newLevel": number | null,
    "totalXp": number,
    "skillLevelUps": string[],
    "newAchievements": [
      { "id": string, "name": string, "xpReward": number }
    ],
    "streak": {
      "currentStreak": number,
      "longestStreak": number
    },
    "isFirstWin": boolean            // 首次完成特別獎勵
  }
}
```

### 4.3 Gamification Profile

```
GET /api/discovery/user/profile

Response:
{
  "level": number,
  "totalXp": number,
  "xpToNextLevel": number,
  "achievements": EarnedAchievement[],
  "streak": { "currentStreak": number, "longestStreak": number, "lastActiveDate": string },
  "skillProgress": {
    [careerId]: {
      [skillId]: {
        "level": number,
        "maxLevel": number,
        "xp": number,
        "lastPracticedAt": string
      }
    }
  }
}
```

### 4.4 Skill Tree

```
GET /api/discovery/user/skill-tree/[careerId]?lang=zhTW

Response:
{
  "success": true,
  "skillTree": {
    "careerId": string,
    "careerName": string,
    "nodes": [
      {
        "id": string,
        "name": string,
        "description": string,
        "max_level": number,
        "requires": string[],
        "progress": SkillProgress,
        "isCore": boolean,
        "isUnlocked": boolean
      }
    ]
  }
}
```

### 4.5 AI Chat

```
POST /api/discovery/chat

Request:
{
  "message": string,
  "context": {
    "aiRole": string,
    "pathTitle": string,
    "currentTask": string,
    "currentTaskDescription": string,
    "taskIndex": number,
    "totalTasks": number,
    "taskProgress": number,
    "completedTasks": string,
    "skills": string[]
  }
}

Response:
{
  "response": string   // AI 回覆（繁體中文）
}

Rate Limits:
- 10 requests / minute / user
- 200,000 tokens / day / user
```

### 4.6 Token Budget

```
GET /api/discovery/user/budget

Response:
{
  "remaining": number,
  "limit": number,              // 200000
  "sessionsRemaining": number,
  "sessionsLimit": number,
  "resetAt": string,            // UTC midnight
  "tokensUsed": number,
  "sessionsStarted": number
}
```

---

## 五、AI 互動規格

### 5.1 AI 導師角色

- **Persona**: 依職涯 YAML 的 `world_setting` 決定。如 DataLab 的「Oracle 首席分析師」
- **語氣**: 同事/導師（非考官），友善但專業
- **語言**: 跟隨用戶語言設定（預設繁體中文）
- **限制**: 不給完整答案，引導學生思考

### 5.2 任務評估 AI

- **Model**: Gemini 2.5 Flash（Vertex AI）
- **Temperature**: 0.7
- **評估維度**: 根據 DISCOVERY-RUBRICS.md
  - 理解力（25 分）
  - 分析力（25 分）
  - 實踐力（25 分）
  - 表達力（25 分）
- **通過門檻**: `completed: true` 需 AI 判定回答確實針對任務要求
- **回饋準則**: 先肯定再建議、具體指出問題、給出下一步、最多 3 個改進建議

### 5.3 自適應任務生成 AI

- **觸發條件**: 用戶完成當前任務後，由 `AdaptiveTaskGenerator` 生成下一個
- **輸入**: Learner Model + YAML World Setting + Target Skill
- **難度調整規則**:
  - avg score > 85% AND avg attempts < 1.5 → 提高難度
  - avg score < 50% OR avg attempts > 3 → 降低難度
  - 弱項技能 → 提供更多引導、分步驟、給提示
  - 強項技能 → 加入邊界案例、減少提示
- **XP 獎勵**: beginner=50, intermediate=80, advanced=120, expert=200

### 5.4 綜合回饋 AI

- **觸發**: Program 完成時
- **輸入**: 完整學習旅程（所有嘗試 + AI 回饋）
- **輸出**: 2-3 段 markdown，角色代入的導師評語
- **簽名**: 用歷史名人（如 Dr. Turing、Prof. McCarthy）
- **Temperature**: 0.8

---

## 六、Gamification 規格

### 6.1 XP 系統

| 項目 | 數值 |
|------|------|
| 每級所需 XP | 500 |
| 首次完成獎勵 | +500 bonus XP |
| Task XP (beginner) | 50 |
| Task XP (intermediate) | 80 |
| Task XP (advanced) | 120 |
| Task XP (expert) | 200 |

### 6.2 等級系統

| Level | 名稱 (zh) | 名稱 (en) |
|-------|-----------|-----------|
| 1 | 見習技師 | Apprentice Technician |
| 2 | 學徒工程師 | Junior Engineer |
| 3 | 初級工程師 | Associate Engineer |
| 4 | 中級工程師 | Mid-level Engineer |
| 5 | 資深工程師 | Senior Engineer |
| 6 | 專家 | Expert |
| 7 | 大師 | Master |
| 8 | 傳說 | Legend |
| 9 | 先驅者 | Pioneer |
| 10 | 創世者 | Creator |

### 6.3 技能樹

- **Core skills**: 4 per career, max_level=10
- **Advanced skills**: 3 per career, max_level=15, requires core skills
- **Unlock 規則**: 所有 `requires` 技能需達到 level 1+
- **XP per skill level**: 與 task XP 連動

### 6.4 成就系統

**Built-in 成就**:

| ID | 條件 | XP Reward |
|----|------|-----------|
| `first_task` | 完成第 1 個任務 | 50 |
| `tasks_5_{careerId}` | 完成 5 個任務 | 100 |
| `tasks_10_{careerId}` | 完成 10 個任務 | 200 |
| `tasks_25_{careerId}` | 完成 25 個任務 | 500 |
| `level_5` | 達到等級 5 | 100 |
| `level_10` | 達到等級 10 | 250 |
| `streak_3` | 連續 3 天 | 50 |
| `streak_7` | 連續 7 天 | 150 |
| `skill_mastery_first_{careerId}` | 任一技能達 Lv.3 | 100 |
| `skill_mastery_3_{careerId}` | 3 個技能達 Lv.3 | 300 |

**YAML-defined 成就** (per career):
- `exploration`: condition-based（`complete_N_tasks`, `reach_level_N`, `streak_N_days`）
- `mastery`: skill level checks（所有 required skills 達到指定等級）
- `special`: hidden achievements

### 6.5 Streak（連續學習）

- 每天第一次完成任務 → streak +1
- 一天沒活動 → streak 歸零
- `longestStreak` 永遠保留最高紀錄
- 以 YYYY-MM-DD 為單位

### 6.6 Learner Model

- 存儲於 `users.metadata.learnerModels[careerId]`
- 追蹤: recentScores(last 10), struggleAreas, strengthAreas, preferredTaskTypes, averageScore, averageAttempts
- 難度: beginner → intermediate → advanced → expert（自動調整）

---

## 七、Acceptance Criteria（驗收標準）

### Scenario Group A: 首次用戶體驗

#### Scenario A1: 新用戶首次進入 Discovery
```gherkin
Given 用戶已登入且從未使用過 Discovery
When 用戶導航到 /discovery
Then 系統跳轉到 /discovery/overview
And 顯示 WelcomeScreen 動畫
And 提供「開始探索」按鈕
```

#### Scenario A2: 完成興趣測驗
```gherkin
Given 用戶在興趣測驗頁面
When 用戶完成所有 5 題
Then 系統計算 tech/creative/business 三維分數
And 跳轉到 /discovery/scenarios
And 職涯列表依推薦分數排序顯示
```

#### Scenario A3: 興趣測驗可多選
```gherkin
Given 用戶正在作答某題
When 用戶選擇多個選項
Then 所有選中的選項都被記錄
And 用戶可以取消已選的選項
And 至少選一個才能前進
```

### Scenario Group B: 職涯探索

#### Scenario B1: 瀏覽職涯列表
```gherkin
Given 用戶在 /discovery/scenarios
When 頁面載入完成
Then 顯示 18 個職涯卡片
And 每張卡片包含：標題、簡述、圖示
And 卡片依據用戶語言顯示對應翻譯
```

#### Scenario B2: 查看職涯詳情
```gherkin
Given 用戶在 scenarios 列表
When 用戶點擊某張職涯卡片
Then 跳轉到 /discovery/scenarios/[id]
And 顯示世界觀（名稱 + 描述 + 氛圍）
And 顯示起始場景
And 顯示技能樹預覽
And 提供「開始探索」按鈕
```

#### Scenario B3: 開始探索職涯
```gherkin
Given 用戶在職涯詳情頁
When 用戶點擊「開始探索」
Then 系統呼叫 POST /scenarios/[id]/start
And 建立新的 program
And 生成首批 tasks
And 跳轉到 program 頁面
```

### Scenario Group C: 任務執行

#### Scenario C1: 提交任務回答
```gherkin
Given 用戶在任務執行頁面
And 用戶已輸入回答文字
When 用戶點擊「提交」
Then 系統將回答送至 AI 評估
And 顯示 loading 狀態
And AI 回傳評估結果（feedback + strengths + improvements）
And 顯示是否通過 (completed)
And 顯示獲得的 XP
```

#### Scenario C2: 任務未通過可重試
```gherkin
Given 用戶提交了回答
And AI 判定未通過 (completed: false)
When 用戶查看回饋
Then 顯示具體改進建議
And 用戶可以修改回答重新提交
And 保留之前的互動歷程
```

#### Scenario C3: 任務通過觸發 gamification
```gherkin
Given 用戶提交的回答被 AI 判定通過
When gamification pipeline 執行完成
Then 用戶獲得 XP
And 相關技能經驗值增加
And 連續天數更新（如果是當天首次）
And 檢查並授予符合條件的成就
And 前端顯示 XP 動畫
And 如果升級則顯示 LevelUpModal
And 如果有新成就則顯示 AchievementToast
```

#### Scenario C4: 首次完成獎勵
```gherkin
Given 用戶從未完成過任何任務（totalXp === 0）
When 用戶首次成功完成一個任務
Then 額外獲得 500 XP bonus
And gamification.isFirstWin === true
And 前端顯示特殊的「首次勝利」動畫
```

### Scenario Group D: AI 互動

#### Scenario D1: AI Chat 正常回覆
```gherkin
Given 用戶在任務頁面打開聊天面板
When 用戶發送訊息
Then AI 以導師角色用繁體中文回覆
And 回覆內容與當前任務相關
And 回覆風格友善鼓勵
```

#### Scenario D2: Rate limit 觸發
```gherkin
Given 用戶在 1 分鐘內發送超過 10 條訊息
When 用戶嘗試發送第 11 條
Then 回傳 429 Too Many Requests
And 顯示「你發送訊息太頻繁了」提示
And 顯示 Retry-After 時間
```

#### Scenario D3: Daily token budget 用盡
```gherkin
Given 用戶當天 AI token 使用量已達 200,000
When 用戶嘗試發送 chat 訊息
Then 顯示「今天的 AI 使用額度已用完」
And 告知額度將於明天 UTC 午夜重置
```

### Scenario Group E: Gamification

#### Scenario E1: Overview 面板正確顯示
```gherkin
Given 用戶已完成多個任務
When 用戶訪問 /discovery/overview
Then 顯示正確的等級和等級名稱
And XP 進度條反映當前 level 內的進度
And 4 stat cards 顯示正確數值
And 已探索職涯可展開查看技能樹
And 最近成就按時間倒序顯示
```

#### Scenario E2: 技能樹更新
```gherkin
Given 用戶完成了針對 skill_X 的任務
When 用戶查看技能樹
Then skill_X 的等級和 XP 有增加
And 進度條正確反映新的進度
And 如果滿足解鎖條件，advanced skills 從 locked 變為 unlocked
```

#### Scenario E3: 連續天數計算
```gherkin
Given 用戶昨天完成了任務（lastActiveDate = yesterday）
When 用戶今天完成第一個任務
Then currentStreak 增加 1
And longestStreak 如果 currentStreak 超過則更新
```

#### Scenario E4: 連續天數斷連
```gherkin
Given 用戶上次活動是兩天前
When 用戶今天完成任務
Then currentStreak 重置為 1
And longestStreak 保持不變
```

### Scenario Group F: 多語言

#### Scenario F1: 職涯內容多語言
```gherkin
Given 用戶語言設定為日文 (ja)
When 用戶瀏覽職涯列表
Then 所有職涯卡片以日文顯示
And 職涯詳情頁以日文顯示世界觀
And AI chat 以日文回覆
```

#### Scenario F2: 回饋翻譯
```gherkin
Given 用戶完成任務並獲得英文回饋
When 用戶語言設定為繁體中文
Then 提供翻譯按鈕
And 點擊後呼叫翻譯 API
And 顯示繁體中文版回饋
```

### Scenario Group G: 錯誤處理

#### Scenario G1: AI 服務異常
```gherkin
Given AI 服務暫時不可用
When 用戶提交任務回答
Then 不顯示技術錯誤訊息
And 顯示友善提示「請稍後再試」
And 用戶的回答不會遺失
```

#### Scenario G2: 未認證用戶
```gherkin
Given 用戶未登入
When 用戶嘗試訪問 /discovery 任何頁面
Then 跳轉到登入頁面
And 保留 redirect URL
And 登入後返回原頁面
```

---

## 八、Guardrails（不可違反的約束）

### 安全與存取
- [ ] 所有 Discovery API 需驗證用戶身份
- [ ] AI token 用量有 per-user daily cap (200K)
- [ ] Chat 有 per-user rate limit (10/min)
- [ ] 不得在任何 response 中洩漏其他用戶的資料

### 資料完整性
- [ ] Gamification 數據不得出現負數（XP、level、streak）
- [ ] 成就一旦獲得不可重複授予（idempotent）
- [ ] Learner Model 的 recentScores 最多保留 10 筆
- [ ] Task 狀態流轉: pending → active → completed（不可回退）

### AI 品質
- [ ] AI 回饋必須用與學生相同的語言
- [ ] AI 永遠不給完整答案
- [ ] AI 評估不可有 0 分（minimum effort = minimum feedback）
- [ ] AI 回饋最多 3 個改進建議
- [ ] AI 不批評學生「沒有回應指示」（設計問題不是學生問題）

### 前端體驗
- [ ] 所有頁面必須有 loading 狀態
- [ ] 所有 API error 必須有友善的 fallback UI
- [ ] 不能出現 console.error 直接給用戶看
- [ ] 動畫不能阻擋用戶操作

### YAML 品質
- [ ] 每個職涯 YAML ≥ 35/50 分（依 DISCOVERY-RUBRICS.md）
- [ ] 起始場景 ≥ 12/15 分
- [ ] 在地連結 ≥ 3/5 分
- [ ] 4 core skills + 3 advanced skills per career

---

## 九、Technical Design（高階架構）

```
┌──────────────────────────────────────────────────┐
│                  Frontend (Next.js 15)            │
│  /discovery/*  → React Client Components         │
│  InterestAssessment → ScenarioList → TaskPage     │
├──────────────────────────────────────────────────┤
│           API Routes (Next.js Route Handlers)     │
│  /api/discovery/scenarios/* │ programs/* │ chat    │
│  Auth middleware │ Rate limit │ Token budget       │
├──────────────────────────────────────────────────┤
│              Service Layer                        │
│  DiscoveryService │ GamificationService           │
│  AdaptiveTaskGenerator │ TaskEvaluationService     │
│  FeedbackGenerationService │ LearnerModelService   │
├──────────────────────────────────────────────────┤
│          Repository Layer (Raw SQL + Pool)         │
│  DiscoveryRepository │ GamificationRepository      │
│  EvaluationRepository │ TaskRepository             │
├──────────────────────────────────────────────────┤
│               Data Sources                        │
│  PostgreSQL (users, programs, tasks, evaluations)  │
│  YAML Files (18 careers × 14 languages)           │
│  Vertex AI (Gemini 2.5 Flash)                     │
└──────────────────────────────────────────────────┘
```

### DB Schema (relevant tables/columns)

```
users:
  id, email, name, ...
  skills      JSONB  → { [careerId]: { [skillId]: SkillProgress } }
  achievements JSONB → EarnedAchievement[]
  metadata    JSONB  → { learnerModels: {...}, streak: {...} }
  total_xp    INTEGER
  level       INTEGER

programs:
  id, user_id, scenario_id, status, metadata JSONB

tasks:
  id, program_id, title, type, status, content JSONB
  interactions JSONB[]
  started_at, completed_at

evaluations:
  id, user_id, program_id, task_id, mode, score, feedback_text
  discovery_data JSONB
```

---

## 十、Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| AI 回覆品質不穩定（hallucination、評分不一致） | 學生收到不合理的回饋 | 已有 JSON parse fallback；需要整合 DISCOVERY-RUBRICS 到 prompt（GAP-8）|
| Vertex AI latency spike | 任務提交 timeout | 已有 friendly error fallback；可考慮增加 retry |
| 用戶惡意大量呼叫 AI | 成本暴增 | 已有 rate limit + daily cap |
| YAML 品質參差 | 學習體驗不一致 | 已有 DISCOVERY-RUBRICS 評分標準 |
| Interest assessment 結果不持久 | 重新整理就消失 | GAP-1，需持久化到 DB |
| 無 E2E 測試 | 功能 regression 難發現 | GAP-12，需增加完整用戶旅程測試 |

---

## 十一、Gap Prioritization（建議修復優先序）

| Priority | Gap | Effort | Impact |
|----------|-----|--------|--------|
| P0 | GAP-8: Rubrics 整合到 AI eval prompt | S | High — 直接影響評估品質 |
| P0 | GAP-1: 興趣測驗結果持久化 | M | High — 首次體驗斷裂 |
| P1 | GAP-3: AI Chat 對話記憶 | M | Medium — 用戶體驗 |
| P1 | GAP-7: Quest UI 串接 | S | Medium — gamification 完整度 |
| P1 | GAP-9: Streak 通知 | S | Medium — engagement |
| P1 | GAP-12: E2E 測試 | L | High — 品質保障 |
| P2 | GAP-11: 離線/錯誤恢復 | M | Medium — robustness |
| P2 | GAP-10: 多職涯切換 | S | Low — edge case |
| P2 | GAP-2: Program prerequisites | M | Low — 現階段夠用 |
| P3 | GAP-4: Portfolio | L | Low — 可後續迭代 |
| P3 | GAP-5: Peer Review | L | Low — 需要用戶量支撐 |
| P3 | GAP-6: Career Recommendation API | M | Low — 需要更多數據 |

---

**Version**: 1.0 | **Last Updated**: 2026-04-05
**Philosophy**: 規格先行。Code 是規格的產物，不是反過來
