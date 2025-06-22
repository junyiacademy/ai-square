# Changelog - AI Square

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [2025-06-22] - 智能首頁與國際化完善

### 新增功能
- **智能首頁登入整合**: 首頁現在會自動檢測登入狀態，已登入用戶直接跳轉到 relations 頁面
- **統一語言選擇器**: 將語言選擇器整合到 Header 組件，所有頁面共享統一的語言切換體驗
- **完整國際化支援**: 為所有 9 種支援語言提供完整的登入系統翻譯

### 改進功能
- **用戶體驗優化**: 
  - 首頁載入時顯示優雅的檢查狀態動畫
  - 語言選擇器在所有頁面都可見，提供一致的操作體驗
  - 統一的視覺設計和互動行為
- **程式碼重構**:
  - 創建可重用的 `LanguageSelector` 組件
  - 使用事件驅動架構實現頁面間語言狀態同步
  - 移除重複的語言選擇邏輯，提高代碼維護性

### 技術改進
- **i18n 系統完善**: 
  - 統一使用 react-i18next 配置
  - 為所有語言提供完整的 auth 命名空間翻譯
  - 改善語言偵測和儲存機制
- **建置品質**: 
  - 移除所有未使用的 imports 和變數
  - 通過 TypeScript 嚴格檢查
  - 通過 ESLint 代碼規範檢查

### 修正問題
- 修正首頁硬編碼中文文字問題
- 修正 Relations 頁面語言選擇器重複的問題
- 修正不同頁面間語言狀態不同步的問題

### 文檔更新
- 新增智能首頁功能規格文檔
- 新增語言選擇器整合工作日誌
- 更新語言切換功能文檔
- 完善開發工作記錄

## [2024-06-21] - Header 登入狀態顯示功能

### Added
- Header 組件顯示登入狀態 (前端功能更新, 測試改進)
- 響應式導航欄支援桌面和移動版
- 跨 tab 登入狀態同步功能
- 完整 TDD 測試套件：Header 組件 19 個測試案例

### Changed
- 全域 layout 整合 Header 組件到所有頁面
- 登入用戶體驗提升：任何頁面都能看到登入狀態

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