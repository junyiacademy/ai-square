# Commit 提交指南

## 🎯 核心原則

1. **每個 commit 都要有開發日誌**
2. **使用智能提交助手**
3. **遵循 Conventional Commits 規範**
4. **準確記錄開發時間**

## 🚀 標準流程

### 1. 開始開發（推薦）
```bash
# 創建開發 ticket 並啟動時間追蹤
make dev-ticket TICKET=feature-name
```

### 2. 提交變更
```bash
# 添加所有變更
git add .

# 使用智能提交助手（推薦）
make commit

# 或直接使用腳本
python3 docs/scripts/commit-guide.py
```

### 3. 自動執行的動作

1. **代碼檢查**
   - ESLint 語法檢查
   - TypeScript 類型檢查
   - 一次性腳本提醒

2. **時間計算**
   - 優先使用即時追蹤數據
   - 其次分析 git commit 間隔
   - 再次使用檔案時間戳
   - 最後基於檔案數量估算

3. **文檔生成**
   - Pre-commit：生成開發日誌（無 hash）
   - Post-commit：更新日誌加入 hash
   - 自動執行補充 commit

4. **智能訊息**
   - 根據變更內容生成有意義的 commit 訊息
   - 不再是無用的 "update X files"

## 📝 Commit Message 格式

### 基本格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 類型
- `feat`: 新功能
- `fix`: Bug 修復
- `docs`: 文檔更新
- `refactor`: 重構（不影響功能）
- `test`: 測試相關
- `chore`: 雜項（構建、依賴等）
- `improve`: 功能改進

### 範例
```
feat(auth): implement user login functionality

- Added login form component
- Integrated with backend API
- Added session management

Closes #123
```

## 📊 開發日誌規則

### 自動生成的日誌位置
```
docs/dev-logs/
└── YYYY-MM-DD/
    ├── features/         # feat commits
    ├── bugfixes/         # fix commits
    ├── documentation/    # docs commits
    └── refactoring/     # refactor commits
```

### 日誌檔名格式
```
YYYY-MM-DD-HH-MM-SS-{type}-{description}.yml
```

### 必要欄位
- `type`: 與 commit type 對應
- `title`: 清晰的標題（無前綴）
- `commit_hash`: 8 位 hash
- `timeline`: 時間記錄
- `metrics`: 開發指標
- `changes`: 檔案變更

## ⚠️ 注意事項

### ✅ 應該做
1. 每次 commit 前先 `git add .`
2. 使用 `make commit` 確保流程完整
3. 填寫有意義的 commit 訊息
4. 一個 commit 只做一件事

### ❌ 不應該做
1. 不要繞過智能提交助手
2. 不要手動修改自動生成的時間
3. 不要混合多個功能在一個 commit
4. 不要使用無意義的訊息

## 🔧 特殊情況

### 補充文檔的 commit
```bash
# 這種 commit 會自動加上 SKIP_POST_COMMIT=1
# 避免無限循環
docs: add commit hash XXX to dev log
```

### 緊急修復
```bash
# 仍然要使用標準流程
git add .
make commit
# 選擇 fix type
```

### 手動 commit（不推薦）
如果必須手動 commit：
1. 仍需遵循 conventional commits
2. 事後補充開發日誌
3. 記錄真實的開發時間

## 📚 相關文檔

- [ADR-015: Ticket-based Development](../decisions/ADR-015-ticket-based-development-workflow.md)
- [ADR-016: Commit-based Time Analysis](../decisions/ADR-016-commit-based-time-analysis-methodology.md)  
- [ADR-017: Dev Logs Standards](../decisions/ADR-017-dev-logs-structure-and-standards.md)
- [Development Logs Guide](development-logs-guide.md)