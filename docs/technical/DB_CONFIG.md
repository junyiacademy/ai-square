# AI Square 資料庫配置標準

## 🚨 重要：所有配置必須一致

為避免再次遇到資料庫配置不一致的問題，所有地方都必須使用以下標準配置：

### 標準配置
```bash
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=ai_square_db
DB_USER=postgres
DB_PASSWORD=postgres
```

### 檢查清單

#### ✅ 已修復的檔案
- [x] `/frontend/.env.local`
- [x] `/frontend/src/lib/repositories/base/repository-factory.ts` (預設值)
- [x] `/frontend/docker-compose.postgres.yml`
- [x] 所有測試腳本 (`src/scripts/test-*.ts`)
- [x] 所有測試 JS 檔案 (`test-*.js`)

#### 🔍 需要檢查的地方
- [ ] 任何新的測試檔案
- [ ] CI/CD 配置檔案
- [ ] 部署腳本

### 常見錯誤避免

1. **不要使用 `ai_square_dev`** - 已棄用
2. **不要使用 `ai-square-development`** - 已棄用
3. **不要使用 `aisquare2025local` 密碼** - 統一使用 `postgres`

### 如果遇到 "Scenario not found" 錯誤

1. 檢查 `.env.local` 中的 `DB_NAME`
2. 檢查 `repository-factory.ts` 中的預設值
3. 重啟 Next.js 開發伺服器
4. 確認資料庫中有資料：
   ```bash
   PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d ai_square_db -c "SELECT COUNT(*) FROM scenarios;"
   ```

### 資料庫重建指令

如果需要重建資料庫：
```bash
docker-compose -f docker-compose.postgres.yml down -v
docker-compose -f docker-compose.postgres.yml up -d
```
