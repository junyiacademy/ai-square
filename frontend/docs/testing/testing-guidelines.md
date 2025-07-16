# AI Square 測試指南

## 🎯 測試原則

### 1. TDD (Test-Driven Development)
遵循 Kent Beck 的 Red → Green → Refactor 循環：
- **Red**: 先寫失敗的測試
- **Green**: 寫最少的代碼讓測試通過
- **Refactor**: 重構代碼但保持測試通過

### 2. 測試金字塔
```
         /\
        /E2E\      (10%) - 關鍵用戶流程
       /------\
      /整合測試\    (30%) - API、服務層
     /----------\
    /  單元測試   \  (60%) - 函數、組件
   /--------------\
```

## 📊 覆蓋率目標

### 當前狀態 (2025/01)
- 整體覆蓋率: ~10%
- 目標門檻: 40%

### 路線圖
| 時期 | 目標覆蓋率 | 重點 |
|------|-----------|------|
| Q1 2025 | 40% | 核心服務層 |
| Q2 2025 | 60% | API 路由 |
| Q3 2025 | 70%+ | 全面覆蓋 |

## 🧪 測試策略

### 優先測試什麼？

#### 必須測試 ✅
1. **業務邏輯** - Services, Repositories
2. **API 路由** - 輸入/輸出驗證
3. **關鍵組件** - 複雜交互邏輯
4. **工具函數** - 純函數最容易測試

#### 可選測試 🤔
1. **UI 組件** - 簡單展示組件
2. **樣式** - CSS/Tailwind
3. **配置檔** - 靜態設定

### 測試命名規範

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {})
    it('should handle edge case', () => {})
    it('should throw error when invalid input', () => {})
  })
})
```

## 🛠️ 實用命令

```bash
# 運行所有測試
npm test

# 覆蓋率報告
npm test -- --coverage

# 測試特定檔案
npm test -- src/lib/services/pbl-yaml-loader

# 監聽模式開發
npm test -- --watch

# 生成 HTML 報告
npm test -- --coverage --coverageReporters=html
open coverage/index.html
```

## 📝 測試範例

### Service 測試
```typescript
// src/lib/services/__tests__/pbl-yaml-loader.test.ts
describe('PBLYamlLoader', () => {
  let loader: PBLYamlLoader;
  
  beforeEach(() => {
    loader = new PBLYamlLoader();
  });
  
  it('should load scenario from YAML', async () => {
    const result = await loader.load('test.yaml');
    expect(result).toHaveProperty('id');
    expect(result.tasks).toHaveLength(3);
  });
  
  it('should handle missing file', async () => {
    await expect(loader.load('missing.yaml'))
      .rejects.toThrow('File not found');
  });
});
```

### API 測試
```typescript
// src/app/api/pbl/scenarios/__tests__/route.test.ts
describe('GET /api/pbl/scenarios', () => {
  it('should return scenarios list', async () => {
    const response = await GET(new Request('http://localhost/api/pbl/scenarios'));
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.scenarios).toBeInstanceOf(Array);
  });
});
```

## 🚨 常見問題

### 1. Mock 設定
```typescript
// 使用 __mocks__ 目錄
src/lib/implementations/__mocks__/gcs-v2.ts

// 或在測試中 mock
jest.mock('@/lib/implementations/gcs-v2');
```

### 2. 非同步測試
```typescript
// 使用 async/await
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

### 3. 測試超時
```typescript
// 增加超時時間
it('should complete within time', async () => {
  // test code
}, 10000); // 10 秒
```

## 📋 PR 檢查清單

提交 PR 前確認：
- [ ] 新功能有對應測試
- [ ] 測試都通過
- [ ] 覆蓋率沒有下降
- [ ] 遵循測試命名規範
- [ ] 沒有 `.only` 或 `.skip`

## 🎓 學習資源

1. [Jest 官方文檔](https://jestjs.io/)
2. [Testing Library](https://testing-library.com/)
3. [Kent Beck - TDD By Example](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
4. 內部範例：`src/lib/utils/__tests__/` (61% 覆蓋率)

## 💡 測試小技巧

1. **從簡單開始** - 先測試純函數和工具
2. **測試行為而非實現** - 關注輸入輸出
3. **保持測試獨立** - 每個測試應該獨立運行
4. **使用 AAA 模式** - Arrange, Act, Assert
5. **定期重構測試** - 測試代碼也需要維護

---

記住：**寫測試是投資，不是成本。** 好的測試讓你更有信心重構和添加新功能。