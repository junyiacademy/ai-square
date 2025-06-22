#!/bin/bash
# 設置 Git Hooks

echo "🔧 設置 AI Square Git Hooks..."

# 設置 git hooks 路徑
git config core.hooksPath .githooks

# 確保 hooks 有執行權限
chmod +x .githooks/pre-commit
chmod +x docs/scripts/commit-guide.py

echo "✅ Git Hooks 設置完成！"
echo ""
echo "使用方式："
echo "  - 正常提交: git commit -m '訊息' (會自動執行檢查)"
echo "  - 跳過檢查: git commit -m '訊息' --no-verify"
echo "  - 手動檢查: make commit-check"
echo "  - 嚴格模式: make commit-strict"