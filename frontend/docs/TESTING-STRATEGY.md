# 測試策略 - Testing Strategy

## 🔴 當前問題
- **高覆蓋率但實際使用仍有錯誤**
- 單元測試無法捕捉整合問題
- Mock 與實際行為不一致
- 缺少端到端測試

## ✅ 解決方案：測試金字塔

```
        /\
       /E2E\      <- 10% - 關鍵用戶流程
      /______\
     /        \
    /Integration\  <- 20% - API + DB 整合
   /______________\
  /                \
 /   Unit Tests     \ <- 70% - 個別函數/組件
/____________________\
```

## 📊 測試類型分配

### 1. 單元測試 (Unit Tests) - 70%
**目的**: 測試個別函數和組件的邏輯

```typescript
// ✅ 好的單元測試
test('calculateTotal should sum items correctly', () => {
  const items = [{ price: 10 }, { price: 20 }];
  expect(calculateTotal(items)).toBe(30);
});

// ❌ 壞的單元測試 (過度 mock)
test('should render', () => {
  render(<Component />);
  // 沒有任何 assertion
});
```

**適用於**:
- 純函數
- 工具函數
- 個別 React 組件
- 資料轉換邏輯

### 2. 整合測試 (Integration Tests) - 20%
**目的**: 測試多個模組的協作

```typescript
// 測試 API + 資料庫
test('POST /api/programs should create program in DB', async () => {
  const response = await request(app)
    .post('/api/programs')
    .send({ scenarioId: '123' });

  expect(response.status).toBe(201);

  // 檢查資料庫
  const program = await db.query('SELECT * FROM programs WHERE id = ?', [response.body.id]);
  expect(program).toBeDefined();
});
```

**適用於**:
- API 路由 + 資料庫
- Service 層 + Repository 層
- 前端組件 + API 呼叫

### 3. E2E 測試 (End-to-End Tests) - 10%
**目的**: 模擬真實用戶操作

```typescript
// 測試完整用戶流程
test('User completes onboarding flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'user@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');

  await page.goto('/onboarding/welcome');
  await page.click('text=Continue');
  // ... 完整流程
});
```

**適用於**:
- 關鍵用戶旅程
- 跨頁面流程
- 認證流程
- 付款流程

## 🎯 關鍵用戶流程 (必須有 E2E 測試)

1. **Onboarding 流程**
   - 登入 → Welcome → Identity → Goals → Assessment

2. **PBL 學習流程**
   - 選擇 Scenario → 開始學習 → 提交答案 → 查看反饋

3. **Discovery 探索流程**
   - 選擇職涯 → 探索技能 → 完成任務

4. **認證流程**
   - 註冊 → 驗證 Email → 登入 → 保持登入狀態

## 🔧 實作建議

### 1. 減少 Mock 使用
```typescript
// ❌ 過度 Mock
jest.mock('react-i18next');
jest.mock('next/navigation');
jest.mock('@/lib/auth');

// ✅ 使用真實實作或測試專用版本
import { TestAuthProvider } from '@/test-utils/providers';
import { MemoryRouter } from '@/test-utils/router';
```

### 2. 使用測試資料庫
```typescript
// 測試環境使用獨立資料庫
beforeEach(async () => {
  await testDb.migrate.latest();
  await testDb.seed.run();
});

afterEach(async () => {
  await testDb.rollback();
});
```

### 3. 測試資料建構器
```typescript
// 使用 Factory Pattern 建立測試資料
const user = UserFactory.build({
  email: 'test@example.com',
  role: 'student'
});

const program = ProgramFactory.build({
  userId: user.id,
  status: 'active'
});
```

## 📝 測試檢查清單

### 新功能開發時
- [ ] 寫單元測試覆蓋核心邏輯
- [ ] 寫整合測試覆蓋 API 端點
- [ ] 如果是關鍵流程，寫 E2E 測試
- [ ] 手動測試一次完整流程
- [ ] 檢查錯誤處理路徑

### Bug 修復時
- [ ] 先寫失敗的測試重現 bug
- [ ] 修復 bug
- [ ] 確認測試通過
- [ ] 加入迴歸測試防止再次發生

## 🚀 執行測試

```bash
# 單元測試
npm run test

# 整合測試
npm run test:integration

# E2E 測試
npm run test:e2e

# 完整測試套件
npm run test:all

# 測試覆蓋率報告
npm run test:coverage
```

## 📈 目標指標

- **單元測試覆蓋率**: 80%+
- **整合測試覆蓋率**: 關鍵 API 100%
- **E2E 測試**: 所有關鍵用戶流程
- **測試執行時間**: < 5 分鐘
- **測試穩定性**: 0 flaky tests

## ⚠️ 常見陷阱

1. **過度依賴覆蓋率數字**
   - 覆蓋率高 ≠ 品質好
   - 要測試實際行為，不只是程式碼執行

2. **Mock 一切**
   - Mock 太多導致測試與實際脫節
   - 優先使用真實實作

3. **忽略 E2E 測試**
   - 單元測試無法發現整合問題
   - E2E 測試是最接近用戶體驗的

4. **測試不穩定 (Flaky)**
   - 避免依賴時間
   - 避免依賴外部服務
   - 使用明確的等待條件

## 🎓 最佳實踐

1. **測試即文檔** - 測試應該清楚說明功能如何運作
2. **快速反饋** - 單元測試應該在幾秒內完成
3. **獨立性** - 測試之間不應該相互依賴
4. **可重複性** - 測試結果應該一致
5. **有意義的失敗** - 測試失敗時應該清楚指出問題

---

記住：**測試的目的是增加信心，而不是增加數字。**
