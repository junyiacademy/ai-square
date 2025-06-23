# ADR-027: Dev Log 標準強制執行

## 狀態
已採納

## 背景
開發日誌（dev logs）出現了兩個主要問題：
1. **檔名缺少時間戳記**：部分檔案名稱沒有 HH-MM-SS 格式的時間
2. **時間計算不準確**：使用檔案系統時間而非 git commit 歷史

這違反了 ADR-016 和 ADR-017 中定義的標準。

## 決策

### 1. 檔名格式強制標準
所有 dev log 檔名必須遵循格式：
```
YYYY-MM-DD-HH-MM-SS-type-description.yml
```

### 2. 時間計算方法
必須使用 git 歷史計算時間，優先級：
1. Git log --follow 獲取檔案歷史
2. Commit 間隔時間
3. 檔案數量估算（最後手段）

### 3. Ticket 關聯
每個 dev log 必須記錄：
- `ticket_id`: ticket 唯一識別碼
- `ticket_name`: ticket 名稱

### 4. 自動修復工具
創建 `fix-devlog-filenames.py` 來：
- 掃描所有缺少時間戳記的檔案
- 從 commit_hash 或檔案內容獲取正確時間
- 使用 git mv 保留歷史

## 實施影響

### 改進的腳本
1. **pre-commit-doc-gen.py**
   - 檔名包含時間戳記
   - 使用 git 歷史計算時間
   - 記錄 active ticket 資訊

2. **post-commit-doc-gen.py**
   - 確保時間計算一致性
   - 更新 ticket 狀態

### 修復的檔案
- 20 個歷史 dev log 檔案已重命名
- 保留了 git 歷史記錄

## 替代方案
1. **只修復新檔案**：不符合一致性要求
2. **使用檔案時間**：不準確，容易被修改
3. **手動修復**：耗時且容易出錯

## 後續行動
1. 加入 CI 檢查，確保新檔案符合格式
2. 定期執行修復腳本
3. 更新文檔說明新標準

## 參考資料
- ADR-016: Commit-based Time Analysis
- ADR-017: Dev Logs Structure and Standards

## 決策者
AI Assistant + Human Developer

## 日期
2025-06-23