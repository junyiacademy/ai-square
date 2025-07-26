# PBL Generate Feedback API

## Feedback 更新策略

### 觸發時機
1. **首次訪問 complete 頁面**：如果沒有當前語言的 feedback
2. **切換語言**：如果新語言沒有 feedback
3. **Evaluation 更新後訪問**：檢測到 evaluation 版本變更

### 版本檢查機制
- 每個 feedback 記錄生成時的 `evaluationVersion`
- 比較 `evaluation.metadata.lastSyncedAt` 與 `feedback.evaluationVersion`
- 如果 evaluation 更新時間晚於 feedback 生成時間，則重新生成

### 不會觸發的情況
- 單純刷新頁面（有快取且版本匹配）
- 完成單個 task（需要用戶進入 complete 頁面才會檢查）
- 切換到已有 feedback 的語言

### 強制更新
- 開發模式下可點擊重新生成按鈕
- 設置 `forceRegenerate: true` 參數

## 成本優化
- 避免每個 task evaluation 都生成 feedback
- 使用多語言快取減少重複生成
- 只在用戶真正需要時（查看完成頁面）才生成