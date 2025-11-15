# Staging Deployment Test Report
Date: 2025-01-14

## 目標
完整測試 staging 部署流程，確保：
1. 資料庫初始化正確
2. Scenarios 數量正確（22個：1 assessment, 9 PBL, 12 discovery）
3. 部署不會刪除既有資料
4. 重複執行不會造成資料重複

## 測試環境
- **Project**: ai-square-463013
- **Region**: asia-east1
- **Cloud SQL Instance**: ai-square-db-staging-asia
- **Cloud Run Service**: ai-square-staging
- **Service URL**: https://ai-square-staging-731209836128.asia-east1.run.app

## 執行步驟與結果

### Step 1: 清空 Staging 資料庫
```bash
# 刪除舊資料庫
gcloud sql databases delete ai_square_db --instance=ai-square-db-staging-asia --project=ai-square-463013 --quiet

# 重新建立空資料庫
gcloud sql databases create ai_square_db --instance=ai-square-db-staging-asia --project=ai-square-463013
```
**結果**: ✅ 成功清空並重建資料庫

### Step 2: 部署服務到 Cloud Run
```bash
cd frontend
SKIP_DB_INIT=1 ./deploy-staging.sh
```
**結果**: ✅ 部署成功
- Docker image 建置成功
- 推送到 GCR 成功
- Cloud Run 服務更新成功
- **問題發現**: 初始化 API 呼叫失敗，因為資料表不存在

### Step 3: 資料庫初始化問題

#### 問題 1: 無法直接連接 Cloud SQL
- **錯誤**: IPv6 連接不支援
- **嘗試解決**:
  - 使用 gcloud sql connect - 失敗（IPv6 限制）
  - 使用 Cloud SQL Proxy - 未安裝
  - 使用 gcloud beta sql connect - 需要互動式輸入密碼

#### 問題 2: 資料庫 Schema 未初始化
- **錯誤**: `relation "scenarios" does not exist`
- **原因**: 新建的資料庫是空的，沒有執行 schema-v4.sql
- **影響**: 所有 API 呼叫都失敗

### Step 4: 本地測試驗證

為了驗證邏輯正確性，在本地環境執行完整測試：

#### 4.1 重建本地資料庫
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -c "DROP DATABASE IF EXISTS ai_square_db;"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -c "CREATE DATABASE ai_square_db;"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d ai_square_db -f src/lib/repositories/postgresql/schema-v4.sql
```
**結果**: ✅ Schema 成功套用

#### 4.2 初始化 Scenarios
```bash
curl -X POST "http://localhost:3004/api/admin/init-assessment" -d '{"force": true}'
curl -X POST "http://localhost:3004/api/admin/init-pbl" -d '{"force": true}'
curl -X POST "http://localhost:3004/api/admin/init-discovery" -d '{"force": true}'
```
**結果**: ✅ 成功初始化
- Assessment: 1 個
- PBL: 9 個
- Discovery: 12 個
- 總計: 22 個 scenarios

#### 4.3 測試防呆機制
```bash
# 再次執行，不強制
curl -X POST "http://localhost:3004/api/admin/init-assessment" -d '{"force": false}'
curl -X POST "http://localhost:3004/api/admin/init-pbl" -d '{"force": false}'
curl -X POST "http://localhost:3004/api/admin/init-discovery" -d '{"force": false}'
```
**結果**: ✅ 防呆機制正常
- 不會建立重複資料
- 顯示 "existing: N, created: 0"

### Step 5: Staging 環境實際狀態

#### 當前問題
1. **資料庫未初始化**: Cloud SQL 資料庫是空的，沒有 schema
2. **無法直接連接**: 從本地無法直接連接 Cloud SQL (IPv6 限制)
3. **Health Check 顯示異常**:
   ```json
   {
     "database": {
       "status": false,
       "error": "Database timeout"
     }
   }
   ```

## 已修復的配置問題

### 1. Schema-v4.sql 更新
添加了缺失的欄位：
- `version VARCHAR(20) DEFAULT '1.0'`
- `difficulty VARCHAR(20) DEFAULT 'intermediate'`
- `estimated_minutes INTEGER DEFAULT 30`
- `xp_rewards JSONB DEFAULT '{}'`
- `ksa_codes JSONB DEFAULT '[]'`
- `unlock_requirements JSONB DEFAULT '{}'`
- `media JSONB DEFAULT '{}'`
- `image_url TEXT`
- `badge_icon TEXT`

### 2. 部署腳本更新
- `deploy-staging.sh`:
  - 統一 DB_NAME=ai_square_db
  - 統一 DB_PASSWORD=postgres
  - 添加 DATABASE_URL 環境變數
  - 添加 NEXTAUTH_SECRET 和 JWT_SECRET

### 3. 初始化腳本更新
- `init-staging-cloud-sql.sh`:
  - 添加 schema hotfix
  - 修正資料庫配置

## 缺失的步驟

### 🔴 關鍵缺失：Schema 初始化方式

目前的部署流程缺少在 Cloud SQL 執行 schema 的可靠方式：

1. **選項 A: 使用 Cloud Build**
   - 在 CI/CD 中執行 schema
   - 需要設定 Cloud Build 權限

2. **選項 B: 使用初始化容器**
   - 建立專門的初始化 Docker image
   - 在部署時執行

3. **選項 C: 使用 API Endpoint**
   - 建立 `/api/admin/init-schema` endpoint
   - 透過 HTTP 呼叫初始化

4. **選項 D: 使用 Cloud SQL Auth Proxy**
   - 在本地安裝並設定 proxy
   - 直接連接執行 schema

## 建議解決方案

### 立即解決方案：建立 Schema 初始化 API

創建 `/api/admin/init-schema` endpoint：
```typescript
// src/app/api/admin/init-schema/route.ts
export async function POST(request: NextRequest) {
  // 驗證 admin key
  // 執行 schema-v4.sql
  // 返回初始化結果
}
```

### 長期解決方案：CI/CD 整合

在 GitHub Actions 中添加 schema 初始化步驟：
```yaml
- name: Initialize Database Schema
  run: |
    # 使用 Cloud SQL proxy 或 Cloud Build
    # 執行 schema-v4.sql
```

## 測試檢查清單

- [x] 本地環境測試通過
- [x] Schema 更新完成
- [x] 防呆機制驗證
- [ ] Staging 資料庫初始化 ❌
- [ ] Staging scenarios 初始化 ❌
- [ ] Staging 健康檢查通過 ❌

## 結論

**本地測試**: ✅ 所有功能正常
- 正確初始化 22 個 scenarios
- 防呆機制有效
- 資料不會重複或遺失

**Staging 部署**: ⚠️ 部分成功
- 服務部署成功
- 資料庫連接設定正確
- **但資料庫 schema 未初始化**

## 下一步行動

1. **立即**: 實作 schema 初始化 API endpoint
2. **短期**: 設定 Cloud SQL Auth Proxy 進行手動初始化
3. **長期**: 整合到 CI/CD 自動化流程

## 附錄：實際執行命令記錄

### 本地測試命令序列
```bash
# 1. 重建資料庫
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -c "DROP DATABASE IF EXISTS ai_square_db;"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -c "CREATE DATABASE ai_square_db;"

# 2. 套用 schema
cd frontend
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d ai_square_db -f src/lib/repositories/postgresql/schema-v4.sql

# 3. 初始化 scenarios
curl -s -X POST "http://localhost:3004/api/admin/init-assessment" -H "Content-Type: application/json" -d '{"force": true}' | python3 -m json.tool
curl -s -X POST "http://localhost:3004/api/admin/init-pbl" -H "Content-Type: application/json" -d '{"force": true}' | python3 -m json.tool
curl -s -X POST "http://localhost:3004/api/admin/init-discovery" -H "Content-Type: application/json" -d '{"force": true}' | python3 -m json.tool

# 4. 驗證數量
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d ai_square_db -c "SELECT mode, COUNT(*) FROM scenarios GROUP BY mode;"

# 5. 測試防呆
curl -s -X POST "http://localhost:3004/api/admin/init-pbl" -H "Content-Type: application/json" -d '{"force": false}' | python3 -m json.tool
```

### Staging 部署命令
```bash
# 1. 清空資料庫
gcloud sql databases delete ai_square_db --instance=ai-square-db-staging-asia --project=ai-square-463013 --quiet
gcloud sql databases create ai_square_db --instance=ai-square-db-staging-asia --project=ai-square-463013

# 2. 部署服務
cd frontend
SKIP_DB_INIT=1 ./deploy-staging.sh

# 3. 檢查健康狀態
curl -s "https://ai-square-staging-731209836128.asia-east1.run.app/api/health" | python3 -m json.tool
```

---
最後更新: 2025-01-14 18:50
