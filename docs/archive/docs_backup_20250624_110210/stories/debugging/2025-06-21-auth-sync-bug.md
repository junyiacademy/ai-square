# Auth 狀態同步之謎：一個調試故事

一個看似簡單的 bug，卻揭示了 React 18 的重要概念。

## 🐛 問題描述

**日期**: 2025-06-21  
**報告者**: QA 團隊  
**嚴重程度**: 高

> "登入後，Header 組件沒有立即顯示登入狀態，需要刷新頁面才能看到。"

## 🕵️ 調查過程

### Step 1: 重現問題 (10分鐘)

```typescript
// 測試步驟
1. 打開應用
2. 點擊登入按鈕
3. 輸入正確的認證資訊
4. 提交表單
5. 觀察 Header 組件

// 結果
✅ 登入成功的提示出現
❌ Header 仍顯示「登入」按鈕
❌ 需要 F5 刷新才能看到用戶名
```

### Step 2: 初步假設 (15分鐘)

**假設 1**: API 回應太慢？
```typescript
// 檢查網路請求
console.time('login-api')
const response = await login(credentials)
console.timeEnd('login-api') // 結果: 230ms

// 結論：API 速度正常 ❌
```

**假設 2**: localStorage 寫入問題？
```typescript
// 驗證 localStorage
localStorage.setItem('test', 'value')
console.log(localStorage.getItem('test')) // 'value'

// 結論：localStorage 正常 ❌
```

### Step 3: 深入程式碼 (30分鐘)

**發現問題點**：
```typescript
// Header.tsx (有問題的版本)
export function Header() {
  const [user, setUser] = useState(null)
  
  useEffect(() => {
    // 只在組件掛載時執行一次
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, []) // 空依賴陣列！
  
  return <div>{user ? user.name : 'Login'}</div>
}
```

**根本原因**：Header 組件在其他地方登入後，不會重新讀取 localStorage！

### Step 4: 嘗試修復 (45分鐘)

**錯誤嘗試 1**: 使用 window.location.reload()
```typescript
// LoginForm.tsx
const handleLogin = async (data) => {
  await login(data)
  window.location.reload() // 太暴力了！
}
// 結果：能用，但用戶體驗很差 ❌
```

**錯誤嘗試 2**: 使用事件監聽
```typescript
// Header.tsx
useEffect(() => {
  const handleStorageChange = () => {
    const userData = localStorage.getItem('user')
    setUser(userData ? JSON.parse(userData) : null)
  }
  
  window.addEventListener('storage', handleStorageChange)
  return () => window.removeEventListener('storage', handleStorageChange)
}, [])
// 結果：storage 事件只在跨標籤頁時觸發 ❌
```

### Step 5: 正確解決方案 (20分鐘)

**使用 Context API**：
```typescript
// contexts/AuthContext.tsx
const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  
  const login = async (credentials) => {
    const userData = await apiLogin(credentials)
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }
  
  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Header.tsx (修復後)
export function Header() {
  const { user } = useAuth() // 使用 Context
  return <div>{user ? user.name : 'Login'}</div>
}
```

## 🎯 解決成果

### Before vs After
| 指標 | 修復前 | 修復後 |
|------|--------|--------|
| 狀態同步 | 需要刷新 | 即時更新 |
| 程式碼複雜度 | 分散在多處 | 集中管理 |
| 可測試性 | 困難 | 容易 |
| 可維護性 | 低 | 高 |

### 測試驗證
```typescript
test('header updates immediately after login', async () => {
  render(
    <AuthProvider>
      <Header />
      <LoginForm />
    </AuthProvider>
  )
  
  expect(screen.getByText('Login')).toBeInTheDocument()
  
  // 執行登入
  await userEvent.type(screen.getByLabelText('Email'), 'test@example.com')
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
  
  // 立即檢查更新
  await waitFor(() => {
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })
})
```

## 💡 學到的教訓

### 1. React 狀態管理原則
- **Local State**: 只影響單一組件的狀態
- **Lifted State**: 需要共享的狀態要提升
- **Global State**: 跨多個組件的狀態用 Context

### 2. 調試技巧
- 先重現問題，確認症狀
- 列出所有可能的原因
- 從簡單的假設開始驗證
- 使用 console.log 和 DevTools
- 寫測試來防止回歸

### 3. 常見陷阱
```typescript
// ❌ 錯誤：依賴外部狀態但不監聽變化
useEffect(() => {
  setData(localStorage.getItem('data'))
}, [])

// ✅ 正確：使用適當的狀態管理
const { data } = useGlobalState()
```

## 🔍 延伸思考

這個 bug 暴露了幾個架構問題：

1. **狀態來源不一致**
   - localStorage 是持久化存儲
   - React state 是運行時狀態
   - 需要明確的同步機制

2. **組件耦合**
   - Header 和 LoginForm 本不應直接依賴
   - 通過 Context 解耦是正確方向

3. **測試的重要性**
   - 如果有整合測試，這個 bug 不會進入生產環境
   - TDD 可以提前發現設計問題

## 🚀 後續改進

1. **添加狀態持久化 Hook**
```typescript
function usePersistedState(key, defaultValue) {
  // 實現略...
}
```

2. **實施狀態管理庫**
   - 考慮使用 Zustand 或 Jotai
   - 更好的 DevTools 支援

3. **加強測試覆蓋**
   - 添加更多整合測試
   - 模擬各種邊界情況

---

**總結**：一個看似簡單的「狀態不同步」問題，實際上反映了前端架構設計的重要性。正確的狀態管理不僅解決了當前問題，還為未來的功能擴展打下了良好基礎。