## CI/CD 部署與資料庫運維指南（給 DevOps/CI 團隊）

此文件聚焦「如何正確部署前後端」與「如何正確管理/遷移資料庫」，並將責任分工與操作步驟具體化。對應文件：

- PM（產品視角）：`docs/handbook/product-requirements-document.md`
- RD（技術架構）：`docs/technical/infrastructure/unified-learning-architecture.md`


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

### 二、必要憑證與環境變數

1) 資料庫（PostgreSQL）
- DB_HOST（雲端使用 Unix Socket 或 Private IP）
- DB_PORT（本機預設 5434；雲端若用 Unix Socket 可不設）
- DB_NAME（標準：`ai_square_db`）
- DB_USER / DB_PASSWORD

2) Redis（可選）
- REDIS_ENABLED（true/false）
- REDIS_URL（例：`redis://localhost:6380`）

3) 前端/系統通用
- NEXTAUTH_SECRET（JWT/Session 用）
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

1) Cloud Run（建議）
- 以 Docker 方式建置映像 → 推送 Artifact Registry → Cloud Run 部署
- 關鍵：Cloud Run 與 Cloud SQL 同區域；若走 Unix Socket，將 `DB_HOST` 設為 `/cloudsql/PROJECT:REGION:INSTANCE`

2) 健康檢查與驗收
- 健康檢查端點（範例）：`/api/monitoring/health`（專案內亦有 `/api/health` 與 KSA/relations 等端點可檢）
- 部署後以 curl 驗證：
```bash
curl -s "https://<your-service-url>/api/monitoring/health" | jq
```

3) 環境變數（常見）
- `NEXTAUTH_SECRET`
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

### 附：現有部署腳本/設定（供參考）

- GitHub Actions Workflow：`frontend/.github/workflows/deploy-staging.yml`
- Cloud Build 設定（選用）：`frontend/cloudbuild.staging.yaml`
- Staging 部署腳本：`frontend/deploy-staging.sh`
- Cloud SQL 初始化腳本（Staging）：`frontend/scripts/init-staging-cloud-sql.sh`
- DB Schema（最新）：`frontend/src/lib/repositories/postgresql/schema-v4.sql`

以上腳本可直接整合至 CI/CD Pipeline：先測試與型別檢查，套用/驗證 DB Schema，最後部署至 Cloud Run，並以 smoke test 驗證。


