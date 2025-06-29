# PBL 系統重構計畫

## 現況分析

### 現有架構
```
Scenario
  └── Stages (stage-1, stage-2, ...)
        └── Tasks (task-1-1, task-1-2, ...)
```

### 問題點
1. **Stage 層級冗餘**：大部分情況下，stage 只是任務的分組，沒有獨立的功能或意義
2. **命名混亂**：目前使用 "journey" 但實際想表達的是 "program"（學習計畫）
3. **資料結構複雜**：每個 task 都產生獨立的檔案，難以管理整個學習歷程

## 新架構設計

### 概念定義
- **Scenario（情境）**：一個學習主題，包含多個任務
- **Program（學習計畫）**：用戶針對某個 Scenario 開啟的一次學習歷程
- **Task（任務）**：學習計畫中的具體任務

### 資料結構
```
Scenario
  └── Tasks (直接包含所有任務)

Program (一次學習歷程)
  └── Task Logs (該次學習的任務記錄)
```

### 資料庫結構
```
user_pbl_logs/
  {user_email}/
    scenario_{scenario_id}/
      program_{program_id}_{timestamp}/
        metadata.json     # Program 的基本資訊
        task_{task_id}/
          metadata.json   # Task 的基本資訊（開始時間、狀態等）
          log.json        # 對話記錄、互動歷史
          progress.json   # 進度資訊、評分、完成狀態
```

## 受影響範圍分析

### 主要受影響的檔案

#### 類型定義
- `/types/pbl.ts` - Stage interface、相關類型定義

#### API 端點
- `/api/pbl/sessions/route.ts` - 創建 session
- `/api/pbl/task-logs/route.ts` - 儲存 task logs
- `/api/pbl/history/route.ts` - 查詢歷史記錄
- `/api/pbl/journey-chat/route.ts` - 聊天功能
- `/api/pbl/journey-analyze/route.ts` - 分析功能
- `/api/pbl/evaluate/route.ts` - 評估功能
- `/api/pbl/progress/route.ts` - 進度追蹤

#### 儲存服務
- `/lib/storage/pbl-gcs-service.ts` - GCS 儲存邏輯
- `/lib/storage/pbl-journey-service.ts` - Journey 服務（需改為 Program）

#### 前端頁面
- `/app/pbl/scenarios/[id]/learn/page.tsx` - 學習頁面
- `/app/pbl/scenarios/[id]/complete/page.tsx` - 完成頁面
- `/app/history/page.tsx` - 歷史頁面
- `/app/pbl/sessions/[id]/review/page.tsx` - 回顧頁面

#### 其他元件
- `/hooks/usePBLProgress.ts` - 進度追蹤 Hook
- `/components/pbl/KSADiagnosticReport.tsx` - 診斷報告元件

## 重構步驟

### Phase 1: 資料模型重構
1. **更新 YAML 結構**
   - 移除 stages 層級
   - 將所有 tasks 直接放在 scenario 下
   - 保留原有的 task 內容

2. **更新 TypeScript 介面**
   - 移除 Stage 相關的介面
   - 更新 Scenario 介面，直接包含 tasks
   - 新增 Program 介面取代 Journey

3. **更新資料庫服務 (pbl-gcs-service.ts)**
   - 改為 program-based 的檔案結構
   - 一個 program 包含多個 task logs
   - 支援按 program 查詢所有相關 logs

### Phase 2: API 層重構
1. **/api/pbl/scenarios/[id]/start**
   - 改為創建新的 program 而非 journey
   - 返回 program_id

2. **/api/pbl/task/logs**
   - 改為在 scenario/program/task 資料夾下儲存
   - 路徑：`scenario_{scenarioId}/program_{programId}_{timestamp}/task_{taskId}/log.json`
   - 分離儲存：metadata.json、log.json、progress.json

3. **/api/pbl/history**
   - 改為返回 program 列表
   - 每個 program 包含所有 tasks 的摘要

4. **/api/pbl/complete**
   - 以 program 為單位計算總成績
   - 顯示每個 task 的個別成績

### Phase 3: 前端頁面調整
1. **學習頁面 (/pbl/learn)**
   - URL 改為 `/pbl/program/[programId]/learn`
   - 移除 stage 相關的進度顯示
   - 直接顯示 task 列表和進度

2. **完成頁面 (/pbl/complete)**
   - 以 program 為單位顯示總結
   - 列出所有 tasks 的成績

3. **歷史頁面 (/history)**
   - 每張卡片代表一個 program
   - 顯示 scenario 名稱和完成狀態
   - 點擊可查看該 program 的詳細內容

### Phase 4: 資料遷移（如需要）
- 將現有的 task-based logs 整合成 program-based 結構
- 保持向後相容性

## 實施優先順序

1. **高優先**
   - 更新資料模型和介面定義
   - 修改 GCS 服務以支援新結構
   - 更新 start API 創建 program

2. **中優先**
   - 更新 history API 和頁面
   - 修改 complete 頁面
   - 調整學習頁面的 URL 和導航

3. **低優先**
   - 資料遷移工具
   - 移除舊的 stage 相關程式碼
   - 優化效能

## 程式碼範例

### 舊的 YAML 結構
```yaml
stages:
  - id: stage-1-research
    name: Job Market Research
    tasks:
      - id: task-1-1
        title: Industry Analysis
```

### 新的 YAML 結構
```yaml
tasks:
  - id: task-1
    title: Industry Analysis
    category: research  # 可選：用來分類任務
```

### 舊的類型定義
```typescript
interface ScenarioProgram {
  stages: Stage[];
}

interface Stage {
  id: string;
  tasks: Task[];
}
```

### 新的類型定義
```typescript
interface Scenario {
  id: string;
  title: string;
  tasks: Task[];  // 直接包含任務
}

interface Program {  // 取代 Journey
  id: string;
  scenarioId: string;
  userId: string;
  startedAt: string;
  status: 'in_progress' | 'completed' | 'paused';
  taskLogs: TaskLog[];
}
```

### 舊的資料路徑
```
user_pbl_logs/{email}/pbl_{scenarioId}_stage_{stageId}_task_{taskId}_{timestamp}_{random}.json
```

### 新的資料路徑
```
user_pbl_logs/{email}/scenario_{scenarioId}/program_{programId}_{timestamp}/
  metadata.json  # Program 層級資訊
  task_{taskId}/
    metadata.json  # Task 基本資訊
    log.json       # 對話記錄
    progress.json  # 進度和評分
```

### 檔案內容範例

**Program metadata.json**
```json
{
  "programId": "prog_123",
  "scenarioId": "ai-job-search",
  "userId": "user@example.com",
  "startedAt": "2024-01-01T10:00:00Z",
  "status": "in_progress",
  "totalTasks": 5,
  "completedTasks": 2
}
```

**Task metadata.json**
```json
{
  "taskId": "task-1",
  "title": "Industry Analysis",
  "startedAt": "2024-01-01T10:05:00Z",
  "status": "completed"
}
```

**Task log.json**
```json
{
  "interactions": [
    {
      "timestamp": "2024-01-01T10:05:30Z",
      "type": "user",
      "content": "Help me analyze the tech industry trends"
    },
    {
      "timestamp": "2024-01-01T10:05:35Z", 
      "type": "ai",
      "content": "I'll help you analyze current tech industry trends..."
    }
  ]
}
```

**Task progress.json**
```json
{
  "completedAt": "2024-01-01T10:30:00Z",
  "score": 85,
  "feedback": "Great analysis of industry trends",
  "ksa_scores": {
    "K1.1": 90,
    "S1.1": 80
  }
}
```

## 預期效益

1. **簡化架構**：移除不必要的 stage 層級
2. **更清晰的概念**：Program 更準確地表達「一次學習歷程」
3. **更好的資料組織**：
   - 相關的 logs 都在同一個 program 資料夾下
   - 同一個 scenario 的所有 programs 集中管理
   - 方便查詢特定 scenario 的學習歷史
4. **更直觀的使用體驗**：用戶更容易理解和追蹤學習進度
5. **效能優化**：
   - 查詢特定 scenario 的歷史時，只需掃描該 scenario 資料夾
   - 減少檔案系統的搜尋範圍
6. **更好的擴展性**：
   - 每個 task 資料夾可以輕鬆添加新的檔案類型（如 audio.json、attachments/ 等）
   - 檔案名稱統一，減少命名困擾
7. **關注點分離**：
   - metadata.json：靜態資訊
   - log.json：動態互動記錄
   - progress.json：評估和進度