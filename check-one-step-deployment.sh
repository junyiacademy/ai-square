#!/bin/bash

# 檢查一步到位部署是否成功
# 用法: ./check-one-step-deployment.sh

set -e

echo "========================================="
echo "🚀 檢查一步到位部署狀態"
echo "========================================="

echo "1. 檢查 GitHub Actions 狀態..."
gh run list --repo=junyiacademy/ai-square --limit=3

echo ""
echo "2. 檢查最新的 Deploy to Staging 狀態..."
LATEST_RUN=$(gh run list --repo=junyiacademy/ai-square --json databaseId,headBranch,status,conclusion,name --jq '.[] | select(.name == "Deploy to Staging" and .headBranch == "staging") | .databaseId' | head -1)

if [ -n "$LATEST_RUN" ]; then
    echo "最新部署 Run ID: $LATEST_RUN"
    gh run view $LATEST_RUN --repo=junyiacademy/ai-square
    
    # 檢查狀態
    STATUS=$(gh run view $LATEST_RUN --repo=junyiacademy/ai-square --json status,conclusion --jq '.status')
    CONCLUSION=$(gh run view $LATEST_RUN --repo=junyiacademy/ai-square --json status,conclusion --jq '.conclusion')
    
    echo ""
    echo "狀態: $STATUS"
    echo "結論: $CONCLUSION"
    
    if [ "$STATUS" == "completed" ] && [ "$CONCLUSION" == "success" ]; then
        echo ""
        echo "✅ 部署成功！現在執行驗證..."
        echo ""
        
        # 執行驗證腳本
        ./scripts/verify-deployment.sh staging
        
        echo ""
        echo "🎉 一步到位部署驗證完成！"
        echo "現在可以通過 git push 觸發自動部署了！"
        
    elif [ "$STATUS" == "completed" ] && [ "$CONCLUSION" == "failure" ]; then
        echo ""
        echo "❌ 部署失敗，查看日誌："
        gh run view $LATEST_RUN --log-failed --repo=junyiacademy/ai-square
        
    elif [ "$STATUS" == "in_progress" ]; then
        echo ""
        echo "⏳ 部署仍在進行中，請稍後再檢查..."
        echo "使用以下命令監控進度："
        echo "gh run view $LATEST_RUN --repo=junyiacademy/ai-square"
        
    else
        echo ""
        echo "⚠️ 未知狀態: $STATUS / $CONCLUSION"
    fi
else
    echo "找不到 Deploy to Staging 的運行記錄"
fi