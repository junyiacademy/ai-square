# ADR-002: 測試策略與 TDD 實踐

**日期**: 2025-06-22  
**狀態**: 已接受  
**決策者**: 技術團隊

## Context
專案需要明確的測試策略來確保程式碼品質，特別是在 AI 協作開發模式下。

## Decision
採用測試金字塔架構，結合 TDD 和 BDD：

### 測試分配
- **單元測試 (70-80%)**: 快速、專注邏輯
- **整合測試 (15-25%)**: API、服務整合
- **E2E 測試 (5-10%)**: 關鍵用戶旅程

### 核心原則
1. **先寫測試，後寫程式碼** (TDD)
2. **測試覆蓋率目標**: 
   - 整體 ≥ 80%
   - 核心功能 ≥ 95%
3. **每個 PR 必須包含測試**

### 工具鏈
- **單元測試**: Jest + React Testing Library
- **整合測試**: Supertest
- **E2E 測試**: Playwright

## Consequences

### Positive
- 高品質的程式碼
- 減少 regression bugs
- 更好的程式碼設計
- AI 生成的程式碼有測試保護

### Negative
- 初期開發速度較慢
- 需要維護測試程式碼
- 團隊需要 TDD 訓練

### Neutral
- 測試成為開發流程的一部分
- 需要在 CI/CD 中整合測試

## Implementation Notes

參考完整測試策略文檔：`archive/legacy/technical/test-strategy.md`

在開發日誌中追蹤測試覆蓋率：
```yaml
# dev-logs/YYYY-MM-DD-feature-xxx.yml
metrics:
  test_coverage: 95
```