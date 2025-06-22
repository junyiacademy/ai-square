# Scripts 目錄說明

## 提交自動化腳本

### commit-guide.py
智能提交助手，自動執行：
- ESLint 檢查
- TypeScript 檢查
- 建置檢查（嚴格模式）
- 測試檢查（嚴格模式）
- 智能生成提交訊息
- 更新功能日誌提醒

### setup-hooks.sh
設置 Git Hooks 的腳本，只需執行一次。

## 分析工具

### analytics.py
位於 `docs/metrics/analytics.py`，用於分析開發日誌並生成報告。

## 使用方式

參見 [智能提交系統使用指南](../docs/tutorials/smart-commit-guide.md)