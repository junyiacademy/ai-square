# TDD 工作流程指南

本指南建立 AI Square 專案的標準 TDD (Test-Driven Development) 工作流程。

## 🎯 TDD 強制規則

### ✅ **所有新功能必須遵循 TDD**
1. **禁止先寫實現代碼** - 任何新功能都必須先寫測試
2. **Red-Green-Refactor 循環** - 嚴格遵循三階段循環
3. **測試覆蓋率門檻** - 新代碼測試覆蓋率必須 ≥ 80%

## 🔄 標準 TDD 循環

### 🔴 **階段 1: Red (寫失敗的測試)**

```typescript
// 範例：為新功能先寫測試
describe('UserProfile Component', () => {
  it('should display user name when loaded', () => {
    const mockUser = { name: 'John Doe', email: 'john@example.com' };
    
    render(<UserProfile user={mockUser} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

**檢查點：**
- [ ] 測試失敗（因為功能尚未實現）
- [ ] 測試清楚描述期望行為
- [ ] 測試名稱具有描述性

### 🟢 **階段 2: Green (寫最小代碼通過測試)**

```typescript
// 只寫足夠讓測試通過的代碼
interface User {
  name: string;
  email: string;
}

export function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

**檢查點：**
- [ ] 測試通過
- [ ] 代碼是最小可行實現
- [ ] 不過度設計

### 🔵 **階段 3: Refactor (重構優化)**

```typescript
// 重構：改善代碼品質但保持測試通過
export function UserProfile({ user }: { user: User }) {
  if (!user) return <div>Loading...</div>;
  
  return (
    <div className="user-profile">
      <h2 className="user-name">{user.name}</h2>
      <p className="user-email">{user.email}</p>
    </div>
  );
}
```

**檢查點：**
- [ ] 所有測試仍然通過
- [ ] 代碼更清晰、更可維護
- [ ] 移除重複代碼

## 📋 TDD 檢查清單

### 開始新功能前
- [ ] 是否已經開啟對應的 ticket？
- [ ] 是否已經定義驗收標準？
- [ ] 是否已經設計 API 介面？

### 寫測試時
- [ ] 測試是否先於實現代碼？
- [ ] 測試是否清楚描述行為？
- [ ] 是否測試行為而非實現細節？
- [ ] 測試名稱是否具有描述性？

### 實現代碼時
- [ ] 是否只寫足夠通過測試的代碼？
- [ ] 是否避免了過度設計？
- [ ] 所有測試是否都通過？

### 重構時
- [ ] 測試是否在重構前後都通過？
- [ ] 是否改善了代碼的可讀性？
- [ ] 是否移除了重複代碼？

## 🛠️ 技術實踐

### 測試結構
```typescript
// 使用 Arrange-Act-Assert 模式
describe('Component/Function Name', () => {
  it('should [expected behavior] when [condition]', () => {
    // Arrange：準備測試資料
    const mockData = { ... };
    
    // Act：執行被測試的行為
    const result = functionUnderTest(mockData);
    
    // Assert：驗證結果
    expect(result).toBe(expectedValue);
  });
});
```

### Mock 策略
```typescript
// 只 mock 外部依賴，不 mock 內部邏輯
jest.mock('@/services/api', () => ({
  fetchUser: jest.fn()
}));

// 使用真實的內部組件
import { UserProfile } from '@/components/UserProfile';
```

### 測試命名規範
```typescript
// ✅ 好的測試名稱
it('should display error message when email is invalid')
it('should call onSubmit when form is submitted with valid data')
it('should redirect to login page when user is not authenticated')

// ❌ 不好的測試名稱
it('should work')
it('test login')
it('renders correctly')
```

## 🚫 TDD 反模式

### ❌ **先寫實現再補測試**
```typescript
// 錯誤：先實現功能
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// 然後才寫測試
it('should calculate total', () => {
  expect(calculateTotal([{price: 10}])).toBe(10);
});
```

### ❌ **測試實現細節**
```typescript
// 錯誤：測試內部狀態
it('should set loading to true', () => {
  const component = render(<MyComponent />);
  expect(component.state.loading).toBe(true);
});

// 正確：測試用戶可見的行為
it('should show loading spinner while fetching data', () => {
  render(<MyComponent />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

### ❌ **一次寫太多測試**
```typescript
// 錯誤：一次寫很多測試
describe('LoginForm', () => {
  it('should validate email');
  it('should validate password');
  it('should submit form');
  it('should handle errors');
  // ... 15 more tests
});

// 正確：一次一個測試
describe('LoginForm', () => {
  it('should show error when email is empty', () => {
    // 實現這個測試，讓它通過，然後才寫下一個
  });
});
```

## 🔧 工具整合

### Jest 配置優化
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Pre-commit Hook
```bash
# 確保提交前所有測試通過
npm run test:ci && npm run lint && npm run typecheck
```

## 📊 測試金字塔

### 70% 單元測試
```typescript
// 純函數測試
describe('formatCurrency', () => {
  it('should format number as currency', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});

// React Hook 測試
describe('useAuth', () => {
  it('should return user when authenticated', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeDefined();
  });
});
```

### 25% 整合測試
```typescript
// API 整合測試
describe('POST /api/users', () => {
  it('should create user with valid data', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' });
    
    expect(response.status).toBe(201);
    expect(response.body.user.name).toBe('John');
  });
});
```

### 5% E2E 測試
```typescript
// Playwright E2E 測試
test('user can complete signup flow', async ({ page }) => {
  await page.goto('/signup');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
});
```

## 🤖 AI 協作下的 TDD

### 讓 AI 幫助你遵循 TDD
```markdown
請幫我為以下功能寫測試（先不要實現）：
- 用戶可以上傳頭像
- 支援 JPG、PNG 格式
- 檔案大小限制 2MB
- 上傳後顯示預覽
```

### TDD 提示模板
```markdown
我要實現 [功能描述]，請幫我：
1. 先寫失敗的測試
2. 檢查測試確實失敗
3. 寫最小代碼讓測試通過
4. 重構優化代碼
```

## 📈 持續改進

### 定期檢視
- 每週檢查測試覆蓋率報告
- 每月檢視 TDD 實踐情況
- 識別並修復測試債務

### 團隊實踐
- Code Review 時檢查 TDD 合規性
- 分享 TDD 最佳實踐範例
- 定期舉辦 TDD 訓練

---

**記住：TDD 不是負擔，是投資！**

遵循 TDD 可以：
- 🚀 提升代碼品質
- 🛡️ 減少 Bug 數量
- 🔄 安心重構
- 📖 自動產生文檔