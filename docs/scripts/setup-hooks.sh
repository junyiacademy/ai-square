#!/bin/bash
# 設置 Git Hooks

echo "🔧 設置 AI Square Git Hooks..."

# 創建 .githooks 目錄（如果不存在）
mkdir -p .githooks

# 複製 hooks 到 .githooks
cp docs/scripts/githooks/pre-commit .githooks/
cp docs/scripts/githooks/post-commit .githooks/ 2>/dev/null || echo "ℹ️  post-commit hook 尚未實現"

# 設置 git hooks 路徑
git config core.hooksPath .githooks

# 確保 hooks 有執行權限
chmod +x .githooks/pre-commit
chmod +x .githooks/post-commit 2>/dev/null || true
chmod +x docs/scripts/commit-guide.py

echo "✅ Git Hooks 設置完成！"
echo ""
echo "使用方式："
echo "  - 正常提交: git commit -m '訊息' (會自動執行檢查)"
echo "  - 跳過檢查: git commit -m '訊息' --no-verify"
echo "  - 手動檢查: make commit-check"
echo "  - 嚴格模式: make commit-strict"