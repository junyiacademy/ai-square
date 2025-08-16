# E2E Testing Requirements - Critical Lessons Learned

## 🚨 最重要的教訓：E2E 測試必須使用真實瀏覽器

### ❌ 錯誤的測試方式（會漏掉關鍵問題）

```bash
# 這種測試方式無法發現 session 維持問題！
curl -X POST /api/auth/login  # API 回應正常
curl /api/pbl/scenarios        # API 也正常

# 但用戶在瀏覽器中卻會被重定向到登入頁！
```

### ✅ 正確的測試方式（使用瀏覽器）

```typescript
// 必須使用 Playwright 或類似工具進行真實瀏覽器測試
test('登入後能訪問受保護頁面', async ({ page }) => {
  // 1. 登入
  await page.goto('/login');
  await page.fill('[name="email"]', 'student@example.com');
  await page.fill('[name="password"]', 'student123');
  await page.click('button[type="submit"]');
  
  // 2. 關鍵測試：訪問受保護頁面
  await page.goto('/discovery/overview');
  
  // 3. 驗證沒有被重定向
  expect(page.url()).toContain('/discovery/overview');
  expect(page.url()).not.toContain('/login');
});
```

## 📋 E2E 測試檢查清單

### 1. 登入測試必須包含
- [ ] **Cookie 驗證**: 檢查必要的 cookies 是否設置（特別是 `accessToken`）
- [ ] **Session 維持**: 登入後訪問其他頁面不被重定向
- [ ] **頁面刷新**: 刷新頁面後仍保持登入狀態
- [ ] **API 狀態同步**: `/api/auth/check` 返回 `authenticated: true`

### 2. 受保護路由測試
必須測試所有需要登入的頁面：
- [ ] `/discovery/overview`
- [ ] `/pbl/scenarios`
- [ ] `/assessment/scenarios`
- [ ] `/profile`
- [ ] 其他需要認證的頁面

### 3. 測試工具要求
- **必須使用**: Playwright、Puppeteer、Selenium 等真實瀏覽器工具
- **不能只用**: curl、fetch、axios 等 API 測試工具

## 🔍 常見錯誤檢測

### 問題：登入成功但被重定向到登入頁

**症狀**：
- API 登入返回 success: true
- 但訪問受保護頁面時被重定向到 /login

**常見原因**：
1. **Cookie 未設置**: 登入 API 沒有設置必要的 cookies
2. **Cookie 名稱錯誤**: 前端檢查的 cookie 名稱與後端設置的不一致
3. **環境變數問題**: NODE_ENV 影響 cookie 的 secure 屬性

**診斷步驟**：
```javascript
// 在瀏覽器 Console 中檢查
document.cookie  // 查看所有 cookies
localStorage     // 查看 localStorage

// 檢查關鍵 API
fetch('/api/auth/check').then(r => r.json()).then(console.log)
```

## 🛠️ 修復驗證流程

### Step 1: 識別問題
使用瀏覽器開發者工具：
1. Network tab: 查看 API 請求和回應
2. Application tab: 檢查 Cookies 和 localStorage
3. Console: 查看錯誤訊息

### Step 2: 修復後的驗證
1. **本地測試**: 使用 Playwright 在本地測試
2. **Staging 測試**: 部署到 staging 後用瀏覽器測試
3. **Production 測試**: 部署到 production 後再次驗證

## 📝 測試腳本範例

```bash
# scripts/e2e-auth-test.sh
#!/bin/bash

SERVICE_URL="${1:-http://localhost:3000}"

echo "🧪 E2E Authentication Test"
echo "=========================="

# 使用 Playwright 進行測試
npx playwright test tests/auth.spec.ts --headed

# 或使用 browser 自動化工具
node scripts/browser-e2e-test.js
```

## ⚠️ 重要提醒

**永遠不要只依賴 API 測試來驗證認證功能！**

真實用戶使用瀏覽器，所以測試也必須使用瀏覽器。這個教訓來自於 2025-08-15 的 staging 部署，當時 API 測試全部通過，但實際用戶無法保持登入狀態。

## 🎯 關鍵原則

1. **測試要模擬真實用戶行為**
2. **使用瀏覽器工具進行 E2E 測試**
3. **檢查 cookies 和 session 狀態**
4. **測試頁面刷新和路由切換**
5. **驗證前後端狀態同步**

---

最後更新：2025-08-15
教訓來源：Staging 部署 session 維持問題