# PBL Task Log 結構說明

## 簡化後的結構 (2025-06-28)

### 設計原則
1. **避免重複資料** - 相同概念只儲存一次
2. **Task-based** - 每個 task 有獨立的 log 檔案
3. **Single Source of Truth** - `session_data` 包含所有資料（包括 processLogs）

### PBLLogData 結構

```typescript
interface PBLLogData {
  // 核心識別碼
  session_id: string;      // Session UUID
  scenario_id: string;     // 場景 ID (例: "ai-job-search")
  stage_id: string;        // 階段 ID (例: "stage-1-research")
  task_id: string;         // 任務 ID (例: "task-1-1")
  
  // 狀態和語言
  status: 'in_progress' | 'completed' | 'paused';
  language: string;        // 語言代碼 (例: "zh-TW")
  
  // 進度追蹤
  progress: {
    score?: number;                // 任務分析分數
    conversation_count: number;    // 使用者訊息數量
    total_time_seconds: number;    // 總花費時間（秒）
    completed_at?: string;         // 完成時間 (ISO string)
  };
  
  // 完整 session 資料（包含所有資訊，包括 processLogs）
  session_data: SessionData;
}
```

### 對話資料存儲

對話記錄儲存在 `session_data.processLogs` 中，不再重複儲存為 `conversation_logs`：

```typescript
// processLog 包含完整對話資訊
processLog.detail.aiInteraction = {
  prompt: string;      // 使用者輸入
  response: string;    // AI 回應
  tokensUsed: number;  // Token 使用量
}
```

### 檔案命名規則

```
pbl_{scenarioId}_stage_{stageId}_task_{taskId}_{timestamp}_{random}
```

例如：
```
pbl_ai-job-search_stage_stage-1-research_task_task-1-1_1751132267159_sh2p4wlmi6.json
```

### 資料來源說明

| 資料 | 儲存位置 | 說明 |
|------|----------|------|
| 使用者資訊 | `session_data.userId`, `session_data.userEmail` | 從 session_data 取得 |
| 時間資訊 | `session_data.startedAt`, `session_data.lastActiveAt` | 開始和最後活動時間 |
| 場景/階段/任務標題 | `session_data.scenarioTitle`, `session_data.currentStageTitle`, `session_data.currentTaskTitle` | 完整標題資訊 |
| 評估結果 | `session_data.stageResults` | 階段評估結果 |
| 對話內容 | `session_data.processLogs` | 完整的對話記錄和互動歷史 |

### 與舊格式的差異

| 舊格式 | 新格式 | 說明 |
|--------|--------|------|
| `user_id`, `user_email` (根層級) | 移除 | 資料在 `session_data` 中 |
| `metadata` object | 移除 | 重複資料，不需要 |
| `timestamp`, `duration_seconds` (根層級) | 移至 `progress` | 更有組織性 |
| `conversation_logs` | 移除 | 對話資料在 `session_data.processLogs` |
| `scenario_info`, `stage_info`, `task_info` | 移除 | 只需要 ID，詳細資料在 `session_data` |

### 使用範例

#### 讀取 log 檔案
```typescript
const logData = await pblGCS.getSessionByLogId(logId, userEmail);
// logData.session_data 包含所有 session 資訊（包括 processLogs）
// logData.progress 包含進度資訊
```

#### 查詢使用者的所有 sessions
```typescript
const sessions = await pblGCS.listUserSessions(userEmail, 'completed');
// 只需要 email
```

#### 查詢特定 task 的所有日誌
```typescript
// 使用 GCS service
const taskLogs = await pblGCS.getTaskLogs(userEmail, 'task-1-1');

// 或使用 API
const response = await fetch('/api/pbl/task-logs?taskId=task-1-1');
// 返回該 task 的所有 sessions，包含對話記錄
```

### 優點
1. **減少資料冗餘** - 相同資料不重複儲存，避免 conversation_logs 重複
2. **更清晰的結構** - 核心識別碼、進度、完整資料分類清楚
3. **效能優化** - 檔案大小更小，傳輸更快
4. **彈性查詢** - 支援按 task_id 查詢所有歷史記錄