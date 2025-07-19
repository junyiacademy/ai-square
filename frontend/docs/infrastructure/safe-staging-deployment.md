# 安全的線上測試部署方案

## 🎯 目標：線上測試新版本，不影響 Production

### 方案 1: 獨立 Staging 環境 (最推薦) ⭐

**架構：**
```
ai-square.com (Production) → 現有 GCS 版本
ai-square-staging.com → 新的 PostgreSQL 版本
```

**實作步驟：**
```bash
# 1. 部署到獨立的 Cloud Run 服務
gcloud run deploy ai-square-staging \
  --image gcr.io/${PROJECT_ID}/ai-square:postgres-version \
  --platform managed \
  --region us-central1 \
  --set-env-vars="DB_HOST=/cloudsql/${PROJECT_ID}:us-central1:ai-square-db-staging" \
  --set-env-vars="ENVIRONMENT=staging"

# 2. 設定獨立網址
gcloud run services update ai-square-staging \
  --platform managed \
  --region us-central1 \
  --update-labels=environment=staging

# 3. 獲取 staging URL
gcloud run services describe ai-square-staging \
  --platform managed \
  --region us-central1 \
  --format="value(status.url)"
```

**優點：**
- 完全隔離，零風險
- 可以充分測試
- 易於分享給測試人員

### 方案 2: URL 路徑區分

**架構：**
```
ai-square.com/* → 現有版本
ai-square.com/beta/* → 新版本
```

**Next.js 設定：**
```typescript
// next.config.ts
module.exports = {
  async rewrites() {
    return [
      {
        source: '/beta/:path*',
        destination: process.env.USE_POSTGRES 
          ? '/:path*' 
          : 'https://ai-square-staging.run.app/:path*'
      }
    ]
  }
}
```

### 方案 3: Feature Flag 控制

**實作：**
```typescript
// lib/feature-flags.ts
export const usePostgres = () => {
  // 可以基於 cookie、query param 或 user attribute
  const urlParams = new URLSearchParams(window.location.search);
  const betaUser = urlParams.get('beta') === 'true';
  const stagingCookie = document.cookie.includes('staging=true');
  
  return betaUser || stagingCookie || process.env.NEXT_PUBLIC_USE_POSTGRES === 'true';
};

// 在 API routes 中
export async function GET(request: NextRequest) {
  const useNewSystem = request.headers.get('x-beta-user') === 'true';
  
  if (useNewSystem) {
    return handleWithPostgres(request);
  } else {
    return handleWithGCS(request);
  }
}
```

### 方案 4: 子網域部署

**架構：**
```
app.ai-square.com → Production (GCS)
staging.ai-square.com → Staging (PostgreSQL)
```

**Cloud Run 設定：**
```bash
# 1. 部署 staging 版本
gcloud run deploy ai-square-staging \
  --image gcr.io/${PROJECT_ID}/ai-square:staging

# 2. 設定自訂網域
gcloud beta run domain-mappings create \
  --service ai-square-staging \
  --domain staging.ai-square.com \
  --region us-central1
```

## 🏗️ 建議實施方案：獨立 Staging + Feature Flags

### Step 1: 部署獨立 Staging
```bash
# 創建 staging Cloud SQL
gcloud sql instances create ai-square-db-staging \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# 部署 staging 服務
make deploy-staging
```

### Step 2: 環境變數配置
```env
# .env.staging
DB_HOST=/cloudsql/PROJECT:REGION:ai-square-db-staging
DB_NAME=ai_square_staging
USE_POSTGRES=true
ENVIRONMENT=staging
```

### Step 3: 測試檢查清單
- [ ] 所有 API endpoints 正常運作
- [ ] 資料遷移完整性
- [ ] 效能基準測試
- [ ] 多語言功能正常
- [ ] 用戶登入/註冊流程

### Step 4: 漸進式遷移
```typescript
// 可以在 staging 測試後，逐步開放給 production 用戶
export const canUsePostgres = (userEmail: string) => {
  const betaTesters = [
    'team@ai-square.com',
    'beta-tester1@gmail.com'
  ];
  
  return process.env.ENVIRONMENT === 'staging' || 
         betaTesters.includes(userEmail);
};
```

## 📊 監控設置

```yaml
# monitoring/staging.yaml
dashboards:
  - name: staging-metrics
    panels:
      - db_connections
      - api_latency
      - error_rates
      - user_activity

alerts:
  - name: staging-db-connection-pool
    condition: connections > 80%
    severity: warning
    
  - name: staging-error-spike
    condition: error_rate > 5%
    severity: critical
```

## 🔄 資料同步策略

### 單向同步 (Production → Staging)
```bash
# 每日同步 production 資料到 staging
0 2 * * * /scripts/sync-prod-to-staging.sh
```

### 同步腳本
```typescript
// scripts/sync-prod-to-staging.ts
async function syncData() {
  // 1. 匯出 GCS 資料
  const gcsData = await exportFromGCS();
  
  // 2. 轉換格式
  const pgData = await transformForPostgres(gcsData);
  
  // 3. 匯入 staging PostgreSQL
  await importToStagingDB(pgData);
  
  // 4. 驗證資料完整性
  await validateDataIntegrity();
}
```

## ✅ 推薦執行計畫

1. **立即執行**：部署獨立 staging 環境
2. **測試 1-2 週**：充分測試所有功能
3. **收集反饋**：邀請內部團隊測試
4. **效能優化**：根據實際使用調整
5. **準備 Production**：確認後再做金絲雀部署

這樣你可以：
- ✅ 充分測試新架構
- ✅ 不影響現有用戶
- ✅ 隨時可以調整
- ✅ 降低部署風險

---

最後更新: 2025-01-19