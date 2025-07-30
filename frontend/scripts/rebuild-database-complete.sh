#!/bin/bash

# 完整的資料庫重建腳本
# 用於確保 local 環境完全乾淨並準備好測試

set -e  # 遇到錯誤立即停止

echo "🚀 開始完整資料庫重建流程..."
echo "=================================="

# 1. 設定環境變數
export DB_HOST=${DB_HOST:-127.0.0.1}
export DB_PORT=${DB_PORT:-5433}
export DB_NAME=${DB_NAME:-ai_square_db}
export DB_USER=${DB_USER:-postgres}
export DB_PASSWORD=${DB_PASSWORD:-postgres}

echo "📋 資料庫設定："
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"

# 2. 停止 Next.js 開發伺服器（如果正在運行）
echo ""
echo "🛑 停止開發伺服器..."
pkill -f "next dev" || true

# 3. 刪除現有資料庫
echo ""
echo "🗑️  刪除現有資料庫..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres <<EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME' AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS $DB_NAME;
EOF

# 4. 創建新資料庫
echo ""
echo "✨ 創建新資料庫..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

# 5. 應用 Schema V3
echo ""
echo "📊 應用 Schema V3..."
if [ -f "scripts/apply-schema-v3-auto.sh" ]; then
  bash scripts/apply-schema-v3-auto.sh
else
  echo "❌ 找不到 apply-schema-v3-auto.sh"
  exit 1
fi

# 6. 載入 Assessment scenarios
echo ""
echo "📚 載入 Assessment scenarios..."
if [ -f "scripts/seed-assessment-scenarios.ts" ]; then
  npx tsx scripts/seed-assessment-scenarios.ts
else
  echo "❌ 找不到 seed-assessment-scenarios.ts"
  exit 1
fi

# 7. 載入 PBL scenarios
echo ""
echo "🎯 載入 PBL scenarios..."
if [ -f "scripts/seed-pbl-scenarios.ts" ]; then
  npx tsx scripts/seed-pbl-scenarios.ts
else
  echo "❌ 找不到 seed-pbl-scenarios.ts"
  exit 1
fi

# 8. 載入 Discovery scenarios
echo ""
echo "🔍 載入 Discovery scenarios..."
if [ -f "scripts/seed-discovery-scenarios.ts" ]; then
  npx tsx scripts/seed-discovery-scenarios.ts
else
  echo "❌ 找不到 seed-discovery-scenarios.ts"
  exit 1
fi

# 9. 驗證資料載入
echo ""
echo "✅ 驗證資料載入..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
SELECT 
  mode, 
  COUNT(*) as count,
  STRING_AGG(title->>'en', ', ' ORDER BY created_at LIMIT 3) as sample_titles
FROM scenarios 
GROUP BY mode
ORDER BY mode;
EOF

# 10. 執行基本健康檢查
echo ""
echo "🏥 執行健康檢查..."

# 檢查表結構
echo "   檢查表結構..."
tables=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "   ✓ 找到 $tables 個表"

# 檢查 scenarios 總數
scenarios=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM scenarios;")
echo "   ✓ 總共載入 $scenarios 個 scenarios"

echo ""
echo "🎉 資料庫重建完成！"
echo "=================================="
echo ""
echo "📋 下一步："
echo "1. 執行測試套件: npm run test:ci"
echo "2. 執行 E2E 測試: npm run test:e2e"
echo "3. 啟動開發伺服器: npm run dev"
echo ""