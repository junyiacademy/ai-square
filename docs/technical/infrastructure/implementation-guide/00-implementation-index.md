# 實作指南索引

## 概述

本目錄包含 AI Square 架構重構的詳細實作指南，提供可直接使用的程式碼範例和實作步驟。

## 📚 實作指南清單

### 1. [Storage 抽象層實作](./01-storage-abstraction-implementation.md)
**內容摘要**：
- IStorageProvider 介面定義
- LocalStorage Provider 完整實作
- GCS Provider 實作範例
- 快取和重試裝飾器
- 錯誤處理機制
- 完整測試範例

**關鍵程式碼**：
- `IStorageProvider` - 統一的儲存介面
- `LocalStorageProvider` - 瀏覽器儲存實作
- `@Cacheable` - 快取裝飾器
- `@Retryable` - 重試裝飾器

**實作時間**：16-20 小時

---

### 2. [Repository Pattern 實作](./02-repository-pattern-implementation.md)
**內容摘要**：
- 領域實體定義（BaseEntity）
- Repository 介面設計
- BaseRepository 抽象類別
- CachedRepository 實作
- Unit of Work 模式
- 具體 Repository 範例

**關鍵程式碼**：
- `BaseEntity` - 實體基類
- `IRepository<T>` - Repository 介面
- `BaseRepository<T>` - 基礎實作
- `UnitOfWork` - 事務管理

**實作時間**：24-30 小時

---

### 3. [Session 統一實作](./03-session-unification-implementation.md)
**內容摘要**：
- BaseSession 抽象類別
- AssessmentSession 實作
- PBLSession 實作
- DiscoverySession 實作
- SessionManager 統一管理
- Hook 整合範例

**關鍵程式碼**：
- `BaseSession<TContext, TProgress>` - Session 基類
- `AssessmentSession` - 測驗 Session
- `PBLSession` - PBL 學習 Session
- `DiscoverySession` - 探索 Session
- `SessionManager` - Session 管理器

**實作時間**：32-40 小時

---

## 🔄 實作順序建議

### Phase 1: 基礎建設（第1-2週）
1. **先實作 Storage 抽象層**
   - 建立介面定義
   - 實作 LocalStorageProvider
   - 加入測試

2. **測試 Storage 層**
   - 單元測試
   - 整合測試
   - 效能測試

### Phase 2: 資料層（第3-4週）
3. **實作 Repository Pattern**
   - 建立領域實體
   - 實作 BaseRepository
   - 建立具體 Repository

4. **實作 Unit of Work**
   - 事務管理
   - Repository 協調

### Phase 3: Session 統一（第5-6週）
5. **實作 BaseSession**
   - 生命週期管理
   - 進度追蹤
   - 評估整合

6. **實作具體 Session**
   - Assessment Session
   - PBL Session
   - Discovery Session

7. **實作 SessionManager**
   - Session 創建和管理
   - 快取機制

## 📋 實作檢查清單

### Storage 層 ✓
- [ ] IStorageProvider 介面
- [ ] LocalStorageProvider 實作
- [ ] 錯誤處理
- [ ] 快取機制
- [ ] 單元測試

### Repository 層 ✓
- [ ] BaseEntity 類別
- [ ] IRepository 介面
- [ ] BaseRepository 實作
- [ ] SessionRepository
- [ ] Unit of Work
- [ ] 整合測試

### Session 層 ✓
- [ ] BaseSession 抽象類
- [ ] AssessmentSession
- [ ] PBLSession
- [ ] DiscoverySession
- [ ] SessionManager
- [ ] useSession Hook

## 🛠️ 開發工具設置

### 必要依賴
```json
{
  "dependencies": {
    "@google-cloud/storage": "^7.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0",
    "jest": "^29.0.0",
    "@testing-library/react-hooks": "^8.0.0"
  }
}
```

### TypeScript 設定
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## 💡 實作提示

### 1. 從小開始
- 先實作最簡單的功能
- 逐步增加複雜度
- 保持程式碼可測試

### 2. 測試驅動
- 先寫測試，再寫實作
- 確保測試覆蓋率 > 80%
- 包含邊界情況測試

### 3. 漸進式遷移
- 使用 Adapter Pattern
- 保持向後相容
- 分階段部署

### 4. 效能考量
- 實作快取機制
- 避免過度查詢
- 監控記憶體使用

## 📞 支援資源

### 文檔連結
- [總體架構設計](../01-design-unified-architecture.md)
- [依賴分析報告](../02-analyze-dependencies.md)
- [工作量估算](../03-estimate-refactoring-effort.md)

### 相關工具
- [Prisma](https://www.prisma.io/) - 未來的 ORM
- [Jest](https://jestjs.io/) - 測試框架
- [TypeScript](https://www.typescriptlang.org/) - 類型系統

## 🎯 成功標準

### 程式碼品質
- TypeScript 嚴格模式
- 0 any 類型
- ESLint 無錯誤

### 測試覆蓋
- 單元測試 > 90%
- 整合測試 > 80%
- E2E 測試關鍵路徑

### 效能指標
- Storage 操作 < 50ms
- Repository 查詢 < 100ms
- Session 載入 < 200ms

---

這些實作指南提供了完整的程式碼範例和實作細節，可以直接用於開發。建議按照順序逐步實作，確保每個階段都經過充分測試後再進行下一步。