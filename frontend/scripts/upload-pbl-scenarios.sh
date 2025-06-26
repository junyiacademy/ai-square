#!/bin/bash

# 設定 GCS bucket 名稱
BUCKET_NAME="ai-square-db"
PBL_PATH="user_pbl_logs/scenarios"

# 創建本地 PBL scenarios 目錄（如果不存在）
mkdir -p public/pbl_data/scenarios

echo "🚀 準備上傳 PBL 情境到 GCS..."
echo "   Bucket: gs://${BUCKET_NAME}/${PBL_PATH}"
echo ""

# 檢查是否有 YAML 檔案
if ls public/pbl_data/scenarios/*.yaml 1> /dev/null 2>&1; then
    echo "📦 找到以下情境檔案："
    ls -la public/pbl_data/scenarios/*.yaml
    echo ""
    
    # 上傳所有 YAML 檔案
    for file in public/pbl_data/scenarios/*.yaml; do
        filename=$(basename "$file")
        echo "⬆️  上傳 $filename..."
        gsutil cp "$file" "gs://${BUCKET_NAME}/${PBL_PATH}/$filename"
        
        if [ $? -eq 0 ]; then
            echo "✅ 成功上傳 $filename"
        else
            echo "❌ 上傳失敗 $filename"
        fi
    done
    
    echo ""
    echo "✨ 完成！"
    echo ""
    echo "📋 已上傳的檔案："
    gsutil ls "gs://${BUCKET_NAME}/${PBL_PATH}/"
else
    echo "⚠️  沒有找到任何 YAML 檔案在 public/pbl_data/scenarios/"
    echo ""
    echo "💡 提示："
    echo "   1. 創建 public/pbl_data/scenarios/ 目錄"
    echo "   2. 將 PBL 情境 YAML 檔案放入該目錄"
    echo "   3. 再次執行此腳本"
fi