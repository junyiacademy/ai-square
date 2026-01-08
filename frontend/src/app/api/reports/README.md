# AI Square 週報系統

自動化週報系統，每週一早上 9:00 發送統計報告到 Slack。

## 📊 報告內容

- **用戶增長**: 新註冊、累計用戶、週環比增長、每日趨勢
- **用戶活躍度**: 週活躍用戶、日均活躍、7 日留存率
- **學習數據**: Assessment/PBL/Discovery 完成數、完成率
- **系統健康**: API 成功率、響應時間、系統可用性

## 🏗️ 架構

```
src/app/api/reports/
├── lib/
│   ├── db-queries.ts          # 資料庫查詢邏輯
│   ├── report-formatter.ts    # 報告格式化
│   ├── slack-client.ts        # Slack 發送
│   └── __tests__/             # 單元測試 (30 tests)
├── weekly/
│   ├── route.ts               # API endpoint
│   └── __tests__/
└── README.md
```

## 🧪 測試覆蓋

- ✅ DB Queries: 5/5 tests
- ✅ Report Formatter: 11/11 tests
- ✅ Slack Client: 7/7 tests
- ✅ API Endpoint: 7/7 tests
- **總計: 30/30 tests passing**

## 🚀 使用方式

### 自動執行 (GitHub Actions)

每週一早上 9:00 (Asia/Taipei) 自動執行：

```yaml
# .github/workflows/weekly-report.yml
schedule:
  - cron: "0 1 * * 1" # 每週一 01:00 UTC = 09:00 台北
```

### 手動執行

```bash
# 方式 1: API 呼叫
curl -X POST https://ai-square-production-m7s4ucbgba-de.a.run.app/api/reports/weekly

# 方式 2: GitHub Actions (手動觸發)
# 前往 GitHub Actions → Weekly Report → Run workflow
```

### 本地測試

```bash
# 運行單元測試
npm test -- src/app/api/reports

# 本地發送報告 (需要 .env.local 設定 SLACK_AISQUARE_WEBHOOK_URL)
curl -X POST http://localhost:3001/api/reports/weekly
```

## ⚙️ 環境變數

```bash
# .env.local 或 .env.production
SLACK_AISQUARE_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_AISQUARE_DEV_WEBHOOK_URL=https://hooks.slack.com/services/...  # fallback
```

## 📝 開發規範

- **TDD 開發**: 所有功能先寫測試 (Red → Green → Refactor)
- **TypeScript 嚴格模式**: 零 `any` 類型
- **測試覆蓋率**: 100%
- **可測試性**: 所有邏輯都在 lib/ 中，易於 mock

## 🔧 維護指南

### 新增指標

1. 更新 `db-queries.ts` 中的 SQL 查詢
2. 更新 `WeeklyStats` interface
3. 更新 `report-formatter.ts` 格式化邏輯
4. 新增對應的單元測試

### 修改報告格式

編輯 `report-formatter.ts` 中的 `formatWeeklyReport` 函數。

### 修改發送時間

編輯 `.github/workflows/weekly-report.yml` 中的 cron 表達式。

## 🎯 設計原則

1. **Infrastructure First**: API Route (非 scripts/)
2. **TDD**: 測試驅動開發
3. **Separation of Concerns**: DB / Format / Send 分離
4. **Type Safety**: 嚴格 TypeScript
5. **Testability**: 易於測試和 mock

---

**建立日期**: 2025-11-27
**測試狀態**: ✅ 30/30 passing
