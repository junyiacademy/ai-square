# PBL Task-Based Sessions 功能驗證報告

## 🔍 測試目標
驗證 PBL 系統是否正確實施了 task-based sessions，確保：
1. 每個 task 有獨立的 session 和 log
2. Learn 過程中資料正確保存
3. Complete 頁面正確顯示資料
4. History 頁面以 task card 形式顯示

## ✅ 已實施的改動

### 1. **數據結構更新** 
- `SessionData` 新增欄位：
  ```typescript
  currentStageId?: string;
  currentStageTitle?: string;
  currentTaskId?: string;
  currentTaskTitle?: string;
  ```

- `PBLLogData` 新增結構化信息：
  ```typescript
  scenario_info?: { id, title, title_zh }
  stage_info?: { id, index, title, title_zh }
  task_info?: { id, index, title, title_zh }
  ```

### 2. **Session 創建邏輯**
- 創建 session 時包含完整的 scenario/stage/task 信息
- Log 文件名格式：`pbl_{scenarioId}_stage_{stageId}_task_{taskId}_{timestamp}_{random}`

### 3. **Task 切換邏輯**
```javascript
// handleNextTask 函數現在會：
1. 完成當前 task 的 session
2. 清空 session 狀態
3. 設置下一個 task
4. 新 session 在用戶發送第一條消息時創建
```

### 4. **History API 改進**
- 支持多語言標題顯示
- 處理空 stages 數據的防禦性編程
- 從 stageProgress 推斷實際階段數

## 📊 預期行為

### Learn 頁面流程：
1. **Task 1-1 開始**
   - 用戶發送第一條消息 → 創建 Session A
   - 所有對話保存在 Session A
   - 分析結果保存在 Session A

2. **切換到 Task 1-2**
   - 點擊「下一個任務」→ Session A 標記為完成
   - 清空對話記錄
   - 用戶發送第一條消息 → 創建新的 Session B

3. **完成 Stage 1**
   - 所有 tasks 完成後進入下一個 stage
   - 每個 task 都有獨立的記錄

### History 頁面顯示：
- 每個 task 一張卡片
- 顯示格式：`[Scenario Title] - [Stage Title] - [Task Title]`
- 包含獨立的評分和互動次數

### Complete 頁面：
- 顯示特定 task 的完成資料
- 包含該 task 的對話記錄和評估結果

## 🧪 手動測試步驟

1. **清空測試數據**
   - 已刪除 GCS 中的所有 PBL logs

2. **測試新的 task 流程**
   ```
   a. 訪問 /pbl → 選擇「AI 輔助求職訓練」
   b. 開始學習 → 發送消息（創建 Task 1-1 session）
   c. 分析任務 → 查看評分
   d. 下一個任務 → 發送消息（創建 Task 1-2 session）
   e. 返回歷史頁面 → 應該看到 2 個獨立的 task 卡片
   ```

3. **驗證數據隔離**
   - Task 1-1 的對話不應出現在 Task 1-2 中
   - 每個 task 有獨立的 session ID

## ⚠️ 注意事項

1. **登入狀態**：需要確保用戶已登入（使用 cookie 或 localStorage）
2. **語言設置**：History API 會根據 `lang` 參數返回對應語言的標題
3. **舊數據兼容**：系統會處理舊的 stage-based sessions，但新創建的都是 task-based

## 🚀 下一步建議

1. **改進 Complete 頁面**
   - 只顯示特定 task 的數據
   - 添加 task 導航功能

2. **優化 History 顯示**
   - 按 scenario 分組顯示 tasks
   - 添加篩選功能（by scenario, stage, status）

3. **增強分析功能**
   - Task-level 的詳細分析報告
   - 跨 task 的進度比較