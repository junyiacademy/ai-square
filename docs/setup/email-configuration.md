# Email Configuration Guide

## 問題診斷

如果您看到「Verification email sent! Please check your inbox」但沒有收到郵件，可能是以下原因：

### 錯誤：Invalid login (535-5.7.8)
這表示 Gmail 拒絕認證。您需要重新設置應用程式專用密碼。

## Gmail 應用程式專用密碼設置

### 步驟 1：啟用兩步驟驗證
1. 前往 [Google 帳戶安全性設定](https://myaccount.google.com/security)
2. 找到「如何登入 Google」區塊
3. 點擊「兩步驟驗證」
4. 按照指示啟用（如果尚未啟用）

### 步驟 2：生成應用程式專用密碼
1. 在兩步驟驗證頁面，向下滾動找到「應用程式密碼」
2. 如果看不到此選項，請確認：
   - 兩步驟驗證已啟用
   - 您不是使用公司/學校/組織的 Google 帳戶（某些組織帳戶可能限制此功能）
3. 點擊「應用程式密碼」
4. 選擇應用程式：「郵件」
5. 選擇裝置：「其他（自訂名稱）」
6. 輸入名稱：`AI Square` 或 `AI Square Email Service`
7. 點擊「產生」
8. **重要**：複製顯示的 16 位密碼（例如：`abcd efgh ijkl mnop`）

### 步驟 3：更新 .env.local
```bash
# 在 frontend/.env.local 中更新
GMAIL_USER=your-email@junyiacademy.org
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop  # 空格會自動被處理
```

### 步驟 4：驗證設置
```bash
# 測試郵件發送
cd frontend
npx tsx scripts/test-email.ts
```

## 替代方案

如果 Gmail 持續有問題，可以考慮：

### 選項 1：使用 SendGrid
```bash
# .env.local
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@your-domain.com
```

### 選項 2：使用 Resend
```bash
# .env.local
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@your-domain.com
```

### 選項 3：開發環境使用 Mailtrap
```bash
# .env.local (僅限開發)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-pass
```

## 常見問題

### Q: 為什麼不能使用一般的 Gmail 密碼？
A: Google 從 2022 年起停止支援「低安全性應用程式」直接使用密碼登入。必須使用應用程式專用密碼。

### Q: 應用程式專用密碼會過期嗎？
A: 通常不會，但如果您更改 Google 帳戶密碼或撤銷應用程式存取權，需要重新生成。

### Q: 如何確認郵件是否真的發送了？
A: 檢查伺服器日誌：
```bash
# 查看郵件發送日誌
npm run dev 2>&1 | grep -E "Email|email|SMTP"
```

### Q: 郵件被標記為垃圾郵件怎麼辦？
A:
1. 確保發件人地址與域名一致
2. 添加 SPF、DKIM、DMARC 記錄到 DNS
3. 使用專業的郵件服務商（SendGrid、Resend 等）

## 錯誤代碼參考

| 錯誤代碼 | 含義 | 解決方案 |
|---------|------|---------|
| 535-5.7.8 | 認證失敗 | 重新生成應用程式專用密碼 |
| 534-5.7.9 | 需要應用程式專用密碼 | 使用應用程式專用密碼而非一般密碼 |
| 550-5.1.1 | 收件人地址無效 | 檢查收件人郵件地址格式 |
| 421-4.7.0 | 暫時性錯誤 | 稍後重試 |
| ENOTFOUND | 無法解析 SMTP 主機 | 檢查網路連線和 SMTP_HOST 設定 |
| ECONNREFUSED | 連線被拒絕 | 檢查防火牆和 SMTP_PORT 設定 |

## 聯絡支援

如果問題持續，請提供以下資訊：
1. 錯誤訊息截圖
2. `npx tsx scripts/test-email.ts` 的完整輸出
3. 您使用的 Google 帳戶類型（個人/組織）
