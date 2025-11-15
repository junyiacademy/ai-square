# 📧 Email 服務設定指南

## 使用 Gmail SMTP 免費發送郵件

### 步驟 1：啟用 Gmail 兩步驟驗證

1. 前往 [Google 帳戶設定](https://myaccount.google.com/security)
2. 找到「登入 Google」區塊
3. 點擊「兩步驟驗證」
4. 按照指示啟用兩步驟驗證

### 步驟 2：建立應用程式專用密碼

1. 在安全性設定中，找到「應用程式密碼」
2. 如果看不到此選項，請確認已啟用兩步驟驗證
3. 點擊「應用程式密碼」
4. 選擇「郵件」和「其他（自訂名稱）」
5. 輸入名稱如「AI Square Email Service」
6. 點擊「產生」
7. **複製產生的 16 位密碼**（只會顯示一次！）

### 步驟 3：設定環境變數

在 `frontend/.env.local` 檔案中加入：

```env
# Gmail SMTP 設定
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # 16位應用程式專用密碼（不含空格）

# 應用程式 URL（用於郵件中的連結）
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 步驟 4：測試郵件發送

建立測試腳本 `scripts/test-email.ts`：

```typescript
import { emailService } from '../src/lib/email/email-service';

async function testEmail() {
  const testEmail = process.env.GMAIL_USER || 'test@example.com';

  console.log('🧪 Testing email service...');

  // 測試驗證郵件
  const verificationSent = await emailService.sendVerificationEmail(
    testEmail,
    'http://localhost:3000/verify-email?token=test-token'
  );

  console.log('Verification email sent:', verificationSent);

  // 測試歡迎郵件
  const welcomeSent = await emailService.sendWelcomeEmail(
    testEmail,
    'Test User'
  );

  console.log('Welcome email sent:', welcomeSent);
}

testEmail().catch(console.error);
```

執行測試：
```bash
npx tsx scripts/test-email.ts
```

## 📊 Gmail SMTP 限制

- **每日發送限制**：500 封（個人帳號）/ 2000 封（Google Workspace）
- **每分鐘限制**：約 20-30 封
- **適用場景**：開發測試、小型應用、MVP

## 🔒 安全注意事項

1. **永遠不要**將密碼提交到版本控制
2. `.env.local` 已在 `.gitignore` 中
3. 生產環境使用環境變數管理服務
4. 定期更換應用程式專用密碼

## 🚀 生產環境建議

當用戶量增長時，考慮升級到專業服務：

1. **SendGrid**（每日 100 封免費）
2. **AWS SES**（每月 62,000 封免費，需信用卡）
3. **Mailgun**（每月 5,000 封免費，3個月）
4. **Resend**（每月 3,000 封免費）

## 📝 故障排除

### 常見錯誤

1. **"Invalid login"**
   - 確認使用應用程式專用密碼，而非帳號密碼
   - 確認已啟用兩步驟驗證

2. **"Connection timeout"**
   - 檢查防火牆設定
   - 確認 Gmail 允許「低安全性應用程式存取」

3. **郵件進入垃圾信箱**
   - 加入 SPF/DKIM 記錄（需自訂網域）
   - 確保郵件內容不觸發垃圾郵件過濾器

## 🎯 下一步

1. 完成 Gmail 設定
2. 測試註冊流程
3. 實作密碼重設功能
4. 監控郵件發送狀態
