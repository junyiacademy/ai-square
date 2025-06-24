# TDD 實踐指南

本指南幫助你在 AI Square 專案中實踐測試驅動開發。

## 🎯 為什麼要 TDD？

1. **設計優先** - 先想怎麼用，再想怎麼寫
2. **即時回饋** - 立即知道程式碼是否正確
3. **重構信心** - 有測試保護，敢於改進
4. **文檔作用** - 測試即是最好的使用範例

## 🔄 TDD 循環

### 1. 🔴 Red - 寫一個失敗的測試

```typescript
// LoginForm.test.tsx
it('should show error when email is invalid', async () => {
  render(<LoginForm onSubmit={mockSubmit} />)
  
  const emailInput = screen.getByLabelText('email')
  const submitButton = screen.getByRole('button', { name: 'login' })
  
  await userEvent.type(emailInput, 'invalid-email')
  await userEvent.click(submitButton)
  
  expect(screen.getByText('請輸入有效的電子郵件')).toBeInTheDocument()
  expect(mockSubmit).not.toHaveBeenCalled()
})
```

### 2. 🟢 Green - 寫最小程式碼通過測試

```typescript
// LoginForm.tsx
const validateEmail = (email: string) => {
  return email.includes('@') && email.includes('.')
}

if (!validateEmail(email)) {
  setError('請輸入有效的電子郵件')
  return
}
```

### 3. 🔵 Refactor - 優化程式碼

```typescript
// utils/validation.ts
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// LoginForm.tsx
import { isValidEmail } from '@/utils/validation'

if (!isValidEmail(email)) {
  setError(t('auth.invalidEmail'))
  return
}
```

## 📊 測試金字塔實踐

### 單元測試 (70-80%)
```typescript
// 純函數
describe('calculateAIScore', () => {
  it('should return correct score for beginner', () => {
    expect(calculateAIScore(3, 10)).toBe(30)
  })
})

// React Hook
describe('useAuth', () => {
  it('should update user state on login', () => {
    const { result } = renderHook(() => useAuth())
    act(() => {
      result.current.login({ email: 'test@example.com' })
    })
    expect(result.current.user).toBeDefined()
  })
})
```

### 整合測試 (15-25%)
```typescript
// API 整合
describe('POST /api/auth/login', () => {
  it('should return user data on valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
    
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('user')
    expect(response.body.user.email).toBe('test@example.com')
  })
})
```

### E2E 測試 (5-10%)
```typescript
// Playwright E2E
test('complete login flow', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('text=歡迎回來')).toBeVisible()
})
```

## 🤖 AI 協作下的 TDD

### 1. 讓 AI 先寫測試
```markdown
請為以下功能寫測試：
- 用戶可以切換語言
- 語言偏好保存到 localStorage
- 頁面重載後記住語言選擇
```

### 2. 審查 AI 生成的測試
- 確認測試覆蓋所有案例
- 檢查測試是否過於複雜
- 確保測試名稱清晰

### 3. 讓 AI 實作功能
```markdown
根據這些測試，請實作語言切換功能
```

## 💡 最佳實踐

### DO ✅
- 一次只寫一個測試
- 測試行為，不是實作細節
- 保持測試簡單清晰
- 使用描述性的測試名稱

### DON'T ❌
- 不要測試框架功能
- 不要過度 mock
- 不要寫脆弱的測試
- 不要忽略測試維護

## 📈 測試覆蓋率

### 查看覆蓋率
```bash
npm test -- --coverage
```

### 覆蓋率標準
- 整體專案: ≥ 80%
- 核心功能: ≥ 95%
- 工具函數: 100%
- UI 組件: ≥ 70%

## 🔧 測試工具

### 單元測試
- **Jest**: 測試框架
- **React Testing Library**: React 組件測試
- **MSW**: API mocking

### 整合測試
- **Supertest**: HTTP 測試
- **Test Containers**: 資料庫測試

### E2E 測試
- **Playwright**: 跨瀏覽器測試
- **Cypress**: 替代選項

## 🔗 相關指南

- [BDD 實踐指南](./bdd-guide.md) - 從用戶需求出發
- [前端測試模式](../frontend/frontend-patterns.md#測試策略)
- [測試策略 ADR](../../decisions/ADR-002-test-strategy.md)

## 📚 學習資源

- [Testing Library 文檔](https://testing-library.com/)
- [Jest 最佳實踐](https://jestjs.io/docs/best-practices)
- [TDD 實踐指南](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

---

記住：**測試不是負擔，是投資！**