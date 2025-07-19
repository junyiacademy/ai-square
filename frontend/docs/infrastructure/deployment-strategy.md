# AI Square 部署策略

## 📌 架構概覽

- **Database**: PostgreSQL (Cloud SQL) - 用戶資料、學習記錄
- **Static Storage**: Google Cloud Storage - 圖片、文件、媒體檔案
- **Caching**: Redis - 分散式快取層
- **Deployment**: Google Cloud Run - 容器化部署

## 🚀 部署策略選項

### 1. 金絲雀部署 (Canary Deployment) ⭐ 推薦
**什麼是金絲雀部署？**
像礦坑中的金絲雀一樣，先讓一小部分用戶使用新版本，確認沒問題後再全面推出。

**執行步驟：**
```bash
# 1. 部署新版本到 staging
gcloud run deploy ai-square-staging \
  --image gcr.io/PROJECT_ID/ai-square:canary \
  --platform managed \
  --region us-central1

# 2. 設定流量分配 (10% 到新版本)
gcloud run services update-traffic ai-square \
  --to-revisions ai-square-canary=10 \
  --platform managed \
  --region us-central1

# 3. 監控並逐步增加流量
# Day 1: 10%
# Day 2: 30% 
# Day 3: 50%
# Day 4: 100%
```

**優點：**
- 風險最小化
- 可即時回滾
- 真實用戶測試

**缺點：**
- 需要處理雙版本相容性
- 部署時間較長

### 2. 藍綠部署 (Blue-Green Deployment)
**執行步驟：**
```bash
# 1. 部署到新環境 (Green)
gcloud run deploy ai-square-green \
  --image gcr.io/PROJECT_ID/ai-square:latest

# 2. 測試新環境
# 3. 切換流量
# 4. 保留舊環境備用
```

**優點：**
- 切換快速
- 回滾簡單

**缺點：**
- 資源成本翻倍
- 資料同步複雜

### 3. 滾動部署 (Rolling Deployment)
不適合此次部署，因為資料層變更太大。

## 🛡️ 風險緩解措施

### 1. 資料備份策略
```bash
# 部署前完整備份
gsutil -m cp -r gs://ai-square-db-v2/* gs://ai-square-backup-$(date +%Y%m%d)/

# PostgreSQL 備份
pg_dump -h localhost -U postgres ai_square_db > backup_$(date +%Y%m%d).sql
```

### 2. 相容性處理
```typescript
// API 層面保持向後相容
export async function getUserData(email: string) {
  if (USE_POSTGRES) {
    return postgresRepo.findByEmail(email);
  } else {
    return gcsStorage.getUserData(email); // Fallback
  }
}
```

### 3. 監控設置
```yaml
# monitoring.yaml
alerts:
  - name: error-rate-spike
    condition: error_rate > 0.05
    action: rollback
  
  - name: latency-degradation  
    condition: p95_latency > 2000ms
    action: investigate
```

## 📋 建議執行計畫

### Phase 1: 準備階段 (2-3 天)
1. **完整測試**
   ```bash
   npm run test:ci
   npm run test:e2e
   npm run test:integration
   ```

2. **資料遷移演練**
   ```bash
   # 在 staging 環境執行完整遷移
   npm run migrate:staging
   ```

3. **效能基準測試**
   - 記錄現有 API 回應時間
   - 設定可接受的效能退化範圍

### Phase 2: 金絲雀部署 (4-5 天)
1. **Day 1**: 部署到 10% 用戶
   - 監控錯誤率
   - 收集用戶反饋
   
2. **Day 2-3**: 增加到 30%
   - 檢查資料一致性
   - 優化慢查詢
   
3. **Day 4-5**: 全面部署
   - 最終驗證
   - 準備回滾計畫

### Phase 3: 穩定階段 (2-3 天)
1. **移除舊代碼**
   - 清理 GCS 相關代碼
   - 更新文檔

2. **優化索引**
   ```sql
   -- 根據實際查詢模式優化
   ANALYZE;
   REINDEX;
   ```

## 🔄 回滾計畫

### 快速回滾 (< 5 分鐘)
```bash
# Cloud Run 流量切換
gcloud run services update-traffic ai-square \
  --to-revisions ai-square-stable=100

# 環境變數切換
kubectl set env deployment/ai-square USE_POSTGRES=false
```

### 資料回滾
```bash
# 如果需要回滾資料
psql -h localhost -U postgres ai_square_db < backup_latest.sql

# 同步最新變更
npm run sync:gcs-from-postgres
```

## 📊 成功指標

1. **技術指標**
   - API 錯誤率 < 0.1%
   - P95 延遲 < 1000ms
   - 資料庫連線池使用率 < 80%

2. **業務指標**
   - 用戶完成率維持或提升
   - 無重大用戶投訴
   - 新功能正常運作

## 🎯 決策建議

**推薦方案：金絲雀部署**

理由：
1. 資料層變更風險高，需要漸進式驗證
2. 可以快速發現並修復問題
3. 對用戶影響最小
4. 有充足時間優化效能

**執行時機：**
- 避開尖峰時段（週一早上、週五下午）
- 建議週二或週三開始部署
- 預留足夠時間處理意外狀況

---

最後更新: 2025-01-19