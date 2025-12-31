# Redis 快取優化工程實作指南

## 目錄

1. [架構決策](#架構決策)
2. [實作步驟](#實作步驟)
3. [工程實作細節](#工程實作細節)
4. [實施時間表](#實施時間表)
5. [預期成果](#預期成果)

---

## 架構決策

### 1. Redis 部署架構選擇

#### 選項分析

| 架構類型          | 成本      | 適用場景         | 優缺點                         |
| ----------------- | --------- | ---------------- | ------------------------------ |
| **單機版**        | ~$50/月   | 開發/測試環境    | ✅ 成本低<br>❌ 無高可用性     |
| **主從複製**      | ~$150/月  | Staging/小型生產 | ✅ 讀寫分離<br>✅ 自動故障轉移 |
| **Redis Cluster** | ~$500+/月 | 大型生產環境     | ✅ 水平擴展<br>✅ 自動分片     |

#### 推薦方案：Google Cloud Memorystore (Redis)

- **區域**: asia-east1 (與 Cloud Run 同區，避免跨區延遲)
- **規格**: 基礎級 1GB (開始) → 標準級 5GB (生產)
- **網路**: 使用 VPC 連接器確保安全連接

### 2. 快取策略選擇

#### Cache-Aside Pattern (推薦)

```
流程：
1. 檢查 Redis 是否有資料
2. 沒有 → 查詢資料庫
3. 寫入 Redis
4. 返回資料

優點：
- 簡單可靠
- 資料庫是真實來源
- 容錯性高
```

#### Write-Through Pattern

```
適用場景：
- 寫入頻率低
- 讀取頻率高
- 需要即時一致性
```

---

## 實作步驟

### Step 1: 環境設置

```bash
# 1. 在 Google Cloud Console 創建 Redis 實例
gcloud redis instances create ai-square-cache \
  --size=1 \
  --region=asia-east1 \
  --redis-version=redis_7_0 \
  --network=default

# 2. 獲取 Redis 連接資訊
gcloud redis instances describe ai-square-cache \
  --region=asia-east1

# 3. 配置 VPC 連接器（讓 Cloud Run 能連接 Redis）
gcloud compute networks vpc-access connectors create redis-connector \
  --region=asia-east1 \
  --network=default \
  --range=10.8.0.0/28

# 4. 更新 Cloud Run 服務配置
gcloud run services update ai-square-frontend \
  --vpc-connector=redis-connector \
  --set-env-vars="REDIS_HOST=10.xxx.xxx.xxx,REDIS_PORT=6379"
```

### Step 2: 快取鍵設計模式

#### 鍵命名規範

```
格式: {prefix}:{entity}:{id}:{field}

範例:
  scenario:pbl:uuid-123:data       # PBL 情境資料
  scenario:assessment:uuid-456:data # 評估情境資料
  user:abc-123:profile             # 用戶資料
  program:xyz-789:progress         # 學習進度
  api:relations:en:v1              # API 快取

版本控制:
  - 在鍵中加入版本號: scenario:v2:pbl:uuid-123
  - 更新時直接改版本號，舊版自動過期
```

### Step 3: TTL (過期時間) 策略

| 資料類型       | TTL    | 範例                                  |
| -------------- | ------ | ------------------------------------- |
| **靜態內容**   | 24小時 | YAML 情境資料、KSA 對應關係、翻譯內容 |
| **半靜態內容** | 1小時  | 用戶資料、學習進度摘要、排行榜        |
| **動態內容**   | 5分鐘  | 即時評分、線上狀態、通知計數          |
| **不快取**     | -      | 交易資料、密碼/敏感資訊、即時對話     |

### Step 4: 快取失效策略

#### 主動失效

```yaml
觸發時機:
  - 資料更新時
  - 用戶完成任務
  - 管理員修改內容

實作方式:
  1. 單鍵刪除: DEL key
  2. 模式刪除: 刪除 scenario:pbl:* 所有鍵
  3. 標記失效: 設置版本號
```

#### 被動失效

- TTL 自動過期
- LRU 淘汰策略 (記憶體滿時)

### Step 5: 監控指標設置

#### 關鍵指標

| 類別         | 指標              | 目標值     |
| ------------ | ----------------- | ---------- |
| **效能指標** | 命中率 (Hit Rate) | > 80%      |
|              | 響應時間 P95      | < 10ms     |
|              | 連接數            | 監控突增   |
| **資源指標** | 記憶體使用率      | 警告 > 80% |
|              | CPU 使用率        | 警告 > 60% |
|              | 網路流量          | 監控異常   |
| **業務指標** | 熱點鍵分析        | -          |
|              | 慢查詢日誌        | -          |
|              | 錯誤率追蹤        | < 0.1%     |

#### 監控工具

- Google Cloud Monitoring
- Redis INFO 命令
- 自定義 metrics 收集

### Step 6: 降級與容錯

#### 降級策略

```yaml
Redis 不可用時: 1. 自動切換到資料庫直連
  2. 記錄降級事件
  3. 限流保護資料庫
  4. 定時重試連接

熔斷器模式:
  - 失敗閾值: 連續 5 次失敗
  - 熔斷時間: 30 秒
  - 半開狀態: 允許少量請求測試

本地快取備援:
  - 使用 Node.js 記憶體快取
  - 僅快取關鍵資料
  - TTL 設置更短
```

---

## 工程實作細節

### 第一步：開發環境準備

#### 1.1 本地 Redis 安裝

```bash
# macOS
brew install redis
brew services start redis

# 或使用 Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine

# 測試連接
redis-cli ping
# 應返回: PONG
```

#### 1.2 環境變數配置

```bash
# .env.local 新增
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_ENABLED=true
```

### 第二步：建立快取層架構

#### 2.1 創建快取服務檔案結構

```
frontend/src/lib/cache/
├── redis-client.ts      # Redis 連接管理
├── cache-service.ts     # 快取邏輯封裝
├── cache-keys.ts        # 鍵名管理
└── strategies/
    ├── scenario-cache.ts # 情境快取策略
    ├── user-cache.ts     # 用戶快取策略
    └── api-cache.ts      # API 快取策略
```

#### 2.2 定義快取介面

```typescript
interface ICacheService {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  flush(pattern: string): Promise<void>;
}
```

### 第三步：實作快取策略

#### 3.1 Cache-Aside Pattern 實作流程

```
1. 收到請求
2. 生成快取鍵 (例: "scenario:pbl:uuid-123")
3. 檢查 Redis
   - 有快取 → 返回 (2ms)
   - 無快取 → 查詢 DB (200ms)
4. 寫入 Redis (TTL: 3600秒)
5. 返回資料
```

#### 3.2 快取鍵設計

```yaml
靜態資料 (TTL: 24小時):
  - scenario:{mode}:{id}
  - ksa:mapping:{version}
  - translation:{lang}:{key}

動態資料 (TTL: 5分鐘):
  - user:{id}:progress
  - program:{id}:status
  - session:{token}

即時資料 (不快取):
  - chat:messages
  - evaluation:realtime
```

### 第四步：整合到現有系統

#### 4.1 Repository 層整合優先順序

```
1. ScenarioRepository
   - getById() 加入快取
   - list() 加入快取
   - create/update 清除快取

2. UserRepository
   - getProfile() 加入快取
   - updateProgress() 更新快取

3. ProgramRepository
   - getActive() 加入快取
   - complete() 清除快取
```

#### 4.2 高優先級 API 整合

1. `/api/pbl/scenarios`
2. `/api/assessment/scenarios`
3. `/api/discovery/scenarios`
4. `/api/relations`
5. `/api/user/profile`

### 第五步：效能測試與調優

#### 5.1 測試腳本結構

```
frontend/scripts/
└── test-cache-performance.ts

測試項目:
1. 無快取時響應時間
2. 有快取時響應時間
3. 快取命中率
4. 並發請求處理能力
```

#### 5.2 壓力測試命令

```bash
# 使用 Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/pbl/scenarios

# 使用 autocannon
npx autocannon -c 100 -d 30 http://localhost:3000/api/pbl/scenarios

# 記錄結果
- 請求/秒 (RPS)
- 平均延遲
- P95/P99 延遲
```

### 第六步：監控與告警

#### 6.1 監控 Dashboard 配置

```yaml
Redis 指標:
  - 連接數
  - 記憶體使用
  - 命中/未命中率
  - 慢查詢

應用指標:
  - API 響應時間
  - 快取使用率
  - 錯誤率
```

#### 6.2 關鍵事件日誌

- 快取命中/未命中
- 快取更新/刪除
- Redis 連接錯誤
- 降級到 DB 直連

### 第七步：生產環境部署

#### 7.1 Google Cloud Memorystore 設置

```bash
# 1. 創建 Redis 實例
gcloud redis instances create ai-square-cache \
  --region=asia-east1 \
  --tier=BASIC \
  --size=1

# 2. 獲取 IP
gcloud redis instances describe ai-square-cache \
  --region=asia-east1 \
  --format="get(host)"

# 3. 配置 VPC 連接器
gcloud compute networks vpc-access connectors create \
  redis-connector \
  --region=asia-east1 \
  --subnet=default \
  --subnet-project=ai-square-2024

# 4. 更新 Cloud Run
gcloud run services update ai-square-staging \
  --vpc-connector=redis-connector \
  --region=asia-east1
```

#### 7.2 環境變數更新

```bash
# 更新 Cloud Run 環境變數
gcloud run services update ai-square-staging \
  --update-env-vars \
  REDIS_HOST=10.x.x.x,\
  REDIS_PORT=6379,\
  REDIS_ENABLED=true \
  --region=asia-east1
```

### 第八步：驗證與回滾計劃

#### 8.1 驗證檢查清單

- [ ] Redis 連接成功
- [ ] 快取寫入/讀取正常
- [ ] TTL 設置正確
- [ ] 快取失效機制運作
- [ ] 降級機制測試通過
- [ ] 監控數據正常

#### 8.2 回滾計劃

```
如果出現問題:
1. 設置 REDIS_ENABLED=false
2. 重新部署 (30秒)
3. 系統自動降級到 DB 直連
4. 調查問題原因
5. 修復後再啟用
```

---

## 實施時間表

| 階段                  | 時間  | 工作內容                                                                               |
| --------------------- | ----- | -------------------------------------------------------------------------------------- |
| **Phase 1: 基礎建設** | 第1週 | 1. 部署 Redis 實例<br>2. 配置網路連接<br>3. 實作連接池管理<br>4. 基礎健康檢查          |
| **Phase 2: 核心功能** | 第2週 | 1. 實作 Cache-Aside 模式<br>2. 設計鍵命名規範<br>3. 配置 TTL 策略<br>4. 測試快取命中率 |
| **Phase 3: 優化調整** | 第3週 | 1. 分析熱點資料<br>2. 調整 TTL 時間<br>3. 實作快取預熱<br>4. 壓力測試                  |
| **Phase 4: 監控完善** | 第4週 | 1. 設置監控告警<br>2. 建立 Dashboard<br>3. 性能基準測試<br>4. 文檔編寫                 |

### 每日實施細節

| 天數  | 任務                      |
| ----- | ------------------------- |
| 第1天 | 本地環境設置 + 基礎程式碼 |
| 第2天 | Repository 層整合         |
| 第3天 | API Routes 整合           |
| 第4天 | 測試與調優                |
| 第5天 | Staging 環境部署          |
| 第6天 | 監控設置                  |
| 第7天 | 文檔完善 + 知識轉移       |

---

## 預期成果

### 效能提升

| 指標                 | 現況  | 優化後 | 提升倍數 |
| -------------------- | ----- | ------ | -------- |
| **API 響應時間**     |       |        |          |
| `/api/pbl/scenarios` | 500ms | 50ms   | 10x      |
| `/api/relations`     | 300ms | 30ms   | 10x      |
| `/api/user/profile`  | 200ms | 20ms   | 10x      |
| **系統容量**         |       |        |          |
| 並發用戶             | 100   | 1000   | 10x      |
| RPS                  | 50    | 500    | 10x      |
| **資料庫負載**       |       |        |          |
| 查詢量               | 100%  | 20%    | -80%     |
| CPU 使用率           | 100%  | 40%    | -60%     |

### 用戶體驗提升

- 頁面載入時間：3秒 → 0.5秒
- API 回應：立即響應
- 整體流暢度：顯著提升

### 成本效益

- 資料庫查詢成本降低 80%
- 資料庫 CPU 成本降低 60%
- 整體雲端成本節省約 40%

---

## 注意事項

### 關鍵風險防範

1. **資料一致性**
   - 更新資料庫時必須同步更新/刪除快取
   - 使用事務確保一致性

2. **快取穿透**
   - 對不存在的資料也要快取空值
   - 設置較短的 TTL (如 60 秒)

3. **快取雪崩**
   - 避免大量鍵同時過期
   - 加入隨機 TTL 偏移 (±10%)

4. **熱鍵問題**
   - 對熱門資料做本地快取
   - 考慮讀寫分離或複製

5. **監控告警**
   - 設置合理閾值，避免誤報
   - 建立 on-call 機制

### 最佳實踐

1. **逐步推進**：先在開發環境驗證，再推到 Staging，最後到 Production
2. **監控先行**：先建立監控，再開始優化
3. **降級準備**：確保系統可以在無 Redis 情況下運作
4. **文檔完善**：記錄所有設計決策和操作步驟
5. **知識分享**：確保團隊成員都了解快取策略

---

## 聯絡與支援

- **專案負責人**: AI Square DevOps Team
- **文檔維護**: 定期更新，記錄實施經驗
- **問題回報**: 透過 GitHub Issues 或 Slack #ai-square-dev

---

_最後更新：2025-08-11_
_版本：1.0.0_
