# Level 3: Advanced Integration Tests

這個層級包含更複雜的整合測試，需要：
- API server 運行
- 完整的資料庫資料
- 多個服務協同工作

## 測試內容

1. **complete-flows.test.ts** - 完整學習流程測試
2. **cache-consistency.test.ts** - 快取一致性測試
3. **performance.test.ts** - 效能測試

## 執行方式

```bash
# 啟動 API server
npm run dev

# 執行 Level 3 測試
npm run test:integration:level-3
```

## 注意事項

這些測試比 Level 1 和 Level 2 更複雜，執行時間更長，適合在：
- 完整的 CI/CD pipeline
- 發布前的完整測試
- 開發環境有完整服務時
