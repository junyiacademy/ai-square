# Discovery Module Test Plan
Discovery 模組完整測試計劃

## 測試策略總覽

### 1. TDD 開發流程
- ❌ 寫測試 → ❌ 測試失敗 → ✅ 寫程式碼 → ✅ 測試通過 → 🔄 重構

### 2. 測試層級架構
```
單元測試 (Unit Tests) → 整合測試 (Integration Tests) → E2E測試 → 瀏覽器測試
```

### 3. 防止 Regression 策略
- 建立基準測試套件
- API 契約測試
- 跨模組影響測試
- 效能基準監控

## 詳細測試計劃

### Phase 1: 單元測試 (Unit Tests)

#### 1.1 Repository 層測試
```typescript
// src/lib/repositories/postgresql/__tests__/discovery-repository.test.ts
- ✅ 建立 Discovery scenarios
- ✅ 查詢 career paths
- ✅ 用戶進度追蹤
- ✅ Portfolio 管理
- ✅ 推薦系統邏輯
```

#### 1.2 Service 層測試
```typescript
// src/lib/services/__tests__/discovery-service.test.ts
- ✅ Career matching 演算法
- ✅ Skill gap 分析
- ✅ 進度計算
- ✅ 成就系統
```

#### 1.3 API Route 測試
```typescript
// src/app/api/discovery/**/__tests__/*.test.ts
- ✅ GET /api/discovery/scenarios
- ✅ GET /api/discovery/scenarios/[id]
- ✅ POST /api/discovery/scenarios/[id]/programs
- ✅ GET /api/discovery/programs/[programId]
- ✅ POST /api/discovery/programs/[programId]/complete
- ✅ GET /api/discovery/recommendations
- ✅ GET /api/discovery/portfolio
```

### Phase 2: 整合測試 (Integration Tests)

#### 2.1 資料流測試
```typescript
// src/__tests__/integration/discovery-flow.test.ts
- ✅ Scenario 載入 → Program 建立 → Task 執行 → Evaluation
- ✅ 多語言資料正確性
- ✅ 快取機制驗證
```

#### 2.2 跨模組測試
```typescript
// src/__tests__/integration/cross-module.test.ts
- ✅ Discovery + Assessment 資料共享
- ✅ Discovery + PBL 技能映射
- ✅ 統一評估系統整合
```

### Phase 3: E2E 測試

#### 3.1 完整用戶旅程
```typescript
// e2e/discovery-complete-flow.spec.ts
describe('Discovery Complete User Journey', () => {
  - ✅ 瀏覽職涯選項
  - ✅ 選擇感興趣的職涯
  - ✅ 開始探索任務
  - ✅ 完成技能評估
  - ✅ 查看推薦結果
  - ✅ 建立作品集
  - ✅ 獲得成就徽章
});
```

#### 3.2 錯誤處理測試
```typescript
// e2e/discovery-error-handling.spec.ts
- ✅ 網路錯誤恢復
- ✅ 無效資料處理
- ✅ 權限錯誤
```

### Phase 4: 瀏覽器實際測試

#### 4.1 跨瀏覽器相容性
```typescript
// src/scripts/test/test-discovery-browser.ts
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge
```

#### 4.2 效能測試
- 載入時間 < 2秒
- API 回應 < 500ms
- 流暢的 UI 互動

## 測試資料準備

### 1. 種子資料
```sql
-- src/scripts/test-data/discovery-seed.sql
- 12 個職涯路徑
- 每個路徑 5-7 個任務
- 測試用戶資料
- 範例作品集項目
```

### 2. Mock 資料
```typescript
// src/__mocks__/discovery-data.ts
- Career scenarios
- User progress
- Portfolio items
- Recommendations
```

## 回歸測試檢查清單

### 每次改動必須執行
1. ✅ 所有單元測試通過
2. ✅ API 契約未改變
3. ✅ 現有功能正常運作
4. ✅ 效能未退步
5. ✅ 跨模組功能正常

### 關鍵指標監控
- API 回應時間
- 資料庫查詢效能
- 錯誤率
- 測試覆蓋率 > 90%

## 測試執行命令

```bash
# 單元測試
npm test -- src/app/api/discovery
npm test -- src/lib/repositories/postgresql/discovery-repository.test.ts

# 整合測試
npm test -- src/__tests__/integration/discovery

# E2E 測試
npm run test:e2e -- discovery

# 瀏覽器測試
npm run test:browser:discovery

# 完整測試套件
npm run test:discovery:all

# 回歸測試
npm run test:regression
```

## 時程規劃

- **Day 1**: Repository 層單元測試 + 實作
- **Day 2**: Service 層 + API 測試
- **Day 3**: 整合測試 + E2E 測試
- **Day 4**: 瀏覽器測試 + 效能優化
- **Day 5**: 回歸測試 + 文檔更新

## 成功標準

1. **功能完整性**: 100% 功能實現
2. **測試覆蓋率**: > 90%
3. **零回歸錯誤**: 不影響現有功能
4. **效能達標**: 符合效能基準
5. **文檔完整**: 測試文檔更新