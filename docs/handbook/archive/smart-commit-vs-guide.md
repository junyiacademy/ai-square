# Smart Commit vs Commit Guide 比較

## 📊 功能對比

### commit-guide.md（文檔）
**用途**：提交規範指南，給人類閱讀
- 說明 Conventional Commits 規範
- 列出標準流程步驟
- 解釋自動執行的動作
- 提供最佳實踐建議

### smart-commit.py（程式）
**用途**：自動化提交工具，實際執行提交
- 整合完整提交流程
- 自動執行各種檢查
- 處理 branch 策略
- 調用其他腳本（包括 commit-guide.py）

## 🔄 執行流程

```
make commit / make dev-commit
    ↓
smart-commit.py
    ├── 1. 檢查當前 branch 和 ticket
    ├── 2. 執行 AI 自動修復檢查 (ai-fix.py)
    ├── 3. 執行提交指南 (commit-guide.py)
    ├── 4. 執行 pre-commit 驗證
    ├── 5. 驗證票券文件完整性
    └── 6. 完成提交

commit-guide.py
    ├── 代碼品質檢查 (lint, typecheck)
    ├── 智能訊息生成
    ├── 時間計算
    └── 互動式提交
```

## 🎯 主要差異

### 1. **層級不同**
- `commit-guide.md` = 規範文檔（WHAT & WHY）
- `smart-commit.py` = 執行工具（HOW）
- `commit-guide.py` = 核心邏輯（被 smart-commit 調用）

### 2. **功能範圍**
**smart-commit.py 額外功能**：
- Branch/Ticket 管理
- AI 自動修復整合
- 票券完整性驗證
- 多腳本協調

**commit-guide.py 核心功能**：
- 代碼檢查
- 提交訊息生成
- 時間追蹤
- Git 操作

### 3. **使用場景**
- **開發者讀文檔**：看 `commit-guide.md` 了解規範
- **日常提交**：用 `make commit` → 執行 `smart-commit.py`
- **簡單提交**：直接用 `commit-guide.py`

## 💡 改進建議

### 1. **讓 smart-commit.py 參考 commit-guide.md**
```python
def show_commit_guidelines(self):
    """顯示提交規範提醒"""
    guide_path = "docs/handbook/02-development-guides/commit-guide.md"
    # 提取關鍵規則並顯示
```

### 2. **在 commit 前自動顯示檢查清單**
```python
def show_pre_commit_checklist(self):
    """從 commit-guide.md 提取並顯示檢查清單"""
    checklist = [
        "✓ 代碼通過 lint 檢查",
        "✓ TypeScript 類型正確",
        "✓ 測試全部通過",
        "✓ 提交訊息符合規範"
    ]
```

### 3. **統一錯誤處理參考文檔**
當提交失敗時，自動顯示相關 handbook 章節的連結。

## 🔗 相關文件
- 規範指南：`docs/handbook/02-development-guides/commit-guide.md`
- 執行腳本：`docs/scripts/smart-commit.py`
- 核心邏輯：`docs/scripts/commit-guide.py`