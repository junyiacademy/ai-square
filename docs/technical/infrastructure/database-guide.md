# AI Square 資料庫指南

## 📋 目錄
1. [Schema V3 概覽](#schema-v3-概覽)
2. [初始化指南](#初始化指南)
3. [效能優化](#效能優化)
4. [查詢範例](#查詢範例)
5. [遷移指南](#遷移指南)
6. [生產環境規劃](#生產環境規劃)

## Schema V3 概覽

### 統一學習架構
```
scenarios (mode: 'pbl' | 'assessment' | 'discovery')
    ↓
programs (繼承 mode，status: pending → active → completed)
    ↓
tasks (繼承 mode，儲存 interactions)
    ↓
evaluations (評估結果)
```

### 核心資料表

#### scenarios 表
- 統一的學習情境定義
- 支援三種模式：PBL、Assessment、Discovery
- JSONB 欄位儲存多語言內容和模式特定資料

#### programs 表
- 用戶的學習實例
- 自動繼承 scenario 的 mode
- 追蹤學習進度和狀態

#### tasks 表
- 學習任務
- 儲存用戶互動記錄
- 支援多種任務類型

#### evaluations 表
- 評估結果
- AI 回饋和評分
- 支援多種評估類型

## 初始化指南

### 1. 創建資料庫
```bash
# 本地開發
createdb ai_square

# Cloud SQL
gcloud sql databases create ai_square --instance=ai-square-db
```

### 2. 執行 Schema
```bash
# 執行 schema v3
psql -d ai_square -f src/lib/repositories/postgresql/schema-v3.sql

# 驗證
psql -d ai_square -c "\dt"
```

### 3. 初始化資料
```bash
# 從 YAML 載入 scenarios
npm run init:scenarios

# 創建測試用戶
npm run init:demo-users
```

## 效能優化

### 建議的索引
```sql
-- 用戶查詢優化
CREATE INDEX idx_programs_user_status ON programs(user_id, status);
CREATE INDEX idx_programs_scenario_user ON programs(scenario_id, user_id);

-- 任務查詢優化
CREATE INDEX idx_tasks_program_order ON tasks(program_id, order_index);
CREATE INDEX idx_tasks_program_status ON tasks(program_id, status);

-- 評估查詢優化
CREATE INDEX idx_evaluations_user_created ON evaluations(user_id, created_at DESC);

-- JSONB 查詢優化
CREATE INDEX idx_scenarios_title ON scenarios USING gin(title);
CREATE INDEX idx_scenarios_mode ON scenarios(mode);
```

### 查詢優化建議
1. 使用 mode 欄位過濾，避免過多 JOIN
2. 善用 JSONB 索引加速多語言查詢
3. 定期執行 VACUUM ANALYZE

## 查詢範例

### 取得用戶的所有進行中學習
```sql
SELECT 
  p.*,
  s.title->>'zh' as scenario_title
FROM programs p
JOIN scenarios s ON p.scenario_id = s.id
WHERE p.user_id = $1 
  AND p.status = 'active'
ORDER BY p.updated_at DESC;
```

### 統計用戶學習成效
```sql
WITH user_stats AS (
  SELECT 
    mode,
    COUNT(*) as total_programs,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    AVG(CASE WHEN status = 'completed' THEN total_score END) as avg_score
  FROM programs
  WHERE user_id = $1
  GROUP BY mode
)
SELECT * FROM user_stats;
```

### 查詢特定 KSA 的掌握度
```sql
SELECT 
  t.id,
  t.context->>'ksa_codes' as ksa_codes,
  COUNT(CASE WHEN (t.interactions->-1->>'isCorrect')::boolean THEN 1 END) as correct,
  COUNT(*) as total
FROM tasks t
JOIN programs p ON t.program_id = p.id
WHERE p.user_id = $1
  AND p.mode = 'assessment'
  AND t.context ? 'ksa_codes'
GROUP BY t.id, ksa_codes;
```

## 遷移指南

### 從舊版本遷移
1. 備份現有資料
2. 執行遷移腳本
3. 驗證資料完整性

### 備份策略
```bash
# 完整備份
pg_dump -h localhost -p 5433 -U postgres ai_square > backup.sql

# Cloud SQL 備份
gcloud sql backups create --instance=ai-square-db
```

## 生產環境規劃

### 短期目標（1-2週）
- [ ] 部署基本監控
- [ ] 設定自動備份
- [ ] 建立效能基準

### 中期目標（1個月）
- [ ] 實作讀寫分離
- [ ] 加入快取層
- [ ] 優化查詢效能

### 長期目標（3個月）
- [ ] 分區表設計
- [ ] 多區域部署
- [ ] 災難復原計劃

### 監控指標
- 連線數
- 查詢效能
- 儲存空間使用
- 錯誤率

---

相關文件：
- [統一學習架構](./unified-learning-architecture.md)
- [部署指南](../deployment/deployment-guide.md)