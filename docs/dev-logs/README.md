# 開發日誌目錄

此目錄記錄所有開發活動，包括新功能、Bug 修復、重構等。

## 📁 目錄結構

```
dev-logs/
├── YYYY-MM-DD/                    # 日期資料夾
│   ├── features/                   # 功能開發
│   ├── bugfixes/                   # Bug 修復
│   ├── documentation/              # 文檔更新
│   ├── refactoring/               # 程式碼重構
│   ├── time-tracking/             # 時間追蹤相關
│   └── auto-documentation/        # 自動生成的文檔
└── templates/                     # 日誌模板
```

## 📝 檔案命名規則

### 自動生成（有 commit hash）
```
YYYY-MM-DD-HH-MM-SS-{type}-{brief-description}.yml
```

### 手動創建（無 commit hash）
```
YYYY-MM-DD-{type}-{description}.yml
```

- **type**: `feature`, `bug`, `refactor`, `docs`, `test`
- **description**: 簡短描述（使用連字號分隔）

### 範例
- `2025-06-23-03-26-02-docs-enhance-commit-message-generation.yml`
- `2025-06-23-02-14-15-bug-fix-time-calculation-int-to.yml`
- `2025-06-22-feature-learning-progress-tracker.yml`

## 🏷️ 日誌類型

| Type | 用途 | 存放位置 | 模板 |
|------|------|----------|------|
| feature | 新功能開發 | features/ | feature-log-template.yml |
| bug | 問題修復 | bugfixes/ | bug-log-template.yml |
| docs | 文檔更新 | documentation/ | docs-log-template.yml |
| refactor | 程式碼重構 | refactoring/ | refactor-log-template.yml |
| test | 測試相關 | misc/ | - |

## 📊 自動化功能

### 1. Pre-commit 生成
- 在 commit 前自動生成日誌
- 基於檔案修改時間計算開發時間
- 日誌包含在 commit 中

### 2. Post-commit 更新
- 補充 commit hash
- 更新時間計算
- 自動執行補充 commit

### 3. 時間計算方法優先級
1. **Real-time tracking** - 即時時間追蹤（最準確）
2. **Git log analysis** - 基於 commit 間隔分析
3. **File timestamp** - 基於檔案修改時間
4. **File count estimate** - 基於檔案數量估算

## 📈 重要欄位說明

### 時間相關
- `total_time_minutes`: 總開發時間（分鐘）
- `ai_time_minutes`: AI 貢獻時間
- `human_time_minutes`: 人類貢獻時間
- `time_estimation_method`: 時間計算方法
- `time_confidence`: 時間準確度（high/medium/low）

### 檔案變更
- `files_added`: 新增檔案數
- `files_modified`: 修改檔案數  
- `files_deleted`: 刪除檔案數
- `changes`: 詳細的檔案變更列表

### 自動生成標記
- `auto_generated`: 是否自動生成
- `pre_commit_generated`: 是否為 pre-commit 生成
- `migrated_at`: migration 時間（如果有）

## 🔧 相關工具

- `commit-guide.py`: 智能提交助手
- `pre-commit-doc-gen.py`: Pre-commit 文檔生成
- `post-commit-doc-gen.py`: Post-commit 文檔更新
- `analytics.py`: 開發數據分析

## 📋 使用指南

1. **開發新功能時**
   ```bash
   make dev-ticket TICKET=feature-name
   # 開發完成後
   make commit
   ```

2. **修復 Bug 時**
   ```bash
   # 直接開始修復，commit 時會自動生成日誌
   git add .
   make commit
   ```

3. **手動創建日誌**
   - 複製對應的模板
   - 填寫必要資訊
   - 保存到正確的日期/類別資料夾