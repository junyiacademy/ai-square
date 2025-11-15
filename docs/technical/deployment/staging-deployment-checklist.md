# Staging 部署檢查清單

## 🎯 部署前必要檢查項目

### 1. 資料庫準備
- [ ] 執行完整資料庫重建
  ```bash
  bash scripts/rebuild-database-complete.sh
  ```
- [ ] 確認三種學習模式的 scenarios 都已載入
  - Assessment: 1 個
  - PBL: 9 個
  - Discovery: 12 個

### 2. 環境變數配置

#### 必要的環境變數 (.env.local)
```bash
# 資料庫配置
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=ai_square_db
DB_USER=postgres
DB_PASSWORD=postgres

# Google Cloud 配置
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GCS_BUCKET_NAME=your-bucket-name

# AI 服務配置
VERTEX_AI_LOCATION=asia-northeast1
ANTHROPIC_API_KEY=your-claude-api-key

# 認證配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Session 配置
SESSION_SECRET=your-session-secret
```

### 3. 測試套件執行

#### 3.1 TypeScript 編譯檢查
```bash
npx tsc --noEmit
```
✅ 必須零錯誤

#### 3.2 ESLint 檢查
```bash
npm run lint
```
✅ 必須零警告

#### 3.3 單元測試
```bash
npm run test:ci
```
✅ 所有測試必須通過

#### 3.4 E2E 測試
```bash
# 統一學習架構測試
npm run test:e2e -- e2e/unified-learning-integration.spec.ts
npm run test:e2e -- e2e/verify-unified-learning-flow.spec.ts

# API 整合測試
npm run test:e2e -- e2e/api-service-integration.spec.ts
```
✅ 所有測試必須通過

### 4. 建置檢查
```bash
npm run build
```
✅ 建置必須成功無錯誤

### 5. 必要檔案清單

#### 資料庫相關
- [ ] `/scripts/apply-schema-v3.sh` - Schema 遷移腳本
- [ ] `/scripts/seed-assessment-scenarios.ts` - Assessment 資料載入
- [ ] `/scripts/seed-pbl-scenarios.ts` - PBL 資料載入
- [ ] `/scripts/seed-discovery-scenarios.ts` - Discovery 資料載入
- [ ] `/scripts/rebuild-database-complete.sh` - 完整重建腳本

#### 服務層實作
- [ ] `/src/lib/services/base-learning-service.ts` - 基礎介面
- [ ] `/src/lib/services/assessment-learning-service.ts` - Assessment 服務
- [ ] `/src/lib/services/pbl-learning-service.ts` - PBL 服務
- [ ] `/src/lib/services/discovery-learning-service.ts` - Discovery 服務
- [ ] `/src/lib/services/learning-service-factory.ts` - 服務工廠

#### Repository 層
- [ ] `/src/lib/repositories/postgresql/` - PostgreSQL 實作
- [ ] `/src/lib/repositories/base/repository-factory.ts` - Repository 工廠

#### API Routes (已整合服務層)
- [ ] `/src/app/api/assessment/scenarios/[id]/programs/route.ts`
- [ ] `/src/app/api/pbl/scenarios/[id]/start/route.ts`
- [ ] `/src/app/api/discovery/scenarios/[id]/start/route.ts`

#### YAML 資料檔案
- [ ] `/public/assessment_data/` - Assessment YAML 檔案
- [ ] `/public/pbl_data/` - PBL YAML 檔案
- [ ] `/public/discovery_data/` - Discovery YAML 檔案

### 6. Staging 環境特定配置

#### Cloud SQL 配置
```bash
# 確保 Cloud SQL 和 Cloud Run 在同一區域
CLOUD_SQL_REGION=asia-east1
CLOUD_RUN_REGION=asia-east1
```

#### 環境變數 (Staging)
```bash
# 資料庫 (Cloud SQL)
DB_HOST=/cloudsql/PROJECT:REGION:INSTANCE
DB_NAME=ai_square_db
DB_USER=postgres
DB_PASSWORD=postgres

# 其他保持相同
```

### 7. 部署步驟

1. **建置 Docker 映像**
   ```bash
   docker build -t gcr.io/PROJECT_ID/ai-square-frontend:staging .
   ```

2. **推送到 Container Registry**
   ```bash
   docker push gcr.io/PROJECT_ID/ai-square-frontend:staging
   ```

3. **部署到 Cloud Run**
   ```bash
   gcloud run deploy ai-square-frontend-staging \
     --image gcr.io/PROJECT_ID/ai-square-frontend:staging \
     --region asia-east1 \
     --add-cloudsql-instances PROJECT:REGION:INSTANCE \
     --set-env-vars "$(cat .env.staging | grep -v '^#' | xargs)"
   ```

### 8. 部署後驗證

- [ ] 訪問 staging URL 確認服務運行
- [ ] 測試三種學習模式都能正常開始
- [ ] 檢查 Cloud Logging 確認無錯誤
- [ ] 執行簡單的功能測試

### 9. 回滾計劃

如果部署失敗：
1. Cloud Run 會自動保留前一版本
2. 使用 `gcloud run services update-traffic` 回滾
3. 檢查 logs 找出問題原因

## 📋 常見問題排查

### 資料庫連接問題
- 檢查 Cloud SQL 和 Cloud Run 是否在同一區域
- 確認 Cloud SQL 實例已啟用
- 檢查 Service Account 權限

### 環境變數問題
- 使用 Secret Manager 管理敏感資訊
- 確認所有必要變數都已設定
- 檢查變數值中的特殊字符

### 建置失敗
- 檢查 Node.js 版本一致性
- 確認所有依賴都已安裝
- 檢查 TypeScript 編譯錯誤

---

**最後更新**: 2025-01-30
**維護者**: AI Square Team
