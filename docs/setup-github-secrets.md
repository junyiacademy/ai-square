# GitHub Secrets 設定指南

## 🔐 設定 Slack Webhook Secret

### 步驟 1: 前往 GitHub Settings

1. 開啟瀏覽器前往：
   ```
   https://github.com/junyiacademy/ai-square/settings/secrets/actions
   ```

2. 或手動導航：
   - GitHub Repository → Settings
   - 左側選單 → Secrets and variables → Actions
   - 點擊 "New repository secret"

### 步驟 2: 新增 Secret

**Name (精確輸入，區分大小寫):**
```
SLACK_AISQUARE_WEBHOOK_URL
```

**Value (從 .env.local 複製完整 webhook URL):**
```
https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

> 💡 實際 URL 請從 `frontend/.env.local` 中的 `SLACK_AISQUARE_WEBHOOK_URL` 複製

### 步驟 3: 儲存

點擊 "Add secret" 按鈕。

---

## ✅ 驗證設定

設定完成後，下次 push 到 main 分支時：

1. GitHub Actions 會自動觸發 `auto-deploy.yml`
2. 部署到 Cloud Run 時會包含 `SLACK_AISQUARE_WEBHOOK_URL` 環境變數
3. Weekly Report API 就能發送報告到 Slack

---

## 🧪 測試

部署完成後，可以手動測試：

```bash
# 呼叫 Production API
curl -X POST https://ai-square-production-m7s4ucbgba-de.a.run.app/api/reports/weekly

# 或手動觸發 GitHub Actions
# 前往: https://github.com/junyiacademy/ai-square/actions/workflows/weekly-report.yml
# 點擊 "Run workflow"
```

報告會發送到 **#ai-square-** 頻道。

---

## 📋 現有 Secrets 清單

確保以下 Secrets 都已設定：

- ✅ `GCP_SA_KEY` - Google Cloud Service Account
- ✅ `PROD_DB_PASSWORD` - Production Database 密碼
- ✅ `STAGING_DB_PASSWORD` - Staging Database 密碼
- ✅ `NEXTAUTH_SECRET` - NextAuth Secret
- ✅ `VERTEX_AI_KEY` - Vertex AI Service Account
- ✅ `SMTP_USER` - Email SMTP 用戶
- ✅ `SMTP_PASS` - Email SMTP 密碼
- ⚠️ `SLACK_AISQUARE_WEBHOOK_URL` - **需要新增**

---

**日期**: 2025-11-27
**相關 PR**: Weekly Report System
