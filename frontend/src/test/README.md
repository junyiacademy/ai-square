# AI Square Test Utilities

## 目錄結構

```
src/test/
├── utils/
│   └── test-helpers.tsx      # 集中的測試工具和 mock 函數
├── examples/
│   └── test-helpers-usage.example.tsx  # 使用範例
└── README.md                 # 本文件
```

## 快速開始

### 1. 引入測試工具

```typescript
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
  resetAllMocks,
  setupAuthenticatedUser,
  setupUnauthenticatedUser,
  testUsers,
  mockApiSuccess,
  mockApiError,
  navigationMocks,
  themeMocks,
} from '@/test/utils/test-helpers';
```

### 2. 基本測試結構

```typescript
describe('MyComponent', () => {
  beforeEach(() => {
    resetAllMocks(); // 重置所有 mock
  });

  it('should render correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## 核心函數

### `renderWithProviders`

使用所有必要的 Provider 渲染組件：

```typescript
// 基本使用
renderWithProviders(<MyComponent />);

// 自定義選項
renderWithProviders(<MyComponent />, {
  authState: { isLoggedIn: true, user: testUsers.student },
  theme: 'dark',
  route: '/dashboard',
});

// 返回值包含 userEvent
const { user } = renderWithProviders(<MyComponent />);
await user.click(button);
```

### 認證狀態管理

```typescript
// 設定已登入狀態
setupAuthenticatedUser(testUsers.student);

// 設定未登入狀態
setupUnauthenticatedUser();

// 使用自定義用戶
setupAuthenticatedUser({
  id: 123,
  email: 'custom@example.com',
  role: 'custom',
  name: 'Custom User',
});
```

### API Mock

```typescript
// 成功響應
mockFetch.mockResolvedValueOnce(
  mockApiSuccess({ data: 'result' })
);

// 錯誤響應
mockFetch.mockResolvedValueOnce(
  mockApiError('Not found', 404)
);

// 驗證呼叫
expect(mockFetch).toHaveBeenCalledWith('/api/endpoint');
```

### 導航 Mock

```typescript
// 觸發導航
await user.click(loginButton);

// 驗證導航
expect(navigationMocks.mockPush).toHaveBeenCalledWith('/login');
expect(navigationMocks.mockReplace).toHaveBeenCalledWith('/dashboard');
```

### 主題 Mock

```typescript
// 渲染深色主題
renderWithProviders(<MyComponent />, { theme: 'dark' });

// 驗證主題切換
expect(themeMocks.mockToggleTheme).toHaveBeenCalled();
```

## 測試資料建立

```typescript
// 建立測試情境
const scenario = createMockScenario({
  title: { en: 'Test Scenario', zh: '測試情境' },
  mode: 'assessment',
});

// 建立測試程式
const program = createMockProgram({
  totalTaskCount: 5,
  completedTaskCount: 2,
});

// 建立測試任務
const task = createMockTask({
  type: 'question',
  score: 90,
});
```

## 預設測試用戶

```typescript
testUsers.student // { id: 1, email: 'student@example.com', role: 'student', name: 'Test Student' }
testUsers.teacher // { id: 2, email: 'teacher@example.com', role: 'teacher', name: 'Test Teacher' }
testUsers.admin   // { id: 3, email: 'admin@example.com', role: 'admin', name: 'Test Admin' }
```

## 完整範例

### 測試登入流程

```typescript
describe('Login Flow', () => {
  beforeEach(() => {
    resetAllMocks();
    setupUnauthenticatedUser();
  });

  it('should redirect to dashboard after login', async () => {
    const { user } = renderWithProviders(<LoginForm />);
    
    // 填寫表單
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    
    // Mock 成功登入
    mockFetch.mockResolvedValueOnce(
      mockApiSuccess({ 
        user: testUsers.student,
        token: 'jwt-token' 
      })
    );
    
    // 提交表單
    await user.click(screen.getByRole('button', { name: 'Login' }));
    
    // 驗證 API 呼叫
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });
    });
    
    // 驗證導航
    expect(navigationMocks.mockPush).toHaveBeenCalledWith('/dashboard');
  });
});
```

### 測試有權限保護的頁面

```typescript
describe('Protected Page', () => {
  it('should show content for authenticated users', () => {
    setupAuthenticatedUser(testUsers.teacher);
    renderWithProviders(<ProtectedPage />);
    
    expect(screen.getByText('Welcome, Test Teacher!')).toBeInTheDocument();
  });

  it('should redirect unauthenticated users', () => {
    setupUnauthenticatedUser();
    renderWithProviders(<ProtectedPage />);
    
    expect(navigationMocks.mockPush).toHaveBeenCalledWith('/login');
  });
});
```

### 測試非同步操作

```typescript
describe('Async Operations', () => {
  it('should load data on mount', async () => {
    mockFetch.mockResolvedValueOnce(
      mockApiSuccess({ 
        items: ['Item 1', 'Item 2'] 
      })
    );
    
    renderWithProviders(<DataList />);
    
    // 等待資料載入
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });
});
```

## 最佳實踐

1. **總是在 `beforeEach` 中呼叫 `resetAllMocks()`**
   - 確保每個測試都從乾淨的狀態開始

2. **使用 `renderWithProviders` 而非 `render`**
   - 自動包含所有必要的 Context Provider

3. **使用返回的 `user` 進行交互**
   ```typescript
   const { user } = renderWithProviders(<Component />);
   await user.click(button); // 而非 fireEvent.click
   ```

4. **使用預設的測試用戶**
   - 避免重複建立相同的用戶資料

5. **使用 helper 函數 mock API**
   - `mockApiSuccess` 和 `mockApiError` 提供一致的響應格式

6. **測試不同的用戶角色**
   - 確保應用程式對不同角色有正確的行為

7. **使用 `waitFor` 處理非同步操作**
   - 避免測試中的競爭狀態

8. **Mock localStorage 而非直接使用**
   - 使用 `mockLocalStorage` 來控制和驗證儲存操作

## 常見問題

### Q: 為什麼我的測試找不到元素？

A: 確保你使用了 `renderWithProviders` 而非 `render`，並且設定了正確的認證狀態。

### Q: 如何測試路由變化？

A: 使用 `navigationMocks.mockPush` 來驗證路由變化：
```typescript
expect(navigationMocks.mockPush).toHaveBeenCalledWith('/new-route');
```

### Q: 如何模擬不同的 API 響應？

A: 使用 `mockFetch` 配合 `mockApiSuccess` 或 `mockApiError`：
```typescript
mockFetch
  .mockResolvedValueOnce(mockApiSuccess({ data: 'first' }))
  .mockResolvedValueOnce(mockApiError('second failed', 500));
```

### Q: 如何在測試中切換認證狀態？

A: 使用 `setupAuthenticatedUser` 和 `setupUnauthenticatedUser`，然後重新渲染：
```typescript
const { rerender } = renderWithProviders(<Component />);
setupAuthenticatedUser(testUsers.admin);
rerender(<Component />);
```

## 更多資源

- 查看 `src/test/examples/test-helpers-usage.example.tsx` 以獲得更多實際範例
- 參考 Testing Library 文檔：https://testing-library.com/
- Jest 文檔：https://jestjs.io/