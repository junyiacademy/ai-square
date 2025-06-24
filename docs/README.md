# 📁 文檔目錄結構

## 簡化後的目錄結構

```
docs/
├── tickets/          # 所有票據（含 spec 內容）
│   ├── in_progress/  # 正在進行的
│   └── completed/    # 已完成的（按年月日歸檔）
├── dev-logs/         # 開發日誌（從 tickets 提取）
├── test-reports/     # 測試報告（從 tickets 提取）  
├── decisions/        # ADR 決策記錄
├── handbook/         # 開發手冊（包含完整 workflow）
├── scripts/          # 自動化腳本
└── stories/          # 使用者故事和場景
```

## 使用說明

1. **開發流程**：參考 `handbook/workflow.md`
2. **票券管理**：所有開發工作都從 `make start` 開始
3. **文件歸檔**：完成的票券自動歸檔到 `completed/YYYY-MM-DD/`

## 重要文件位置

- 工作流程手冊: `handbook/workflow.md`
- 決策記錄: `decisions/ADR-*.md`
- 自動化腳本: `scripts/`
- 使用者故事: `stories/`

## 備份位置

原始結構備份在: `../docs_backup_*`
