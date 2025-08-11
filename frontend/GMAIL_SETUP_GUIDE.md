# Gmail 郵件服務設置指南

## 問題診斷
目前郵件發送失敗，錯誤訊息：
```
Invalid login: 534-5.7.9 Application-specific password required
```

## 解決方案：設置 Gmail 應用程式專用密碼

### 步驟 1：啟用兩步驟驗證
1. 登入 Google 帳號：https://myaccount.google.com
2. 點擊「安全性」
3. 在「登入 Google」區塊中，點擊「兩步驟驗證」
4. 按照指示完成設定

### 步驟 2：生成應用程式專用密碼
1. 前往：https://myaccount.google.com/apppasswords
2. 在「選擇應用程式」下拉選單中選擇「郵件」
3. 在「選擇裝置」下拉選單中選擇「其他（自訂名稱）」
4. 輸入名稱（例如：AI Square Staging）
5. 點擊「產生」
6. 複製生成的 16 位密碼（格式如：xxxx xxxx xxxx xxxx）

### 步驟 3：更新 Cloud Run 環境變數
```bash
# 使用生成的應用程式專用密碼（移除空格）
gcloud run services update ai-square-staging \
  --region=asia-east1 \
  --update-env-vars="GMAIL_USER=ai-square@junyiacademy.org,GMAIL_APP_PASSWORD=你的16位密碼"
```

### 步驟 4：驗證設置
1. 註冊新帳號測試
2. 檢查是否收到驗證郵件
3. 查看 Cloud Run 日誌確認發送狀態

## 當前狀態
- ✅ GMAIL_USER 已設置：ai-square@junyiacademy.org
- ❌ GMAIL_APP_PASSWORD 需要更新為應用程式專用密碼
- ✅ 郵件服務程式碼正常運作
- ✅ 未驗證郵件的用戶仍可登入（按設計）

## 驗證郵件內容
當郵件服務正常運作後，用戶將收到：
- 標題：Verify your AI Square account
- 內容：包含驗證連結
- 驗證連結格式：https://[domain]/verify-email?token=[token]

## 測試建議
1. 使用真實的 email 地址進行測試
2. 檢查垃圾郵件資料夾
3. 確認郵件內容格式正確
4. 測試驗證連結是否有效

## 備選方案
如果 Gmail 設置困難，可以考慮：
1. 使用 SendGrid（每天免費 100 封）
2. 使用 Mailgun（每月免費 5000 封）
3. 使用 AWS SES（需要 AWS 帳號）

---

*最後更新：2025-08-11*