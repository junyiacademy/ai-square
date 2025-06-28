# 認證系統測試指南

## 測試準備
1. 啟動開發伺服器：`npm run dev`
2. 開啟瀏覽器開發者工具 (F12)
3. 切換到 Network 標籤頁

## 測試步驟

### 1. 測試登入流程
1. 訪問 http://localhost:3000/login
2. 使用測試帳號登入：
   - Email: `student@example.com`
   - Password: `student123`
3. 檢查：
   - ✅ 應該跳轉到 /relations 頁面
   - ✅ Header 應顯示用戶資訊
   - ✅ Network 標籤應顯示 Set-Cookie headers

### 2. 測試認證持續性
1. 重新整理頁面 (F5)
2. 檢查：
   - ✅ 應該仍然保持登入狀態
   - ✅ Header 應該仍顯示用戶資訊

### 3. 測試登出流程
1. 點擊 Header 的登出按鈕
2. 檢查：
   - ✅ 應該跳轉到 /login 頁面
   - ✅ Header 應該顯示登入按鈕（而非用戶資訊）
   - ✅ Network 標籤應顯示 logout API 調用

### 4. 測試登出後的狀態
1. 手動訪問 http://localhost:3000/relations
2. 檢查：
   - ✅ 應該可以正常訪問（目前沒有路由保護）
   - ✅ Header 應該顯示登入按鈕

### 5. 測試 Cookie 清除
1. 在開發者工具中檢查 Application > Cookies
2. 確認以下 cookies 已被清除：
   - `isLoggedIn`
   - `userRole`
   - `user`

## 已知問題
- 目前沒有實作路由保護，未登入用戶仍可訪問所有頁面
- Session 持久化尚未實作（AUTH-002）

## 測試結果記錄
請在測試後記錄結果：

- [ ] 登入功能正常
- [ ] 登出功能正常
- [ ] Cookies 正確設置和清除
- [ ] 認證狀態在頁面重整後保持

測試日期：_______________
測試人員：_______________
備註：_______________