# 檔案結構重組計劃

## 設計理念
- **根目錄**: 只保留專案啟動必要檔案
- **docs/**: AI 開發知識庫和所有流程文件
- **scripts/**: 移到 docs/scripts/ (開發工具)

## 重組方案

### 根目錄（保持簡潔）
```
/
├── README.md          # 專案簡介 + 快速開始 + 指向 docs/
├── Makefile          # 基本指令入口
├── frontend/         # 前端程式碼
├── backend/          # 後端程式碼
├── .gitignore
└── .githooks/        # Git hooks
```

### docs/ 目錄（AI 知識庫）
```
docs/
├── PLAYBOOK.md       # 開發指南（從根目錄移入）
├── CHANGELOG.md      # 版本記錄（從根目錄移入）
├── CLAUDE.md         # AI 專案知識（從根目錄移入）
├── scripts/          # 開發腳本（從 /scripts/ 移入）
│   ├── commit-guide.py
│   ├── setup-hooks.sh
│   └── analytics.py
├── features/         # 功能日誌
├── decisions/        # 架構決策
├── ai-tasks/        # AI 任務模板
├── tutorials/       # 教學文件
├── metrics/         # 分析報告
├── product/         # 產品文檔
├── architecture/    # 架構文檔
└── archive/         # 歸檔
```

## 移動清單

### 需要移動
1. `/PLAYBOOK.md` → `/docs/PLAYBOOK.md`
2. `/CHANGELOG.md` → `/docs/CHANGELOG.md`
3. `/CLAUDE.md` → `/docs/CLAUDE.md`
4. `/scripts/*` → `/docs/scripts/*`

### 需要更新
1. 根目錄 README.md - 簡化內容
2. Makefile - 更新腳本路徑
3. .githooks/pre-commit - 更新腳本路徑

## 新的 README.md 內容重點
1. 專案簡介（3-5句）
2. 快速開始
   - 前端: `make frontend`
   - 後端: `make backend`
3. 專案架構概覽
4. AI 開發指引
   - 閱讀 `docs/PLAYBOOK.md`
   - 使用 `docs/CLAUDE.md` 了解專案
   - 參考 `docs/ai-tasks/` 任務模板

## 預期效益
- 根目錄清爽，新人容易理解
- docs/ 成為完整的 AI 開發知識庫
- 所有流程文件集中管理
- 維持原有功能不變