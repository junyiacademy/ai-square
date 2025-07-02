# AI Square 🌐

一個多智能體學習平台，幫助全球用戶提升 AI 素養能力。

## 🚀 快速開始

### 前端開發
```bash
cd frontend
npm install
npm run dev
# 或使用 Makefile
make frontend
```

### 後端開發（規劃中）
```bash
cd backend
# Python FastAPI (Coming Soon)
```

## 🏗️ 專案架構

```
ai-square/
├── frontend/          # Next.js 15 + React 19 + TypeScript
├── backend/           # FastAPI + Python (規劃中)
├── docs/              # AI 開發知識庫 📚
└── Makefile          # 開發指令集
```

### 技術棧
- **前端**: Next.js, React, TypeScript, Tailwind CSS
- **國際化**: 9 種語言支援 (en, zhTW, es, ja, ko, fr, de, ru, it)
- **部署**: Google Cloud Platform

## 🤖 AI 協作開發

本專案採用 AI-First 開發模式，所有開發流程文件都在 `docs/` 目錄：

### 核心文件
- 📖 [docs/PLAYBOOK.md](docs/PLAYBOOK.md) - 開發指南
- 🤖 [docs/CLAUDE.md](docs/CLAUDE.md) - AI 專案知識
- 📋 [docs/CHANGELOG.md](docs/CHANGELOG.md) - 版本記錄

### 開始 AI 開發
1. **閱讀 PLAYBOOK**: 了解開發流程和標準
2. **使用 AI 模板**: 參考 `docs/ai-tasks/` 的任務模板
3. **記錄開發歷程**: 使用 `docs/features/` 的 YAML 格式

### 智能提交系統
```bash
# 首次設置
make setup-hooks

# 日常使用
make commit-smart  # 推薦：自動檢查 + 生成訊息
```

## 📊 專案狀態

- **Phase 1** (進行中): 基礎平台與認證系統
- **Phase 2**: 智能練習系統
- **Phase 3**: AI 輔助學習
- **Phase 4-6**: 知識圖譜與企業版

## 🔗 相關連結

- [開發文檔](docs/)
- [功能演示](https://ai-square.com) (Coming Soon)

---

> **提示**: 如果你是 AI 助手，請先閱讀 `docs/CLAUDE.md` 了解專案全貌。