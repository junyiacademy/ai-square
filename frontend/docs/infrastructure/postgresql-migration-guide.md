# PostgreSQL Migration Guide

## 📋 概述

AI Square 採用混合式儲存架構：
- **PostgreSQL**: 動態資料（用戶、學習進度、評估結果）
- **Google Cloud Storage**: 靜態內容（YAML 檔案、媒體資源）

## 🏗️ 架構設計

### 資料庫結構 (v3.5.1 Consolidated Schema)

完整架構包含所有功能模組：

```sql
-- 核心表格
- users: 用戶資料
- programs: 學習計畫
- tasks: 任務記錄
- evaluations: 評估結果
- scenarios: 場景元資料
- interactions: 用戶互動記錄
- translations: 多語言翻譯

-- 新增功能模組
- onboarding_flows: 個人化引導流程
- user_onboarding_progress: 引導進度追蹤
- questions: 問題庫系統
- task_questions: 任務問題關聯 (多對多)
- question_performance: 問題效能分析
- ai_usage: AI 使用追蹤與成本控制
```

**Schema 檔案**: `/docs/infrastructure/postgresql-migration-schema-docker-v3.5.sql`

### Repository Pattern

```
frontend/src/lib/repositories/
├── base/
│   └── repository-factory.ts      # 統一管理所有 repositories
├── interfaces/
│   └── index.ts                   # 所有介面定義
├── postgresql/
│   ├── user-repository.ts         
│   ├── program-repository.ts      
│   ├── task-repository.ts         
│   ├── evaluation-repository.ts   
│   └── scenario-repository.ts     
└── gcs/
    ├── content-repository.ts      # YAML 內容
    └── media-repository.ts        # 媒體檔案
```

## 🚀 本地開發設置

### 1. 啟動本地 PostgreSQL

```bash
# 啟動 Docker 服務
npm run db:up

# PostgreSQL: localhost:5433
# pgAdmin: http://localhost:5050
# Redis: localhost:6379
```

### 2. 執行資料遷移

```bash
# 完整遷移
npm run migrate:complete

# 驗證遷移結果
npm run migrate:verify

# 檢查系統健康
npm run db:health
```

## 📊 遷移狀態

目前已完成：
- ✅ 資料庫架構設計與實作
- ✅ Repository Pattern 實作
- ✅ 所有 API routes 已更新 (11個)
- ✅ 遷移工具開發完成
- ✅ 本地測試環境設置

待完成：
- ⏳ Cloud SQL 生產環境部署
- ⏳ 監控與備份設置
- ⏳ 效能優化與索引調整

## 🔧 API Routes 更新進度

### 已更新 ✅ (全部完成)
- `/api/users/[id]`
- `/api/programs`
- `/api/programs/[id]`
- `/api/evaluations`
- `/api/pbl/user-programs`
- `/api/pbl/history`
- `/api/pbl/draft-program`
- `/api/pbl/programs/[programId]`
- `/api/pbl/programs/[programId]/activate`
- `/api/pbl/programs/[programId]/completion`
- `/api/assessment/results`
- `/api/assessment/results/[id]`

## 🌐 Cloud SQL 部署

### 創建實例
```bash
gcloud sql instances create ai-square-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

### 環境變數設定
```env
# Production
DB_HOST=/cloudsql/PROJECT_ID:REGION:ai-square-db
DB_PORT=5432
DB_NAME=ai_square_db
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_PASSWORD
```

## 📝 開發指引

### 使用 Repository
```typescript
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// 在 API route 中
const userRepo = repositoryFactory.getUserRepository();
const user = await userRepo.findByEmail(email);
```

### 交易處理
```typescript
// 需要原子操作時
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // 多個操作
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## 🔍 除錯與監控

### 查看 PostgreSQL 日誌
```bash
npm run db:logs
```

### 常見問題
1. **連線錯誤**: 確認 Docker 正在執行
2. **權限問題**: 檢查環境變數設定
3. **效能問題**: 執行 ANALYZE 更新統計資訊

## 🗂️ 檔案清理記錄 (更新: 2025-01-19)

### 保留檔案
- `/docs/infrastructure/postgresql-migration-guide.md` (本檔案)
- `/docs/infrastructure/postgresql-migration-schema-docker-v3.5.sql` (主要 Schema)
- `/docs/infrastructure/performance-indexes.sql` (效能索引)
- `/src/lib/repositories/*` (Repository 實作)
- `/src/scripts/complete-migration.ts` (主要遷移工具)
- `/src/scripts/verify-migration.ts` (驗證工具)
- `/src/scripts/check-db-health.ts` (健康檢查)
- `/docker-compose.postgres.yml` (開發環境)

### 已合併移除的檔案
- `postgresql-migration-schema.sql` → 合併到主 Schema
- `postgresql-migration-schema-v2.sql` → 合併到主 Schema
- `postgresql-migration-schema-docker.sql` → 合併到主 Schema
- `postgresql-migration-schema-v3-multilingual.sql` → 合併到主 Schema
- `postgresql-migration-schema-docker-v3.sql` → 合併到主 Schema
- `postgresql-migration-schema-v4-fully-normalized.sql` → 合併到主 Schema
- `postgresql-migration-schema-v3.5-balanced.sql` → 合併到主 Schema
- `onboarding-schema-addition.sql` → 合併到主 Schema
- `question-bank-system-design.sql` → 合併到主 Schema

**現在只有一個主要 Schema 檔案**：`postgresql-migration-schema-docker-v3.5.sql` (v3.5.1)

## 📁 清理後的檔案結構

```
docs/infrastructure/
├── postgresql-migration-schema-docker-v3.5.sql  # 主要 Schema (v3.5.1)
└── performance-indexes.sql                       # 效能索引

frontend/docs/infrastructure/
├── postgresql-migration-guide.md                 # 本檔案
├── deployment-strategy.md
├── implementation-guide/
│   ├── 00-implementation-index.md
│   ├── 01-storage-abstraction-implementation.md
│   ├── 02-repository-pattern-implementation.md
│   └── 03-session-unification-implementation.md
├── safe-staging-deployment.md
└── unified-learning-architecture.md

frontend/docs/deployment/
└── cloud-sql-setup.md                           # Cloud SQL 部署指南
```

## 🎯 整理成果

- ✅ **9 個重複的 SQL schema 檔案** → 整合為 1 個主要檔案
- ✅ **8 個重複的文檔檔案** → 移除，保留最相關的
- ✅ **統一 Schema**: 包含所有功能（Onboarding + Question Bank + 核心系統）
- ✅ **更新所有引用**: Docker compose, 部署指南, 遷移工具

---

最後更新: 2025-01-19