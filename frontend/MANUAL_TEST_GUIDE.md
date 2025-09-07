# 手動測試指南 - Onboarding 不再阻擋使用者

## 測試目的
驗證修改後的程式碼不會強制使用者完成 onboarding，讓使用者可以直接使用三大模式。

## 修改內容
1. **`src/app/login/page.tsx`** - 移除了 onboarding 檢查，登入後直接導向 dashboard
2. **`src/app/register/page.tsx`** - 註冊後直接導向 dashboard，而非 onboarding

## 測試步驟

### 步驟 1: 啟動開發伺服器
```bash
cd frontend
npm run dev
```
伺服器會在 http://localhost:3000 啟動（或其他可用的 port）

### 步驟 2: 清除瀏覽器資料
1. 開啟瀏覽器的開發者工具 (F12)
2. 進入 Application 標籤
3. 清除 Local Storage 中的所有資料
4. 清除 Cookies

### 步驟 3: 測試登入流程
1. 訪問 http://localhost:3000/login
2. 使用測試帳號登入：
   - Email: demo@example.com
   - Password: （需要確認正確的密碼）
3. **預期結果**: 登入後應該直接進入 `/dashboard`，而不是 `/onboarding/welcome`

### 步驟 4: 測試三大模式訪問
登入後，直接在瀏覽器網址列輸入：

1. **PBL 模式**: http://localhost:3000/pbl/scenarios
   - **預期結果**: 可以看到 PBL 情境列表

2. **Assessment 模式**: http://localhost:3000/assessment/scenarios  
   - **預期結果**: 可以看到評估情境列表

3. **Discovery 模式**: http://localhost:3000/discovery/scenarios
   - **預期結果**: 可以看到探索情境列表

### 步驟 5: 測試註冊流程（可選）
1. 登出後訪問 http://localhost:3000/register
2. 註冊新帳號
3. **預期結果**: 註冊後應該直接進入 `/dashboard`，而不是 `/onboarding/welcome`

## 測試結果檢查清單

- [ ] 登入後直接進入 dashboard
- [ ] 沒有被強制導向 onboarding
- [ ] 可以直接訪問 PBL 頁面
- [ ] 可以直接訪問 Assessment 頁面  
- [ ] 可以直接訪問 Discovery 頁面
- [ ] 註冊後直接進入 dashboard（如果測試）

## 問題排查

如果測試失敗：

1. **還是被導向到 onboarding**
   - 檢查 `src/app/login/page.tsx` 第 71-74 行是否已修改
   - 確認沒有其他地方檢查 onboarding 狀態

2. **無法訪問三大模式**
   - 可能是登入狀態問題，檢查 cookies
   - 檢查瀏覽器 console 是否有錯誤訊息

3. **登入失敗**
   - 確認資料庫中有 demo 使用者
   - 確認密碼正確

## 修改前 vs 修改後

### 修改前的行為
```
登入 → 檢查 onboardingCompleted → false → 強制導向 /onboarding/welcome
```

### 修改後的行為  
```
登入 → 直接導向 /dashboard → 可以自由訪問所有功能
```

## 結論
這個修改讓 onboarding 變成完全可選的功能，提升使用者體驗，讓使用者可以立即探索平台的核心功能。