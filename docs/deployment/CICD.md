## CI/CD 部署與資料庫運維指南

> **🚀 部署方式**：所有部署使用 **GitHub Actions + gcloud CLI** 進行管理。

此文件聚焦「如何使用 GitHub Actions 部署前後端」與「如何正確管理/遷移資料庫」。對應文件：

- PM（產品視角）：`docs/handbook/PRD.md`
- RD（技術架構）：`docs/technical/infrastructure/unified-learning-architecture.md`
- **CI/CD 配置**：`.github/workflows/` 目錄

## 🚨🚨🚨 部署監控與驗證流程 - 每次推送後必須執行！！！ 🚨🚨🚨

### 🔴🔴🔴 最重要的規則：PUSH 後必須監控 GitHub Actions！！！ 🔴🔴🔴

**違反此規則的後果：**
- ❌ 部署失敗卻不知道
- ❌ 用戶遇到錯誤
- ❌ 浪費時間 debug
- ❌ 失去專業性

### 📋 標準部署監控 SOP

**每次 `git push` 後的強制檢查流程：**

#### 1. **即時監控 GitHub Actions 部署狀態（絕對必要！）**
```bash
# 檢查最新 workflow 執行狀態
gh run list --limit 5

# 監控特定 workflow (Staging)
gh run list --workflow="Deploy to Staging" --limit 2

# 檢查執行中的部署
gh run view [RUN_ID]  # 取得詳細狀態

# 如果失敗，檢查錯誤日誌
gh run view [RUN_ID] --log-failed
```

#### 2. **部署完成後立即驗證**
```bash
# 檢查 staging 服務健康狀態
curl -s https://ai-square-staging-463013.asia-east1.run.app/ | head -5

# 驗證 API 可用性
curl -s https://ai-square-staging-463013.asia-east1.run.app/api/health
```

#### 3. **認證功能完整測試**
```bash
# 使用 deployment-qa agent 進行自動化測試
# 會執行完整的認證流程驗證：
# - 登入功能
# - Session 持久性
# - 受保護路由存取
# - Cookie 管理
# - API 認證狀態
```

#### 4. **關鍵功能驗證清單**
- [ ] **登入流程**: Demo 帳號可正常登入
- [ ] **Session 維持**: 重新整理頁面不會登出
- [ ] **Header 狀態**: 登入後顯示用戶資訊，非 "Sign in"
- [ ] **PBL 場景**: 可正常啟動 `/api/pbl/scenarios/[id]/start`
- [ ] **Discovery 功能**: 可存取職業探索功能
- [ ] **Assessment 評估**: 可開始評估流程

#### 5. **問題排除流程**

**如果部署狀態顯示失敗但服務正常運作：**
```bash
# 檢查服務是否真的在運行
curl -I https://ai-square-staging-463013.asia-east1.run.app/

# 檢查特定功能
curl -s https://ai-square-staging-463013.asia-east1.run.app/api/auth/check

# 如果服務正常，CI/CD 失敗可能是測試問題，不是部署問題
```

**如果服務無法存取：**
```bash
# 檢查 Cloud Run 服務狀態
gcloud run services describe ai-square-staging --region=asia-east1

# 檢查最新修訂版本
gcloud run revisions list --service=ai-square-staging --region=asia-east1

# 檢查服務日誌
gcloud run services logs read ai-square-staging --region=asia-east1 --limit=20
```

### 🚨 強制執行規則

1. **🔴 推送後立即監控 GitHub Actions** - 這是最重要的！絕不能推送完就離開！
   ```bash
   # 每次 push 後立即執行
   gh run list --limit 5
   # 持續監控直到部署完成
   ```
2. **等待部署完成** - 確認狀態為 `completed`
3. **執行功能測試** - 使用 deployment-qa agent 或手動測試
4. **記錄問題** - 如有問題立即修復
5. **確認可用性** - 確保用戶可正常使用

**記住：不監控 = 不負責任 = 不專業！**

### 💡 部署成功判斷標準

**真正的部署成功 = 功能正常，不是 CI/CD 綠燈**

- ✅ **服務可存取**: HTTP 200 回應
- ✅ **核心功能正常**: 登入、導航、API 可用
- ✅ **無 JavaScript 錯誤**: 瀏覽器 console 無嚴重錯誤
- ✅ **認證正常運作**: 401 錯誤處理正確

**CI/CD 狀態參考價值：**
- `success` = 很可能沒問題
- `failure` = 需要檢查，但可能是測試問題，不一定是部署問題

### 🔄 自動化監控建議

```bash
# 建立部署監控 alias
alias monitor-deploy='gh run list --limit 3 && sleep 30 && gh run list --limit 3'

# 快速功能測試
alias test-staging='curl -s https://ai-square-staging-463013.asia-east1.run.app/api/health && echo "✅ Staging OK"'
```

**記住：監控 → 驗證 → 測試 → 確認，缺一不可！**

## 🚨🚨🚨 部署後強制測試規則 - 每次部署都要測試！！！ 🚨🚨🚨

### 部署完成 ≠ 工作完成
**部署只是第一步，測試通過才算完成！**

### 每次部署後必須執行：
1. **實際瀏覽器測試**
   ```bash
   npx playwright test --headed  # 必須看著瀏覽器實際操作
   ```

2. **核心功能驗證清單**
   - [ ] 登入功能正常
   - [ ] Discovery 分類篩選器顯示正確數量
   - [ ] PBL 場景可以載入
   - [ ] Assessment 可以開始
   - [ ] 主要頁面無錯誤

3. **API 端點測試**
   ```bash
   curl -X POST $URL/api/auth/login --data '...'
   curl $URL/api/discovery/scenarios?lang=zh
   curl $URL/api/pbl/scenarios?lang=zh
   ```

4. **錯誤日誌檢查**
   ```bash
   gcloud run services logs read $SERVICE --region=asia-east1 --limit=50 | grep -i error
   ```

### 🔴 違反規則的後果
- 用戶會發現問題 → 信任度降低
- 需要重新部署 → 浪費時間
- 可能造成生產環境問題 → 嚴重事故

**記住：沒測試就說部署完成 = 不負責任！**

## 🚨 部署初始化關鍵步驟 (2025/01/16 血淚教訓)

### ❌ 最常被遺忘的步驟：Scenario 初始化
**問題**: 部署完成後，應用程式看起來是空的，沒有任何內容。

**原因**: Database seed 只創建 demo 帳號，scenarios 需要透過 API 初始化。

### ✅ 正確的部署流程
```bash
# 1. 部署 Cloud Run 和 Database
make deploy-staging  # 或 make deploy-production

# 2. 初始化 Scenarios（關鍵！經常被遺忘！）
BASE_URL="https://your-service-url"
curl -X POST "$BASE_URL/api/admin/init-pbl"
curl -X POST "$BASE_URL/api/admin/init-discovery"
curl -X POST "$BASE_URL/api/admin/init-assessment"

# 3. 驗證部署
./scripts/verify-deployment.sh staging
```

### 📝 記住：
- **Database Seed ≠ Application Data**
- Seed 創建帳號，API 創建內容
- 沒有 API 初始化 = 空的應用程式

## 🛠️ GitHub Actions + gcloud CLI 部署架構（2025/12 更新）

**🧩 核心原則：使用 GitHub Actions + gcloud CLI 進行所有部署**

### GitHub Actions 負責完整部署流程
```yaml
✅ GitHub Actions 負責：
- 基礎設施管理（通過 gcloud CLI）
  - Cloud SQL、Cloud Run 服務
  - Service Account、IAM 權限
  - Secret Manager 配置
  - 網路設定（VPC、Domain Mapping）

- 應用程式部署
  - 建構 Docker image
  - 推送到 Container Registry
  - 執行資料庫遷移（Prisma migrate）
  - 初始化場景資料（/api/admin/init）
  - 執行 E2E 測試
  - 健康檢查驗證

工作流程：
1. Push to branch → 觸發 GitHub Actions
2. Build & Push Docker image
3. Deploy to Cloud Run (using gcloud CLI)
4. Run database migrations
5. Initialize application data
6. Run E2E tests
```

### 正確的部署流程
```bash
# 部署流程（每次更新）
git add -A
git commit -m "feat: new feature"
git push origin staging  # 觸發 GitHub Actions

# GitHub Actions 自動執行：
# 1. Build Docker image
# 2. Push to GCR
# 3. Deploy to Cloud Run
# 4. Run migrations
# 5. Initialize data
# 6. Run tests
```

### 手動部署命令（如果需要）
```bash
# 使用 Makefile 命令
make deploy-staging          # 部署到 Staging
make deploy-production       # 部署到 Production
make staging-logs           # 查看 Staging logs
make production-health      # 檢查 Production 健康狀態
```

### 關鍵原則：
1. **先調查現有方案** - 不要假設沒有解決方案
2. **整合而非創建** - 整合到現有系統，不要創建新系統
3. **標準化工具** - 使用行業標準工具（GitHub Actions, gcloud CLI, Prisma）
4. **避免臨時腳本** - 每個「臨時」腳本都會變成技術債

## 📚 Cloud Run + Cloud SQL Deployment Guide

### 🚨 Key Principle: Regions Must Match
**Critical lesson from painful staging deployment**

#### Diagnostics

1. **Check Cloud SQL instance**:
   ```bash
   gcloud sql instances describe INSTANCE_NAME --format="table(name,region,state)"
   ```

2. **Check Cloud Run config**:
   ```bash
   gcloud run services describe SERVICE_NAME --region=REGION --format="json" | jq '.spec.template.metadata.annotations'
   ```

#### Connection Methods

**Method 1: Unix Socket (Recommended)**
```bash
gcloud run deploy SERVICE_NAME \
  --add-cloudsql-instances=PROJECT:REGION:INSTANCE \
  --set-env-vars DB_HOST="/cloudsql/PROJECT:REGION:INSTANCE"
```

**Method 2: Private IP + VPC (Most Secure)**
```bash
# Create VPC Connector
gcloud compute networks vpc-access connectors create CONNECTOR \
  --region=REGION --network=default --range=10.8.0.0/28

# Deploy with connector
gcloud run deploy SERVICE_NAME \
  --vpc-connector=CONNECTOR \
  --vpc-egress=all-traffic
```

#### Common Issues

1. **Password auth failed**: Use Secret Manager for special chars
2. **Connection timeout**: Check region matching
3. **Permission denied**: Add `cloudsql.client` role

#### Deployment Checklist

- [ ] Cloud SQL and Cloud Run in same region
- [ ] Environment variables set correctly
- [ ] Cloud SQL instance mounted
- [ ] Service account has permissions
- [ ] Database initialized
- [ ] Password managed properly

#### Repository Pattern Connection

```typescript
const dbHost = process.env.DB_HOST || 'localhost';
const isCloudSQL = dbHost.startsWith('/cloudsql/');

if (isCloudSQL) {
  poolConfig.host = dbHost;
  // Don't set port for unix socket
} else {
  poolConfig.host = dbHost;
  poolConfig.port = parseInt(process.env.DB_PORT || '5432');
}
```

### 目錄
- 一、Google Cloud Account 配置
- 二、Terraform 基礎設施管理
- 三、環境分層與配置
- 四、必要憑證與 Secret Manager
- 五、資料庫（Cloud SQL）管理
- 六、CI/CD 流程（使用 Terraform）
- 七、部署步驟（Staging & Production）
- 八、監控與健康檢查
- 九、常見問題（Troubleshooting）


---

### 一、Google Cloud Account 配置

#### 🔧 重要：使用正確的 Google Cloud 帳號

AI Square 專案必須使用以下配置：
- **Project ID**: `ai-square-463013`
- **Account**: `youngtsai@junyiacademy.org`
- **Region**: `asia-east1`

#### 設定 gcloud 配置

```bash
# 如果尚未建立 ai-square 配置
gcloud config configurations create ai-square
gcloud config set account youngtsai@junyiacademy.org
gcloud config set project ai-square-463013
gcloud config set compute/region asia-east1

# 每次開發前確認配置
gcloud config configurations activate ai-square
gcloud config list  # 應顯示 project = ai-square-463013
```

#### 多專案開發提示

如果同時開發其他專案（如 Duotopia），使用環境變數隔離：

```bash
# Terminal for AI Square
export CLOUDSDK_ACTIVE_CONFIG_NAME=ai-square

# Terminal for other projects
export CLOUDSDK_ACTIVE_CONFIG_NAME=other-config
```

**部署前必須檢查**：
```bash
gcloud config get-value project  # 應顯示 ai-square-463013
gcloud auth list  # 確認 youngtsai@junyiacademy.org 為 ACTIVE
```

---

### 二、Terraform 基礎設施管理

#### 🎯 核心原則：Infrastructure as Code + 使用既有自動化方案

##### 一步到位原則 (One-Step Deployment)
**使用成熟的、已經存在的解決方案，而不是不斷創造新的臨時方案。**

優先順序：
1. **GitHub Actions (CI/CD)** - 最自動化的解決方案
2. **Terraform + Makefile** - 基礎設施即代碼
3. **現有部署腳本** - 如果已經有成熟腳本
4. **gcloud 命令** - 直接使用 GCP CLI

❌ **絕對避免**：
- 創建新的臨時 shell scripts
- 寫一次性的部署腳本
- 重複造輪子

✅ **正確做法**：
- 使用 Cloud Build 自動構建
- 使用 Terraform 管理基礎設施
- 使用 Makefile 標準化命令
- 使用 GitHub Actions CI/CD

#### 🛠️ Terraform vs GitHub Actions 責任分工

**🧩 核心原則：把對的工具用在對的地方 - Terraform 建房子，GitHub Actions 搬家具！**

| 工具 | 職責 | 不該做的事 |
|------|------|------------|
| **Terraform** | • Cloud SQL 實例<br>• Cloud Run 服務<br>• Service Account<br>• IAM 權限<br>• Secret Manager<br>• 網路設定 | • 資料庫 Schema<br>• Demo 帳號建立<br>• 初始資料載入<br>• 執行測試<br>• 應用程式邏輯 |
| **GitHub Actions** | • Docker image 建構<br>• Container Registry 推送<br>• 資料庫遷移（Prisma）<br>• 場景資料初始化<br>• E2E 測試執行<br>• 健康檢查驗證 | • 基礎設施建立<br>• Cloud 資源管理<br>• IAM 權限設定 |

**正確的協作流程：**
```mermaid
graph LR
    A[Terraform] -->|建立基礎設施| B[Cloud SQL + Cloud Run]
    C[Git Push] -->|觸發| D[GitHub Actions]
    D -->|部署應用| B
    D -->|執行遷移| E[Database Schema]
    D -->|初始化| F[Application Data]
```

##### Terraform 管理架構

所有基礎設施都使用 Terraform 管理：

```bash
# Terraform 目錄結構
terraform/
├── main.tf                 # 主配置檔案
├── environments/
│   ├── staging.tfvars     # Staging 環境變數
│   └── production.tfvars  # Production 環境變數
└── .gitignore             # 忽略敏感資料
```

#### Terraform 管理的資源

- **Cloud SQL** (PostgreSQL 資料庫)
- **Cloud Run** (應用程式服務)
- **Secret Manager** (密碼管理)
- **Service Account** (IAM 權限)
- **Monitoring** (監控告警)

#### 關鍵原則

1. **Region 一致性**：Cloud Run 與 Cloud SQL 必須在同一個 Region (`asia-east1`)
2. **State 管理**：Terraform state 儲存在 GCS bucket
3. **密碼安全**：所有密碼使用 Secret Manager


---

### 三、環境分層與配置

#### 環境分層

| 環境 | 用途 | Terraform Workspace | 配置檔 |
|------|------|-------------------|--------|
| Local | 開發測試 | N/A | `.env.local` |
| Staging | 整合測試 | staging | `environments/staging.tfvars` |
| Production | 正式環境 | production | `environments/production.tfvars` |

#### Terraform 初始化

```bash
# ⚠️ 重要：執行前必須設定 DB_PASSWORD！
export TF_VAR_db_password="YOUR_SECURE_PASSWORD"  # 符合密碼要求：12字符+大小寫+數字

# 1. 初始化 Terraform
cd terraform
terraform init

# 2. 切換到正確的 workspace
terraform workspace select staging  # 或 production

# 3. 預覽變更（會提示輸入 db_password 如果沒設定）
terraform plan -var-file="environments/staging.tfvars"

# 4. 套用變更
terraform apply -var-file="environments/staging.tfvars"
```

**⚠️ 血淚教訓：如果忘記設定 DB_PASSWORD**
- Terraform 會創建資源但 Cloud Run 無法連接資料庫
- 需要手動修復：`gcloud run services update ai-square-staging --update-env-vars DB_PASSWORD=xxx`

### 四、必要憑證與 Secret Manager

#### ⚠️ Terraform 密碼要求
Terraform 配置中對資料庫密碼有以下驗證規則（`main.tf` 第 61-64 行）：
- **最少 12 個字符**
- **必須包含大寫字母**
- **必須包含小寫字母**
- **必須包含數字**
- **建議不要使用特殊符號**（避免 URL 編碼問題）

**密碼設定方式**：
1. 在 `.env.local` 中設定（不要提交到 Git）
2. 使用環境變數 `export TF_VAR_db_password="你的密碼"`
3. Production 環境使用 Secret Manager

#### 使用 Secret Manager 管理密碼

Terraform 會自動建立和管理 Secret Manager：

```hcl
# main.tf 中的 Secret Manager 配置
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password-${var.environment}"
  replication {
    auto {}
  }
}
```

#### 環境變數配置

Terraform 會自動設定以下環境變數：

1) **資料庫配置**
   - `DB_HOST`: `/cloudsql/PROJECT:REGION:INSTANCE` (Unix Socket)
   - `DB_NAME`: `ai_square_db`
   - `DB_USER`: `postgres`
   - `DB_PASSWORD`: 從 Secret Manager 讀取
   - `DATABASE_URL`: 完整連線字串（含 URL 編碼的密碼）

   **⚠️ 重要注意事項**：
   - 密碼中若含特殊字符（如 `#`、`@`、`%`），必須進行 URL 編碼
   - Terraform 使用 `urlencode()` 函數自動處理
   - 應用程式優先使用個別環境變數（DB_HOST、DB_PASSWORD）而非 DATABASE_URL

2) **應用程式配置**
   - `NODE_ENV`: `production`
   - `NEXTAUTH_SECRET`: 從 Secret Manager 讀取
   - `JWT_SECRET`: 從 Secret Manager 讀取

3) **Redis 配置** (可選)
   - `REDIS_ENABLED`: `true`/`false`
   - `REDIS_URL`: Redis 連線 URL
- 其他第三方金鑰（依服務需要放入 Secret Manager）

建議集中於：
- 本機：`frontend/.env.local`、`backend/.env.local`
- Staging/Prod：GCP Secret Manager + Cloud Run 環境變數


---

### 五、資料庫（Cloud SQL）管理

#### 🎯 資料庫管理策略更新（2025/08 - Prisma Integration）

從 2025/08 開始，專案採用 **Prisma ORM** 作為資料庫 Schema 管理和遷移工具，取代原本的手動 SQL 腳本管理方式。

##### Prisma 架構

```
frontend/
├── prisma/
│   ├── schema.prisma              # Prisma Schema 定義（單一真實來源）
│   ├── migrations/                # 自動生成的遷移檔案
│   │   └── 20250818154047_initial_schema/
│   │       └── migration.sql
│   └── seed.ts                    # 資料 Seed 腳本（Demo 帳號）
├── src/
│   └── app/api/admin/
│       ├── migrate/route.ts       # Prisma 初始化 API endpoint
│       ├── prisma-init/route.ts   # Prisma 初始化與健康檢查
│       └── prisma-deploy/route.ts # Prisma 部署專用 endpoint
```

##### 使用 Prisma 的優勢

1. **Schema as Code**: Schema 定義在 `schema.prisma`，版本控制追蹤
2. **自動遷移生成**: 自動產生 SQL 遷移檔案
3. **Type Safety**: 自動生成 TypeScript 型別
4. **遷移歷史**: 完整的遷移歷史記錄
5. **資料 Seeding**: 內建 seed 機制
6. **GCP 相容性**: 完全支援 Cloud SQL PostgreSQL

##### Prisma 在 GCP 的使用

**Prisma 完全可以在 GCP 上使用！**
- ✅ 支援 Cloud SQL PostgreSQL
- ✅ 支援 Cloud Run 部署
- ✅ 支援 Unix Socket 連線 (`/cloudsql/...`)
- ✅ 支援 Cloud Build 自動化部署

#### 重要：密碼設定注意事項

**絕對不要在文檔中硬編碼密碼！**

1. **密碼管理原則**
   - 所有密碼必須使用 Secret Manager 或環境變數
   - 密碼不應包含特殊字符（如 `#`、`@`、`%`）以避免 URL 編碼問題
   - 開發環境密碼需符合 Terraform 要求：12字符以上，包含大小寫和數字

2. **環境變數設定**
   ```bash
   # 使用環境變數檔案
   # 在 .env.local（已加入 .gitignore）中設定：
   DB_PASSWORD=你的密碼（需符合要求）

   # 然後在執行時讀取：
   source .env.local
   export TF_VAR_db_password="${DB_PASSWORD}"
   ```

3. **DATABASE_URL 處理**
   - 如果密碼包含特殊字符，必須進行 URL 編碼
   - Repository Factory 會自動解析 DATABASE_URL 並解碼密碼

#### Terraform 管理 Cloud SQL

Terraform 會自動建立和管理 Cloud SQL 實例：

```hcl
# main.tf 中的 Cloud SQL 配置
resource "google_sql_database_instance" "main" {
  name             = "ai-square-db-${var.environment}-asia"
  database_version = "POSTGRES_15"
  region          = var.region

  settings {
    tier = var.environment == "production" ? "db-custom-2-4096" : "db-f1-micro"

    # 安全設定
    database_flags {
      name  = "log_connections"
      value = "on"
    }

    # 備份設定
    backup_configuration {
      enabled = var.environment == "production"
      start_time = "03:00"
    }
  }
}
```

#### 資料庫 Schema 管理（Prisma）

1) **Schema 定義**
   - 位置：`frontend/prisma/schema.prisma`
   - 包含所有資料表定義、關聯、索引
   - 使用 Prisma DSL 語法

2) **初始化方式（Prisma）**
   ```bash
   # 本地開發
   npx prisma migrate dev

   # Staging/Production - 透過 API
   curl -X POST "$URL/api/admin/migrate"
   ```

3) **遷移流程**
   ```bash
   # 1. 修改 schema.prisma
   # 2. 生成遷移
   npx prisma migrate dev --name descriptive_name
   # 3. 應用到 Production
   npx prisma migrate deploy
   ```

4) **Demo 帳號 Seeding**
   ```bash
   # 自動執行（配置在 package.json）
   npx prisma db seed

   # 手動執行
   npx tsx prisma/seed.ts
   ```

5) **Prisma 部署腳本**
   ```bash
   # 完整 Prisma 部署（已整合到 Terraform）
   cd terraform
   make deploy-staging    # 包含 Prisma 遷移
   make deploy-production # 包含 Prisma 遷移
   ```

5) **備份策略**
   - Production：每日自動備份（凌晨 3:00）
   - Staging：不自動備份（節省成本）
   - 使用 `gcloud sql backups` 手動備份

6) **遷移最佳實踐**
   - 永遠先在本地測試遷移
   - 使用描述性的遷移名稱
   - 避免破壞性變更（使用 soft delete）
   - 先在 Staging 測試，再部署到 Production


---

### 六、CI/CD 流程（使用 Terraform）

#### 🚀 完整自動化部署架構 (2025/01 新增)

##### 最佳實踐部署流程

```mermaid
sequenceDiagram
    participant Dev as 開發者
    participant Make as Makefile
    participant TF as Terraform
    participant GCP as Google Cloud
    participant E2E as E2E Tests
    participant Report as 報告

    Dev->>Make: make deploy-staging
    Make->>Make: 檢查 TF_VAR_db_password
    Make->>TF: terraform apply
    TF->>GCP: 部署基礎設施
    GCP-->>TF: 返回 Service URL
    TF->>TF: 等待健康檢查
    TF->>E2E: 執行 Playwright E2E 測試
    E2E-->>TF: 測試結果
    TF->>TF: 執行 Terraform Tests
    Make->>Report: 生成部署報告
```

##### 一鍵部署系統

```bash
# 設定密碼（只需一次，從環境變數讀取）
# 在 .env.local 中設定你的密碼（需符合 Terraform 要求）
# 然後執行：
source .env.local
export TF_VAR_db_password="${DB_PASSWORD}"

# 完整自動化部署（包含所有測試）
make deploy-staging    # 部署到 Staging
make deploy-production # 部署到 Production

# CI/CD 整合（無互動）
make ci-deploy ENV=staging
```

##### Terraform 檔案架構

```
terraform/
├── 📄 基礎設施定義
│   ├── main.tf              # Cloud SQL, Cloud Run, IAM
│   ├── post-deploy.tf       # 資料庫初始化
│   └── e2e.tf              # E2E 測試整合
│
├── 🔧 自動化工具
│   ├── Makefile            # 簡化命令介面
│   └── deploy-complete.sh  # 完整部署腳本
│
├── 🧪 測試套件
│   ├── tests_plan.tftest.hcl     # 配置驗證
│   ├── tests_validate.tftest.hcl # 部署驗證
│   └── tests_e2e_integration.tftest.hcl # E2E 整合
│
└── 🔐 環境設定
    └── environments/
        ├── staging.tfvars
        └── production.tfvars
```

#### 部署前檢查清單

- [ ] Terraform state 已初始化
- [ ] 所有資源已導入 Terraform state
- [ ] Secret Manager 已設定所有密碼
- [ ] Cloud SQL 與 Cloud Run 在同一 Region
- [ ] Service Account 權限正確
- [ ] E2E 測試檔案已準備
- [ ] Terraform test 已配置

#### GitHub Actions 整合

```yaml
# .github/workflows/deploy.yml
name: Deploy with Terraform

on:
  push:
    branches:
      - main  # Production
      - staging  # Staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Terraform Init
        run: |
          cd terraform
          terraform init

      - name: Terraform Apply
        run: |
          cd terraform
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            terraform apply -var-file="environments/production.tfvars" -auto-approve
          else
            terraform apply -var-file="environments/staging.tfvars" -auto-approve
          fi
```

#### 🔒 Branch-Based Deployment Strategy（分支部署策略）

##### 核心原則：分支自動對應環境

| Branch | Environment | URL | Auto Deploy | Security Level |
|--------|------------|-----|-------------|----------------|
| `main` | Production | https://ai-square-production-*.run.app | ✅ Yes | 🔴 最高 |
| `staging` | Staging | https://ai-square-staging-*.run.app | ✅ Yes | 🟡 中等 |
| `develop` | Development | Local only | ❌ No | 🟢 低 |
| Feature branches | None | Local only | ❌ No | 🟢 低 |

##### 🚨 安全考量與最佳實踐

###### 1. **Secret Management（密碼管理）**
```yaml
# ✅ 正確做法：使用 GitHub Secrets + Google Secret Manager
環境變數分層：
  GitHub Secrets:
    - GCP_SA_KEY: Service Account JSON（GitHub → GCP 認證）
    - DB_PASSWORD: 資料庫密碼（加密儲存）
    - NEXTAUTH_SECRET: NextAuth 認證密鑰

  Google Secret Manager:
    - ai-square-db-password: 資料庫密碼
    - ai-square-nextauth-secret: NextAuth 密鑰
    - ai-square-database-url: 完整資料庫連接字串

# ❌ 錯誤做法：
  - 在程式碼中硬編碼密碼
  - 在 Dockerfile 中寫入密碼
  - 在 cloudbuild.yaml 中明文密碼
```

###### 2. **Environment Variable Isolation（環境變數隔離）**
```bash
# Production 專屬變數（高安全性）
NEXTAUTH_URL=https://ai-square-production-*.run.app
DATABASE_URL=postgresql://...ai-square-db-production
NODE_ENV=production

# Staging 專屬變數（測試環境）
NEXTAUTH_URL=https://ai-square-staging-*.run.app
DATABASE_URL=postgresql://...ai-square-db-staging-asia
NODE_ENV=staging
```

###### 3. **Branch Protection Rules（分支保護規則）**
```yaml
main branch:
  - Require pull request reviews (2+ approvers)
  - Require status checks to pass
  - Require branches to be up to date
  - Require conversation resolution
  - Include administrators

staging branch:
  - Require pull request reviews (1+ approver)
  - Require status checks to pass
  - Require branches to be up to date
```

##### 自動部署工作流程

###### `.github/workflows/auto-deploy.yml`（簡化版）
```yaml
name: Auto Deploy

on:
  push:
    branches:
      - main        # 自動部署到 Production
      - staging     # 自動部署到 Staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Determine environment
        id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "service=ai-square-production" >> $GITHUB_OUTPUT
          else
            echo "environment=staging" >> $GITHUB_OUTPUT
            echo "service=ai-square-staging" >> $GITHUB_OUTPUT
          fi

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ steps.env.outputs.service }} \
            --region asia-east1 \
            --set-env-vars NODE_ENV=${{ steps.env.outputs.environment }}
```

###### `.github/workflows/deploy-by-branch.yml`（進階版）
```yaml
name: Deploy by Branch

on:
  push:
    branches: [main, staging, develop]
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]

jobs:
  deploy:
    environment: ${{ needs.setup.outputs.environment }}
    steps:
      - name: Set environment-specific variables
        run: |
          # 根據分支設定不同的環境變數
          # 使用 GitHub Secrets 安全管理敏感資訊
```

##### 🔐 安全部署檢查清單

部署前必須確認：
- [ ] **密碼管理**：所有密碼都使用 Secret Manager
- [ ] **環境隔離**：Production 與 Staging 資料庫完全分離
- [ ] **權限最小化**：Service Account 只有必要權限
- [ ] **分支保護**：main 分支已設定保護規則
- [ ] **監控告警**：部署失敗會立即通知
- [ ] **回滾機制**：可快速回滾到上一版本
- [ ] **SSL/TLS**：所有連線都使用 HTTPS
- [ ] **日誌審計**：所有部署操作都有日誌記錄

##### 開發工作流程

###### 1. Feature Development（功能開發）
```bash
# 從 staging 建立功能分支
git checkout staging
git pull origin staging
git checkout -b feature/my-feature

# 本地開發測試
npm run dev
npm run test

# 推送到功能分支（不觸發自動部署）
git push origin feature/my-feature
```

###### 2. Deploy to Staging（部署到測試環境）
```bash
# 合併到 staging 分支
git checkout staging
git merge feature/my-feature
git push origin staging
# → 自動觸發 Staging 部署
```

###### 3. Deploy to Production（部署到生產環境）
```bash
# 測試通過後，從 staging 合併到 main
git checkout main
git pull origin main
git merge staging
git push origin main
# → 自動觸發 Production 部署
```

##### 緊急回滾流程

###### 快速回滾（Cloud Run）
```bash
# 列出最近版本
gcloud run revisions list \
  --service ai-square-production \
  --region asia-east1

# 回滾到前一版本
gcloud run services update-traffic \
  ai-square-production \
  --to-revisions <previous-revision>=100 \
  --region asia-east1
```

###### Git 回滾
```bash
# 回滾 main 分支
git checkout main
git revert HEAD
git push origin main
# → 自動觸發部署回滾版本
```

##### 🚨 常見問題與解決方案

###### 環境變數遺失
**問題**：部署後某些功能失效（如 AI 服務）
**原因**：手動部署容易遺漏環境變數
**解決**：
1. 使用 GitHub Actions 自動部署
2. 環境變數定義在 workflow 檔案中
3. 使用 Secret Manager 集中管理

###### 分支混淆
**問題**：錯誤地將測試代碼部署到生產環境
**解決**：
1. 嚴格的分支保護規則
2. 自動化部署（避免手動操作）
3. 清晰的分支命名規範

###### 密碼洩漏風險
**問題**：密碼出現在日誌或程式碼中
**解決**：
1. 永遠使用 Secret Manager
2. 定期輪換密碼
3. 審計日誌檢查

#### 重要：不再使用臨時腳本
根據「一步到位原則」，請使用 Terraform 和 GitHub Actions 進行部署，不要創建或使用臨時 shell scripts。DB Schema 已整合到 Terraform post-deploy 流程中。


---

### 五、前端部署（Next.js）

#### 🚀 正確的部署方式（遵循一步到位原則）

##### 使用 Terraform + Makefile（唯一推薦方式）
```bash
# 進入 Terraform 目錄
cd terraform

# Staging 部署（包含所有基礎設施和應用程式）
make deploy-staging

# Production 部署
make deploy-production

# 部署驗證
make test ENV=staging
```

##### 使用 GitHub Actions（CI/CD 自動化）
```yaml
# Push to main branch → 自動部署到 Production
# Push to develop branch → 自動部署到 Staging
```

##### 使用 Cloud Build（快速部署）
```bash
# 使用 gcloud 命令直接觸發 Cloud Build
gcloud builds submit --region=asia-east1 \
  --config=cloudbuild.yaml \
  --substitutions=_SERVICE_NAME=ai-square-staging
```

#### ❌ 不再使用的方式
以下方式違反「一步到位原則」，請勿使用：
- ~~臨時 shell scripts（deploy.sh、deploy-staging.sh 等）~~
- ~~手動 Docker build 和 push~~
- ~~分離的資料庫初始化腳本~~

所有部署邏輯都已整合到 Terraform 中，實現真正的一鍵部署。

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

### 九、常見問題（Troubleshooting）

#### 🔴🔴🔴 最重要的規則：Push 後必須監控 GitHub Actions！！！ 🔴🔴🔴

**每次 `git push` 後必須立即執行：**
```bash
# 立即監控部署狀態（這是最重要的！）
gh run list --limit 5

# 持續監控直到完成
gh run watch  # 會自動更新狀態
```

**不監控的後果：**
- ❌ 部署失敗卻不知道
- ❌ 用戶遇到錯誤才發現
- ❌ 浪費大量時間 debug
- ❌ 顯得不專業

#### 🔥 最常見的四個錯誤（90% 的部署問題）

1. **Push 後沒有監控 GitHub Actions（最嚴重！）**
   - 症狀：以為部署成功，但實際失敗
   - 原因：推送後就離開，沒有監控部署狀態
   - 解決：`gh run list --limit 5` 並等待完成

2. **只跑 Terraform 忘記 push commits**
   - 症狀：`relation "scenarios" does not exist`
   - 原因：Terraform 只建立空資料庫，GitHub Actions 才執行 schema migration
   - 解決：`git push origin staging` 並監控 GitHub Actions

3. **忘記設定 DB_PASSWORD**
   - 症狀：Health check 顯示 `DATABASE_URL not configured`
   - 原因：Terraform 需要 db_password 變數但沒設定
   - 解決：`export TF_VAR_db_password="xxx"` 再跑 Terraform

4. **Google Cloud 帳號錯誤**
   - 症狀：權限錯誤或部署到錯誤專案
   - 原因：多專案開發時帳號混亂
   - 解決：`gcloud config configurations activate ai-square`

#### 🚨 重要教訓：正確理解 Terraform vs GitHub Actions 分工

**問題：為什麼部署後資料庫沒有 schema？**

**根本原因：誤解了工具的職責範圍**

這就像買了一台挖土機（Terraform）來蓋房子，卻期待它還能幫你裝潢和搬家具。Terraform 是基礎設施工具，不是應用程式部署工具！

**正確的理解：**
- **Terraform** = 建築公司（蓋房子、接水電）
- **GitHub Actions** = 搬家公司（搬家具、裝潢布置）

| 階段 | 負責工具 | 具體工作 |
|------|---------|----------|
| **基礎建設** | Terraform | 建立 Cloud SQL 實例、Cloud Run 服務、設定權限 |
| **應用部署** | GitHub Actions | 建構 Docker image、執行資料庫遷移、載入初始資料 |

**解決方法：**
```bash
# ❌ 錯誤：只執行 Terraform 就期待一切都好
terraform apply  # 這只是蓋好空房子！

# ✅ 正確：完整的部署流程
# 1. Terraform 建基礎設施（一次就好）
terraform apply -var-file="environments/staging.tfvars"

# 2. GitHub Actions 部署應用（每次更新都要）
git push origin staging  # 這才會搬家具進去！
```

**記住：沒有 push = 沒有部署 = 空的資料庫！**

#### 🚨 資料庫密碼設定問題

**問題：Health check 顯示 "DATABASE_URL not configured"**

**原因：**
1. Terraform 沒有設定 DB_PASSWORD（應該從 Secret Manager 讀取）
2. Health check 只檢查 DATABASE_URL，但應用程式可以使用個別環境變數

**臨時解決：**
```bash
# 手動更新 Cloud Run 環境變數
gcloud run services update ai-square-staging \
  --region asia-east1 \
  --update-env-vars DB_PASSWORD=YourPassword
```

**正確解決：使用 Secret Manager（待實作）**

#### 🚨 測試失敗但想部署

**問題：Pre-push hook 阻止部署**

**解決：**
```bash
# 跳過測試（僅限緊急情況）
git push --no-verify origin staging

# 但記得之後要修復測試！
```

#### 🚨 資料庫連接錯誤

**問題：relation "scenarios" does not exist**

**原因：資料庫 schema 還沒建立（GitHub Actions 沒執行）**

**診斷步驟：**
```bash
# 1. 檢查是否有未 push 的 commits
git status
git log origin/staging..HEAD

# 2. 檢查 Cloud Run 使用的 image 版本
gcloud run services describe ai-square-staging \
  --region=asia-east1 \
  --format="value(spec.template.spec.containers[0].image)"

# 3. 檢查 GitHub Actions 執行狀態
gh run list --branch staging --limit 5
```

#### 🚨 Google Cloud 帳號切換問題

**問題：在多個專案間切換時搞混帳號**

**解決：使用 gcloud configurations**
```bash
# 建立專屬配置
gcloud config configurations create ai-square
gcloud config set account youngtsai@junyiacademy.org
gcloud config set project ai-square-463013

# 切換配置
gcloud config configurations activate ai-square

# 確認當前配置
gcloud config list
```

**注意：Terraform 使用 ADC (Application Default Credentials)**
```bash
# 設定 ADC
gcloud auth application-default login
gcloud auth application-default set-quota-project ai-square-463013
```

#### 🚨 部署流程總結

**正確的部署流程：**
1. **開發** → 在 local 測試
2. **Commit** → 通過所有檢查
3. **Push** → 觸發 GitHub Actions
4. **GitHub Actions** → 建構 image、執行遷移、部署應用
5. **驗證** → 檢查服務健康狀態

**不要做的事：**
- ❌ 只跑 Terraform 就以為部署完成
- ❌ 忘記 push commits
- ❌ 手動執行資料庫遷移
- ❌ 跳過測試（除非緊急）

#### 🚨 2025/01 血淚教訓總結

**問題 1: database 'ai_square_db' does not exist**
- **症狀**: Terraform 執行成功，但應用程式報錯找不到資料庫
- **根本原因**: 只跑了 Terraform（創建空資料庫）但沒有 push commits 觸發 GitHub Actions（執行 schema 遷移）
- **教訓**: 改動程式碼後必須 `git push` 才能觸發完整部署流程

**問題 2: DB_PASSWORD not configured**
- **症狀**: Health check 顯示 DATABASE_URL not configured
- **根本原因**: Terraform 配置中缺少 DB_PASSWORD 環境變數設定
- **臨時修復**: `gcloud run services update ai-square-staging --update-env-vars DB_PASSWORD=xxx`
- **正確做法**: 使用 Secret Manager 管理密碼

**問題 3: 多 Google Cloud 帳號混亂**
- **症狀**: 部署到錯誤的專案或權限錯誤
- **根本原因**: 同時開發多個專案（AI Square, Duotopia）時帳號切換混亂
- **解決方案**: 使用 gcloud configurations 管理多個帳號配置
- **注意事項**: Terraform 使用 ADC，與 gcloud active account 是分開的

**問題 4: 為什麼「一步部署」一直失敗？**
- **錯誤認知**: 以為 Terraform 會處理所有事情
- **實際情況**:
  - Terraform = 基礎設施（Cloud SQL 實例、Cloud Run 服務）
  - GitHub Actions = 應用程式（Docker build、DB migration、初始化資料）
- **正確理解**: 這是分工合作，不是單一工具能完成的

**最重要的提醒**:
```bash
# 完整部署 = Terraform + GitHub Actions
# 如果只跑 Terraform，你只會得到空的基礎設施！
git add -A
git commit -m "fix: deployment configuration"
git push origin staging  # 這一步觸發 GitHub Actions！
```

#### 🚨 部署後驗證檢查清單

**每次部署後必須執行的檢查：**
```bash
# 1. 檢查 Health endpoint
curl -s "https://ai-square-staging-xxxxxxxxx.asia-east1.run.app/api/health" | jq

# 2. 檢查 GitHub Actions 狀態
gh run list --branch staging --limit 5

# 3. 檢查 Cloud Run logs
gcloud run services logs read ai-square-staging --region=asia-east1 --limit=50 | grep -i error

# 4. 檢查資料庫連線
# 如果看到 "relation does not exist"，表示 schema 還沒建立

# 5. 檢查 Docker image 版本
gcloud run services describe ai-square-staging --region=asia-east1 --format="value(spec.template.spec.containers[0].image)"
```

**如果發現問題的診斷步驟：**
1. 確認有沒有未 push 的 commits：`git status`
2. 確認 GitHub Actions 有沒有執行：查看 Actions 頁面
3. 確認 Terraform 和 GitHub Actions 都執行成功
4. 確認環境變數都設定正確（特別是 DB_PASSWORD）

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

#### Step 4: 更新 Terraform 配置

更新 Terraform 環境變數檔案：

1. **terraform/environments/production.tfvars**
```hcl
environment = "production"
region = "asia-east1"
# 其他 Production 專屬設定
```

2. **不再需要手動更新的設定**
Cloud SQL 實例名稱會由 Terraform 自動管理，無需手動設定。

#### Step 5: 初始化資料庫 Schema（已整合到 Terraform）

資料庫 Schema 初始化已完全整合到 Terraform post-deploy 流程中，會自動執行：
1. Prisma 遷移
2. Demo 帳號建立
3. 初始資料 Seed

**不需要手動執行任何 SQL 腳本或 API 呼叫。**

#### Step 6: 執行 Production 部署

```bash
# 使用 Terraform（唯一推薦方式）
cd terraform
make deploy-production

# 或使用 GitHub Actions（CI/CD）
# Push 到 main 分支會自動觸發 Production 部署
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

### 附：推薦的部署資源（遵循一步到位原則）

#### 推薦的部署方式：
- **Terraform 配置**：`terraform/` 目錄包含所有基礎設施定義
- **GitHub Actions Workflow**：自動化 CI/CD 流程
- **Cloud Build**：快速構建與部署

#### Prisma 資源（資料庫管理）：
- **Prisma Schema**：`frontend/prisma/schema.prisma` - 單一真實來源
- **Prisma Migrations**：`frontend/prisma/migrations/` - 版本控制的遷移歷史
- **Prisma Seed**：`frontend/prisma/seed.ts` - Demo 資料初始化

**重要**：所有部署邏輯都已整合到 Terraform 和 GitHub Actions 中，實現真正的一鍵部署。

### 重要提醒

1. **環境隔離**：Production 必須有獨立的資源（DB、Secrets、Service Account）
2. **區域一致**：Cloud SQL 和 Cloud Run 必須在同一區域（asia-east1）
3. **密碼安全**：Production 密碼必須使用強密碼，並存在 Secret Manager
4. **備份策略**：Production DB 必須啟用自動備份
5. **監控告警**：設定關鍵指標監控和錯誤告警
6. **成本控制**：設定預算警報，定期檢視成本報告

---

## 十六、完整部署架構圖 (2025/01 新增)

### 系統架構總覽

```mermaid
graph TB
    subgraph "開發環境"
        Dev[開發者] --> LocalTest[本地測試<br/>localhost:3000]
        LocalTest --> E2ELocal[E2E Tests<br/>Playwright]
    end

    subgraph "CI/CD Pipeline"
        Dev --> GitHub[GitHub Push]
        GitHub --> Actions[GitHub Actions]
        Actions --> TFPlan[Terraform Plan]
        TFPlan --> TFApply[Terraform Apply]
        TFApply --> Deploy[部署]
    end

    subgraph "Google Cloud Platform"
        subgraph "Staging Environment"
            CloudRunStg[Cloud Run<br/>ai-square-staging]
            CloudSQLStg[Cloud SQL<br/>PostgreSQL 15]
            SecretStg[Secret Manager]
            CloudRunStg --> CloudSQLStg
            CloudRunStg --> SecretStg
        end

        subgraph "Production Environment"
            CloudRunProd[Cloud Run<br/>ai-square-frontend]
            CloudSQLProd[Cloud SQL<br/>PostgreSQL 15]
            SecretProd[Secret Manager]
            CloudRunProd --> CloudSQLProd
            CloudRunProd --> SecretProd
        end
    end

    Deploy --> CloudRunStg
    Deploy --> CloudRunProd

    subgraph "測試流程"
        CloudRunStg --> E2EStaging[E2E Tests<br/>對 Staging]
        CloudRunProd --> E2EProd[E2E Tests<br/>對 Production]
        E2EStaging --> TFTest[Terraform Tests]
        E2EProd --> TFTest
    end
```

### 資源關聯架構

```mermaid
graph LR
    subgraph "Terraform Resources"
        ServiceAccount[google_service_account<br/>ai-square-service]

        SQL[google_sql_database_instance<br/>ai-square-db-{env}]
        DB[google_sql_database<br/>ai_square_db]

        CloudRun[google_cloud_run_service<br/>ai-square-{env}]

        Secret[google_secret_manager_secret<br/>db-password-{env}]

        IAM1[google_project_iam_member<br/>cloudsql.client]
        IAM2[google_project_iam_member<br/>secretmanager.secretAccessor]

        Monitor[google_monitoring_uptime_check_config]
        Alert[google_monitoring_alert_policy]
    end

    ServiceAccount --> IAM1
    ServiceAccount --> IAM2
    CloudRun --> ServiceAccount
    CloudRun --> SQL
    CloudRun --> Secret
    SQL --> DB
    CloudRun --> Monitor
    Monitor --> Alert
```

### 測試架構

```mermaid
graph TB
    subgraph "測試類型"
        subgraph "Infrastructure Tests"
            PlanTest[tests_plan.tftest.hcl<br/>配置驗證]
            ValidateTest[tests_validate.tftest.hcl<br/>部署驗證]
        end

        subgraph "Application Tests"
            E2ETest[E2E Tests<br/>Playwright]
            HealthTest[Health Check<br/>API 可用性]
            LoginTest[Login Flow<br/>認證測試]
        end

        subgraph "Integration Tests"
            DBTest[Database Tests<br/>資料完整性]
            APITest[API Tests<br/>端點測試]
        end
    end

    PlanTest --> ValidateTest
    ValidateTest --> E2ETest
    E2ETest --> HealthTest
    E2ETest --> LoginTest
    HealthTest --> DBTest
    LoginTest --> APITest
```

### 安全架構

```mermaid
graph TB
    subgraph "Secret Management"
        EnvVar[TF_VAR_db_password<br/>環境變數]
        SecretMgr[Google Secret Manager]
        CloudRun[Cloud Run Service]

        EnvVar --> Terraform
        Terraform --> SecretMgr
        SecretMgr --> CloudRun
    end

    subgraph "Access Control"
        ServiceAcc[Service Account]
        IAMRoles[IAM Roles]

        ServiceAcc --> IAMRoles
        IAMRoles --> SQLClient[Cloud SQL Client]
        IAMRoles --> SecretAccess[Secret Accessor]
    end
```

### Makefile 命令總覽

```bash
# 部署命令
make deploy-staging       # 完整部署到 Staging
make deploy-production    # 完整部署到 Production
make ci-deploy           # CI/CD 無互動部署

# 測試命令
make test               # 執行 Terraform 測試
make e2e                # 執行 E2E 測試

# 維護命令
make status             # 查看部署狀態
make logs               # 查看 Cloud Run 日誌
make destroy-staging    # 銷毀 Staging 環境
make destroy-production # 銷毀 Production 環境

# 輔助命令
make init               # 初始化 Terraform
make plan               # 預覽變更
make apply              # 套用變更
make clean              # 清理檔案
```

### 關鍵特性

1. **完全自動化**：一個命令完成所有部署步驟
2. **零人工介入**：除了初始密碼設定，無需任何輸入
3. **完整測試覆蓋**：基礎設施 + E2E + 整合測試
4. **安全管理**：Secret Manager 管理所有敏感資訊
5. **多環境支援**：Staging 和 Production 獨立部署
6. **錯誤恢復**：自動重試和錯誤處理機制
7. **部署報告**：自動生成包含測試結果的報告
8. **安全檢查**：自動執行安全審計，防止洩露敏感資訊

---

## 十七、🔒 安全審計與 CI/CD 整合 (2025/01 新增)

### CI/CD 自動化實際實施狀態

#### ✅ 已完全實施並運作的自動化：

1. **基礎 CI Pipeline** (`/.github/workflows/ci.yml`)
   - ✅ TypeScript 編譯檢查
   - ✅ ESLint 程式碼品質檢查
   - ✅ Jest 單元測試執行
   - ✅ 測試覆蓋率報告 (Codecov)
   - ✅ npm audit 安全掃描
   - ✅ TruffleHog 敏感資訊掃描
   - ✅ Conventional commits 檢查

2. **Terraform 自動化** (`/.github/workflows/terraform.yml`)
   - ✅ Terraform plan 自動執行
   - ✅ Terraform apply (staging 自動, production 需要審核)
   - ✅ Security check 腳本執行
   - ✅ 多環境支援 (workspace)
   - ✅ 健康檢查驗證

3. **部署自動化** (`/.github/workflows/deploy.yml`)
   - ✅ Docker image 建置和推送
   - ✅ Cloud Run 部署
   - ✅ 環境變數配置
   - ✅ Slack 通知

#### ⚠️ 已配置但未完全自動化：

1. **容器安全掃描**
   - 配置位置：`deploy-complete.yml` (Trivy)
   - 實際狀態：未整合到主要部署流程
   - 需要手動觸發或使用 `deploy-complete.yml` workflow

2. **藍綠部署**
   - 配置位置：`terraform/blue-green-deployment.tf`
   - 實際狀態：Terraform 模組已建立但未在 CI/CD 中使用
   - 需要手動執行流量切換腳本

3. **E2E 測試自動執行**
   - 配置位置：`terraform/e2e.tf`, `terraform/Makefile`
   - 實際狀態：在主要 deploy workflow 中被註解掉
   - 需要手動執行 `make e2e`

4. **監控告警**
   - 配置位置：`terraform/monitoring.tf`
   - 實際狀態：Terraform 已定義但需要確認 Slack webhook 和實際觸發

#### ❌ 尚未實施：

1. **自動回滾機制**
   - 有配置在 `deploy-complete.yml` 但不是主要部署路徑
   - 需要手動使用 Terraform 回滾

2. **自動晉升 (Auto-promotion)**
   - 無自動從 staging 到 production 的機制
   - 所有 production 部署需要手動觸發

3. **效能測試**
   - 只有基本的建置時間檢查
   - 無實際的負載測試或效能基準測試

### 部署前安全檢查流程

```mermaid
graph LR
    A[開始部署] --> B[安全檢查]
    B --> C{檢查結果}
    C -->|通過| D[執行部署]
    C -->|失敗| E[阻止部署]
    E --> F[生成安全報告]
    F --> G[通知開發者]

    B --> B1[掃描硬編碼密碼]
    B --> B2[檢查環境變數]
    B --> B3[驗證 Secret Manager]
    B --> B4[檢查檔案權限]
```

### 自動化安全檢查

#### Pre-deployment Security Checklist

```bash
# 部署前必須通過的安全檢查
make security-check    # 執行完整安全審計
```

安全檢查項目：

1. **硬編碼密碼檢查** (✅ 已實施)
   - 掃描所有檔案中的密碼模式
   - 檢查 .env 檔案是否在版本控制中
   - 驗證敏感資訊是否使用環境變數

2. **Secret Manager 驗證** (⚠️ 部分實施)
   - 確認所有必要的 secrets 已建立
   - 驗證服務帳號權限
   - 檢查 secret 版本和輪替策略

3. **配置檔案審計** (✅ 已實施)
   - 檢查 `.env.production.yaml` 無硬編碼密碼
   - 驗證 Terraform 變數使用環境變數
   - 確認 GitHub Actions secrets 設定

### 安全檢查腳本

```bash
#!/bin/bash
# security-check.sh - CI/CD 安全檢查腳本

set -e

echo "🔒 執行安全審計..."

# 1. 檢查硬編碼密碼
echo "檢查硬編碼密碼..."
HARDCODED=$(grep -r "password\|secret\|key" --include="*.yaml" --include="*.yml" --include="*.env" . 2>/dev/null | grep -v "^\*" | grep -v "example" | grep -v "template" || true)

if [ ! -z "$HARDCODED" ]; then
    echo "❌ 發現可能的硬編碼密碼："
    echo "$HARDCODED"
    exit 1
fi

# 2. 檢查 .env 檔案
echo "檢查環境檔案..."
if git ls-files | grep -E "\.env$|\.env\.production$|\.env\.staging$" | grep -v "\.example"; then
    echo "❌ 發現 .env 檔案在版本控制中"
    exit 1
fi

# 3. 驗證 Secret Manager
echo "驗證 Secret Manager..."
REQUIRED_SECRETS=(
    "db-password-${ENVIRONMENT}"
    "nextauth-secret-${ENVIRONMENT}"
    "jwt-secret-${ENVIRONMENT}"
)

for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! gcloud secrets describe "$secret" &>/dev/null; then
        echo "❌ Secret 不存在: $secret"
        exit 1
    fi
done

# 4. 檢查 Terraform 配置
echo "檢查 Terraform 配置..."
if grep -r "password.*=.*\"" terraform/ --include="*.tf" | grep -v "var\." | grep -v "data\."; then
    echo "❌ Terraform 檔案中發現硬編碼密碼"
    exit 1
fi

echo "✅ 安全檢查通過"
```

### CI/CD Pipeline 整合

#### GitHub Actions 安全檢查

```yaml
# .github/workflows/security-check.yml
name: Security Audit

on:
  push:
    branches: [main, staging, production]
  pull_request:
    branches: [main]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Security Check
        run: |
          chmod +x ./scripts/security-check.sh
          ./scripts/security-check.sh

      - name: Scan for Secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./

      - name: Check Dependencies
        run: |
          npm audit --audit-level=moderate

      - name: SAST Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: '.'
```

### 安全最佳實踐

#### 1. 密碼管理

```bash
# 使用 Secret Manager 或環境變數
DB_PASSWORD: "${DB_PASSWORD}"  # 從 Secret Manager 讀取
```

#### 2. 環境變數配置

```yaml
# .env.example (可以提交到 Git)
DB_HOST=/cloudsql/PROJECT:REGION:INSTANCE
DB_NAME=ai_square_db
DB_USER=postgres
DB_PASSWORD=your-secure-password-here  # 範例值

# .env.production (不要提交到 Git)
# 實際密碼應該從 Secret Manager 讀取
```

#### 3. Secret Rotation 策略

```bash
# 定期輪替密碼（每季度）
gcloud scheduler jobs create http rotate-secrets \
  --schedule="0 0 1 */3 *" \
  --uri="https://YOUR-FUNCTION-URL/rotate-secrets" \
  --http-method=POST
```

### 安全監控與告警

```yaml
# monitoring-rules.yaml
alertPolicy:
  displayName: "Suspicious Access Alert"
  conditions:
    - displayName: "High rate of 401 errors"
      conditionThreshold:
        filter: 'resource.type="cloud_run_revision"
                 AND metric.type="run.googleapis.com/request_count"
                 AND metric.label.response_code="401"'
        comparison: COMPARISON_GT
        thresholdValue: 10
        duration: 60s
```

### Makefile 安全命令

```makefile
# 安全相關命令
security-check: ## 執行完整安全審計
	@echo "🔒 執行安全審計..."
	@./scripts/security-check.sh
	@echo "🔍 掃描敏感資訊..."
	@trufflehog filesystem . --no-verification
	@echo "📊 檢查相依套件..."
	@cd frontend && npm audit
	@echo "✅ 安全檢查完成"

rotate-secrets: ## 輪替所有 secrets
	@echo "🔄 輪替 secrets..."
	@./scripts/rotate-secrets.sh

security-report: ## 生成安全報告
	@echo "📋 生成安全報告..."
	@./scripts/generate-security-report.sh > security-report-$(date +%Y%m%d).md
```

### 安全檢查清單

部署前必須確認：

- [ ] 無硬編碼密碼在程式碼中
- [ ] 所有 .env 檔案已加入 .gitignore
- [ ] Secret Manager 已設定所有必要 secrets
- [ ] 服務帳號權限遵循最小權限原則
- [ ] HTTPS 已啟用且強制使用
- [ ] 資料庫備份已啟用
- [ ] 監控告警已設定
- [ ] 安全審計日誌已啟用
- [ ] Rate limiting 已配置
- [ ] CORS 設定正確

### 事件回應計畫

發現安全問題時：

1. **立即行動**
   - 撤銷洩露的憑證
   - 輪替所有相關密碼
   - 檢查存取日誌

2. **調查範圍**
   - 確認影響時間範圍
   - 識別受影響的系統
   - 評估資料外洩風險

3. **修復與預防**
   - 修正安全漏洞
   - 更新安全檢查腳本
   - 加強監控機制

## 十八、CI/CD 自動化完善計畫

### 🎯 需要完成的自動化項目

#### 1. 容器安全掃描整合
```yaml
# 將 Trivy 掃描加入主要部署流程
# 在 .github/workflows/deploy.yml 的 security job 中加入：
- name: Run Trivy container scan
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'gcr.io/${{ env.PROJECT_ID }}/ai-square-${{ matrix.environment }}:${{ github.sha }}'
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'  # 發現嚴重漏洞時失敗
```

#### 2. E2E 測試自動執行
```yaml
# 取消註解並啟用 E2E 測試
# 在 deploy-staging job 的步驟中：
- name: Run E2E tests
  working-directory: frontend
  run: |
    npm ci
    npx playwright install --with-deps
    PLAYWRIGHT_BASE_URL=${{ steps.deploy.outputs.url }} npm run test:e2e
  continue-on-error: false  # E2E 失敗應該阻止部署
```

#### 3. 藍綠部署實施
```bash
# 在 Terraform 中啟用藍綠部署
# main.tf 中使用 blue_green_deployment module
module "deployment" {
  source = "./modules/blue-green"
  active_color = var.deployment_color
  # ... 其他配置
}

# GitHub Actions 中加入流量切換
- name: Switch traffic to new version
  run: |
    cd terraform
    make canary-deploy PERCENT=10
    sleep 300  # 監控 5 分鐘
    make canary-deploy PERCENT=50
    sleep 300
    make canary-deploy PERCENT=100
```

#### 4. 自動回滾機制
```yaml
# 在部署後加入健康檢查和自動回滾
- name: Health check with auto-rollback
  run: |
    RETRY_COUNT=0
    MAX_RETRIES=5
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
      if curl -f ${{ steps.deploy.outputs.url }}/api/health; then
        echo "Health check passed"
        break
      fi
      RETRY_COUNT=$((RETRY_COUNT+1))
      sleep 30
    done

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
      echo "Health check failed, rolling back"
      gcloud run services update-traffic $SERVICE_NAME \
        --to-revisions=${{ steps.deploy.outputs.previous_revision }}=100
      exit 1
    fi
```

#### 5. 效能測試整合
```yaml
# 加入 Lighthouse CI 或類似工具
- name: Run performance tests
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: |
      ${{ steps.deploy.outputs.url }}
      ${{ steps.deploy.outputs.url }}/pbl/scenarios
      ${{ steps.deploy.outputs.url }}/discovery/scenarios
    budgetPath: ./performance-budget.json
    uploadArtifacts: true
```

#### 6. 自動晉升機制
```yaml
# 建立獨立的 workflow 用於自動晉升
name: Auto-promote to Production
on:
  workflow_run:
    workflows: ["Deploy to Staging"]
    types: [completed]

jobs:
  promote:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - name: Wait for stability period
        run: sleep 3600  # 1 小時穩定期

      - name: Check staging metrics
        run: |
          # 檢查錯誤率、延遲等指標
          ERROR_RATE=$(gcloud monitoring read ...)
          if [ $ERROR_RATE -gt 1 ]; then
            echo "Error rate too high, cancelling promotion"
            exit 1
          fi

      - name: Promote to production
        run: |
          gh workflow run deploy.yml -f environment=production
```

### 🚀 實施優先順序

1. **第一階段** (高優先級，低風險)
   - ✅ 容器安全掃描整合
   - ✅ E2E 測試自動執行
   - ✅ 監控告警確認

2. **第二階段** (中優先級，中風險)
   - 自動回滾機制
   - 效能測試整合

3. **第三階段** (低優先級，高複雜度)
   - 藍綠部署完整實施
   - 自動晉升機制

### 📋 實施檢查清單

- [ ] 更新 `.github/workflows/deploy.yml` 加入容器掃描
- [ ] 取消註解 E2E 測試步驟
- [ ] 建立 `performance-budget.json` 效能預算
- [ ] 測試自動回滾腳本
- [ ] 建立 `auto-promote.yml` workflow
- [ ] 更新 Terraform 使用藍綠部署模組
- [ ] 設定所有必要的 GitHub secrets
- [ ] 更新文件反映新的 CI/CD 流程

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



## 十二、完整重建步驟 (Staging/Production)

### 🔄 Staging 環境完整重建

當需要完全重建 Staging 環境時（例如：schema 版本不一致、資料庫損壞），執行以下步驟：

#### 1. 刪除舊的 Cloud SQL 實例（如果存在）
```bash
# 列出現有實例
gcloud sql instances list --project=ai-square-463013

# 刪除舊實例（如果存在）
gcloud sql instances delete ai-square-db-staging-asia \
  --project=ai-square-463013
```

#### 2. 建立新的 Cloud SQL 實例
```bash
gcloud sql instances create ai-square-db-staging-asia \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-east1 \
  --project=ai-square-463013

# 設定密碼
gcloud sql users set-password postgres \
  --instance=ai-square-db-staging-asia \
  --password=staging123! \
  --project=ai-square-463013

# 建立資料庫
gcloud sql databases create ai_square_staging \
  --instance=ai-square-db-staging-asia \
  --project=ai-square-463013
```

#### 3. 初始化 Schema 和 Seed Data
```bash
# 使用 Makefile 命令
make staging-db-init

# 或手動執行
gcloud sql connect ai-square-db-staging-asia \
  --user=postgres \
  --database=ai_square_staging

# 在 psql 中執行
\i src/lib/repositories/postgresql/schema-v4.sql
\i src/lib/repositories/postgresql/seeds/01-demo-accounts.sql
```

#### 4. 重新部署 Cloud Run
```bash
# 使用 Makefile（推薦）
make deploy-staging

# 或手動部署
gcloud run deploy ai-square-staging \
  --image gcr.io/ai-square-463013/ai-square-frontend:latest \
  --region asia-east1 \
  --add-cloudsql-instances=ai-square-463013:asia-east1:ai-square-db-staging-asia \
  --allow-unauthenticated
```

#### 5. 驗證部署
```bash
# 健康檢查
curl https://ai-square-staging-731209836128.asia-east1.run.app/api/health

# 測試登入
curl -X POST https://ai-square-staging-731209836128.asia-east1.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com", "password": "student123"}'
```

### 🚀 Production 環境完整重建

**⚠️ 警告：Production 重建會影響真實用戶，請謹慎操作！**

#### 1. 備份現有資料（重要！）
```bash
# 導出現有資料
gcloud sql export sql ai-square-db-production \
  gs://ai-square-backups/production-backup-$(date +%Y%m%d-%H%M%S).sql \
  --database=ai_square_production \
  --project=ai-square-463013
```

#### 2. 刪除並重建 Cloud SQL（可選）
```bash
# 如果需要完全重建
gcloud sql instances delete ai-square-db-production \
  --project=ai-square-463013

# 建立新實例
gcloud sql instances create ai-square-db-production \
  --database-version=POSTGRES_15 \
  --tier=db-n1-standard-1 \
  --region=asia-east1 \
  --backup \
  --backup-start-time=03:00 \
  --project=ai-square-463013

# 設定強密碼
gcloud sql users set-password postgres \
  --instance=ai-square-db-production \
  --password=YOUR_STRONG_PASSWORD \
  --project=ai-square-463013
```

#### 3. 初始化 Production Schema
```bash
# 使用 Makefile
make production-db-init

# 或透過 API（如果已部署）
curl -X POST https://ai-square-frontend-731209836128.asia-east1.run.app/api/admin/init-schema \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json"
```

#### 4. 重新部署 Production Cloud Run
```bash
# 使用 Makefile（推薦）
make deploy-production

# 會執行以下步驟：
# 1. Cloud Build 建置 image
# 2. 部署到 Cloud Run
# 3. 設定環境變數和 secrets
```

#### 5. 初始化 Demo 帳號和 Scenarios
```bash
# Demo 帳號
curl -X POST https://ai-square-frontend-731209836128.asia-east1.run.app/api/admin/fix-demo-accounts \
  -H "Content-Type: application/json"

# Scenarios
make production-scenarios-init
```

#### 6. 驗證和監控
```bash
# 健康檢查
make production-health

# 查看日誌
make production-logs

# 設定監控
make production-monitoring
```

### 🛠️ 快速重建命令彙總

```bash
# Local 環境
npm run db:reset              # 完全重建本地資料庫

# Staging 環境
make deploy-staging-full      # 完整重建 Staging（含 DB）

# Production 環境
make deploy-production-full   # 完整重建 Production（需確認）
```

### ⚠️ 重建前檢查清單

- [ ] 確認是否需要備份現有資料
- [ ] 確認 Schema 版本（v3 vs v4）
- [ ] 確認環境變數設定正確
- [ ] 確認 Service Account 權限
- [ ] 確認 Secrets 已設定
- [ ] 準備好回滾計畫

## 十三、🔥 初始化 Scenarios via API (關鍵步驟！)

**🚨 這是部署後最重要的步驟，經常被遺忘！**

### 部署流程正確順序
1. **Database Seed**: 創建 demo 帳號（自動執行）
2. **API 初始化**: 創建 scenarios（必須手動執行）

### 初始化 Scenarios（必須執行）

#### 自動化方式（使用 Terraform）
```bash
# Terraform 會自動在 post-deploy 階段執行初始化
cd terraform
make deploy-staging    # 包含自動初始化
make deploy-production # 包含自動初始化
```

#### 手動方式（如果 Terraform 初始化失敗）
```bash
# 設定環境 URL
# Staging
BASE_URL="https://ai-square-staging-731209836128.asia-east1.run.app"

# Production
BASE_URL="https://ai-square-frontend-731209836128.asia-east1.run.app"

# 初始化所有 scenarios（必須執行！）
curl -X POST "$BASE_URL/api/admin/init-pbl"
curl -X POST "$BASE_URL/api/admin/init-discovery"
curl -X POST "$BASE_URL/api/admin/init-assessment"
```

預期結果：
- PBL: 9 scenarios
- Discovery: 12 scenarios (4 arts, 4 technology, 2 business, 2 science)
- Assessment: 1+ scenarios

**為什麼這很重要？**
- Database seed 只創建 demo 帳號，不創建 scenarios
- Scenarios 必須透過 API 從 YAML 檔案初始化
- 忘記這步驟會導致應用程式看起來是空的

### 常見初始化問題與解決

1. **密碼認證失敗**
   - 確保密碼不包含特殊字符（如 `#`、`@`、`%`）
   - 使用標準密碼：`postgres`

2. **PostgreSQL 陣列格式錯誤**
   - 確保 prerequisites 欄位正確處理為陣列
   - 檢查 YAML 解析邏輯

3. **Scenario ID null constraint**
   - 確保使用 `gen_random_uuid()` 生成 UUID
   - 檢查 INSERT 語句包含 id 欄位

## 十四、初始化 Demo 帳號

### 🌱 Database Seed 機制（推薦方式）

從 2025/01 開始，專案使用自動化 seed 機制來管理 demo 帳號。

#### Seed 檔案結構
```
src/lib/repositories/postgresql/
├── schema-v4.sql                    # 主要 schema
└── seeds/
    ├── 01-demo-accounts.sql         # Demo 帳號定義
    └── seed-runner.ts               # TypeScript seed 執行器
```

#### Local 環境自動 Seed

使用 Docker Compose 時會自動執行 seed：

```bash
# 完全重建資料庫（包含自動 seed）
npm run db:reset

# 分別執行
npm run db:drop    # 清除舊資料庫
npm run db:init    # 啟動新資料庫（自動執行 schema + seed）

# 手動執行 seed（如果需要）
npm run seed
```

Docker Compose 會自動掛載並執行：
1. `schema-v4.sql` - 建立資料表結構
2. `01-demo-accounts.sql` - 建立 demo 帳號

#### Demo 帳號列表（Prisma Seed）

| Email | 密碼 | 角色 | 說明 |
|-------|------|------|------|
| student@example.com | student123 | student | 學生帳號 |
| teacher@example.com | teacher123 | teacher | 教師帳號 |
| admin@example.com | admin123 | admin | 管理員帳號 |

**注意**：使用 Prisma 後，demo 帳號由 `prisma/seed.ts` 管理，統一為三個核心帳號。

#### Cloud SQL 初始化（Staging/Production）

對於 Cloud SQL，需要手動執行 seed：

```bash
# 1. 連線到 Cloud SQL
gcloud sql connect INSTANCE_NAME --user=postgres --database=ai_square_db

# 2. 執行 schema（如果還沒有）
\i schema-v4.sql

# 3. 執行 seed
\i seeds/01-demo-accounts.sql

# 4. 驗證
SELECT email, role FROM users WHERE email LIKE '%@example.com';
```

或使用 API 端點（如果有實作）：

```bash
curl -X POST "https://YOUR-SERVICE-URL/api/admin/seed-demo-accounts" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY"
```

### Production Demo 帳號設定（舊方式，僅供參考）

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

### Demo 帳號資訊（Prisma Seed）

從 2025/08 開始，使用 Prisma seed 管理 demo 帳號：

| Email | Password | Role | 用途 |
|-------|----------|------|------|
| student@example.com | student123 | student | 學生功能測試 |
| teacher@example.com | teacher123 | teacher | 教師功能測試 |
| admin@example.com | admin123 | admin | 管理員功能測試 |

#### Prisma Seed 執行方式

```bash
# 本地開發（自動執行）
npm run db:reset  # 包含 schema + seed

# Staging/Production（透過 API）
curl -X POST "$URL/api/admin/migrate"
```

#### Prisma 與 GCP 整合重點

1. **環境變數設定**
   ```bash
   DATABASE_URL="postgresql://postgres:password@localhost/ai_square_db?host=/cloudsql/PROJECT:REGION:INSTANCE"
   ```

2. **Cloud Run 部署**
   - Dockerfile 必須包含 `npx prisma generate`
   - 部署時複製 `prisma/` 目錄到生產映像
   - 確保 DATABASE_URL 環境變數正確設定

3. **初始化流程**
   - Cloud SQL 實例建立後，資料庫是空的
   - 透過 `/api/admin/migrate` API 初始化 schema 和 demo 帳號
   - 再透過 `/api/admin/init-*` APIs 初始化 scenarios

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

---

## 十九、🗄️ 資料庫配置標準

### 🚨 絕對不能再出現的問題：DB_NAME 不一致

**標準配置**：
```bash
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=ai_square_db  # 統一使用這個！
DB_USER=postgres
DB_PASSWORD=postgres
```

**檢查清單**：
- [ ] `.env.local` 使用正確的 DB_NAME
- [ ] `repository-factory.ts` 預設值正確
- [ ] `docker-compose.postgres.yml` 配置正確
- [ ] 所有測試腳本使用統一配置

**如果遇到 "Scenario not found" 錯誤**：
1. 立即檢查 `DB_NAME` 配置
2. 重啟 Next.js 開發伺服器
3. 確認資料庫連線

**禁止使用的舊名稱**：
- ❌ `ai_square_dev`
- ❌ `ai-square-development`
- ❌ `aisquare2025local` (密碼)

## 二十、🛡️ 環境區分保護策略 - 開發快速、生產安全 (2025/08 新增)

### 🏗️ 新架構：Terraform + GitHub Actions 分離

**2025/08/21 重大更新**: 全面重構部署架構，解決循環依賴問題。

#### 核心改變

1. **基礎設施與應用分離**
   - **Terraform**: 只管理基礎設施（Cloud SQL, Cloud Run, IAM）
   - **GitHub Actions**: 處理應用部署（Docker build, schema init, data loading）

2. **消除 `always_run = "${timestamp()}"` 反模式**
   - 所有操作都是冪等的
   - 可以安全地重複執行
   - 狀態管理正確

3. **清晰的部署流程**
   ```bash
   # 1. 基礎設施（手動觸發）
   make terraform-deploy-staging

   # 2. 應用程式（自動觸發）
   git push origin staging  # 觸發 GitHub Actions
   ```

#### 新文件結構

```
terraform/
├── main.tf               # 純基礎設施配置
├── post-deploy.tf        # 基礎設施健康檢查
├── blue-green-deployment.tf  # 藍綠部署配置
└── e2e.tf               # E2E 測試配置

.github/workflows/
├── deploy-staging.yml     # Staging 部署流程
└── deploy-production.yml  # Production 部署流程（多重保護）
```

#### 優勢

1. **避免循環依賴**: Terraform 不再依賴應用程式 API
2. **提升可靠性**: 每個步驟都是獨立的、可測試的
3. **更好的錯誤處理**: 失敗時可以定位到具體步驟
4. **環境隔離**: Staging 和 Production 有不同的保護級別

詳細文檔請參考：`docs/deployment/terraform-github-actions-architecture.md`

### 🎯 核心原則：開發要快，生產要穩

**開發環境（Staging）**: 保持靈活性，隨時可重建
**生產環境（Production）**: 多重保護，防止誤操作

### 📊 環境差異對照表

| 功能 | Staging | Production | 說明 |
|------|---------|------------|------|
| 資料庫重建 | ✅ 允許 | ❌ 預設禁止 | Production 需要特殊確認 |
| 自動初始化 | ✅ 每次部署 | ⚠️ 僅首次 | 避免覆蓋現有資料 |
| Demo 帳號重置 | ✅ 自動 | ❌ 手動 | 保護用戶密碼 |
| Scenario 強制更新 | ✅ force: true | ❌ force: false | 保護用戶進度 |
| 備份要求 | ❌ 可選 | ✅ 強制 | 資料安全優先 |
| 刪除保護 | ❌ 無 | ✅ 啟用 | deletion_protection = true |

### 🔧 Terraform 環境區分實作

#### 1. 資料庫初始化保護

```hcl
# post-deploy.tf 修改建議

# 資料庫 Schema 初始化
resource "null_resource" "init_database_schema" {
  # Staging: 每次部署都執行
  count = var.environment == "staging" ? 1 : 0

  triggers = {
    always_run = "${timestamp()}"
  }

  # ... 現有初始化邏輯
}

# Production 保護層
resource "null_resource" "production_init_protection" {
  count = var.environment == "production" ? 1 : 0

  provisioner "local-exec" {
    command = <<-EOT
      echo "========================================="
      echo "⚠️  PRODUCTION ENVIRONMENT DETECTED!"
      echo "========================================="
      echo "Database initialization is DISABLED by default."
      echo ""
      echo "To initialize production database:"
      echo "1. First time setup: Set TF_VAR_force_production_init=true"
      echo "2. Use Prisma migrations for schema changes"
      echo "3. Use API endpoints for data updates"
      echo "========================================="

      # 檢查是否強制初始化
      if [ "${var.force_production_init}" = "true" ]; then
        echo "🚨 FORCE INITIALIZATION REQUESTED"
        echo "This will initialize the production database."
        echo "Sleeping 10 seconds... Press Ctrl+C to cancel"
        sleep 10
        # 執行初始化
        ${path.module}/scripts/init-production-db.sh
      fi
    EOT
  }
}
```

#### 2. Demo 帳號管理差異

```hcl
# Demo 帳號 Seeding
resource "null_resource" "seed_demo_accounts" {
  depends_on = [null_resource.init_database_schema]

  triggers = {
    # Staging: 每次都更新密碼
    # Production: 只在 demo_passwords 變更時更新
    run_trigger = var.environment == "staging" ?
      "${timestamp()}" :
      "${md5(jsonencode(var.demo_passwords))}"
  }

  provisioner "local-exec" {
    command = <<-EOT
      if [ "${var.environment}" = "production" ]; then
        echo "⚠️  Production: Using DO NOTHING for existing accounts"
        CONFLICT_ACTION="DO NOTHING"
      else
        echo "✅ Staging: Will update passwords on conflict"
        CONFLICT_ACTION="DO UPDATE SET password_hash = EXCLUDED.password_hash"
      fi

      # 執行 SQL with appropriate conflict action
      # ...
    EOT
  }
}
```

#### 3. Scenario 初始化策略

```hcl
# Scenario 初始化
resource "null_resource" "init_scenarios" {
  depends_on = [null_resource.init_database_schema]

  triggers = {
    # Staging: 總是執行
    # Production: 只在檔案變更時執行
    run_trigger = var.environment == "staging" ?
      "${timestamp()}" :
      "${filemd5("${path.module}/scenarios-checksum.txt")}"
  }

  provisioner "local-exec" {
    command = <<-EOT
      SERVICE_URL="${google_cloud_run_service.ai_square.status[0].url}"

      # 設定 force 參數
      if [ "${var.environment}" = "production" ]; then
        FORCE_UPDATE="false"
        echo "🛡️ Production: Scenarios will not be force updated"
      else
        FORCE_UPDATE="true"
        echo "🚀 Staging: Scenarios will be force updated"
      fi

      # 初始化 scenarios
      for endpoint in init-assessment init-pbl init-discovery; do
        curl -s -X POST "$${SERVICE_URL}/api/admin/$${endpoint}" \
          -H "Content-Type: application/json" \
          -d "{\"force\": $${FORCE_UPDATE}}"
      done
    EOT
  }
}
```

### 🛡️ 多重保護機制

#### 1. 變數控制

```hcl
# variables.tf
variable "force_production_init" {
  description = "Force initialization of production database (危險操作)"
  type        = bool
  default     = false
}

variable "allow_production_destroy" {
  description = "Allow destruction of production resources (極度危險)"
  type        = bool
  default     = false
}
```

#### 2. 生命週期保護

```hcl
# Cloud SQL 實例保護
resource "google_sql_database_instance" "main" {
  # ... 其他配置

  deletion_protection = var.environment == "production"

  lifecycle {
    prevent_destroy = var.environment == "production"
  }
}
```

#### 3. 執行前確認

```bash
# Makefile 中加入確認步驟
deploy-production:
	@echo "🚨 WARNING: You are about to deploy to PRODUCTION!"
	@echo "This action will:"
	@echo "  - Deploy new code to production"
	@echo "  - NOT reset database"
	@echo "  - NOT change existing user passwords"
	@echo ""
	@echo "Type 'deploy-production' to confirm: "
	@read confirm && [ "$$confirm" = "deploy-production" ] || exit 1
	terraform apply -var-file="environments/production.tfvars"
```

### 🔄 建議的工作流程

#### Staging 快速迭代流程

```bash
# 1. 快速重建一切
make deploy-staging

# 2. 會自動執行：
#    - 重建 schema
#    - 重置 demo 密碼
#    - 強制更新 scenarios
#    - 清除快取

# 3. 立即可測試最新版本
```

#### Production 安全部署流程

```bash
# 1. 先在 staging 測試
make deploy-staging
make test-staging

# 2. 確認無誤後部署 production
make deploy-production

# 3. Production 會：
#    - 保留現有資料
#    - 不改變用戶密碼
#    - 只更新必要的 scenarios
#    - 自動備份

# 4. 如需初始化（首次部署）
TF_VAR_force_production_init=true make deploy-production
```

### 📋 實施檢查清單

- [ ] 修改 `post-deploy.tf` 加入環境判斷
- [ ] 更新 `variables.tf` 加入保護變數
- [ ] 修改 API 端點支援 `force` 參數
- [ ] 更新 Makefile 加入確認步驟
- [ ] 測試 staging 仍可快速重建
- [ ] 測試 production 保護機制有效
- [ ] 更新團隊文件說明差異

### 🚨 緊急情況處理

如果真的需要重置 Production：

```bash
# 1. 備份現有資料（強制）
make production-backup

# 2. 設定強制初始化變數
export TF_VAR_force_production_init=true
export TF_VAR_allow_production_destroy=true

# 3. 執行重建（需要多次確認）
make deploy-production-force

# 4. 立即移除危險變數
unset TF_VAR_force_production_init
unset TF_VAR_allow_production_destroy
```

### 💡 最佳實踐總結

1. **Staging = 實驗場**：隨時可以打掉重練
2. **Production = 堡壘**：多重防護，謹慎操作
3. **使用 Prisma Migrate**：Production schema 變更的正確方式
4. **API 優於 SQL**：通過應用層邏輯管理資料
5. **備份優先**：任何 Production 操作前先備份
6. **團隊溝通**：Production 變更需要通知團隊

### 🔮 未來改進方向

1. **藍綠部署**：進一步降低 Production 風險
2. **自動備份驗證**：確保備份可還原
3. **變更審核流程**：Production 變更需要審核
4. **災難演練**：定期測試恢復流程
