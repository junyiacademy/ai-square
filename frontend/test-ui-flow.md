# PBL 延遲建立 Program 測試流程

## 測試步驟

### 1. 查看 Scenario Details 頁面
訪問: http://localhost:3000/pbl/scenarios/ai-job-search/details

預期結果：
- 如果用戶有現有 programs，會顯示 program 列表
- 預設選中最新的 program
- 顯示兩個按鈕：
  - "繼續學習" (藍色) - 繼續選中的 program
  - "開始新學習" (綠色) - 創建新的 program

### 2. 測試新建 Program（延遲創建）
1. 點擊 "開始新學習" 按鈕
2. 應該導航到: `/pbl/program/temp_xxx/learn?scenarioId=ai-job-search&taskId=task-1&isNew=true`
3. 注意 URL 中的 `temp_` 前綴和 `isNew=true` 參數

### 3. 在學習頁面發送第一條消息
1. 輸入任何消息，例如: "Hello, I need help with job search"
2. 發送消息時，系統應該：
   - 創建實際的 program
   - 更新 URL 為實際的 program ID（不再有 temp_ 前綴）
   - 保存對話記錄

### 4. 驗證 Program 已創建
1. 返回 details 頁面
2. 應該看到新創建的 program 出現在列表中
3. 狀態顯示為 "進行中"

### 5. 測試繼續現有 Program
1. 選擇一個現有的 program
2. 點擊 "繼續學習"
3. 應該導航到: `/pbl/program/{programId}/learn?scenarioId=ai-job-search&taskId=task-1`
4. 注意沒有 `isNew=true` 參數
5. 應該能看到之前的對話歷史

## 實現細節

### Details 頁面
- 顯示用戶在此 scenario 的所有 programs
- 支援選擇要繼續的 program
- 提供新建 program 的選項（使用臨時 ID）

### 學習頁面
- 檢測 `isNew=true` 和 `temp_` 前綴
- 在第一次發送消息時創建實際 program
- 更新 URL 而不刷新頁面
- 後續消息使用實際 program ID

### 優點
1. 用戶可以瀏覽而不創建無用的 programs
2. 同一個 scenario 可以有多個 programs
3. 每個 program 是獨立的學習歷程
4. 可以隨時繼續之前的學習