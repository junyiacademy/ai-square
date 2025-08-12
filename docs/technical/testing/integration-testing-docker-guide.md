# Integration Tests Docker 環境設置指南

## 📋 問題分析

Integration tests 失敗是因為需要：
1. PostgreSQL (port 5433)
2. Redis (port 6379)
3. 正確的測試資料庫 schema

## 🐳 解決方案：Docker Compose 測試環境

### 1. 檔案結構

```
ai-square/
├── docs/
│   └── technical/testing/
│       └── integration-testing-docker-guide.md  # 本文檔
└── frontend/
    ├── docker-compose.test.yml           # 測試環境 Docker 配置
    ├── scripts/
    │   ├── test-integration.sh           # 完整測試腳本
    │   └── test-integration-quick.sh     # 開發用快速測試
    ├── .env.test                          # 測試環境變數
    └── tests/integration/
        └── setup/test-environment.ts      # 增強的測試設置
```

### 2. 核心檔案說明

#### `docker-compose.test.yml`
- PostgreSQL 15 Alpine (port 5433)
- Redis 7 Alpine (port 6379)
- 自動載入 schema 和 migration
- 使用 tmpfs 提升效能
- 健康檢查確保服務就緒

#### `scripts/test-integration.sh`
- 完整的生命週期管理
- 等待服務健康檢查
- 自動清理
- 彩色輸出和狀態報告

#### `.env.test`
- 測試專用環境變數
- 禁用外部服務
- 正確的連線配置

## 🚀 使用方式

### 開發時測試

```bash
# 從 frontend 目錄執行
cd frontend

# 啟動測試環境
docker-compose -f docker-compose.test.yml up -d

# 執行特定測試
npm test -- tests/integration/cache/cache-consistency.test.ts

# 快速測試特定模式
./scripts/test-integration-quick.sh "cache"

# 關閉測試環境
docker-compose -f docker-compose.test.yml down
```

### CI/CD 整合

```bash
# 一鍵執行所有 integration tests
cd frontend
npm run test:integration:docker
```

### 可用的 npm scripts

```json
{
  "scripts": {
    "test:integration": "jest --config jest.integration.config.js --runInBand --forceExit",
    "test:integration:docker": "bash scripts/test-integration.sh",
    "test:integration:watch": "docker-compose -f docker-compose.test.yml up -d && jest --config jest.integration.config.js --watch"
  }
}
```

## 📊 預期結果

執行 `npm run test:integration:docker` 後應該看到：

```
🚀 Starting integration test environment...
🛑 Stopping existing containers...
▶️  Starting test services...
⏳ Waiting for services to be ready...
✅ All services are ready!
🧪 Running integration tests...

PASS tests/integration/raw-pg.test.js
PASS tests/integration/simple-db.test.ts
PASS tests/integration/cache/cache-consistency.test.ts
PASS tests/integration/flows/complete-learning-journey.test.ts

Test Suites: 7 passed, 7 total
Tests:       45 passed, 45 total

✅ All integration tests passed!
🧹 Cleaning up...
```

## 🔧 故障排除

### 1. Port 衝突

```bash
# 檢查 port 使用
lsof -i :5433
lsof -i :6379

# 停止衝突的服務
sudo systemctl stop postgresql
sudo systemctl stop redis
```

### 2. Docker 權限問題

```bash
# 確保 Docker daemon 運行中
docker ps

# 如果需要 sudo（不建議）
sudo docker-compose -f docker-compose.test.yml up -d
```

### 3. Schema 載入失敗

```bash
# 檢查容器日誌
docker-compose -f docker-compose.test.yml logs postgres-test

# 手動載入 schema
docker exec -i ai-square-test-db psql -U postgres -d ai_square_db < frontend/src/lib/repositories/postgresql/schema-v3.sql
```

### 4. 服務健康檢查失敗

```bash
# 檢查服務狀態
docker-compose -f docker-compose.test.yml ps

# 重啟服務
docker-compose -f docker-compose.test.yml restart
```

### 5. 測試環境變數問題

```bash
# 檢查 .env.test 檔案
cat frontend/.env.test

# 確保環境變數正確載入
printenv | grep -E "(DB_|REDIS_|NODE_ENV)"
```

## 💡 進階優化

### 1. 並行測試資料庫

如需多個獨立的測試資料庫：

```yaml
# docker-compose.test.yml
environment:
  POSTGRES_MULTIPLE_DATABASES: test_db_1,test_db_2,test_db_3
```

### 2. 測試資料預載

```bash
# 在 docker-entrypoint-initdb.d 中加入
- ./test-data/seed.sql:/docker-entrypoint-initdb.d/03-seed.sql
```

### 3. 效能監控

```bash
# 加入測試執行時間監控
npm run test:integration:docker 2>&1 | tee test-results.log
```

## 🎯 最佳實踐

1. **使用 tmpfs**: PostgreSQL 資料存在記憶體中，提升測試速度
2. **健康檢查**: 確保服務完全就緒後再執行測試
3. **自動清理**: 測試完成後自動停止容器
4. **環境隔離**: 使用獨立的測試資料庫和 Redis 實例
5. **並行控制**: 使用 `--runInBand` 避免並行測試衝突

## 📈 效能比較

| 方式 | 啟動時間 | 測試執行時間 | 清理時間 |
|------|----------|--------------|----------|
| 本地安裝 | N/A | ~30s | N/A |
| Docker | ~15s | ~35s | ~5s |
| Testcontainers | ~25s | ~40s | ~10s |

Docker 方式在開發效率和環境一致性方面最優。

## 🔄 GitHub Actions 整合

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'

    - name: Install dependencies
      run: |
        cd frontend
        npm ci

    - name: Run integration tests
      run: |
        cd frontend
        npm run test:integration:docker
```

這個設置讓所有 integration tests 能夠在乾淨、一致的環境中執行，大幅提升測試可靠性！ 