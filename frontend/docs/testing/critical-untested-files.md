# 關鍵未測試檔案清單

## 優先級 1: 核心服務層 🔴

這些檔案是系統的核心，必須優先測試：

### YAML Loaders (資料載入器)
- [ ] `src/lib/services/assessment-yaml-loader.ts`
- [ ] `src/lib/services/discovery-yaml-loader.ts`
- [ ] `src/lib/services/pbl-yaml-loader.ts`
- [ ] `src/lib/services/scenario-initialization-service.ts`

**為什麼重要**：這些是載入所有學習內容的核心服務

### Repository 實現
- [ ] `src/lib/implementations/gcs-v2/repositories/`
  - [ ] `gcs-scenario-repository.ts`
  - [ ] `gcs-program-repository.ts`
  - [ ] `gcs-task-repository.ts`
  - [ ] `gcs-evaluation-repository.ts`

**為什麼重要**：所有資料存取都經過這層

## 優先級 2: API 路由 🟡

### 統一架構 API
- [ ] `/api/assessment/scenarios/route.ts`
- [ ] `/api/discovery/scenarios/route.ts`
- [ ] `/api/pbl/scenarios/route.ts`

### Program/Task API
- [ ] `/api/*/programs/[programId]/route.ts`
- [ ] `/api/*/tasks/[taskId]/route.ts`

## 優先級 3: 工具函數 🟢

已經有 61% 覆蓋率，但可以提升：
- [ ] `src/lib/utils/translations.ts` (0%)
- [ ] `src/lib/utils/error-handler.ts` (需要修復測試)

## 測試策略建議

### 第一階段（1週）
1. 為所有 YAML Loaders 寫單元測試
2. 為 Repository 層寫整合測試
3. 目標：核心服務層達到 70% 覆蓋率

### 第二階段（2週）
1. 為主要 API routes 寫測試
2. 修復現有失敗的測試
3. 目標：整體覆蓋率達到 50%

### 第三階段（1個月）
1. 補充 E2E 測試
2. 建立測試文化和規範
3. 目標：整體覆蓋率達到 70%

## 快速勝利 (Quick Wins)

這些檔案很容易測試，可以快速提升覆蓋率：
1. `locale-mapping.ts` - 簡單的對照表
2. `translations.ts` - 純函數
3. 各種 schema 檔案 - 驗證邏輯

## 測試命令

```bash
# 測試特定服務
npm test -- src/lib/services --coverage

# 測試特定 API
npm test -- src/app/api/assessment --coverage

# 生成 HTML 報告
npm test -- --coverage --coverageReporters=html
# 開啟 coverage/index.html
```