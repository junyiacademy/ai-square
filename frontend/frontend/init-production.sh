#!/bin/bash
PROD_URL="https://ai-square-frontend-m7s4ucbgba-de.a.run.app"

echo "初始化 Production 資料..."

# 1. Assessment
echo "初始化 Assessment..."
curl -X POST "$PROD_URL/api/admin/init-assessment" \
  -H "Content-Type: application/json" \
  -d '{"force": true}' \
  -s | jq '.success'

# 2. PBL  
echo "初始化 PBL..."
curl -X POST "$PROD_URL/api/admin/init-pbl" \
  -H "Content-Type: application/json" \
  -d '{"force": true}' \
  -s | jq '.success'

# 3. Discovery
echo "初始化 Discovery..."
curl -X POST "$PROD_URL/api/admin/init-discovery" \
  -H "Content-Type: application/json" \
  -d '{"force": true}' \
  -s | jq '.success'

echo "完成！"
