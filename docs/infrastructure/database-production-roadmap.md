# Database Production Deployment Roadmap
**目標**: 2週內將 PostgreSQL 資料庫整合到 main branch 並部署到 production
**時間**: 2025/07/25 - 2025/08/08

## 🎯 Current Status (2025/07/25)
- ✅ Local development database setup complete
- ✅ Schema v3 implemented and tested
- ⚠️ Staging environment has connection issues
- ❌ Production environment not configured
- ❌ Data migration strategy not finalized
- ❌ Performance optimization pending

## 📅 Week 1: Stabilization & Testing (07/25 - 07/31)

### Day 1-2: Fix Staging Issues (07/25-07/26)
**目標**: 確保 staging 環境穩定運行
- [ ] 解決 Cloud SQL 連線問題
  - [ ] 確認區域匹配 (Cloud SQL & Cloud Run 必須同區域)
  - [ ] 修復 Unix socket 連線設定
  - [ ] 測試連線池配置
- [ ] 完整測試 staging 功能
  - [ ] Auth flow 測試
  - [ ] PBL/Assessment/Discovery 模組測試
  - [ ] 多語言內容載入測試
- [ ] 建立 staging 監控
  - [ ] 設定 Cloud Monitoring alerts
  - [ ] 配置 error reporting

### Day 3-4: Performance Testing & Optimization (07/27-07/28)
**目標**: 確保資料庫效能符合生產需求
- [ ] 執行負載測試
  - [ ] 使用 k6 或 JMeter 模擬 1000+ 併發用戶
  - [ ] 測試關鍵 API endpoints 回應時間
  - [ ] 識別效能瓶頸
- [ ] 資料庫優化
  - [ ] 建立必要索引 (已有 performance-indexes.sql)
  - [ ] 優化慢查詢
  - [ ] 配置連線池大小
- [ ] 實施快取策略
  - [ ] Redis 快取層完整測試
  - [ ] 設定快取 TTL 策略
  - [ ] 監控快取命中率

### Day 5: Security Audit (07/29)
**目標**: 確保資料庫安全性
- [ ] 安全性檢查
  - [ ] SQL injection 防護測試
  - [ ] 權限最小化原則實施
  - [ ] 敏感資料加密確認
- [ ] 備份策略
  - [ ] 設定自動備份 (Cloud SQL automated backups)
  - [ ] 測試備份還原流程
  - [ ] 建立災難恢復計畫
- [ ] Secret management
  - [ ] 所有密碼使用 Secret Manager
  - [ ] 定期輪換策略

### Day 6-7: Integration Testing (07/30-07/31)
**目標**: 確保所有功能與資料庫整合正常
- [ ] 完整 E2E 測試
  - [ ] 所有 user journeys 測試
  - [ ] 跨瀏覽器相容性測試
  - [ ] 行動裝置測試
- [ ] 資料一致性驗證
  - [ ] 測試 transaction 正確性
  - [ ] 驗證 foreign key constraints
  - [ ] 確認資料完整性

## 📅 Week 2: Production Deployment (08/01 - 08/08)

### Day 8-9: Production Environment Setup (08/01-08/02)
**目標**: 建立生產環境基礎設施
- [ ] Cloud SQL Production 設定
  - [ ] 創建高可用性實例 (HA configuration)
  - [ ] 設定 read replicas (如需要)
  - [ ] 配置自動擴展
- [ ] Network 設定
  - [ ] VPC configuration
  - [ ] Private IP setup
  - [ ] Firewall rules
- [ ] Monitoring 設定
  - [ ] Cloud Monitoring dashboards
  - [ ] Alert policies
  - [ ] SLO/SLA 定義

### Day 10: Data Migration (08/03)
**目標**: 遷移現有資料到生產資料庫
- [ ] 資料遷移計畫
  - [ ] 匯出現有 YAML/JSON 資料
  - [ ] 轉換資料格式
  - [ ] 驗證資料完整性
- [ ] 執行遷移
  - [ ] 小批次測試遷移
  - [ ] 完整資料遷移
  - [ ] 驗證遷移結果
- [ ] Rollback 計畫
  - [ ] 準備回滾腳本
  - [ ] 測試回滾流程

### Day 11: Feature Flag & Gradual Rollout (08/04)
**目標**: 使用 feature flag 逐步切換到資料庫
- [ ] Feature flag 實施
  - [ ] 實作資料來源切換邏輯
  - [ ] 允許 YAML/DB 雙軌運行
  - [ ] A/B testing 設定
- [ ] Canary deployment
  - [ ] 5% 流量切換到 DB
  - [ ] 監控錯誤率和效能
  - [ ] 逐步增加流量比例

### Day 12: Merge to Main (08/05)
**目標**: 合併程式碼到 main branch
- [ ] Code review
  - [ ] 完整 PR review
  - [ ] 解決所有 comments
  - [ ] 更新文檔
- [ ] Pre-merge checklist
  - [ ] 所有測試通過
  - [ ] 無 TypeScript 錯誤
  - [ ] 效能基準測試通過
- [ ] Merge & tag
  - [ ] Merge to main
  - [ ] Create release tag
  - [ ] Update CHANGELOG

### Day 13: Production Deployment (08/06)
**目標**: 部署到生產環境
- [ ] Pre-deployment
  - [ ] 備份現有系統
  - [ ] 通知用戶維護時間
  - [ ] 準備 rollback 計畫
- [ ] Deployment
  - [ ] 部署新版本
  - [ ] 執行 smoke tests
  - [ ] 監控系統指標
- [ ] Post-deployment
  - [ ] 驗證所有功能
  - [ ] 監控錯誤日誌
  - [ ] 收集用戶反饋

### Day 14: Monitoring & Optimization (08/07-08/08)
**目標**: 確保系統穩定並優化
- [ ] 生產環境監控
  - [ ] 24小時密切監控
  - [ ] 處理任何緊急問題
  - [ ] 效能調優
- [ ] 文檔更新
  - [ ] 更新部署文檔
  - [ ] 更新運維手冊
  - [ ] 知識轉移
- [ ] 慶祝成功! 🎉

## 🚨 Critical Success Factors

### 1. **區域一致性**
```yaml
必須確保:
- Cloud SQL: asia-east1
- Cloud Run: asia-east1
- Cloud Storage: asia-east1
```

### 2. **零停機部署**
- 使用 feature flags 實現漸進式切換
- 保持 YAML 和 DB 雙軌運行能力
- Blue-green deployment 策略

### 3. **效能基準**
- API 回應時間 < 200ms (P95)
- 資料庫查詢時間 < 50ms (P95)
- 併發用戶支援 > 1000

### 4. **監控指標**
- Error rate < 0.1%
- Uptime > 99.9%
- Database CPU < 80%
- Memory usage < 70%

## 📋 Rollback Plan

如果出現嚴重問題：
1. **立即回滾**
   - Feature flag 切回 YAML
   - 恢復舊版本 Cloud Run
   - 從備份還原（如需要）

2. **問題分析**
   - 收集錯誤日誌
   - 分析 root cause
   - 制定修復計畫

3. **重新部署**
   - 修復問題
   - 更完整的測試
   - 更謹慎的部署策略

## 🎯 Key Milestones

| Date | Milestone | Success Criteria |
|------|-----------|------------------|
| 07/28 | Staging Stable | 所有功能測試通過，無連線問題 |
| 07/31 | Performance Verified | 負載測試通過，滿足效能要求 |
| 08/03 | Data Migrated | 所有資料成功遷移，無資料遺失 |
| 08/05 | Merged to Main | PR approved，CI/CD 通過 |
| 08/06 | Production Live | 系統上線，用戶可正常使用 |
| 08/08 | Fully Stable | 48小時無重大問題 |

## 📞 Support & Escalation

### 問題升級流程
1. **Level 1**: Dev team 處理 (< 30 mins)
2. **Level 2**: Tech lead 介入 (< 2 hours)
3. **Level 3**: CTO/架構師支援 (critical issues)

### 關鍵聯絡人
- Database Admin: [TBD]
- Cloud Architect: [TBD]
- On-call Engineer: [TBD]

## 💡 Lessons Learned from Staging

1. **區域很重要** - Cloud SQL 和 Cloud Run 必須同區域
2. **連線池配置** - 預設值通常不夠
3. **Unix socket** - 比 TCP 更穩定但設定複雜
4. **監控先行** - 沒有監控就沒有生產環境

---

**Remember**: 寧願延後上線，也不要倉促部署。品質和穩定性是第一優先！