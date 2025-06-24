# Changelog - AI Square

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- implement pre-commit and post-commit documentation generation (60fb717)
### Fixed
- improve time tracking accuracy (b79d337)
- improve time tracking accuracy (50f9a2d)
- improve time tracking accuracy (8f16e4c)
## [2025-06-23] - 開發流程自動化與品質門檻建立

### Added
- **智能提交分析系統** (dc21387)
  - 實作 smart-commit-analyzer.py 自動化提交分析
  - 整合 pre-commit 和 post-commit hooks 自動化流程
  - 建立智能化的提交訊息處理機制
  
- **全面性工作流程自動化** (28678b7)
  - 設置 GitHub Actions CI/CD pipeline 支援多版本測試 (Node.js 18.x, 20.x)
  - 實作 pre-push hook 確保程式碼品質
  - 建立多層次品質檢查點：pre-commit → pre-push → CI/CD
  - 創建 ADR-020 記錄架構決策
  
- **開發日誌自動生成系統** (678eac2, ba7c0ae)
  - 實作 pre-commit 開發日誌生成功能
  - 實作 post-commit 文檔自動更新機制
  - 整合 changelog 自動更新流程
  - 支援時間追蹤與分析 (commit-based analysis)

- **文件命名規範系統** (01b4100, 0b5f1a8)
  - 實作智能檔案名稱生成邏輯
  - 優化檔名長度限制處理
  - 建立一次性腳本清理政策
  
- **測試整合** (59ae5cf)
  - 將測試執行整合到 commit 工作流程
  - 支援基礎設施變更的測試豁免機制
- implement comprehensive ticket management system with parallel development support (94453f0)
- implement AI auto-commit prevention mechanism (4658190)
- implement pre-commit and post-commit documentation generation (03572d3)

### Changed
- **提交訊息生成改進** (f42e828, 4c1de64)
  - 增強提交訊息生成邏輯
  - 改進多檔案變更的描述方式
  
- **開發日誌結構重組** (788776a, 97de2d2, 7f572ab)
  - 簡化 dev logs 目錄結構
  - 移除子目錄分類，採用日期資料夾組織
  - 修正錯誤放置的檔案

- **CLAUDE.md 規則強化**
  - 嚴格禁止 AI 助手使用直接 git 命令
  - 明確規定必須使用 Makefile 工作流程
  - 加入違規處理的明確指引

### Fixed
- **時間計算修正** (e030932)
  - 修復 int() 轉 round() 的問題
  - 解決小於一分鐘的時間被轉為 0 的問題
  - 正確顯示小數點時間（如 0.9 分鐘）

- **Git hooks 問題** (f1cd8ff)
  - 停用有問題的 git hooks
  - 清理設定檔案
  
- **測試修復**
  - 修復 Header 組件鍵盤導航測試
  - 修復 API 路由的 NextResponse mock 問題
  - 修復 i18next 設定問題
- fix filename duplication, improve time calculation, and prevent recursive tracking (ea06b2d)
- fix translation key mismatch and responsive title overflow (39b3aaf)
- fix time calculations and implement bidirectional ticket linking (2e22dbc)

### Removed
- 移除遷移腳本 (366b72e)
- 清理測試用暫存檔案 (7d0edf4, adcbb99)

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