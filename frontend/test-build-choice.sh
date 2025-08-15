#!/bin/bash
echo "🚀 選擇建置方式："
echo "1) Cloud Build（推薦，~7分鐘，自動處理平台問題）"
echo "2) Local Docker Build（~30分鐘，需要 Docker Desktop）"
read -p "請選擇 (1 或 2，預設 1): " BUILD_CHOICE
BUILD_CHOICE=${BUILD_CHOICE:-1}

if [ "$BUILD_CHOICE" = "1" ]; then
    echo "✅ 你選擇了 Cloud Build（好選擇！）"
    echo "這將使用 gcloud builds submit..."
else
    echo "📦 你選擇了 Local Docker Build"
    echo "這將使用 docker build --platform linux/amd64..."
fi
