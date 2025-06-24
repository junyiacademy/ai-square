# React Hooks 順序錯誤修復 - 工作日誌

**日期**: 2025-06-21  
**Bug ID**: HEADER-001  
**類型**: Bug 修復  
**嚴重程度**: 中等  
**狀態**: ✅ 完成

## 📋 Bug 概述

Header 組件出現 React Hooks 順序錯誤，導致用戶點擊登出按鈕時出現控制台警告和潛在的狀態不一致問題。

## 🎯 錯誤分析

**錯誤訊息**:
```
Error: React has detected a change in the order of Hooks called by Header. 
This will lead to bugs and errors if not fixed.

Previous render            Next render
------------------------------------------------------
1. useContext                 useContext
2. useContext                 useCallback
   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

**觸發條件**:
用戶點擊 Header 中的 "Sign out" 按鈕時，組件重新渲染導致 hooks 調用順序改變。

**根本原因**:
1. **錯誤處理邏輯問題**: `useEffect` 中的錯誤處理邏輯調用了 `handleLogout()` 函數
2. **Hooks 衝突**: `handleLogout` 函數可能導致組件重新渲染，影響了 hooks 調用順序
3. **不穩定函數引用**: 函數沒有使用 `useCallback` 進行優化

## 🔧 技術實作

### 1. 問題診斷階段 - 20分鐘
- **重現錯誤**: 確認登出操作觸發 Hooks 順序錯誤
- **錯誤分析**: 識別 useEffect 中錯誤處理邏輯的問題
- **Hooks 順序檢查**: 分析組件中所有 hooks 的調用順序

### 2. 解決方案設計 - 15分鐘
- **分離邏輯**: 創建獨立的 `clearAuthState` 函數
- **函數穩定化**: 使用 `useCallback` 確保函數引用穩定
- **依賴管理**: 正確設置 useEffect 的依賴數組

### 3. 修復實作階段 - 30分鐘

#### 創建穩定的狀態清除函數
```typescript
const clearAuthState = useCallback(() => {
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('user')
  setUser(null)
  setIsLoggedIn(false)
}, [])
```

#### 優化事件處理函數
```typescript
const handleLogout = useCallback(() => {
  clearAuthState()
  router.push('/login')
}, [clearAuthState, router])

const handleLogin = useCallback(() => {
  router.push('/login')
}, [router])
```

#### 修復錯誤處理邏輯
```typescript
useEffect(() => {
  const checkAuthStatus = () => {
    // ...
    } catch (error) {
      console.error('Error parsing user data:', error)
      clearAuthState() // ✅ 直接調用狀態清除函數
    }
  }
  // ...
}, [clearAuthState]) // ✅ 正確的依賴數組
```

### 4. 測試驗證階段 - 25分鐘
- **專門測試**: 建立 `Header.hooks-order.test.tsx`
- **場景覆蓋**: 5 個 Hooks 順序專門測試
- **回歸測試**: 確保原有 41 個測試仍然通過

### 5. 文檔記錄階段 - 10分鐘
- **Bug 記錄**: 詳細記錄問題和解決方案
- **預防措施**: 建立 Hooks 使用檢查清單

## 📊 核心修復代碼

### 修復前的問題代碼
```typescript
// ❌ 問題代碼
useEffect(() => {
  const checkAuthStatus = () => {
    // ...
    } catch (error) {
      console.error('Error parsing user data:', error)
      handleLogout() // ❌ 可能導致 hooks 順序問題
    }
  }
  // ...
}, []) // ❌ 空依賴數組，但內部使用了外部函數
```

### 修復後的正確代碼
```typescript
// ✅ 修復後代碼
const clearAuthState = useCallback(() => {
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('user')
  setUser(null)
  setIsLoggedIn(false)
}, [])

useEffect(() => {
  const checkAuthStatus = () => {
    // ...
    } catch (error) {
      console.error('Error parsing user data:', error)
      clearAuthState() // ✅ 直接調用狀態清除函數
    }
  }
  // ...
}, [clearAuthState]) // ✅ 正確的依賴數組
```

## 🧪 測試驗證

### 新增測試案例
1. **多次渲染一致性測試** ✅
2. **登出操作 Hooks 穩定性測試** ✅  
3. **錯誤處理中的 Hooks 順序測試** ✅
4. **Storage 事件中的 Hooks 順序測試** ✅
5. **快速連續狀態變化測試** ✅

### 測試結果
- **新增測試**: 5 個專門的 Hooks 順序測試
- **原有測試**: 41 個測試全部通過 ✅
- **總測試數**: 46 個測試全部通過 ✅

## 📈 修復效果

### 修復前
- ❌ 登出時出現 React Hooks 順序錯誤
- ❌ 控制台顯示 warning 訊息
- ❌ 可能導致組件狀態不一致

### 修復後  
- ✅ 登出功能正常運作
- ✅ 無 React Hooks 順序錯誤
- ✅ 所有測試通過
- ✅ 代碼更穩定和可維護

## 🔍 學習筆記

### React Hooks 最佳實踐
1. **Hooks 順序一致性**: React 依賴 hooks 調用順序來維護狀態
2. **useCallback 的重要性**: 避免不必要的重新渲染和依賴問題
3. **錯誤處理策略**: 避免在錯誤處理中調用可能改變 hooks 順序的函數

### 依賴管理原則
- **完整依賴**: useEffect 的依賴數組必須包含所有外部依賴
- **函數穩定化**: 使用 useCallback 確保函數引用穩定
- **避免循環依賴**: 小心設計函數依賴關係

### 測試策略改進
1. **邊界條件測試**: 錯誤處理、快速操作、並發狀態變化
2. **Hooks 專門測試**: 對於複雜的狀態管理組件，需要專門的 Hooks 測試
3. **真實場景模擬**: 測試應該模擬用戶的真實操作場景

## 🚀 預防措施

### 開發規範更新
1. **Hooks 規則檢查**: 確保 hooks 在條件語句外調用
2. **useCallback 使用**: 對於在 useEffect 中使用的函數，使用 useCallback
3. **依賴數組正確性**: useEffect 的依賴數組必須包含所有外部依賴
4. **專門測試**: 對於複雜的狀態管理，創建專門的 Hooks 測試

### 程式碼檢查清單
- [ ] 所有 hooks 在組件頂層調用？
- [ ] useEffect 依賴數組是否完整？
- [ ] 事件處理函數是否使用 useCallback？
- [ ] 是否有 Hooks 順序的專門測試？

## 🔧 技術細節

### useCallback 使用模式
```typescript
// 基礎狀態清除函數
const clearAuthState = useCallback(() => {
  // 狀態清除邏輯
}, []) // 無外部依賴

// 依賴其他 callback 的函數
const handleLogout = useCallback(() => {
  clearAuthState()
  router.push('/login')
}, [clearAuthState, router]) // 包含所有依賴
```

### 錯誤處理最佳實踐
```typescript
// 在 useEffect 中安全地處理錯誤
useEffect(() => {
  const checkAuthStatus = () => {
    try {
      // 主要邏輯
    } catch (error) {
      console.error('Error:', error)
      clearAuthState() // 直接調用穩定的函數
    }
  }
  
  checkAuthStatus()
}, [clearAuthState]) // 正確的依賴
```

---

**完成時間**: 2025-06-21 20:40  
**總耗時**: 100 分鐘  
**Bug 嚴重程度**: 中等 → 已解決  
**測試新增**: 5 個專門測試  
**代碼品質**: 顯著提升 