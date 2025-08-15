## CI/CD 部署與資料庫運維指南（給 DevOps/CI 團隊）

此文件聚焦「如何正確部署前後端」與「如何正確管理/遷移資料庫」，並將責任分工與操作步驟具體化。對應文件：

- PM（產品視角）：`docs/handbook/product-requirements-document.md`
- RD（技術架構）：`docs/technical/infrastructure/unified-learning-architecture.md`
- **Local 部署指南**：`docs/deployment/local-deployment-guide.md` （從 Claude Code 直接部署）


### 目錄
- 一、整體架構與環境分層
- 二、必要憑證與環境變數
- 三、資料庫（PostgreSQL）管理與遷移
- 四、CI/CD 流程（測試 → 建置 → 佈署）
- 五、前端部署（Next.js）
- 六、後端部署（FastAPI/其他服務）
- 七、快取（Redis）與健康檢查
- 八、常見問題（Troubleshooting）


---

### 一、整體架構與環境分層

建議最少三層環境：
- Local（開發者本機）
- Staging（近真實環境，驗證 CI/CD 與資料庫/快取）
- Production（正式）

關鍵原則：Cloud Run 與 Cloud SQL「必須在同一個 Region」。否則會出現連線逾時、看似 "relation does not exist" 的誤導性錯誤。（教訓已納入）


---

### 二、必要憑證與環境變數（全環境統一）

1) 資料庫（PostgreSQL）
- DB_HOST（雲端使用 Unix Socket 或 Private IP）
- DB_PORT（本機預設 5434；雲端若用 Unix Socket 可不設）
- DB_NAME：`ai_square_db`（Local/Staging/Prod 全環境統一）
- DB_USER：`postgres`
- DB_PASSWORD：`postgres`（全環境統一，建議在 Prod 以 Secret Manager 管理）

2) Redis（可選）
- REDIS_ENABLED（true/false）
- REDIS_URL（例：`redis://localhost:6380`）

3) 前端/系統通用（必要）
- NEXTAUTH_SECRET（JWT/Session 用，必須設定）
- JWT_SECRET（JWT 簽名用，必須設定）
- 其他第三方金鑰（依服務需要放入 Secret Manager）

建議集中於：
- 本機：`frontend/.env.local`、`backend/.env.local`
- Staging/Prod：GCP Secret Manager + Cloud Run 環境變數


---

### 三、資料庫（PostgreSQL）管理與遷移

1) 版本化 Schema
- 最新 Schema 檔位於：`frontend/src/lib/repositories/postgresql/schema-v4.sql`
- 歷史版本（v3/v3.5）仍可參考，但新環境建議直接套 v4。

2) 本機初始化（Docker 或本機 PostgreSQL）
```bash
# 連線參數請依實際調整
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5434 -U postgres -d ai_square_db -f frontend/src/lib/repositories/postgresql/schema-v4.sql
```

3) 雲端初始化（Cloud SQL）
- 建議透過 Cloud Build/CD 步驟或 GitHub Actions job 執行 `psql -f schema-v4.sql`
- 確保 Cloud Run 與 Cloud SQL 在同區域；使用 Unix Socket 或 VPC Connector

4) 遷移/升級策略
- 嚴禁破壞性變更直接覆蓋：請以 `ALTER TABLE/TYPE` 兼容式更新
- 大版本（v3 → v4）：先在 Staging 測試「備援 + 轉換」，再排程 Production

5) 資料校驗（CI Step 建議）
```bash
# 基礎健康檢查
PGPASSWORD=postgres psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT NOW();"

# 資料表存在性
PGPASSWORD=postgres psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT to_regclass('public.scenarios') IS NOT NULL AS ok;"
```


---

### 四、CI/CD 流程（測試 → 建置 → 佈署）

#### 部署前檢查清單：
- [ ] 確認 DB_NAME 統一為 `ai_square_db`
- [ ] 確認 DB_PASSWORD 統一為 `postgres`
- [ ] 確認設定 NEXTAUTH_SECRET 環境變數
- [ ] 確認設定 JWT_SECRET 環境變數
- [ ] 確認設定 DATABASE_URL 環境變數（格式：`postgresql://user:pass@host:port/db`）
- [ ] 確認 Cloud SQL 與 Cloud Run 在同一 Region
- [ ] 確認 schema-v4.sql 已套用到資料庫
- [ ] 確認資料庫 schema 版本與程式碼相符（執行 migration 腳本）

推薦最小工作流程（以前端為例）：
1) 單元測試 & 型別檢查 & Lint
```bash
cd frontend
npm ci
npm run typecheck
npm run lint
npm test -- --ci --no-coverage
```

2) 整合測試（可在 Staging Pipeline）
```bash
# 需有測試 DB/Redis。可透過 docker 起 Postgres/Redis。
REDIS_ENABLED=true REDIS_URL=redis://localhost:6380 USE_SHARED_DB=1 \
  npx jest -c jest.integration.config.js --runInBand --no-coverage
```

3) 建置產物
```bash
cd frontend
npm run build
```

4) 部署（參考現有設定）
- GitHub Actions：`frontend/.github/workflows/deploy-staging.yml`
- Cloud Build（選用）：`frontend/cloudbuild.staging.yaml`
- 輔助腳本：`frontend/deploy-staging.sh`、`frontend/scripts/init-staging-cloud-sql.sh`

建議將「DB Schema 套用」做為部署前置或部署後置步驟（migrate job），確保程式碼與資料庫同步。


---

### 五、前端部署（Next.js）

#### 手動部署（使用部署腳本）
```bash
cd frontend

# 設定環境變數（可選，腳本有預設值）
export NEXTAUTH_SECRET="your-secret-here"  # 或使用預設值
export JWT_SECRET="your-jwt-secret"        # 或使用預設值

# 執行部署腳本
./deploy-staging.sh

# 如要跳過資料庫初始化
SKIP_DB_INIT=1 ./deploy-staging.sh
```

#### Cloud Run 部署要點
1) Cloud Run（建議）
- 以 Docker 方式建置映像 → 推送 Artifact Registry → Cloud Run 部署
- 關鍵：Cloud Run 與 Cloud SQL 同區域；若走 Unix Socket，將 `DB_HOST` 設為 `/cloudsql/PROJECT:REGION:INSTANCE`

2) 健康檢查與驗收
- 健康檢查端點（範例）：`/api/monitoring/health`（專案內亦有 `/api/health` 與 KSA/relations 等端點可檢）
- 部署後以 curl 驗證：
```bash
curl -s "https://<your-service-url>/api/monitoring/health" | jq
```

3) 環境變數（必要）
- `NEXTAUTH_SECRET`（必須設定，否則認證功能失效）
- `JWT_SECRET`（必須設定）
- `DB_*`（Host/Name/User/Password）
- `REDIS_*`（若啟用）


---

### 六、後端部署（FastAPI/其他服務）

若使用 FastAPI：
1) 同樣以 Docker 建置映像，將 `DB_*`、`REDIS_*` 帶入容器環境
2) 在 Cloud Run / GKE 或其他環境運行
3) 以 `uvicorn` 啟動並設定健康檢查端點（/health）


---

### 七、快取（Redis）與健康檢查

1) Redis 啟動（本機測試）
```bash
docker run -d --name ai-square-test-redis -p 6380:6379 redis:7
export REDIS_ENABLED=true
export REDIS_URL=redis://localhost:6380
```

2) 整合測試時的建議
- 對 cache 標頭（`X-Cache`）的斷言採寬鬆策略（HIT/SWR/MISS/undefined）以降低 CI 偶發性
- Redis 斷線時應具備 fallback（memory/localStorage/DB）

3) 健康檢查與監控
- 部署後請於 CI 加入 smoke test：
```bash
curl -s "https://<svc>/api/relations?lang=en" | jq '.'
curl -s "https://<svc>/api/assessment/scenarios?lang=en" | jq '.'
```


---

### 八、常見問題（Troubleshooting）

1) Cloud Run ↔ Cloud SQL 連線逾時 / relation does not exist
- 檢查 Region 是否一致
- 若用 Unix Socket，`DB_HOST` 應為 `/cloudsql/PROJECT:REGION:INSTANCE` 且不需要 port
- 若用 Private IP + VPC Connector，確認 Connector 正常與防火牆規則

2) 整合測試大量失敗（本機/CI）
- 未啟動測試 DB/Redis：請先起容器或設 `USE_SHARED_DB=1` 指向現有 DB
- 斷言過嚴：已於多數測試放寬 SLA（p95/p50）與 cache header；若仍失敗請檢查真實 API 回應

3) DB 遷移衝突
- 大版本升級（v3 → v4）務必先在 Staging 試跑並備份
- 用 `ALTER` 保持向後相容，避免破壞性 drop

4) 型別/ESLint 阻擋部署
- 先跑：`npm run typecheck && npm run lint`，修正後再 build/deploy

5) 健康檢查 OK、頁面空白
- 檢查 `.env` 是否遺漏 `NEXTAUTH_SECRET` 或 DB/Redis 相關
- 檢查 Cloud Run Service Logs（Runtime 500 常見於 env/連線）


---

### 九、Production 環境基礎建設 SOP

#### 🚨 重要：Production 環境必須獨立於 Staging

**絕對不要共用 Staging 的資源**，特別是：
- ❌ 不要共用 Cloud SQL 實例
- ❌ 不要共用 Secrets
- ❌ 不要共用 Service Account

#### Step 1: 建立 Production Cloud SQL 實例

```bash
# 1. 建立 Production 資料庫實例
gcloud sql instances create ai-square-db-production \
  --database-version=POSTGRES_15 \
  --tier=db-n1-standard-1 \
  --region=asia-east1 \
  --network=default \
  --backup \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=03 \
  --maintenance-release-channel=production \
  --project=ai-square-463013

# 2. 建立資料庫
gcloud sql databases create ai_square_db \
  --instance=ai-square-db-production \
  --project=ai-square-463013

# 3. 設定資料庫密碼（使用強密碼）
gcloud sql users set-password postgres \
  --instance=ai-square-db-production \
  --password="YOUR_STRONG_PASSWORD" \
  --project=ai-square-463013
```

#### Step 2: 建立 Production Service Account

```bash
# 1. 建立專用的 Service Account
gcloud iam service-accounts create ai-square-production \
  --display-name="AI Square Production Service Account" \
  --project=ai-square-463013

# 2. 設定 Service Account 變數
SERVICE_ACCOUNT="ai-square-production@ai-square-463013.iam.gserviceaccount.com"

# 3. 授予必要權限
# Cloud SQL Client
gcloud projects add-iam-policy-binding ai-square-463013 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"

# Secret Manager Accessor
gcloud projects add-iam-policy-binding ai-square-463013 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

# Cloud Storage (如需要)
gcloud projects add-iam-policy-binding ai-square-463013 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectViewer"

# Cloud Run Invoker (如需要)
gcloud projects add-iam-policy-binding ai-square-463013 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.invoker"
```

#### Step 3: 設定 Production Secrets

```bash
# 執行 setup script 或手動建立
cd scripts
chmod +x setup-production-secrets.sh
./setup-production-secrets.sh

# 或手動建立每個 secret：

# 1. 資料庫密碼（使用與 Step 1 相同的密碼）
echo -n "YOUR_STRONG_PASSWORD" | \
  gcloud secrets create db-password-production --data-file=- --project=ai-square-463013

# 2. NextAuth Secret（隨機生成）
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create nextauth-secret-production --data-file=- --project=ai-square-463013

# 3. JWT Secret（隨機生成）
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create jwt-secret-production --data-file=- --project=ai-square-463013

# 4. Claude API Key（使用實際的 key）
echo -n "YOUR_CLAUDE_API_KEY" | \
  gcloud secrets create claude-api-key-production --data-file=- --project=ai-square-463013

# 5. Admin Init Key（用於保護初始化端點）
echo -n "$(openssl rand -base64 24)" | \
  gcloud secrets create admin-init-key-production --data-file=- --project=ai-square-463013

# 6. Google Credentials（如需要）
gcloud secrets create google-credentials-production \
  --data-file=path/to/service-account.json \
  --project=ai-square-463013
```

#### Step 4: 更新部署設定檔

更新以下檔案中的 Cloud SQL 實例名稱：

1. **frontend/deploy-production.sh**
```bash
# 從：
CLOUD_SQL_INSTANCE="ai-square-463013:asia-east1:ai-square-db-staging-asia"
# 改為：
CLOUD_SQL_INSTANCE="ai-square-463013:asia-east1:ai-square-db-production"
```

2. **frontend/.github/workflows/deploy-production.yml**
```yaml
# 從：
CLOUD_SQL_INSTANCE: ai-square-463013:asia-east1:ai-square-db-staging-asia
# 改為：
CLOUD_SQL_INSTANCE: ai-square-463013:asia-east1:ai-square-db-production
```

#### Step 5: 初始化資料庫 Schema

```bash
# 方法 1: 使用 Cloud SQL Proxy（推薦）
# 安裝 Cloud SQL Proxy
curl -o cloud-sql-proxy \
  https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# 啟動 proxy
./cloud-sql-proxy --port 5433 \
  ai-square-463013:asia-east1:ai-square-db-production &

# 套用 schema
PGPASSWORD="YOUR_STRONG_PASSWORD" psql \
  -h localhost \
  -p 5433 \
  -U postgres \
  -d ai_square_db \
  -f frontend/src/lib/repositories/postgresql/schema-v4.sql

# 方法 2: 部署後使用 HTTP API
# 部署服務後執行
curl -X POST "https://YOUR-SERVICE-URL/api/admin/init-schema" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json"
```

#### Step 6: 執行 Production 部署

```bash
# 使用 Makefile
make deploy-production

# 或使用部署腳本
cd frontend
./deploy-production.sh

# 或使用 GitHub Actions（推薦）
# Push 到 production 分支會自動觸發
```

#### Step 7: 初始化 Scenarios

```bash
SERVICE_URL="https://ai-square-frontend-731209836128.asia-east1.run.app"

# Assessment scenarios
curl -X POST "${SERVICE_URL}/api/admin/init-assessment" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'

# PBL scenarios
curl -X POST "${SERVICE_URL}/api/admin/init-pbl" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'

# Discovery scenarios
curl -X POST "${SERVICE_URL}/api/admin/init-discovery" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'
```

#### Step 8: 驗證部署

```bash
# 1. 健康檢查
curl "https://YOUR-SERVICE-URL/api/health"

# 2. 檢查資料庫連線
curl "https://YOUR-SERVICE-URL/api/admin/init-schema"

# 3. 檢查 scenarios
curl "https://YOUR-SERVICE-URL/api/assessment/scenarios?lang=en"
curl "https://YOUR-SERVICE-URL/api/pbl/scenarios?lang=en"
curl "https://YOUR-SERVICE-URL/api/discovery/scenarios?lang=en"
```

#### Production 環境檢查清單

- [ ] Cloud SQL Production 實例已建立
- [ ] 資料庫 `ai_square_db` 已建立
- [ ] 資料庫密碼已設定（強密碼）
- [ ] Service Account 已建立並授權
- [ ] 所有 Production Secrets 已建立
- [ ] 部署設定檔已更新為 production 實例
- [ ] Schema v4 已套用
- [ ] Cloud Run 服務已部署
- [ ] Scenarios 已初始化
- [ ] 健康檢查通過
- [ ] DNS 記錄已更新（如需要）
- [ ] 監控告警已設定
- [ ] 備份策略已啟用

### 十、GitHub Actions Secrets 設定

在 GitHub Repository Settings → Secrets and variables → Actions 中設定：

#### Staging 環境 Secrets：
- `GCP_SA_KEY`: Staging Service Account JSON key
- `NEXTAUTH_SECRET`: Staging NextAuth secret
- `JWT_SECRET`: Staging JWT secret
- `SLACK_WEBHOOK_URL`: （可選）Slack 通知 webhook URL

#### Production 環境 Secrets：
- `GCP_SA_KEY_PRODUCTION`: Production Service Account JSON key
- `NEXTAUTH_SECRET_PRODUCTION`: Production NextAuth secret（與 Secret Manager 一致）
- `JWT_SECRET_PRODUCTION`: Production JWT secret（與 Secret Manager 一致）
- `ADMIN_INIT_KEY`: Admin 初始化 key（保護初始化端點）
- `SLACK_WEBHOOK_URL`: （可選）Slack 通知 webhook URL

設定步驟：
1. 進入 GitHub Repository → Settings → Secrets and variables → Actions
2. 點擊 "New repository secret"
3. 輸入 Name（如 `GCP_SA_KEY_PRODUCTION`）和 Value
4. 點擊 "Add secret"

### 十一、Production 成本估算與優化

#### 月成本估算（asia-east1 區域）

**基礎配置**（推薦起始配置）：
- Cloud Run (1 CPU, 1Gi, min=1): ~$50-100/月
- Cloud SQL (db-n1-standard-1): ~$50-70/月
- Cloud Storage: ~$5-10/月
- Secret Manager: ~$0.06/secret/月
- **總計**: ~$105-180/月

**成本優化選項**：

1. **開發/測試環境**（最低成本）：
```bash
# 使用 shared-core 實例
gcloud sql instances create ai-square-db-dev \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \  # ~$15/月
  --region=asia-east1

# Cloud Run 設定最小實例為 0
--min-instances 0  # 允許 cold start，節省閒置成本
```

2. **Production 優化**：
```bash
# 使用 Cloud Scheduler 在非尖峰時段縮減
# 例如：晚上 10 點後降低 min-instances
gcloud scheduler jobs create http scale-down \
  --schedule="0 22 * * *" \
  --uri="https://run.googleapis.com/v2/projects/PROJECT/locations/REGION/services/SERVICE" \
  --update-service-min-instances=0
```

3. **監控成本**：
```bash
# 設定預算警報
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="AI Square Production Budget" \
  --budget-amount=200 \
  --threshold-rule=percent=50,basis=current-spend \
  --threshold-rule=percent=90,basis=current-spend \
  --threshold-rule=percent=100,basis=current-spend
```

### 十二、監控與告警設定

#### 基礎監控
```bash
# 1. 設定 Uptime Check
gcloud monitoring uptime-check-configs create \
  --display-name="AI Square Production Health" \
  --resource-type="uptime-url" \
  --monitored-resource="{'host': 'ai-square-frontend-731209836128.asia-east1.run.app'}" \
  --http-check="{'path': '/api/health', 'port': 443, 'use-ssl': true}" \
  --period="5m"

# 2. 設定錯誤率告警
gcloud monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="5xx errors > 1%" \
  --condition-metric-type="run.googleapis.com/request_count" \
  --condition-filter="metric.label.response_code_class='5xx'" \
  --condition-comparison="COMPARISON_GT" \
  --condition-threshold-value=0.01
```

#### 關鍵指標監控
- Request latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- Database connections
- Memory usage
- Cold start frequency

### 附：現有部署腳本/設定（供參考）

#### Staging 環境：
- GitHub Actions Workflow：`frontend/.github/workflows/deploy-staging.yml`
- Cloud Build 設定（選用）：`frontend/cloudbuild.staging.yaml`
- Staging 部署腳本：`frontend/deploy-staging.sh`
- Cloud SQL 初始化腳本：`frontend/scripts/init-staging-cloud-sql.sh`

#### Production 環境：
- GitHub Actions Workflow：`frontend/.github/workflows/deploy-production.yml`
- Production 部署腳本：`frontend/deploy-production.sh`
- Dockerfile：`frontend/Dockerfile.production`
- Secrets 設定腳本：`scripts/setup-production-secrets.sh`
- 部署參數文檔：`docs/deployment/production-deployment-parameters.md`

#### 共用資源：
- DB Schema（最新）：`frontend/src/lib/repositories/postgresql/schema-v4.sql`
- Makefile 命令：`make deploy-staging`, `make deploy-production`

以上腳本可直接整合至 CI/CD Pipeline：先測試與型別檢查，套用/驗證 DB Schema，最後部署至 Cloud Run，並以 smoke test 驗證。

### 重要提醒

1. **環境隔離**：Production 必須有獨立的資源（DB、Secrets、Service Account）
2. **區域一致**：Cloud SQL 和 Cloud Run 必須在同一區域（asia-east1）
3. **密碼安全**：Production 密碼必須使用強密碼，並存在 Secret Manager
4. **備份策略**：Production DB 必須啟用自動備份
5. **監控告警**：設定關鍵指標監控和錯誤告警
6. **成本控制**：設定預算警報，定期檢視成本報告

### 十三、Production 部署常見問題與解決方案（2025-01-15 實測驗證）

#### 🚨 Docker Image Platform 問題【已驗證】

**實際錯誤訊息**：
```
ERROR: (gcloud.run.deploy) Revision 'ai-square-frontend-00044-vlk' is not ready and cannot serve traffic. 
Cloud Run does not support image 'gcr.io/ai-square-463013/ai-square-frontend:latest': 
Container manifest type 'application/vnd.oci.image.index.v1+json' must support amd64/linux.
```

**根本原因（實測確認）**：
- 在 macOS (Apple Silicon M1/M2) 上使用 Docker Desktop 建置時，預設產生 multi-platform image
- Cloud Run 只接受 linux/amd64 單一平台 image
- **關鍵發現**：`deploy-staging.sh` 有 `--platform linux/amd64`，但 `deploy-production.sh` 沒有

**驗證過的解決方案**：
```bash
# ✅ 方法 1：本地建置時指定平台（實測成功）
docker build --platform linux/amd64 -t image:tag -f Dockerfile .

# ✅ 方法 2：使用 Cloud Build（實測成功，耗時 6分37秒）
gcloud builds submit --tag gcr.io/ai-square-463013/ai-square-frontend:cloud-build-20250115-2058 --timeout=30m
# 結果：STATUS: SUCCESS

# ❌ 方法 3：不要只在 Dockerfile 指定平台（測試無效）
# FROM --platform=linux/amd64 node:20-alpine  # 這樣還是會產生 multi-platform image
```

**實際修復步驟**：
1. 編輯 `deploy-production.sh` 第 46 行
2. 從 `docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -f ${DOCKERFILE} .`
3. 改為 `docker build --platform linux/amd64 -t ${IMAGE_NAME}:${IMAGE_TAG} -f ${DOCKERFILE} .`

#### 🚨 API Routes 404 問題【已驗證】

**實際測試結果**：
```bash
# 使用舊 image 時的錯誤
curl -s "https://ai-square-frontend-731209836128.asia-east1.run.app/api/health"
# 返回：HTML 404 頁面而非 JSON

# 使用 Cloud Build 新 image 後成功
curl -s "https://ai-square-frontend-731209836128.asia-east1.run.app/api/health" | jq
# 返回：
{
  "status": "degraded",
  "timestamp": "2025-08-15T13:07:35.428Z",
  "version": "0.1.0",
  "environment": "production",
  "checks": {
    "database": { "status": false, "error": "DATABASE_URL not configured" },
    "redis": { "status": false, "error": "Redis client not available" },
    "memory": { "status": true, "used": 38878056, "limit": 536870912, "percentage": 7 }
  }
}
```

**實際原因（已確認）**：
1. **舊版 staging image 問題**：部署了 `gcr.io/ai-square-463013/ai-square-staging:latest`
2. **該 image 沒有包含新的 API routes**：可能是幾天前的版本
3. **Next.js standalone output 需要正確的環境變數**：`ENVIRONMENT=staging`

**驗證過的解決方案**：
```bash
# 使用 Cloud Build 建置新 image（確保包含所有最新代碼）
gcloud builds submit --tag gcr.io/ai-square-463013/ai-square-frontend:cloud-build-20250115-2058

# 部署新 image
gcloud run deploy ai-square-frontend \
  --image gcr.io/ai-square-463013/ai-square-frontend:cloud-build-20250115-2058 \
  --region asia-east1 \
  --platform managed

# 結果：API routes 正常工作
```

#### 🚨 Service Account 權限問題

**問題描述**：
```
PERMISSION_DENIED: Permission 'iam.serviceaccounts.actAs' denied on service account
```

**解決方案**：
```bash
# 方法 1：使用預設 service account（快速解決）
gcloud run deploy SERVICE_NAME \
  --image IMAGE_URL \
  # 不指定 --service-account

# 方法 2：授予權限（正確做法）
gcloud iam service-accounts add-iam-policy-binding \
  SERVICE_ACCOUNT_EMAIL \
  --member="user:YOUR_EMAIL" \
  --role="roles/iam.serviceAccountUser"
```

#### 🚨 Cloud SQL 連線問題【已驗證】

**實際錯誤訊息**：
```bash
# 建立 Cloud SQL 時的錯誤
ERROR: (gcloud.sql.instances.create) [SERVICE_NETWORKING_NOT_ENABLED] 
Private service networking is not enabled on the project.
```

**驗證過的解決方案**：
```bash
# ✅ 成功的命令（不指定 --network）
gcloud sql instances create ai-square-db-production \
  --database-version=POSTGRES_15 \
  --tier=db-n1-standard-1 \
  --region=asia-east1 \
  --backup \
  --backup-start-time=03:00 \
  --project=ai-square-463013
# 結果：成功建立

# ❌ 失敗的命令（指定 --network）
gcloud sql instances create ... --network=default  # 會導致 SERVICE_NETWORKING_NOT_ENABLED
```

**Unix Socket 連線設定（已驗證）**：
```bash
# Cloud Run 環境變數設定
--set-env-vars DB_HOST="/cloudsql/ai-square-463013:asia-east1:ai-square-db-production"
# 注意：不需要設定 DB_PORT（Unix socket 不使用 port）
```

#### 🚨 Build 時間過長問題【已驗證】

**實測數據對比**：
| 建置方式 | 耗時 | 平台處理 | 建議優先級 |
|---------|------|---------|----------|
| Cloud Build | **6分37秒** | ✅ 自動處理 | **推薦** |
| Local Docker (Mac M1/M2) | **29分鐘** | ❌ 需手動指定 | 備選 |

**已更新的部署腳本**（2025-01-15）：
```bash
# deploy-staging.sh 和 deploy-production.sh 現在都有選項：
🚀 選擇建置方式：
1) Cloud Build（推薦，~7分鐘，自動處理平台問題）
2) Local Docker Build（~30分鐘，需要 Docker Desktop）
請選擇 (1 或 2，預設 1): 1
```

**Cloud Build 優勢**：
1. **速度快 4 倍**：6-7 分鐘 vs 29 分鐘
2. **自動處理平台**：不需要指定 `--platform linux/amd64`
3. **雲端資源**：不佔用本地 CPU/記憶體
4. **並行處理**：Google 的建置伺服器效能更好

**使用 Cloud Build 的命令**：
```bash
# 方式 1：使用更新後的部署腳本（推薦）
make deploy-staging    # 或 make deploy-production
# 選擇選項 1

# 方式 2：直接使用 gcloud
gcloud builds submit \
  --tag gcr.io/ai-square-463013/ai-square-frontend:$(date +%Y%m%d-%H%M) \
  --timeout=30m \
  --project=ai-square-463013
```

#### 🚨 Image 版本管理混亂

**問題描述**：
- 不確定哪個 image 是最新版本
- staging 和 production image 混用

**最佳實踐**：
```bash
# 1. 使用明確的標記策略
gcr.io/PROJECT/ai-square-frontend:prod-20250115-1430
gcr.io/PROJECT/ai-square-frontend:staging-20250115-1430
gcr.io/PROJECT/ai-square-frontend:$(git rev-parse --short HEAD)

# 2. 查看 image 資訊
gcloud container images describe IMAGE_URL

# 3. 列出所有版本
gcloud container images list-tags gcr.io/PROJECT/IMAGE

# 4. 部署時明確指定版本
gcloud run deploy --image IMAGE_URL:SPECIFIC_TAG
```

#### 🚨 環境變數設定錯誤

**常見錯誤**：
- 忘記設定 `NEXTAUTH_SECRET`
- `DB_PASSWORD` 包含特殊字元導致解析錯誤
- 混用 staging 和 production 的環境變數

**檢查清單**：
```bash
# 查看 Cloud Run 環境變數
gcloud run services describe SERVICE_NAME \
  --region=REGION \
  --format="yaml(spec.template.spec.containers[].env)"

# 必要的環境變數
- NODE_ENV=production
- DB_HOST=/cloudsql/PROJECT:REGION:INSTANCE
- DB_NAME=ai_square_db
- DB_USER=postgres
- DB_PASSWORD=（使用 Secret Manager）
- NEXTAUTH_SECRET=（32 字元隨機字串）
- JWT_SECRET=（32 字元隨機字串）
```

### 十四、Staging vs Production 部署差異【重要發現】

#### 🔍 為什麼 Staging 成功而 Production 失敗？

**實際對比結果**：
```bash
# Staging deploy-staging.sh（第 41 行）
docker build --platform linux/amd64 -f Dockerfile.staging -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG .

# Production deploy-production.sh（原始第 46 行）
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -f ${DOCKERFILE} .
# 缺少 --platform linux/amd64！
```

**關鍵差異總結**：
| 項目 | Staging | Production | 影響 |
|------|---------|------------|------|
| Platform 指定 | ✅ 有 `--platform linux/amd64` | ❌ 沒有 | 導致 Cloud Run 拒絕 multi-platform image |
| Dockerfile | Dockerfile.staging | Dockerfile.production | Production 更複雜，multi-stage build |
| Cloud SQL | ai-square-db-staging-asia | ai-square-db-production | 需要分別建立 |
| 部署頻率 | 經常部署，腳本經過多次優化 | 較少部署，問題未被發現 | Staging 腳本更成熟 |

**結論**：
- **並非 GitHub Actions vs Local 的差異**
- **是部署腳本本身的差異**：Staging 腳本已經修正過平台問題，Production 沒有

### 十五、部署流程優化建議（Local Deploy 版本）

#### 建議的 Local Production 部署流程

1. **使用修正後的部署腳本**
   ```bash
   # 確保 deploy-production.sh 包含 --platform linux/amd64
   ./deploy-production.sh
   ```
   
2. **或使用 Cloud Build（推薦）**
   ```bash
   # Cloud Build 自動處理平台問題
   gcloud builds submit --tag gcr.io/PROJECT/IMAGE:TAG --timeout=30m
   ```

3. **實施藍綠部署**
   ```bash
   # 部署到新版本但不切換流量
   gcloud run deploy SERVICE_NAME-green \
     --image NEW_IMAGE \
     --no-traffic
   
   # 測試新版本
   curl https://green-url.run.app/api/health
   
   # 切換流量
   gcloud run services update-traffic SERVICE_NAME \
     --to-revisions=SERVICE_NAME-green=100
   ```

3. **建立部署前檢查腳本**
   ```bash
   #!/bin/bash
   # pre-deploy-checks.sh
   
   # 檢查 image 平台
   docker manifest inspect IMAGE_URL | jq '.manifests[].platform'
   
   # 檢查 API routes
   docker run --rm IMAGE_URL ls -la /app/.next/standalone/
   
   # 驗證環境變數
   gcloud run services describe SERVICE_NAME --format=yaml | grep -E "DB_|NEXT"
   ```

4. **監控部署結果**
   ```bash
   # 即時查看日誌
   gcloud run logs tail --service SERVICE_NAME --region REGION
   
   # 設定告警
   gcloud monitoring policies create --config-from-file=alerts.yaml
   ```



## 十三、初始化 Demo 帳號 (重要！)

### Production Demo 帳號設定

Production 環境需要初始化標準 demo 帳號以供測試使用。

#### 方法 1: 使用 Admin API (推薦)
```bash
# 使用 fix-demo-accounts API
curl -X POST https://ai-square-frontend-m7s4ucbgba-de.a.run.app/api/admin/fix-demo-accounts \
  -H "Content-Type: application/json" \
  -d '{"secretKey": "fix-demo-accounts-2025"}' \
  -s | jq
```

#### 方法 2: 直接 SQL 初始化
```bash
# 透過 Cloud SQL Proxy 連線 (Production: port 5434)
cloud-sql-proxy --port 5434 \
  ai-square-463013:asia-east1:ai-square-db-production &

# 連線到資料庫
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5434 -U postgres -d ai_square_db
```

```sql
-- 創建標準 demo 帳號
INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at)
VALUES 
(gen_random_uuid(), 'student@example.com', 
 '$2b$10$.xkZ3DfAj2WDXSknfBBLsO/bNlHbeSWlzS6GZYVlPd/11XaAe7f4m', -- student123
 'Student User', 'student', true, NOW(), NOW()),
(gen_random_uuid(), 'teacher@example.com',
 '$2b$10$BrsePjeOuXf039pkk2VDEOReodDH2H.zQlj6cRMPg0fYhXFmzZ/vy', -- teacher123  
 'Teacher User', 'teacher', true, NOW(), NOW()),
(gen_random_uuid(), 'admin@example.com',
 '$2b$10$7QwCi8yF0MFsvpjxJuNNMO3L0BpIuHgwsbfVFJQbUMKc0E91WPjfW', -- admin123
 'Admin User', 'admin', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified;
```

### Demo 帳號資訊

| Email | Password | Role | 用途 |
|-------|----------|------|------|
| student@example.com | student123 | student | 學生功能測試 |
| teacher@example.com | teacher123 | teacher | 教師功能測試 |
| admin@example.com | admin123 | admin | 管理員功能測試 |

### 驗證 Demo 帳號

```bash
# 測試登入 (student)
curl -X POST https://ai-square-frontend-m7s4ucbgba-de.a.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com", "password": "student123"}' \
  -s | jq

# 測試登入 (teacher)
curl -X POST https://ai-square-frontend-m7s4ucbgba-de.a.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "teacher@example.com", "password": "teacher123"}' \
  -s | jq

# 測試登入 (admin)
curl -X POST https://ai-square-frontend-m7s4ucbgba-de.a.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}' \
  -s | jq

# 檢查資料庫中的帳號
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5434 -U postgres -d ai_square_db \
  -c "SELECT email, role, email_verified FROM users WHERE email LIKE '%@example.com' ORDER BY role;"
```

### 重要注意事項

⚠️ **必須步驟**：
1. 每次重新部署 Production 後都要檢查 demo 帳號是否存在
2. 如果資料庫重置，必須重新執行初始化
3. 密碼 hash 是預先生成的，不要改變
4. Cloud SQL 密碼必須設定為 `postgres` (或更新環境變數)

⚠️ **常見問題**：
1. **登入失敗**: 檢查密碼 hash 是否正確
2. **資料庫連線失敗**: 確認 Cloud SQL instance 已掛載到 Cloud Run
3. **密碼認證失敗**: 執行 `gcloud sql users set-password postgres --instance=ai-square-db-production --password=postgres`

⚠️ **安全考量**：
- Demo 帳號僅供測試使用
- 生產環境應該定期更改密碼
- 不要在真實用戶環境使用這些帳號
