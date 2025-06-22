# Development Logs 操作指南

## 📋 概述

開發日誌（Development Logs）是 AI Square 專案的核心知識管理系統，記錄每次開發活動的詳細資訊。本指南說明如何正確創建、維護和使用開發日誌。

## 🏗️ 基本結構

### 目錄組織
```
docs/dev-logs/
├── 2025-06-23/                    # 日期資料夾
│   └── *.yml                      # 所有日誌檔案直接放在日期資料夾下
└── README.md                      # 總覽說明
```

### 檔案命名規則

#### 自動生成檔案（推薦）
```
YYYY-MM-DD-HH-MM-SS-{type}-{description}.yml
```
範例：`2025-06-23-14-30-45-feature-user-authentication.yml`

#### 手動創建檔案
```
YYYY-MM-DD-{type}-{description}.yml
```
範例：`2025-06-23-docs-api-documentation.yml`

**注意**：檔名已包含類型資訊，不需要子資料夾分類

## 🚀 使用流程

### 1. 開始新任務（推薦方式）

```bash
# 開始新的開發任務
make dev-ticket TICKET=feature-user-auth

# 這會自動：
# - 創建開發 ticket
# - 啟動時間追蹤
# - 準備環境
```

### 2. 提交代碼

```bash
# 添加變更
git add .

# 使用智能提交助手
make commit

# 或使用 Python 腳本
python3 docs/scripts/commit-guide.py
```

**自動執行的動作**：
1. 執行代碼檢查（ESLint、TypeScript）
2. 計算開發時間
3. 生成 pre-commit 日誌
4. 創建有意義的 commit 訊息
5. 執行 commit
6. 更新日誌加入 commit hash
7. 自動執行補充 commit

### 3. 手動創建日誌

如果需要手動創建日誌：

1. 複製對應的模板：
   - `feature-log-template.yml` - 功能開發
   - `bug-log-template.yml` - Bug 修復
   - `docs-log-template.yml` - 文檔更新
   - `refactor-log-template.yml` - 重構工作

2. 填寫必要欄位：
   ```yaml
   type: feature
   title: 實作使用者認證功能
   date: '2025-06-23'
   developer: AI + Human
   status: completed
   
   timeline:
     - phase: 實現
       duration: 45.0
       ai_time: 36.0
       human_time: 9.0
       tasks:
         - 設計認證流程
         - 實作登入功能
         - 添加單元測試
   ```

3. 保存到正確位置：
   - 檔名：`2025-06-23-feature-user-authentication.yml`
   - 路徑：`docs/dev-logs/2025-06-23/`

## 📏 嚴格規則

### ✅ 必須遵守

1. **檔案位置**
   - 所有日誌必須放在對應的日期資料夾
   - 所有檔案直接放在日期資料夾下，不使用子資料夾
   - 不可將日誌直接放在 `dev-logs/` 根目錄

2. **命名規範**
   - 必須使用小寫字母
   - 必須使用連字號分隔
   - 描述必須清晰明確
   - 不可使用特殊字符

3. **時間記錄**
   - 必須記錄實際開發時間
   - 必須區分 AI 和人類時間
   - 時間單位為分鐘，保留一位小數

4. **內容完整性**
   - 必須填寫所有必要欄位
   - title 不可包含 conventional commit 前綴
   - description 必須是完整的 commit 訊息

### ❌ 禁止事項

1. 不可修改自動生成的時間戳
2. 不可修改 commit hash
3. 不可刪除 auto_generated 標記
4. 不可將多個任務混在一個日誌

## 📊 時間計算說明

### 計算方法優先級

1. **即時追蹤**（最準確）
   ```bash
   make dev-ticket TICKET=xxx  # 自動啟動追蹤
   ```

2. **Git 分析**（次準確）
   - 基於 commit 間隔時間
   - 適用於連續開發

3. **檔案時間戳**（一般準確）
   - 基於檔案修改時間
   - 適用於短期開發

4. **檔案數量估算**（最不準確）
   - 基於變更檔案數
   - 僅作為後備方案

### 合理性範圍

- 最小時間：0.5 分鐘
- 最大連續開發：8 小時
- 標準 AI/Human 比例：80/20

## 🔍 查詢和分析

### 查找特定日期的日誌
```bash
ls docs/dev-logs/2025-06-23/
```

### 查找特定類型的日誌
```bash
find docs/dev-logs -name "*feature*.yml" -type f
```

### 執行數據分析
```bash
python3 docs/scripts/analytics.py --date 2025-06-23
```

## 🛠️ 維護和整理

### 定期檢查
每週執行一次檢查，確保：
- 所有日誌都在正確位置
- 檔名符合規範
- 沒有重複的日誌

### 遷移舊日誌
如果有不符合規範的日誌：
```bash
# 創建遷移腳本
python3 docs/scripts/migrate-logs.py
```

## 💡 最佳實踐

1. **及時記錄**：在 commit 時自動生成，不要延後
2. **詳細任務**：在 tasks 中列出具體完成的工作
3. **準確時間**：使用 dev-ticket 啟動即時追蹤
4. **有意義的標題**：讓人一眼就知道做了什麼
5. **完整的描述**：包含所有重要細節

## 🚨 常見問題

### Q: 忘記使用 dev-ticket 怎麼辦？
A: 沒關係，commit 時會基於檔案時間戳自動計算

### Q: 手動創建的日誌沒有 commit hash？
A: 這是正常的，手動日誌不需要 commit hash

### Q: 一天有很多小 commit，都要創建日誌嗎？
A: 是的，每個 commit 都應該有對應的日誌，這樣才能準確追蹤

### Q: 如何修正錯誤的時間記錄？
A: 不建議手動修改，可以在 metrics 中添加修正說明

## 📚 相關文檔

- [ADR-017: Dev Logs Structure and Standards](../decisions/ADR-017-dev-logs-structure-and-standards.md)
- [Development Logs README](../dev-logs/README.md)
- [Commit Guide](commit-guide.md)