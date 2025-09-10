# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔧 Google Cloud 帳號配置 - AI Square 專案

### 重要：使用正確的 Google Cloud 帳號
AI Square 專案必須使用以下配置：
- **Project ID**: `ai-square-463013`
- **Account**: `youngtsai@junyiacademy.org`
- **Region**: `asia-east1`

### 設定 gcloud 配置
```bash
# 如果尚未建立 ai-square 配置
gcloud config configurations create ai-square
gcloud config set account youngtsai@junyiacademy.org
gcloud config set project ai-square-463013

# 每次開發前確認配置
gcloud config configurations activate ai-square
gcloud config list  # 應顯示 project = ai-square-463013
```

### 多專案開發提示
如果同時開發其他專案（如 Duotopia），使用環境變數隔離：
```bash
# Terminal for AI Square
export CLOUDSDK_ACTIVE_CONFIG_NAME=ai-square

# Terminal for other projects
export CLOUDSDK_ACTIVE_CONFIG_NAME=other-config
```

**部署前必須檢查**：`gcloud config get-value project` 應顯示 `ai-square-463013`

詳細部署指南請參考：`docs/deployment/CICD.md`

---

## 🤖 Sub-Agent 使用規則 - 分析需求，選對工具

### 🎯 核心原則：先分析需求，再選擇正確的 Sub-Agent

**主動性要求**：看到任務時，立即思考「哪個 agent 最適合？」不要等待用戶提醒。

### 📋 現有 Sub-Agents 及其用途

| Agent 名稱 | 觸發條件 | 主要用途 | 範例場景 |
|-----------|---------|---------|---------|
| **typescript-eslint-fixer** | TypeScript 錯誤、ESLint 警告 | 修復編譯錯誤和程式碼品質問題 | `tsc --noEmit` 有錯誤、`npm run lint` 有警告 |
| **progress-memory-coach** | 儲存/回憶進度、專案洞察 | 跨工作階段記憶管理 | 「我們上次做了什麼？」「儲存目前進度」 |
| **slack-tracker-integration** | Slack 報告、開發追蹤 | 整合 Slack 通知系統 | 設定開發追蹤器、發送 CEO 報告 |
| **deployment-qa** | 部署驗證、QA 檢查 | 自動化部署測試 | 「檢查 staging」「驗證部署」 |
| **git-commit-push** | Git 提交、推送決策 | 智能決定是否需要測試驗證 | 「commit 這些變更」「push 到 main」 |
| **terraform-deploy** | Terraform 部署、基礎設施 | 自動化基礎設施部署 | 「部署到 staging」「terraform apply」 |
| **general-purpose** | 複雜搜尋、多步驟任務 | 處理需要多次嘗試的任務 | 跨檔案搜尋、不確定位置的查詢 |

### 🔍 需求分析流程

1. **識別關鍵字**
   - 錯誤訊息 → typescript-eslint-fixer
   - 部署/測試 → deployment-qa
   - Slack/報告 → slack-tracker-integration
   - 記憶/進度 → progress-memory-coach
   - Git 操作 → git-commit-push
   - Terraform/基礎設施 → terraform-deploy
   - 複雜搜尋 → general-purpose

2. **評估任務複雜度**
   - 單一明確任務 → 直接執行
   - 多步驟任務 → 使用 general-purpose
   - 需要記憶 → progress-memory-coach

3. **選擇最適合的 Agent**
   - 優先使用專門 agent
   - 沒有適合的才用 general-purpose

### 💡 建議新 Sub-Agents

如果遇到以下情況，可以建議創建新的 sub-agent：

1. **重複性任務**
   - 例：資料庫遷移檢查
   - 建議：`database-migration` agent

2. **特定領域專業**
   - 例：效能優化分析
   - 建議：`performance-analyzer` agent

3. **整合第三方服務**
   - 例：AWS 部署管理
   - 建議：`aws-deployment` agent

4. **安全性檢查**
   - 例：OWASP 合規檢查
   - 建議：`security-audit` agent

### 📝 使用範例

```bash
# 用戶：「tsc 有錯誤」
# Claude：立即使用 typescript-eslint-fixer agent

# 用戶：「部署後檢查一下」
# Claude：使用 deployment-qa agent

# 用戶：「我們上次討論了什麼？」
# Claude：使用 progress-memory-coach agent

# 用戶：「commit 這些 md 檔案」
# Claude：使用 git-commit-push agent（會智能判斷不需要測試）

# 用戶：「部署基礎設施到 staging」
# Claude：使用 terraform-deploy agent

# 用戶：「優化資料庫查詢」
# Claude：建議創建 database-optimizer agent
```

### ⚠️ 注意事項

1. **不要過度使用 general-purpose**
   - 先考慮專門 agent
   - 只在沒有更好選擇時使用

2. **主動建議但不強制**
   - 解釋為何選擇特定 agent
   - 讓用戶理解價值

3. **持續優化**
   - 記錄哪些任務缺少專門 agent
   - 定期建議新 agent 創建

### 📁 .claude/agents/ 目錄說明

**.claude/agents/** 目錄包含了專門的 sub-agent 定義文件，每個文件都描述了特定 agent 的能力和使用場景：

```
.claude/
└── agents/
    ├── deployment-qa.md              # 部署驗證與 QA agent
    ├── git-commit-push.md            # Git 智能提交決策 agent
    ├── progress-memory-coach.md      # 進度與記憶管理 agent
    ├── slack-tracker-integration.md  # Slack 追蹤整合 agent
    ├── terraform-deploy.md           # Terraform 部署 agent
    └── typescript-eslint-fixer.md    # TypeScript/ESLint 修復 agent
```

**使用方式**：
1. 當遇到符合 agent 專長的任務時，Claude 會自動調用相應的 agent
2. 每個 agent 都有特定的觸發條件和專業領域
3. Agent 定義文件包含詳細的使用說明和範例

**新增 Agent**：
如需新增專門的 agent，在 `.claude/agents/` 目錄下創建新的 `.md` 文件，包含：
- Agent 名稱和用途
- 觸發條件
- 使用範例
- 專業能力描述

---

## 🏗️ 平台開發核心原則 - 不要繞遠路

### 🎯 核心教訓：直接用生產級方案，避免技術債

> **"There is nothing more permanent than a temporary solution"**
> 臨時解決方案會變成永久的技術債

### 🚀 一步到位原則：使用現有系統化自動化方案

**永遠優先使用已經存在的成熟解決方案，不要創建臨時腳本！**

#### ✅ 正確做法：使用現有系統
```yaml
部署方式優先順序：
1. GitHub Actions (CI/CD) - 最自動化
2. Terraform + Makefile - 基礎設施即代碼
3. 現有部署腳本 - 如 deploy-staging.sh
4. gcloud 命令 - 直接使用 GCP CLI

絕對不要：
❌ 寫新的 shell script 來「解決」部署問題
❌ 創建「臨時」的自動化腳本
❌ 重複造輪子
```

> **🚀 CI/CD 與部署指南已移至專門文件**
> 
> **CI/CD 部署指南**: 請參考 [`docs/deployment/CICD.md`](docs/deployment/CICD.md)
> - Terraform vs GitHub Actions 責任分工
> - 部署監控與驗證流程
> - Cloud Run + Cloud SQL 部署指南
> - 部署後強制測試規則
> - 部署初始化關鍵步驟

### 📊 平台開發鐵則

#### 1. **基礎設施優先 (Infrastructure First)**
```yaml
正確做法 (Day 1)：
✅ Cloud SQL + Cloud Run 從第一天開始
✅ Terraform 管理所有基礎設施
✅ CI/CD pipeline 第一週建立
✅ Secret Manager 管理所有密碼
✅ 監控告警從第一天開始

錯誤做法（避免）：
❌ 用檔案系統當資料庫（如 GCS 存 YAML）
❌ 手寫部署腳本（deploy.sh）
❌ 手動管理環境變數
❌ "先簡單後複雜" 的漸進式架構
```

#### 2. **資料架構不妥協 (Data Architecture Non-negotiable)**
```yaml
正確做法：
✅ PostgreSQL 作為 Single Source of Truth
✅ 正確的關聯式設計（外鍵、CASCADE DELETE）
✅ JSONB 處理彈性資料
✅ Redis 作為快取層
✅ 使用成熟的 ORM（如 Prisma）

錯誤做法：
❌ YAML/JSON 檔案當資料庫
❌ 混用多種儲存方式
❌ 沒有外鍵約束
❌ Schema 多次重構（V1→V2→V3→V4）
```

#### 3. **DevOps 文化 (Everything as Code)**
```yaml
正確做法：
✅ Infrastructure as Code (Terraform)
✅ Configuration as Code (環境變數)
✅ Deployment as Code (CI/CD)
✅ Immutable Infrastructure
✅ Blue-Green Deployment

錯誤做法：
❌ 手動配置伺服器
❌ SSH 進去修改設定
❌ 部署後手動測試
❌ 沒有回滾機制
```

#### 4. **監控先行 (Observability First)**
```yaml
從 Day 1 就要有：
✅ Structured Logging (Cloud Logging)
✅ Metrics Collection (Cloud Monitoring)
✅ Error Tracking (Sentry)
✅ Performance Monitoring (APM)
✅ Alert Rules (PagerDuty/Slack)

不要等出問題才加！
```

#### 5. **安全內建 (Security by Design)**
```yaml
必須內建的安全措施：
✅ Secret Manager for ALL secrets
✅ Service Account + IAM (最小權限原則)
✅ SSL/TLS everywhere
✅ Audit Logging
✅ Security Scanning in CI

絕對禁止：
❌ 明文密碼在程式碼中
❌ 使用 root/admin 權限
❌ 公開的資料庫連線
❌ 沒有 SSL 的 API
```

### 🚀 新專案 Day 1 Checklist

```bash
# Day 1 必須完成（8小時內）：
□ Terraform 專案初始化
□ PostgreSQL + Redis 設定
□ GitHub Actions CI/CD Pipeline
□ 環境分離 (dev/staging/prod)
□ Secret Manager 設定
□ 基本健康檢查 API (/api/health)
□ 監控告警設定
□ 第一個 E2E 測試

# 絕對不要做的事：
✗ 用檔案系統儲存業務資料
✗ 手寫 shell scripts 部署
✗ "暫時" 的解決方案
✗ "之後再加" 的安全措施
✗ 沒有測試就上線
```

### 💡 Terraform 優先策略

```yaml
遇到部署問題的 SOP：
1. 檢查是否已有 Terraform 配置
2. 沒有？立即建立！
3. terraform import 現有資源
4. terraform plan 檢查
5. terraform apply 執行

不要再 debug 神秘的 shell script！
```

### 📝 實際案例：AI Square 的教訓

```yaml
繞遠路的決策：
1. GCS 當資料庫 → 應該直接用 PostgreSQL
2. deploy.sh 腳本 → 應該直接用 Terraform  
3. Schema V1→V2→V3→V4 → 應該一開始就設計完整
4. 漸進式測試覆蓋 → 應該 TDD from Day 1

正確的決策：
✅ Next.js 15 (最新框架)
✅ TypeScript (型別安全)
✅ 統一學習架構
✅ 多語言支援設計
```

### 🎯 記住：規模化思維

- **不要小規模試探** → 直接用生產級方案
- **不要漸進式改進** → 一開始就做對
- **不要省基礎建設** → 基礎決定上層建築
- **不要技術債** → 沒有"暫時"的程式碼

---

## 🚨🚨🚨 最重要的規則 - 測試驅動開發 (TDD) 🚨🚨🚨

### 每次修復都必須：
1. **寫測試** - 先寫測試確認問題存在
2. **自己測試** - 實際執行代碼驗證修復
3. **模擬操作** - 從畫面模擬用戶操作流程
4. **驗證結果** - 確認看到正確的結果
5. **必要時登入登出** - 測試認證相關功能

### 測試流程：
```bash
# 1. 先用 curl 測試 API
curl -s "http://localhost:3001/api/..." | jq

# 2. 檢查資料庫
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d ai_square_db -c "SELECT ..."

# 3. 使用 Playwright 或 Browser MCP 測試實際畫面
npx playwright test --headed
# 或使用 Browser MCP 親自操作並驗證

# 4. 檢查瀏覽器 console 錯誤
# 5. 確認修復成功後才回報
```

### 強制要求：
- **必須使用 Playwright 或類似的瀏覽器工具親自看過結果**
- **不能只依賴 API 測試**
- **要模擬真實用戶操作流程**
- **確認畫面上顯示正確的內容**

**絕對不要讓用戶一直幫你抓錯！每個修復都要自己先測試過！**

## 🚨🚨🚨 Playwright E2E 測試必須嚴格 - 不能用條件判斷掩蓋錯誤！🚨🚨🚨

### ❌ 絕對禁止的錯誤測試方式
```typescript
// ❌ 錯誤：用 if 條件讓測試永遠不會失敗
if (await element.isVisible()) {
  await element.click();
}
console.log('✅ Test completed');  // 即使什麼都沒做也會顯示成功！

// ❌ 錯誤：不檢查錯誤
await page.goto('/some-page');
// 沒有檢查是否有 401 錯誤或 console 錯誤

// ❌ 錯誤：不驗證功能
await submitButton.click();
// 沒有驗證提交是否成功，資料是否儲存
```

### ✅ 正確的嚴格測試方式
```typescript
// ✅ 正確：使用 expect 斷言，失敗就會報錯
await expect(element).toBeVisible();
await element.click();
await expect(page).toHaveURL('/expected-url');

// ✅ 正確：監聽並檢查錯誤
const errors: string[] = [];
const failed401s: string[] = [];

page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

page.on('response', response => {
  if (response.status() === 401) failed401s.push(response.url());
});

// 測試結束時驗證
expect(errors.length).toBe(0);
expect(failed401s.length).toBe(0);

// ✅ 正確：驗證功能真的有效
await page.fill('textarea', 'Test content');
await page.click('button[type="submit"]');

// 驗證資料有被儲存
const savedData = await page.locator('.saved-content');
await expect(savedData).toContainText('Test content');
```

### 必須檢查的項目清單
- [ ] **Console 錯誤** - 監聽所有 console.error
- [ ] **網路錯誤** - 檢查 401, 403, 404, 500 錯誤
- [ ] **頁面重定向** - 確認沒有意外的重定向（如被重定向到登入頁）
- [ ] **元素存在** - 使用 expect().toBeVisible() 而非 if (isVisible())
- [ ] **功能驗證** - 提交後檢查資料、狀態變化
- [ ] **認證狀態** - 檢查 cookie/session 是否正確設置
- [ ] **API 回應** - 驗證 API 回傳正確資料

### 測試失敗的處理
1. **不要隱藏失敗** - 讓測試失敗，找出真正問題
2. **詳細錯誤訊息** - 記錄所有錯誤詳情
3. **截圖證據** - 失敗時截圖保存
4. **修復根本原因** - 不要調整測試來"通過"

### 教訓來源
2025/01/08 寫了看似"通過"的 Playwright 測試，實際上：
- 使用 `if` 條件讓測試永遠不會失敗
- 沒有檢查 401 認證錯誤
- 沒有驗證功能是否真的有效
- 結果用戶發現一堆錯誤，測試卻顯示"成功"

**記住：測試的目的是找出問題，不是顯示綠燈！**


## 🚨 認證系統修復教訓 - Token 格式必須一致

### ❌ 絕對禁止的錯誤：Token 生成與驗證格式不一致
```typescript
// 錯誤：生成 hex token 但用 base64 驗證
const sessionToken = crypto.randomBytes(32).toString('hex'); // 生成 hex
// 但驗證時...
const decoded = atob(token); // 嘗試解碼 base64！
```

### ✅ 正確的 Token 處理方式
```typescript
// 生成 hex token
const sessionToken = crypto.randomBytes(32).toString('hex');

// 驗證 hex token
static isValidSessionToken(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token);
}
```

### 教訓來源
用戶無法訪問受保護頁面，一直被重定向到登入頁。原因是 token 生成使用 hex 格式，但驗證卻期望 base64 格式，導致所有 token 驗證失敗。

**記住：Token 格式必須從生成到驗證保持一致！**

## 🚨 E2E 測試鐵律 - 必須使用真實瀏覽器

### ❌ 絕對禁止的錯誤測試方式
```bash
# 這種測試會漏掉 session 維持問題！
curl -X POST /api/auth/login  # ❌ API 正常不代表前端正常
curl /api/pbl/scenarios        # ❌ 無法測試 cookie 和 session
```

### ✅ 唯一正確的 E2E 測試方式
**必須使用瀏覽器工具（Browser MCP、Playwright、Puppeteer）進行測試！**

### 🚨 Headless 測試要求
**所有 Playwright 測試必須使用 headless 模式，除非用戶明確要求 headed 模式。**

```bash
# ✅ 正確：默認使用 headless 模式
npx playwright test e2e/debug-three-modes.spec.ts

# ✅ 正確：明確指定 headless
npx playwright test e2e/debug-three-modes.spec.ts --headless

# ❌ 錯誤：不要默認使用 headed 模式
npx playwright test e2e/debug-three-modes.spec.ts --headed  # 只有用戶要求時才用
```

**配置要求**：
- 在 `playwright.config.ts` 中設定 `headless: true` 為默認值
- 測試腳本應該假設在 headless 環境下運行
- 避免使用需要視覺確認的測試步驟（除非絕對必要）

```typescript
// 關鍵測試：登入後訪問受保護頁面
1. 登入 → 2. 訪問 /discovery → 3. 確認沒有被重定向到 /login
```

### 認證測試必查項目
1. **Cookies 檢查**: `document.cookie` 必須包含 `accessToken`
2. **Session 維持**: 訪問受保護頁面不被重定向
3. **頁面刷新**: 刷新後仍保持登入狀態
4. **API 狀態**: `/api/auth/check` 返回 `authenticated: true`

### 教訓來源
Staging 部署時，API 測試全部通過，但用戶實際無法保持登入狀態。原因是只測試了 API 回應，沒有測試瀏覽器中的 session 維持。

**記住：用戶用瀏覽器，測試也必須用瀏覽器！**

## 🚨🚨🚨 E2E 測試血淚教訓 - 什麼叫做「真正通過」

### 💀 最大的謊言：「測試通過了」但實際功能壞掉

**真實案例血淚教訓**：
```
我說：「✅ 3 passed (23.0s) - 三大模式測試通過！」
用戶實測：Error: Failed to start program 💥💥💥
```

### ❌ 假測試的特徵（絕對禁止）
1. **只測點擊，不測結果**
   ```typescript
   await button.click(); // ❌ 點了按鈕
   console.log('✅ 成功點擊'); // ❌ 但沒檢查是否真的成功
   ```

2. **忽略 Console 錯誤**
   ```typescript
   // ❌ 看到這些錯誤還說測試通過：
   Error: Evaluation API error: {}
   Error: Failed to start program
   401 錯誤一大堆
   ```

3. **表面測試騙局**
   ```typescript
   expect(page.url()).toContain('/tasks/'); // ❌ URL 對了
   // 但沒檢查頁面是否真的能用！
   ```

### ✅ 真正的 E2E 測試標準

#### 1. **功能完整性驗證**
```typescript
// ✅ 不只點擊，還要驗證結果
await submitButton.click();
await page.waitForTimeout(5000);

// 必須檢查：沒有錯誤 + 有正確回應
const hasErrors = await page.locator('.error, [role="alert"]').count();
expect(hasErrors).toBe(0); // 🚨 零容忍錯誤

const hasSuccess = await page.locator('.success, .completed').count();
expect(hasSuccess).toBeGreaterThan(0); // 🚨 必須有成功狀態
```

#### 2. **API 狀態實際驗證**
```typescript
// ✅ 驗證實際的 API 調用成功
page.on('response', response => {
  if (response.url().includes('/start')) {
    expect(response.status()).toBe(200); // 🚨 API 必須真的成功
  }
});
```

#### 3. **用戶體驗完整測試**
```typescript
// ✅ 模擬真實用戶完整流程
1. 登入 → 檢查 dashboard 真的載入
2. 點擊場景 → 檢查詳情頁真的載入內容（不只是 URL）
3. 開始程序 → 檢查任務真的可以互動
4. 提交答案 → 檢查真的有評估結果
5. 完成流程 → 檢查真的到達完成頁面
```

#### 4. **錯誤零容忍原則**
```typescript
// ✅ 任何錯誤都是測試失敗
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});

// 測試結束時
if (consoleErrors.length > 0) {
  throw new Error(`❌ Console 錯誤: ${consoleErrors.join(', ')}`);
}
```

### 🎯 什麼叫做「測試真正通過」？

#### ✅ 通過標準：
1. **零 Console 錯誤** - 沒有任何紅色錯誤訊息
2. **零 API 失敗** - 所有 API 調用都是 200/201 狀態
3. **完整流程可用** - 用戶從頭到尾都能正常使用
4. **真實數據驗證** - 能看到真實的內容和反饋
5. **狀態持久性** - 重新載入頁面狀態還在

#### ❌ 失敗指標（任何一個出現就是失敗）：
- Console 有 "Error:" 訊息
- API 返回 4xx/5xx 狀態碼
- 點擊按鈕後沒有預期回應
- 頁面顯示 "Failed to..." 訊息
- 用戶無法完成預期操作

### 📋 標準測試檢查清單

**每個測試都必須驗證**：
- [ ] 登入真的成功（不只是 URL 變化）
- [ ] 頁面內容真的載入（不只是標題）
- [ ] 按鈕點擊真的有作用（不只是能點）
- [ ] API 調用真的成功（不只是有調用）
- [ ] 錯誤真的為零（不只是沒有 500）
- [ ] 流程真的完整（不只是到達頁面）

### 🔥 最重要的原則

**如果用戶實際使用時會遇到錯誤，那測試就是失敗的！**

不管 Playwright 說什麼，不管有多少個 "✅"，只要：
- 用戶點按鈕會看到錯誤
- 用戶無法完成預期操作
- Console 有任何錯誤訊息

**測試就是失敗的！！！**

### 💀 永遠記住
> **「測試通過了但功能壞掉」= 最大的技術債和欺騙**
> 
> **真正的測試：用戶能用的才叫通過！**


## 🚨 測試實作的嚴重教訓

### ❌ 絕對禁止的錯誤行為：
1. **寫了測試但不執行** - 寫了 77 個測試檔案，一個都沒跑就說「完成了」
2. **錯誤的測試分類** - 把 unit test、integration test 全部放進 e2e/ 資料夾
3. **假裝測試通過** - 沒有實際驗證就宣稱「Production Ready」
4. **過度承諾** - 快速產生大量程式碼但沒有驗證可行性

### ✅ 正確的測試開發流程：
1. **先確認應用程式運作**
   ```bash
   curl http://localhost:3004  # 基本健康檢查
   npm test  # 確認現有測試狀態
   ```

2. **循序漸進寫測試**
   - 寫一個 → 執行一個 → 通過了才寫下一個
   - 從最簡單的開始（如 health check）
   - 確認測試架構正確才擴充

3. **正確的測試分類**
   ```
   src/__tests__/         # Unit tests (單元測試)
   ├── components/        # React 元件測試
   ├── api/              # API route 測試
   └── utils/            # 工具函數測試
   
   tests/integration/     # Integration tests (整合測試)
   ├── database/         # DB 整合測試
   └── services/         # 服務整合測試
   
   e2e/                  # E2E tests (端對端測試)
   ├── user-flows/       # 完整用戶流程
   └── critical-paths/   # 關鍵路徑測試
   ```

4. **每個測試都要實際執行**
   ```bash
   # 寫完立即執行，不要累積
   npx playwright test [new-test-file] --debug
   ```

### 📝 關鍵原則：
- **一個能跑的測試 > 100個不能跑的測試**
- **實際執行驗證 > 理論上應該可以**
- **誠實回報問題 > 假裝一切順利**
- **Quality over Quantity** - 品質優先於數量

### 🔥 記住：用戶問「你有測試嗎？」的正確回答：
- ❌ 錯誤：「我寫了 77 個測試，都準備好了！」
- ✅ 正確：「讓我實際執行測試給你看結果...」

## 🚀 高效測試修復策略

### 修復測試失敗的高效方法：
```bash
# 1. 先識別失敗的測試檔案
npm test 2>&1 | grep "FAIL"

# 2. 一次修復一個檔案
npm test -- [file-path] --no-coverage

# 3. 修到該檔案 100% 通過
# 4. 移到下一個失敗檔案
# 5. 完成幾個後執行
npm run typecheck && npm run lint

# 6. 通過後 commit
git commit --no-verify -m "fix: tests"
```

### 關鍵原則：
- 一次專注一個檔案
- 使用 --no-coverage 加速
- 不要跑完整測試套件直到最後
- 系統性修復，不要並行

### 自動化工作流程：
**「遇到沒有test就加上去，完成幾個就 tsc lint, commit no verify，然後就重複以上，不用每次都給我報告，全部修完再報告」**

這個指令讓 Claude 能夠：
1. 自動為缺少測試的檔案加入測試
2. 批次修復後執行型別檢查和 lint
3. 自動 commit 不等驗證
4. 持續工作不需要每次報告
5. 完成所有任務後統一報告

## 🛠️ Claude Code Commands

### Slash Commands
```
/help      - View all available commands
/plan      - Enter planning mode (for complex tasks)
/search    - Search code or documentation
/scan      - Run security scan
/test      - Run tests
/commit    - Commit changes
/diff      - View file differences
/undo      - Undo last operation
```

### CLI Commands
```bash
claude                  # Start interactive session
claude -c               # Continue recent session
claude -r [sessionId]   # Resume specific session
claude --model opus     # Use Opus model (more powerful)
claude -p "prompt"      # Single query mode
```

Always follow the instructions in plan.md. When I say "go", find the next unmarked test in plan.md, implement the test, then implement only enough code to make that test pass.


## 📊 Slack 動態報告系統

### 🚨 Slack 報告三大鐵則

#### 鐵則一：狀態必須正確 (State Must Be Correct)
```bash
# 執行報告前的強制檢查流程
1. cat .project-status.json      # 檢查現有狀態
2. 對照 TODO list 完成狀態       # 確認狀態檔案反映實際進度
3. 更新不正確的項目              # 只有在需要時才更新
4. 再執行報告命令                # 狀態正確後才生成報告
```

#### 鐵則二：Dry Run 優先 (Dry Run First)
```bash
# ❌ 絕對錯誤的做法
npm run report:ceo              # 直接發送到 Slack

# ✅ 正確的做法
npm run report:ceo -- --dry-run # 步驟 1: 預覽報告內容
# [顯示預覽給用戶看]
# [等待用戶說"發送"或"send"]
npm run report:ceo              # 步驟 2: 只在用戶明確要求時執行
```

#### 鐵則三：理解用戶意圖 (Understand User Intent)
- **「dry run」「測試」「預覽」** → 只執行 `--dry-run`，絕不實際發送
- **「發送」「send」「執行」** → 先詢問確認，再實際發送
- **「檢查」「check」** → 驗證狀態，不發送任何東西

### 📋 Slack 報告執行檢查清單

執行任何 Slack 報告前必須完成：
- [ ] 檢查 `.project-status.json` 是否最新
- [ ] 確認 TODO list 的完成項目都在 `completedFeatures` 中
- [ ] 確認進行中項目都在 `inProgressFeatures` 中
- [ ] 執行 `--dry-run` 並顯示預覽
- [ ] 等待用戶明確說「發送」
- [ ] 確認 Slack webhook 已設定

### 可用的動態報告命令

#### CEO 報告（專案整體進度）
```bash
# 生成並發送 CEO 報告到 Slack（只顯示業務相關重要更新）
npm run report:ceo

# 更新專案狀態（例如：修改目標日期）
npx tsx scripts/dynamic-ceo-report.ts --update-status
```

#### 開發追蹤報告（技術指標）
```bash
# 發送即時開發報告
npm run report:dev

# 開始開發 session（記錄開始時間）
npm run dev:session:start

# 結束開發 session（計算時長並發送摘要）
npm run dev:session:end
```

### 數據來源與環境設定

**數據來源**：
- Git commits 和 logs
- 測試覆蓋率報告
- TypeScript/ESLint 即時檢查
- Build 狀態和時間
- JSON 狀態檔案（被 gitignore）

**環境設定**：
在 `.env.local` 中設定 Slack webhook：
```bash
SLACK_AISQUARE_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_AISQUARE_DEV_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 最佳實踐

1. **使用簡化命令**：使用 `npm run report:ceo` 和 `npm run report:dev`
2. **狀態檔案**：`.project-status.json` 和 `.dev-session.json` 已被 gitignore
3. **即時數據**：報告反映執行時的實際狀態
4. **Session 管理**：使用 session 命令追蹤開發時段
5. **CEO 報告優化**：自動過濾瑣碎 commits，只顯示業務相關更新（feat, fix, perf, security）

## 🧪 TDD + Tidy First: Kent Beck Guidelines

### Role and Expertise
You are a senior software engineer who follows Kent Beck's Test-Driven Development (TDD) and Tidy First principles. Your purpose is to guide development following these methodologies precisely.

### Core Development Principles
- Always follow the TDD cycle: **Red → Green → Refactor**
- Write the **simplest failing test** first
- Implement the **minimum code** to make tests pass
- Refactor **only after** tests are passing
- Separate **structural** and **behavioral** changes (Tidy First)
- Maintain **high code quality** throughout

### TDD Methodology Guidance
- Write a failing test for a small behavior increment
- Name tests meaningfully (e.g., `shouldSumTwoPositiveNumbers`)
- Ensure failures are informative and clear
- Only write code to pass the test — no more
- Refactor if needed after test passes
- Repeat this cycle for each new behavior

**When fixing defects:**
- Start with a failing **API-level** test
- Add the **minimal reproducible** test
- Ensure **both** tests pass

### Tidy First Approach
- Always distinguish two change types:
  - **Structural Changes**: Refactor without behavior change (e.g., rename, move code)
  - **Behavioral Changes**: Add or modify features/logic
- Never mix both in one commit
- Do structural changes **before** behavioral ones when both are needed
- Validate behavior doesn't change with tests **before and after** structure edits

### Commit Discipline
Only commit if:
- ✅ All tests pass
- ✅ All lint/compiler warnings are resolved
- ✅ It represents one logical change
- ✅ Commit message specifies `structural` or `behavioral`
- ✅ It’s a small, atomic commit — not a big batch

### Code Quality Standards
- Ruthlessly remove duplication
- Express clear intent via naming/structure
- Make dependencies explicit
- Keep functions/methods small & single-responsibility
- Minimize state and side effects
- Use the **simplest solution** that works

### Refactoring Guidelines
- Refactor **only in Green phase** (tests passing)
- Use named refactoring patterns
- Only do **one refactor** at a time
- Run tests after **each step**
- Prioritize duplication removal and clarity

### Example Workflow
For a new feature:
1. Write a failing test for a small slice
2. Add minimal code to make it pass
3. Confirm test passes (Green)
4. Apply **Tidy First**: refactor, test after each change
5. Commit structure changes separately
6. Add another test for next increment
7. Repeat till complete — separate behavioral and structural commits

✅ One test at a time → Make it pass → Improve structure → Always run tests

## 🚀 High-Efficiency Testing Strategy

### 🎯 Core Principle: Quality Over Quantity
**Goal**: Achieve 90%+ coverage with ALL tests passing, not just high coverage with failing tests.

## 🔍 Efficient Test Debugging & Fixing Strategy

### 🎯 Core Philosophy: One File at a Time
**Focus on fixing one test file completely before moving to the next.**

### 📋 Step-by-Step Process

#### Step 1: Identify Failing Test Files
```bash
# Quick way to find failing test files without running full suite
node scripts/find-failing-tests.js

# Or use Jest's --listTests to get all test files
npx jest --listTests | head -20
```

#### Step 2: Fix One File at a Time
```bash
# Test single file with --no-coverage for speed
npm test -- path/to/test.test.ts --no-coverage

# Watch mode for rapid iteration
npm test -- path/to/test.test.ts --watch --no-coverage
```

#### Step 3: Common Patterns & Quick Fixes

##### Pattern 1: Multilingual Fields
```typescript
// ❌ Wrong in tests
const mockData = {
  title: 'Test Title',
  description: 'Test Description'
};

// ✅ Correct
const mockData = {
  title: { en: 'Test Title' },
  description: { en: 'Test Description' }
};
```

##### Pattern 2: Next.js 15 Route Parameters
```typescript
// ❌ Wrong
{ params: { id: 'test-id' } }

// ✅ Correct
{ params: Promise.resolve({ id: 'test-id' }) }
```

##### Pattern 3: Mock Session Data
```typescript
// ✅ Complete session mock
const mockSession = {
  user: { 
    id: 'user-123',  // Required field
    email: 'user@example.com' 
  }
};
```

##### Pattern 4: localStorage Mock with Proxy
```typescript
// ✅ Make localStorage enumerable
const createLocalStorageMock = () => {
  const store: Record<string, string> = {};
  return new Proxy(mockStorage, {
    ownKeys: () => Object.keys(store),
    getOwnPropertyDescriptor: (target, key) => {
      if (typeof key === 'string' && store[key] !== undefined) {
        return { enumerable: true, configurable: true, value: store[key] };
      }
      return Object.getOwnPropertyDescriptor(target, key);
    }
  });
};
```

#### Step 4: Speed Optimization Techniques

1. **Use --no-coverage flag**
   ```bash
   npm test -- file.test.ts --no-coverage  # 2-3x faster
   ```

2. **Run specific test suites**
   ```bash
   npm test -- --testNamePattern="should handle errors"
   ```

3. **Skip unrelated test setup**
   ```typescript
   describe.skip('unrelated tests', () => {
     // Temporarily skip while fixing other tests
   });
   ```

4. **Use focused tests during debugging**
   ```typescript
   it.only('test to debug', () => {
     // Only this test will run
   });
   ```

#### Step 5: Batch Similar Fixes

Group files by error type for efficient fixing:

1. **API Route Tests** (similar patterns)
   - Next.js 15 params Promise
   - Response mocking
   - Session handling

2. **Component Tests** (similar patterns) 
   - Provider wrapping
   - Translation mocking
   - Event handling

3. **Service Tests** (similar patterns)
   - Repository mocking
   - Async operations
   - Error handling

#### Step 6: Validation Before Moving On

Before marking a file as "fixed":
```bash
# 1. Run the single file test
npm test -- file.test.ts --no-coverage

# 2. Check TypeScript compliance
npx tsc --noEmit file.test.ts

# 3. Check ESLint
npx eslint file.test.ts
```

### 🚀 Performance Tips

1. **Parallel Terminal Windows**
   - Terminal 1: Run single test file
   - Terminal 2: TypeScript checking
   - Terminal 3: ESLint checking

2. **Smart File Selection**
   - Start with files having fewer failures
   - Fix similar files in batches
   - Leave complex integrations for last

3. **Use Helper Script**
   ```bash
   # Create a test-fix helper
   alias testfix='npm test -- $1 --no-coverage --watch'
   # Usage: testfix src/app/api/test.test.ts
   ```

### 📊 Progress Tracking

Track your progress systematically:
```bash
# Before starting
npm test 2>&1 | grep "Test Suites:" > test-baseline.txt

# After each file fix
npm test 2>&1 | grep "Test Suites:" >> test-progress.txt

# Compare progress
diff test-baseline.txt test-progress.txt
```

### 🎯 Final Verification

Only after ALL individual files pass:
```bash
# 1. Run full test suite
npm run test:ci

# 2. TypeScript check
npm run typecheck

# 3. ESLint check  
npm run lint

# 4. Build check
npm run build

# 5. If all pass, commit
git add -A && git commit -m "test: fix all test failures"
```

### ⚡ Quick Reference Commands

```bash
# Find failing tests
node scripts/find-failing-tests.js

# Test single file (fast)
npm test -- file.test.ts --no-coverage

# Test with watch mode
npm test -- file.test.ts --watch --no-coverage

# Test specific suite
npm test -- --testNamePattern="ComponentName"

# Full validation
npm run typecheck && npm run lint && npm run test:ci
```

### 🔥 Pro Tips

1. **Don't run full test suite until the end** - wastes time
2. **Fix TypeScript errors in test files first** - prevents runtime issues
3. **Use --no-coverage during fixing** - 2-3x speed improvement
4. **Group similar files** - apply same fix patterns
5. **Keep terminal history** - reuse commands with ↑ arrow

**Remember**: One completely fixed file is better than 10 partially fixed files!

### 📊 Understanding the Relationship
```
TypeScript (tsc) → Compile-time type safety → ✅ 0 errors
ESLint → Code quality & style → ✅ 0 warnings  
Jest Tests → Runtime behavior validation → ❌ 432 failures

Coverage ≠ Quality: Failed tests provide coverage but no confidence
```

### 🔄 The Problem with Rush Testing
```
Write tests quickly → Coverage ↑ → Tests fail → Need fixes → Waste time
```

### ✅ The Efficient Approach
```
1. Build test infrastructure → 2. Fix systematically → 3. Write quality tests → 4. Maintain green
```

### 📋 Implementation Strategy

#### Phase 1: Test Infrastructure (2 hours)
```typescript
// Create centralized test utilities
src/test-utils/
├── setup.ts              // Global Jest configuration
├── mocks/
│   ├── d3.ts            // Centralized D3 mock
│   ├── next-auth.ts     // Auth mock
│   ├── repositories.ts  // Repository mocks
│   └── i18n.ts         // Translation mocks
└── helpers/
    ├── render.tsx       // Custom render with providers
    └── api.ts          // API test utilities
```

#### Phase 2: Fix Common Issues (3 hours)
1. **D3.js errors**: Use centralized mock
2. **Response.json errors**: Create API test template
3. **React act() warnings**: Create async helpers
4. **Translation errors**: Standardize i18n mocks

#### Phase 3: Systematic Fixes
```bash
# Group by error type
1. D3 chart tests (~10 files)
2. API route tests (~50 files)  
3. React component tests (~30 files)
4. Other tests
```

#### Phase 4: Quality Test Patterns

**❌ Bad: Coverage-focused**
```typescript
test('renders', () => {
  render(<Component />);
  // No assertions = useless test
});
```

**✅ Good: Behavior-focused**
```typescript
test('displays error when form is invalid', async () => {
  const { user } = renderWithProviders(<Form />);
  
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
});
```

### 🏗️ 測試模板

**基本原則**：
- 使用 `renderWithProviders` 包裝組件
- 使用 `createMockRequest` 和 `mockSession` 測試 API
- 驗證實際行為而非實現細節
- 使用 `waitFor` 處理異步操作

### 🎯 關鍵原則
1. **測試行為，非實現**：專注於用戶結果
2. **保持綠色**：立即修復，不累積技術債
3. **集中管理**：統一所有 mocks 和 helpers
4. **文檔化測試**：清晰的測試名稱解釋功能

## 🔧 TypeScript 錯誤修復核心原則

### 🚨 修復策略
**零風險修復：永遠不破壞現有功能，每次修復都必須可驗證和可逆轉。**

### 核心原則
1. **永遠不使用 `any` 類型** - 使用 `Record<string, unknown>` 或具體類型
2. **使用 Optional Chaining** - `program?.completedAt ?? null`
3. **一次修復一個檔案** - 修復後立即測試
4. **永遠不使用 `@ts-ignore`** - 修復根本問題而非掩蓋


## 🚀 Modern AI Development Workflow

### Core Principle: Minimal, Efficient, AI-Friendly

```
1. Start work (make new) → 2. Smart save (make save) → 3. Complete work (make done)
```

### Core Commands (80% of use cases)
```bash
make ai-new TYPE=feature TICKET=name   # Start new work
make ai-save                          # Smart save progress (record AI complexity)
make ai-done                          # Complete work (test+commit+merge)
```

### AI Behavior Guidelines

**DO:**
1. Execute `make ai-new` before starting work
2. MVP-first mindset - core user value before infrastructure
3. Write tests alongside features (TDD)
4. Regular `make ai-save` to track progress
5. Wait for user confirmation before `make ai-done`
6. All commit messages in English
7. Strict TypeScript types (no `any`)
8. Follow all ESLint rules

**DON'T:**
1. Auto-commit without user request
2. Use legacy commands
3. Create verbose documentation
4. Use `any` type
5. Ignore ESLint warnings
6. Commit mid-development

### AI Complexity Tracking
```bash
# Record complexity (not tokens)
AI_TASK="implement login" AI_COMPLEXITY=complex make ai-save
```

Complexity levels: `simple`, `medium`, `complex`, `debug`

---

## 🧪 Testing Best Practices

### Testing Principles
1. **TDD First**: Write tests before code
2. **Coverage Target**: 70%+ coverage
3. **Test Separation**: Unit and E2E tests separate
4. **Mock Dependencies**: Isolate tests with mocks

### Unit vs E2E Tests
- **Unit Tests**: API routes, React components, utilities, state management
- **E2E Tests**: User flows, cross-page interactions, browser behavior, critical paths

### Test Naming
- Unit: `ComponentName.test.tsx` or `functionName.test.ts`
- E2E: `feature-name.spec.ts`

### Handling Obsolete Snapshots
When tests pass but CI fails due to obsolete snapshots:
```bash
# Check for obsolete snapshots
npm run test:ci

# If you see "X snapshots obsolete", remove them:
npm run test:ci -- -u

# This removes obsolete snapshots without affecting passing tests
```

**Note**: Obsolete snapshots are NOT test failures - they're just leftover snapshots from tests that no longer exist or no longer use snapshots.

## 🎯 MVP Development Strategy

### Priority Order
1. Core user value - validate assumptions
2. Basic functionality - ensure main flows work
3. Quality assurance - adequate testing (70%+)
4. Infrastructure - optimize when needed

### Avoid Premature Optimization
- ❌ Complex monitoring (use 3rd party)
- ❌ Over-optimization (wait for bottlenecks)
- ❌ 100% coverage (focus critical paths)
- ❌ Perfect infrastructure (incremental improvement)

### 🏗️ Data Model & Naming Standards

#### Timestamp Field Naming
1. **createdAt**: Record creation time
   - PostgreSQL: `created_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `createdAt: Date`

2. **startedAt**: Actual start time (optional)
   - PostgreSQL: `started_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `startedAt?: Date`

3. **completedAt**: Completion time (optional)
   - PostgreSQL: `completed_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `completedAt?: Date`

4. **updatedAt**: Last update time
   - PostgreSQL: `updated_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `updatedAt: Date`

#### DDD Terminology

**`content`** - Task Content
- **Purpose**: User-facing content and materials
- **Includes**: instructions, question, options, description, hints, resources

**`context`** - Task Context  
- **Purpose**: Environment and background information
- **Includes**: scenarioId, difficulty, ksaCodes, metadata, taskType, estimatedTime

#### Mandatory Checklist
- [ ] content contains only user content
- [ ] context contains only system metadata  
- [ ] No nested content.context or context.content
- [ ] All modules (PBL/Assessment/Discovery) use same structure

### 🚨 TypeScript & ESLint 核心規則

#### 檢查優先順序
```bash
# 1. 先檢查 TypeScript 錯誤（最優先）
npx tsc --noEmit

# 2. 修復所有 TypeScript 錯誤後，再處理 ESLint
npm run lint
```

#### 核心規則
1. **永遠不使用 `any` 類型** - 使用 `Record<string, unknown>` 或具體類型
2. **Next.js 15 路由參數** - 必須使用 `Promise<{ params }>` 並 `await`
3. **多語言欄位** - 必須使用 `Record<string, string>` 格式
4. **Repository 方法** - 可選方法必須使用 `?.` 操作符
5. **測試檔案** - 必須嚴格遵守所有 TypeScript 規則，零例外
6. **Pre-commit 檢查** - 必須通過所有檢查才能提交

#### 常見錯誤模式
- **多語言欄位不匹配**: `string` vs `Record<string, string>`
- **Next.js 15 路由參數**: 忘記 `await params`
- **Repository 方法調用**: 忘記使用 `?.` 操作符
- **測試檔案型別錯誤**: 使用 `any` 或不符合介面定義

### 🛡️ 錯誤修復流程

#### TDD 修復流程
1. **先寫測試確認錯誤存在** - 建立重現錯誤的測試
2. **修復錯誤** - 一次只修復一個錯誤
3. **驗證修復** - 確保所有測試通過
4. **實際測試** - 使用 Playwright 或 Browser 工具測試

#### 常見錯誤模式與解決方案
- **多語言欄位不匹配**: 使用 `{ en: value }` 格式
- **型別定義衝突**: 從單一來源導入，不重複定義
- **不安全的型別轉換**: 使用 `as unknown as Type`
- **Next.js 15 路由參數**: 使用 `Promise<{ params }>` 並 `await`

#### 快速修復檢查清單
   ```bash
# 1. 檢查 TypeScript 錯誤
npx tsc --noEmit

# 2. 搜尋型別衝突
grep -r "interface TypeName" src/

# 3. 驗證修復
npm run typecheck && npm run lint && npm run test:ci
```

### Git Commit Guidelines

#### 🚨 Pre-commit Checklist
**Must complete ALL checks before commit:**

1. **TypeScript Check (永遠最先檢查)**:
   ```bash
   cd frontend && npx tsc --noEmit
   ```
   **如果有任何 TypeScript 錯誤（包含測試檔案），必須先修復才能繼續！**
   
   檢查測試檔案錯誤：
   ```bash
   npx tsc --noEmit 2>&1 | grep -E "test\.(ts|tsx)"
   ```

2. **ESLint Check (TypeScript 通過後才檢查)**: 
   ```bash
   cd frontend && npx eslint $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')
   ```

3. **Test Check**:
   ```bash
   cd frontend && npm run test:ci
   ```

4. **Build Check**:
   ```bash
   cd frontend && npm run build
   ```

5. **Automated pre-commit command**:
   ```bash
   make pre-commit-check
   ```

#### Commit Message Format
1. **All commit messages in English**
2. **Follow conventional commits**:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `refactor:` code refactoring
   - `test:` testing
   - `chore:` maintenance
3. **Never auto-commit** - wait for user confirmation
4. **AI-enhanced format**:
   ```
   <type>: <subject>
   
   <body>
   
   🤖 AI Assistant: Claude Opus 4
   📊 Session context: ~<tokens> tokens (estimated)
   🎯 Task complexity: <level>
   📁 Files changed: <number>
   ```

#### Git Sync Workflow
**Always sync before commit:**
```bash
# 1. Check status
git status

# 2. Pull and rebase
git pull --rebase origin main

# 3. Resolve conflicts if any
# 4. Then commit
```

---

## 項目資訊

> **📋 產品需求與技術規格已移至專門文件**
> 
> **產品需求文檔 (PRD)**: 請參考 [`docs/handbook/PRD.md`](docs/handbook/PRD.md)
> - 產品願景與核心功能
> - 技術棧選型與架構
> - 發展路線圖與優先事項
> - 成功指標與風險管理
> 
> **技術架構文檔**: 請參考 [`docs/technical/infrastructure/unified-learning-architecture.md`](docs/technical/infrastructure/unified-learning-architecture.md)
> - 統一學習架構設計
> - 資料庫架構與 Repository Pattern
> - API 設計與服務層架構

### Development Commands

#### Frontend (Next.js)
```bash
# Development server
cd frontend && npm run dev

# Build production
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# Type checking
cd frontend && npm run typecheck
```

#### Testing Commands
```bash
# Unit Tests (Jest + React Testing Library)
cd frontend && npm run test                    # Watch mode
cd frontend && npm run test:ci                  # CI mode (no watch)
cd frontend && npm run test -- --coverage       # With coverage report
cd frontend && npm run test -- src/components   # Test specific folder

# E2E Tests (Playwright)
cd frontend && npx playwright install           # Install browsers (first time)
cd frontend && npm run test:e2e                 # Run all E2E tests
cd frontend && npm run test:e2e -- --project=chromium  # Chrome only
cd frontend && npm run test:e2e -- --grep "Login"      # Specific test
```

#### Test File Structure
```
frontend/
├── src/
│   ├── components/
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       └── __tests__/
│   │           └── LoginForm.test.tsx    # Unit test
│   ├── app/
│   │   └── api/
│   │       └── auth/
│   │           ├── login/
│   │           │   └── route.ts
│   │           └── __tests__/
│   │               └── login.test.ts     # API test
├── e2e/
│   └── login.spec.ts                     # E2E test
└── __mocks__/                            # Test mocks
```

#### Backend (Python FastAPI)
```bash
# Development server
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Run tests (if pytest is installed)
cd backend && python -m pytest

# Linting (if ruff is installed)
cd backend && python -m ruff check .
```

#### Docker & Cloud Deployment
```bash
# Build Docker image
make build-frontend-image

# Deploy to Google Cloud Run
make gcloud-build-and-deploy-frontend
```

> **📋 詳細部署指南**: 請參考 [`docs/deployment/CICD.md`](docs/deployment/CICD.md)

### Architecture

> **📋 詳細架構說明**: 請參考 [`docs/technical/infrastructure/unified-learning-architecture.md`](docs/technical/infrastructure/unified-learning-architecture.md)

**核心架構**：
- **統一學習架構**: 所有模組（Assessment、PBL、Discovery）遵循相同資料流程
- **Repository Pattern**: PostgreSQL Repository 抽象層
- **多語言支援**: 14 種語言，混合式翻譯架構
- **快取策略**: 多層快取提升效能

### Database Architecture

> **📋 詳細資料庫架構**: 請參考 [`docs/technical/infrastructure/unified-learning-architecture.md`](docs/technical/infrastructure/unified-learning-architecture.md)

**核心設計**：
- **PostgreSQL**: 主要資料庫，統一學習架構
- **資料流程**: Content Source → Scenario → Program → Task → Evaluation
- **多語言支援**: JSONB 格式儲存
- **Repository Pattern**: 抽象層設計，支援未來擴充

### Configuration Files
- `eslint.config.mjs` - Next.js + TypeScript ESLint setup
- `tailwind.config.js` - Tailwind CSS configuration  
- `next.config.ts` - Next.js configuration with i18n
- `tsconfig.json` - TypeScript configuration

### Important Technical Specifications

#### 🚨 Cloud SQL Deployment - Regions Must Match
**Key lesson from painful staging deployment**

- **Problem**: "relation does not exist" errors were actually timeout issues
- **Cause**: Cloud SQL in `us-central1`, Cloud Run in `asia-east1`
- **Solution**: Both services must be in same region

#### Vertex AI Model Names
- **Correct model**: `gemini-2.5-flash` (not gemini-pro)

## 🏗️ Architecture Best Practices - Lessons from GCS-v2 Migration

### 🎯 Get Architecture Right from Day 1

#### Golden Rules for Infrastructure
```yaml
Must-have from Day 1:
- Database: PostgreSQL (never use filesystem as DB)
- Cache: Redis (design caching strategy early)
- File Storage: S3/GCS (static files only)
- Version Control: Git-based content management
```

#### Core Design Principles

1. **Unified Data Model**
   ```typescript
   interface UnifiedDataFlow {
     source: ContentSource;      // YAML, API, AI
     scenario: LearningScenario; // Unified learning unit
     program: UserProgram;       // User instance
     task: LearningTask;         // Task
     evaluation: Assessment;     // Assessment
   }
   ```

2. **Repository Pattern from Start**
   ```typescript
   interface IRepository<T> {
     findById(id: string): Promise<T>;
     create(item: T): Promise<T>;
     update(id: string, updates: Partial<T>): Promise<T>;
   }
   ```

3. **Proper Multi-language Support**
   ```typescript
   // ❌ Wrong: String suffixes
   interface WrongWay {
     title_en: string;
     title_zh: string;
   }
   
   // ✅ Right: Structured JSONB
   interface RightWay {
     title: {
       en: string;
       zh: string;
     };
   }
   ```

### 🚨 Red Flags to Avoid

1. **❌ Using filesystem as database**
2. **❌ String suffixes for i18n**
3. **❌ No abstraction layer**
4. **❌ "Temporary" solutions**
5. **❌ Ignoring data relationships**

### 💡 MVP Baseline

```yaml
OK to simplify in MVP:
✅ Feature count - fewer but focused
✅ UI polish - simple but usable
✅ Performance - basic is fine

Never skip in MVP:
❌ Proper database choice
❌ Error handling
❌ Data model design
❌ Repository Pattern
❌ Test framework
```

> "There is nothing more permanent than a temporary solution"

## 🗄️ 資料庫配置標準

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





## 🚨 評估命名規範統一

### 重大更新：Evaluation Type 命名規範統一

**背景**：用戶要求簡化評估類型命名，避免複雜的學術術語。

**變更內容**：
- ❌ **舊命名**：`summative`, `formative`, `diagnostic`, `ai-feedback`
- ✅ **新命名**：`assessment_complete`, `pbl_complete`, `discovery_complete`

**更新範圍**：
1. **Assessment API**: 
   - Complete API: `evaluationType: 'assessment_complete'`
   - Evaluation API: 查找 `'assessment_complete'` 類型
2. **PBL API**: Complete API: `evaluationType: 'pbl_complete'`
3. **Discovery API**: Complete API: `evaluationType: 'discovery_complete'`
4. **資料庫**: 現有 `summative` 評估更新為 `assessment_complete`
5. **文件**: CLAUDE.md 中的型別定義已更新

**實作原則**：
- 使用簡單描述性命名，避免學術術語
- 一個 `evaluation_type` 欄位即可，不需要 `subtype`
- 保持 API 簡潔，不使用向後相容的條件判斷

**用戶反饋**：「不要那麼複雜啦 assessment_complete pbl_complete discovery_complete 這樣就好啦」

### 關鍵教訓

1. **Next.js 升級影響**: 主要框架升級（如 Next.js 14 → 15）會帶來重大 API 變更
2. **型別一致性**: 整個專案要保持型別定義的一致性
3. **漸進式修復**: 修復一個錯誤可能暴露更多錯誤，需要耐心逐一解決
4. **測試覆蓋**: 良好的測試覆蓋可以在重構時提供信心

---

Note: This CLAUDE.md file must remain in the project root directory to be automatically read by Claude AI.


