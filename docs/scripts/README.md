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

### pre-push-hook.sh
Pre-push Git Hook，防止推送有問題的程式碼：
- 檢查 commit 訊息格式
- 執行前端測試 (npm run test:ci)
- 執行 lint 檢查 (npm run lint)
- 執行 TypeScript 類型檢查 (tsc --noEmit)
- 檢查建置是否成功 (npm run build)
- 檢查後端測試（如果存在）
- 掃描敏感資訊
- 警告大檔案

使用方式：
```bash
# 安裝 hook
make setup-hooks

# 手動執行檢查（不推送）
make pre-push-check

# 跳過檢查強制推送
git push --no-verify
```

### setup-hooks.sh
設置 Git Hooks 的腳本，只需執行一次。

## 分析工具

### analytics.py
位於 `docs/metrics/analytics.py`，用於分析開發日誌並生成報告。

## 使用方式

參見 [智能提交系統使用指南](../docs/tutorials/smart-commit-guide.md)