# Session 持久化測試指南

## 功能概述
實作了完整的 JWT-based session 持久化機制，包含：
- Access Token (15分鐘有效期)
- Refresh Token (7天有效期)
- 自動 token 刷新
- 定期認證檢查

## 手動測試步驟

### 1. 測試基本登入流程
1. 訪問 http://localhost:3000/login
2. 使用測試帳號登入
3. 開啟開發者工具 > Application > Cookies
4. 確認以下 cookies 存在：
   - `accessToken` - JWT access token
   - `refreshToken` - JWT refresh token
   - `isLoggedIn` - 向後相容
   - `user` - 用戶資訊

### 2. 測試 Token 過期和刷新
1. 登入後等待 10-15 分鐘
2. 重新整理頁面
3. 在 Network 標籤觀察：
   - 應該看到 `/api/auth/check` 請求
   - 如果 token 即將過期，會自動呼叫 `/api/auth/refresh`
   - 新的 access token 會自動設置

### 3. 測試 Session 持續性
1. 登入系統
2. 關閉瀏覽器標籤（不要登出）
3. 重新開啟網站
4. 應該仍保持登入狀態

### 4. 測試自動檢查機制
1. 登入後保持頁面開啟
2. 觀察 Network 標籤
3. 每 5 分鐘應該有一次 `/api/auth/check` 請求
4. 確保 session 保持活躍

## API 端點

### POST /api/auth/login
- 發放 access token (15分鐘) 和 refresh token (7天)
- 設置 httpOnly cookies

### POST /api/auth/refresh
- 使用 refresh token 獲取新的 access token
- 只接受來自 cookies 的 refresh token

### GET /api/auth/check
- 檢查當前認證狀態
- 返回 `tokenExpiringSoon` 標誌

### POST /api/auth/logout
- 清除所有認證相關 cookies

## 安全特性

1. **httpOnly Cookies**
   - 防止 XSS 攻擊
   - tokens 無法被 JavaScript 讀取

2. **短期 Access Token**
   - 15 分鐘過期
   - 減少 token 洩漏風險

3. **Refresh Token 限制**
   - 只能在 `/api/auth/refresh` 使用
   - 7 天有效期

4. **Secure Flag**
   - 生產環境強制 HTTPS

## 測試檢查清單

- [ ] 登入成功設置 JWT tokens
- [ ] Access token 15 分鐘後過期
- [ ] Token 即將過期時自動刷新
- [ ] Refresh token 可成功獲取新 access token
- [ ] 登出清除所有 tokens
- [ ] 關閉瀏覽器後重開仍保持登入
- [ ] 每 5 分鐘自動檢查認證狀態
- [ ] 舊的 cookie 系統仍然相容

## 已知限制

1. **開發環境**
   - 使用預設 JWT secret
   - 需在生產環境設置 `JWT_SECRET` 環境變數

2. **用戶資料**
   - 目前使用 mock 用戶資料
   - 生產環境需連接真實資料庫

3. **Token 儲存**
   - Refresh tokens 未儲存在資料庫
   - 無法撤銷已發放的 tokens

測試日期：_______________
測試人員：_______________