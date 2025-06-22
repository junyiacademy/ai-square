# ADR-012: Git Hooks 分析與清理決策

**日期**: 2025-06-23  
**狀態**: 已接受  
**決策者**: Human + Claude

## 背景

用戶提出關鍵問題：

> "pre-commit hook 進入了無限循環
> githook 常常出錯啊，跟我解釋壹下，他是幹嘛的？有必要存在嗎？有必要執行他嗎？
> 為什麼根目錄有，doc 也有？是不是多餘的？"

## 當前狀況分析

### 1. Git Hooks 配置混亂

```bash
# 當前配置
git config --get core.hooksPath
# 輸出: .githooks

# 但實際檔案在
docs/scripts/githooks/
├── pre-commit
└── post-commit

# 而且 .githooks/ 在 .gitignore 中被忽略！
```

### 2. 無限循環的原因

```bash
# pre-commit hook 執行流程
pre-commit -> commit-guide.py -> 檢查通過 -> 執行 commit
-> 觸發 post-commit -> post-commit-doc-gen.py -> 又觸發 pre-commit!
```

**問題根源**：
1. `commit-guide.py` 本身會執行 commit
2. 每次 commit 又觸發 post-commit hook
3. post-commit 修改檔案，某些情況下又觸發檢查，形成循環

### 3. 架構混亂

```
根目錄:
├── .githooks/           # git config 指向這裡，但被 .gitignore 忽略
└── docs/scripts/githooks/  # 實際檔案在這裡，但 git 找不到
```

## Git Hooks 是什麼？

### 基本概念
Git Hooks 是 Git 的生命週期掛鉤，在特定 Git 操作時自動執行腳本：

```bash
# 常見的 hooks
pre-commit     # commit 前執行（檢查代碼品質）
post-commit    # commit 後執行（生成文檔、通知）
pre-push       # push 前執行（運行測試）
pre-receive    # 服務器端接收前執行
```

### 我們的 Hooks

#### Pre-commit Hook
```bash
#!/bin/bash
echo "🤖 AI Square Pre-commit 檢查開始..."
python3 docs/scripts/commit-guide.py  # 執行品質檢查
```

**目的**：
- ESLint 檢查
- TypeScript 檢查  
- 自動生成提交訊息
- 文檔完整性檢查

#### Post-commit Hook  
```bash
#!/bin/bash
echo "📝 Post-commit: 生成開發文檔..."
python3 docs/scripts/post-commit-doc-gen.py  # 生成文檔
```

**目的**：
- 自動生成開發日誌
- 創建故事記錄
- 時間追蹤記錄

## 問題分析

### 1. 無限循環問題

**當前流程**：
```
用戶執行: git commit
-> pre-commit hook 
-> commit-guide.py 
-> 內部又執行 git commit（！問題源頭）
-> 觸發 post-commit hook
-> post-commit-doc-gen.py
-> 修改檔案，某些情況觸發新的檢查
-> 循環開始
```

**解決方案**：分離責任
```
用戶執行: git commit  
-> pre-commit hook: 只檢查，不提交
-> Git 執行實際提交
-> post-commit hook: 生成文檔
```

### 2. 架構混亂問題

**當前問題**：
- Git 配置指向 `.githooks/`（但被忽略）
- 實際檔案在 `docs/scripts/githooks/`
- 路徑不一致導致混亂

### 3. 複雜度過高

當前的 `commit-guide.py` 做太多事情：
- ✅ 品質檢查（應該保留）
- ❌ 執行提交（應該交給 Git）
- ❌ 生成提交訊息後直接提交（應該讓用戶確認）

## 決策：簡化 Git Hooks

### 1. 保留還是移除？

**結論：保留，但大幅簡化**

**保留的理由**：
- 自動品質檢查有價值
- 自動文檔生成減少手動工作
- 統一的開發流程

**簡化的目標**：
- 移除無限循環
- 分離檢查和提交責任
- 簡化配置

### 2. 新的架構設計

```
.git/hooks/              # Git 預設位置，簡單直接
├── pre-commit          # 只做檢查，不執行提交
└── post-commit         # 只生成文檔

移除：
- .githooks/ 配置
- docs/scripts/githooks/
- 複雜的路徑設定
```

### 3. 簡化的 Pre-commit 流程

```bash
#!/bin/bash
# 新的 pre-commit hook - 只檢查，不提交

echo "🔍 執行代碼檢查..."

# 檢查 ESLint（如果有 frontend）
if [ -d "frontend" ]; then
    cd frontend && npm run lint
    if [ $? -ne 0 ]; then
        echo "❌ ESLint 檢查失敗"
        exit 1
    fi
fi

# 檢查 TypeScript（如果有 frontend）
if [ -d "frontend" ]; then
    cd frontend && npx tsc --noEmit
    if [ $? -ne 0 ]; then
        echo "❌ TypeScript 檢查失敗"
        exit 1
    fi
fi

echo "✅ 代碼檢查通過"
exit 0
```

### 4. 簡化的工作流程

```bash
# 用戶執行
git add .
git commit -m "feat: add new feature"

# 自動執行
-> pre-commit: 檢查代碼品質（通過/失敗）
-> Git 執行提交（如果檢查通過）
-> post-commit: 生成開發文檔
```

## 實施計畫

### 階段 1: 立即修復無限循環

```bash
# 1. 禁用當前的 hooks
git config --unset core.hooksPath

# 2. 移除有問題的 hooks
rm -rf .githooks/
rm -rf docs/scripts/githooks/

# 3. 修改 commit-guide.py 為純檢查工具
# 移除內部的 git commit 調用
```

### 階段 2: 重新設計（可選）

```bash
# 如果需要 hooks，創建簡單版本
cp .git/hooks/pre-commit.sample .git/hooks/pre-commit
# 編輯為簡單的檢查腳本
```

### 階段 3: 工具化

```bash
# 將 commit-guide.py 改為可選工具
make check      # 執行檢查
make commit     # 檢查後提交
git commit      # 純 Git，不執行複雜檢查
```

## 建議的替代方案

### 方案 A: 完全移除 Hooks（推薦）

```bash
# 移除所有 hooks
git config --unset core.hooksPath
rm -rf .githooks/
rm -rf docs/scripts/githooks/

# 改為手動工具
make check      # 執行檢查
make commit     # 智能提交（包含檢查）
git commit      # 純 Git 提交
```

**優點**：
- 簡單可靠
- 用戶有選擇權
- 不會有意外的自動行為
- 易於調試

### 方案 B: 最小化 Hooks

```bash
# 只保留基本檢查
.git/hooks/pre-commit:
#!/bin/bash
if [ -d "frontend" ]; then
    cd frontend && npm run lint --quiet
fi
exit 0  # 總是通過，只警告
```

### 方案 C: 配置化 Hooks

```bash
# 讓用戶選擇是否啟用
make enable-hooks    # 啟用自動檢查
make disable-hooks   # 禁用自動檢查
```

## 對你問題的直接回答

### 1. "githook 是幹嘛的？"
Git Hooks 是在 Git 操作時自動執行的腳本，用於：
- **品質控制**：commit 前檢查代碼
- **自動化**：commit 後生成文檔  
- **流程標準化**：確保團隊一致的工作流程

### 2. "有必要存在嗎？"
**對個人開發**：不是必需的，甚至可能礙事
**對團隊開發**：有幫助，但要設計得當

### 3. "有必要執行嗎？"
**當前版本**：不建議，因為有無限循環 bug
**簡化版本**：可以考慮，但要讓用戶有選擇權

### 4. "為什麼根目錄有，docs 也有？"
這是配置錯誤！應該只有一個位置：
- Git 配置指向 `.githooks/`（但被 .gitignore 忽略）
- 實際檔案在 `docs/scripts/githooks/`  
- 這就是混亂的源頭

## 立即行動建議

**推薦：完全移除 Hooks，改為可選工具**

```bash
# 1. 立即停用 hooks
git config --unset core.hooksPath

# 2. 清理混亂的配置
rm -rf .githooks/
rm -rf docs/scripts/githooks/

# 3. 修改 Makefile 提供選擇
make check      # 執行檢查（不提交）
make commit     # 智能提交（包含檢查和文檔生成）
git commit      # 純 Git 提交（快速）
```

這樣你就有完全的控制權，不會再有意外的自動行為！