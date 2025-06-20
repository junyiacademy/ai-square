# Changelog - AI Square

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [2024-06-20] - Phase 1: Documentation System

### Added
- 完整 BDD/DDD/TDD 文檔架構系統
- AI 引導開發自動化腳本 (`docs/workflows/start-dev.py`)
- 智能提交檢查系統 (`docs/workflows/commit-guide.py`)
- 產品維度文檔：願景、用戶角色、Epic、功能規格
- 架構維度文檔：系統上下文、界限上下文、通用語言
- 技術維度文檔：測試策略、前端實作指南
- 增強版 Makefile 包含 AI 開發指令和品質檢查

### Changed
- 優化 `.gitignore` 規則，排除開發暫存檔案
- 工作流程腳本加入可執行權限

### Fixed
- 修正多語言系統 i18n 架構不一致問題
- 移除 `next.config.ts` 中不相容的 i18n 配置
- 標準化使用 `react-i18next` 系統
- 改善語言偏好持久化機制

## [2024-06-19] - Phase 0: Project Foundation

### Added
- 初始專案架構建立
- Next.js 15 + React 19 + TypeScript 5 技術棧
- 多語言支援系統 (9 種語言)
- AI 素養框架 YAML 資料結構
- 基礎 AI 素養關係視覺化頁面
- Google Cloud Platform 部署配置

### Changed
- 完善專案 README 文檔
- 建立基礎開發工作流程

---

> **自動化說明**: 此 Changelog 部分內容由 AI 引導開發系統自動生成和維護。重大版本和里程碑會手動編輯以確保準確性。