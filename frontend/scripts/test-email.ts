#!/usr/bin/env tsx
import 'dotenv/config';
import { emailService } from '../src/lib/email/email-service';

async function testEmailService() {
  console.log('🧪 測試 Email 服務...\n');

  // 檢查環境變數
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ 錯誤：請先設定 GMAIL_USER 和 GMAIL_APP_PASSWORD 環境變數');
    console.log('\n請在 .env.local 檔案中加入：');
    console.log('GMAIL_USER=your-email@gmail.com');
    console.log('GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx');
    console.log('\n詳細說明請參考 docs/email-setup-guide.md');
    process.exit(1);
  }

  const testEmail = process.argv[2] || process.env.GMAIL_USER;
  console.log(`📮 測試郵件將發送到: ${testEmail}\n`);

  try {
    // 測試 1：驗證郵件
    console.log('1️⃣ 發送驗證郵件...');
    const verificationResult = await emailService.sendVerificationEmail(
      testEmail,
      'http://localhost:3000/verify-email?token=test-verification-token-123'
    );
    console.log(`   結果: ${verificationResult ? '✅ 成功' : '❌ 失敗'}\n`);

    // 等待一下避免太快發送
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 測試 2：歡迎郵件
    console.log('2️⃣ 發送歡迎郵件...');
    const welcomeResult = await emailService.sendWelcomeEmail(
      testEmail,
      'Test User'
    );
    console.log(`   結果: ${welcomeResult ? '✅ 成功' : '❌ 失敗'}\n`);

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 測試 3：密碼重設郵件
    console.log('3️⃣ 發送密碼重設郵件...');
    const resetResult = await emailService.sendPasswordResetEmail(
      testEmail,
      'http://localhost:3000/reset-password?token=test-reset-token-456'
    );
    console.log(`   結果: ${resetResult ? '✅ 成功' : '❌ 失敗'}\n`);

    console.log('📊 測試總結：');
    console.log(`   驗證郵件: ${verificationResult ? '✅' : '❌'}`);
    console.log(`   歡迎郵件: ${welcomeResult ? '✅' : '❌'}`);
    console.log(`   密碼重設: ${resetResult ? '✅' : '❌'}`);

    if (verificationResult || welcomeResult || resetResult) {
      console.log('\n✨ 請檢查您的收件箱（包括垃圾郵件資料夾）！');
    }

  } catch (error) {
    console.error('\n❌ 測試過程中發生錯誤:', error);
    console.log('\n可能的原因：');
    console.log('1. 應用程式專用密碼不正確');
    console.log('2. Gmail 帳號未啟用兩步驟驗證');
    console.log('3. 網路連線問題');
    console.log('\n請參考 docs/email-setup-guide.md 進行設定');
  }
}

// 執行測試
testEmailService();