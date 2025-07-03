# YAML/JSON 整合系統 - 驗收指南

## 快速驗收步驟

### 1. 自動化驗收測試
```bash
# 執行完整驗收測試
node scripts/acceptance-test.js

# 測試會自動檢查：
# ✅ 檔案結構
# ✅ 轉換功能
# ✅ API CRUD
# ✅ 同步機制
# ✅ 網站功能
```

### 2. 手動驗收項目

#### A. 檢查檔案生成
```bash
# 查看 JSON 檔案
ls -la public/rubrics_data_json/
ls -la public/pbl_data_json/

# 應該看到對應的 .json 和 .meta.json 檔案
```

#### B. 測試轉換功能
```bash
# 轉換所有 YAML 到 JSON
npm run data:convert

# 應該看到：
# ✅ ai_lit_domains.yaml → ai_lit_domains.json
# ✅ ksa_codes.yaml → ksa_codes.json
# ... 等等
```

#### C. 測試網站功能
```bash
# 1. 啟動開發伺服器
npm run dev

# 2. 開啟瀏覽器訪問
# http://localhost:3000/relations
# http://localhost:3000/ksa
# http://localhost:3000/pbl

# 確認頁面正常載入，資料顯示正確
```

#### D. 測試 CRUD API
```bash
# 讀取資料
curl "http://localhost:3000/api/admin/data?type=rubrics&filename=ai_lit_domains" | jq

# 更新資料（加入測試欄位）
curl -X PUT http://localhost:3000/api/admin/data \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rubrics",
    "filename": "ai_lit_domains",
    "updates": {
      "test_timestamp": "'$(date)'"
    },
    "syncToYaml": false
  }'

# 確認更新成功
curl "http://localhost:3000/api/admin/data?type=rubrics&filename=ai_lit_domains" | jq '.data.test_timestamp'
```

#### E. 測試同步功能
```bash
# 修改 JSON 並同步回 YAML
node scripts/yaml-json-crud-system.js update rubrics ksa_codes '{"test":"sync test"}'
node scripts/yaml-json-crud-system.js sync rubrics ksa_codes

# 檢查 YAML 是否更新
grep "test:" public/rubrics_data/ksa_codes.yaml
```

## 預期結果

### ✅ 成功標準
1. 所有 YAML 檔案都有對應的 JSON 檔案
2. 網站所有頁面正常載入，無錯誤
3. API 可以讀取、更新、創建、刪除資料
4. JSON 修改可以同步回 YAML
5. 效能提升（載入速度更快）

### 📊 效能驗證
```bash
# 比較載入時間
time curl -s "http://localhost:3000/api/relations?lang=en" > /dev/null

# 應該在 50ms 以內完成
```

## 常見問題

### Q1: JSON 檔案不存在？
```bash
npm run data:convert
```

### Q2: API 返回錯誤？
檢查伺服器是否運行：
```bash
npm run dev
```

### Q3: 同步失敗？
檢查檔案權限：
```bash
chmod +x scripts/yaml-json-crud-system.js
```

## 完整文檔

詳細技術文檔請參考：
`docs/handbook/technical-specs/yaml-json-integration.md`