# PBL Task-Based Sessions 改進方案

## 現況問題
- 目前系統是以 **stage** 為單位創建 session
- 一個 stage 內的所有 tasks 共用同一個 session
- 導致多個 tasks 的對話和評估都混在一起

## 建議改進方案

### 方案 A: 每個 Task 獨立 Session（推薦）
1. 修改 session 創建邏輯，在每次切換 task 時創建新的 session
2. 優點：
   - 每個 task 有獨立的 log，清晰明瞭
   - 評估更精準，針對單一 task
   - 歷史記錄更容易查找和分析
3. 缺點：
   - 需要較大的代碼改動
   - 可能增加存儲成本

### 方案 B: 保持現有架構，但改進顯示
1. 保持 stage-based session，但在顯示時根據 taskId 過濾
2. 優點：
   - 改動較小
   - 保持向後兼容性
3. 缺點：
   - 數據仍然混在一起
   - 查詢和分析較複雜

## 實施步驟（方案 A）

1. **修改 handleNextTask 函數**
   ```typescript
   // 在切換 task 時完成當前 session 並創建新的
   if (currentTaskIndex < currentStage.tasks.length - 1) {
     // 完成當前 task 的 session
     await completeCurrentSession();
     // 創建新的 session for next task
     await createNewTaskSession(nextTask);
   }
   ```

2. **更新 session 結構**
   - 添加 `taskId` 作為必要欄位
   - 修改 logId 生成邏輯

3. **調整歷史顯示**
   - 顯示 task-level 的詳細信息
   - 每個 task 有獨立的卡片

4. **優化評估邏輯**
   - 每個 task 獨立評估
   - stage 完成後可以有整體評估

## 需要修改的文件
1. `/app/pbl/scenarios/[id]/learn/page.tsx` - 主要邏輯
2. `/app/api/pbl/sessions/route.ts` - session 創建
3. `/app/api/pbl/history/route.ts` - 歷史顯示
4. `/lib/storage/pbl-gcs-service.ts` - 存儲邏輯