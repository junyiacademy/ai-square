# 開發日誌目錄

此目錄記錄所有開發活動，包括新功能、Bug 修復、重構等。

## 📁 檔案命名規則

```
YYYY-MM-DD-{type}-{description}.yml
```

- **type**: `feature`, `bug`, `refactor`, `docs`, `test`
- **description**: 簡短描述（使用連字號分隔）

### 範例
- `2025-06-22-feature-homepage-login.yml`
- `2025-06-22-bug-auth-sync.yml`
- `2025-06-22-refactor-component-structure.yml`

## 📝 使用模板

- **功能開發**: 使用 `feature-log-template.yml`
- **Bug 修復**: 使用 `bug-log-template.yml`

## 📊 自動分析

所有日誌都可以被 `docs/scripts/analytics.py` 自動分析，生成：
- 開發效率報告
- 成本分析
- AI 協作統計
- 常見問題模式

## 🏷️ 類型說明

| Type | 用途 | 關鍵指標 |
|------|------|----------|
| feature | 新功能開發 | 開發時間、AI貢獻度、成本節省 |
| bug | 問題修復 | 診斷時間、影響範圍、預防措施 |
| refactor | 程式碼重構 | 改善幅度、風險評估 |
| docs | 文檔更新 | 覆蓋範圍、清晰度提升 |
| test | 測試改進 | 覆蓋率提升、錯誤發現率 |