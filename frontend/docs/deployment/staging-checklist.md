# Staging Deployment Checklist - Database Schema

## 🎯 目標
確保 PBL、Discovery、Assessment 三個模式的資料庫 schema 在 staging 環境能一步到位成功部署。

## 📋 Pre-Deployment Checklist

### 1. Schema 文件準備
- [ ] 確認 `schema-v4.sql` 是最新版本
- [ ] 確認包含所有三個 mode 的定義
- [ ] 確認多語言欄位都使用 JSONB 格式

### 2. 環境變數設定
```bash
export DB_HOST=<staging-db-host>
export DB_PORT=5432
export DB_NAME=ai_square_db
export DB_USER=postgres
export DB_PASSWORD=<your-password>
```

### 3. Cloud SQL 設定 (如果使用 GCP)
- [ ] 確認 Cloud SQL 實例與 Cloud Run 在同一區域
- [ ] 設定正確的連線方式（Unix Socket 或 Private IP）
- [ ] 確認服務帳號有 `cloudsql.client` 角色

## 🚀 Deployment Steps

### Step 1: 初始化資料庫
```bash
# 在 frontend 目錄下執行
./scripts/init-db-staging.sh
```

### Step 2: 驗證 Schema
```bash
# 執行驗證腳本
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/check-db-schema.sql
```

### Step 3: 測試三個模式
```bash
# 插入測試資料並驗證
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/test-three-modes.sql
```

## ✅ 驗證檢查點

### 1. 資料庫結構檢查
- [ ] Extensions 安裝成功 (uuid-ossp, pgcrypto)
- [ ] Custom types 建立成功 (learning_mode 包含 'pbl', 'discovery', 'assessment')
- [ ] 所有核心表建立成功 (users, scenarios, programs, tasks, evaluations)
- [ ] Mode 欄位存在於 programs, tasks, evaluations 表中

### 2. 多語言支援檢查
- [ ] scenarios.title 是 JSONB 類型
- [ ] scenarios.description 是 JSONB 類型
- [ ] tasks.title 是 JSONB 類型
- [ ] domains.name 是 JSONB 類型

### 3. Mode-Specific 資料欄位
- [ ] scenarios 表有 pbl_data, discovery_data, assessment_data 欄位
- [ ] programs 表有 pbl_data, discovery_data, assessment_data 欄位
- [ ] tasks 表有 pbl_data, discovery_data, assessment_data 欄位
- [ ] evaluations 表有 pbl_data, discovery_data, assessment_data 欄位

### 4. Triggers 檢查
- [ ] set_program_mode_trigger 存在且正常運作
- [ ] set_task_mode_trigger 存在且正常運作
- [ ] set_evaluation_mode_trigger 存在且正常運作

### 5. Views 檢查
- [ ] pbl_scenarios_view 可正常查詢
- [ ] discovery_scenarios_view 可正常查詢
- [ ] assessment_scenarios_view 可正常查詢

### 6. 索引檢查
- [ ] idx_scenarios_mode 存在
- [ ] idx_programs_mode 存在
- [ ] idx_tasks_mode 存在
- [ ] idx_evaluations_mode 存在

## 🔍 Troubleshooting

### 問題 1: Mode propagation 失敗
```sql
-- 檢查 trigger 是否正確安裝
SELECT trigger_name, action_statement 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%mode%';
```

### 問題 2: 多語言欄位查詢錯誤
```sql
-- 測試 JSONB 查詢
SELECT title->>'en' as title_en, title->>'zh' as title_zh 
FROM scenarios 
WHERE mode = 'discovery';
```

### 問題 3: View 無法查詢
```sql
-- 重建 views
DROP VIEW IF EXISTS pbl_scenarios_view CASCADE;
-- 然後重新執行 schema-v4.sql 中的 CREATE VIEW 部分
```

## 📊 期望結果

執行完成後應該看到：
- Tables created: 11+
- Views created: 5+
- Functions created: 6+
- Triggers created: 5+

測試資料應該顯示：
- ✓ PASS for all mode propagation tests
- 每個 mode 都有至少 1 個 scenario, program, task

## 🎉 Success Criteria

1. **Zero Errors**: 所有腳本執行無錯誤
2. **Mode Propagation**: Programs 和 Tasks 自動繼承正確的 mode
3. **Multilingual Support**: 可以儲存和查詢多語言內容
4. **Performance**: 索引正確建立，查詢效能良好

## 📝 Post-Deployment

1. **清理測試資料**:
```sql
DELETE FROM users WHERE email = 'test@staging.com';
DELETE FROM scenarios WHERE source_path LIKE 'test/%';
```

2. **備份 Schema**:
```bash
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --schema-only > backup_schema_$(date +%Y%m%d).sql
```

3. **監控初期使用**:
- 檢查 mode propagation 是否正常
- 確認多語言查詢效能
- 觀察是否有意外的錯誤

---

✅ 完成以上所有步驟後，資料庫就已經準備好支援 PBL、Discovery、Assessment 三個模式了！