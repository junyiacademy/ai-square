# 測試覆蓋率分析報告

## 當前狀態
- **總覆蓋率**: 68.79%
- **目標**: 90%
- **差距**: 21.21%

## 優先級排序（根據 @CLAUDE.md 指引）

### 🔴 高優先級 - 核心底層服務（不常變動）
這些是系統核心，應該優先測試：

1. **Repository 層** (共需 ~1673 行)
   - `evaluation-repository.ts`: 12.6% (缺 449 行)
   - `task-repository.ts`: 12.5% (缺 439 行)
   - `discovery-repository.ts`: 16.8% (缺 400 行)
   - `scenario-repository.ts`: 17.7% (缺 385 行)
   **理由**: 資料存取層是最底層、最穩定的部分

2. **核心服務** (共需 ~629 行)
   - `unified-evaluation-system.ts`: 0% (缺 422 行)
   - `base-learning-service.ts`: 0% (缺 133 行)
   **理由**: 業務邏輯核心，評估系統是關鍵功能

3. **AI 服務** (共需 ~313 行)
   - `vertex-ai-service.ts`: 14.9% (缺 313 行)
   **理由**: AI 整合是核心功能

### 🟡 中優先級 - API 路由（相對穩定）

4. **核心 API 路由** (選擇性，共需 ~1000+ 行)
   - `auth/login/route.ts`: 部分覆蓋
   - `assessment/results/route.ts`: 0% (缺 273 行)
   - `discovery/programs/evaluation/route.ts`: 0% (缺 293 行)
   **理由**: API 介面相對穩定，但比底層更容易變動

### 🟢 低優先級 - UI 和輔助檔案

5. **頁面元件** (不建議測試)
   - 各種 `page.tsx` 檔案
   **理由**: UI 經常變動，投資報酬率低

6. **型別定義** (不需測試)
   - `types/*.ts` 檔案
   **理由**: 純型別定義，沒有邏輯

7. **測試輔助檔案** (不需測試)
   - `test-utils/*`, `__mocks__/*`
   **理由**: 測試工具本身

## 建議執行順序

### 第一階段：Repository 層測試 (預計 +8% 覆蓋率)
```bash
# 1. 補充 evaluation-repository 測試
src/lib/repositories/postgresql/__tests__/evaluation-repository.test.ts

# 2. 補充 task-repository 測試  
src/lib/repositories/postgresql/__tests__/task-repository.test.ts

# 3. 補充 discovery-repository 測試
src/lib/repositories/postgresql/__tests__/discovery-repository.test.ts

# 4. 補充 scenario-repository 測試
src/lib/repositories/postgresql/__tests__/scenario-repository.test.ts
```

### 第二階段：核心服務測試 (預計 +5% 覆蓋率)
```bash
# 5. 創建 unified-evaluation-system 測試
src/lib/services/evaluation/__tests__/unified-evaluation-system.test.ts

# 6. 創建 base-learning-service 測試
src/lib/services/__tests__/base-learning-service.test.ts
```

### 第三階段：AI 服務測試 (預計 +3% 覆蓋率)
```bash
# 7. 補充 vertex-ai-service 測試
src/lib/ai/__tests__/vertex-ai-service.test.ts
```

### 第四階段：關鍵 API 測試 (預計 +5% 覆蓋率)
```bash
# 8. 選擇性補充重要 API 路由測試
```

## 預期結果
- Repository 層: +8%
- 核心服務: +5%
- AI 服務: +3%
- API 路由: +5%
- **總計**: ~89-91% (達成目標)

## 不建議測試的部分
- ❌ UI 頁面 (page.tsx)
- ❌ 型別定義檔案
- ❌ 測試工具本身
- ❌ Mock 檔案
- ❌ 範例檔案

## 執行策略
1. 專注於底層、穩定的程式碼
2. 測試核心業務邏輯
3. 確保關鍵路徑有覆蓋
4. 避免測試經常變動的 UI