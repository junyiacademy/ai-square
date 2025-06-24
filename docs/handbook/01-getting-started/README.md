# 📚 開發手冊索引

## 核心文檔

### 工作流程
- [開發工作流程](workflow.md) - 三階段開發流程說明
- [票券驅動開發](workflows/TICKET_DRIVEN_DEVELOPMENT.md) - 詳細的票券管理流程
- [PLAYBOOK](PLAYBOOK.md) - 專案開發指南
- [快速參考](quick-reference.md) - 常用命令速查

### 技術指南
- [前端開發指南](guides/frontend-guide.md) - Next.js 開發規範
- [測試策略](technical/test-strategy.md) - 測試方法和標準
- [開發標準](legacy/development-standards.md) - 編碼規範

### 規劃文檔
- [檔案結構規劃](planning/FILE_STRUCTURE_PLAN.md)
- [遷移計畫](planning/MIGRATION_PLAN.md)

### 報告
- [簡化工作總結](simplification-summary.md) - 2024-06-24 流程簡化
- [遷移報告](migration-report.md) - 文檔重組詳情
- [CHANGELOG](CHANGELOG.md) - 變更歷史

## 文件位置對照表

| 原位置 | 新位置 | 說明 |
|--------|--------|------|
| `/docs/PLAYBOOK.md` | `/docs/handbook/PLAYBOOK.md` | 開發指南 |
| `/docs/archive/legacy/` | `/docs/handbook/legacy/` | 歷史技術文檔 |
| `/docs/workflows/` | `/docs/handbook/workflows/` | 工作流程文檔 |
| `/docs/bugs/` | `/docs/specs/bug-analysis/` | Bug 分析報告 |
| `/docs/features/` | `/docs/specs/features/` | 功能規格書 |
| `/docs/refactoring/` | `/docs/specs/refactoring/` | 重構計畫 |
| `/docs/testing/` | `/docs/test-reports/legacy/` | 測試文檔 |
| `/docs/time-logs/` | `/docs/archive/time-logs/` | 時間記錄（純歸檔） |

## 目錄結構說明

### `/docs/handbook/` - 開發手冊
主動參考的指南、標準、流程文檔
- `core-practices/` - 核心開發實踐（TDD、BDD、Git工作流）
- `design-patterns/` - 設計模式（DDD、前端架構）
- `product/` - 產品規格和願景
- `guides/` - 操作指南
- `improvements/` - 改進建議（自動生成）

### `/docs/specs/` - 規格文檔
- `features/` - 功能規格
- `bug-analysis/` - Bug 分析
- `refactoring/` - 重構計畫

### `/docs/dev-logs/` - 開發日誌
- 按日期組織（YYYY-MM-DD）
- `archive/` - 歷史開發日誌

### `/docs/test-reports/` - 測試報告
- `legacy/` - 歷史測試文檔
- `reports/` - 測試執行報告

### `/docs/archive/` - 純歸檔
不常查閱的歷史文件（如 time-logs）

## 快速導航

- 🎯 [開始新任務](workflow.md#第一階段啟動-ticket)
- 🔍 [檢查開發狀態](workflow.md#第二階段進入開發)
- 📝 [提交工作](workflow.md#第三階段commit-流程)
- 📚 [ADR 決策記錄](../decisions/)
- 🛠️ [自動化腳本](../scripts/)
- 📖 [使用者故事](../stories/)