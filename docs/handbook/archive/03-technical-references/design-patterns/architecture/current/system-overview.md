# AI Square 系統架構總覽

## 🏗️ 當前架構 (2025-06)

### 整體架構
```
┌─────────────────────────────────────────┐
│           用戶瀏覽器                      │
└─────────────────┬───────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────┐
│         Google Cloud CDN                 │
│         (靜態資源快取)                    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Google Cloud Run (Frontend)        │
│         Next.js 15 App                   │
│      ┌─────────────────────────┐        │
│      │   App Router (React 19)  │        │
│      │   - SSR/CSR 混合         │        │
│      │   - API Routes          │        │
│      └─────────────────────────┘        │
└─────────────────┬───────────────────────┘
                  │ 內部 API
┌─────────────────▼───────────────────────┐
│      Google Cloud Run (Backend)         │
│         FastAPI (計劃中)                  │
│      ┌─────────────────────────┐        │
│      │   - AI 服務整合          │        │
│      │   - 資料處理            │        │
│      │   - 認證授權            │        │
│      └─────────────────────────┘        │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ Google Gemini│    │  Firestore   │
│   AI API     │    │   Database   │
└──────────────┘    └──────────────┘
```

## 📦 技術棧

### Frontend (實作中)
- **框架**: Next.js 15 (App Router)
- **UI**: React 19 + TypeScript
- **樣式**: Tailwind CSS
- **國際化**: react-i18next (9 語言)
- **狀態管理**: React Context + useReducer
- **測試**: Jest + React Testing Library

### Backend (Phase 2)
- **框架**: FastAPI
- **語言**: Python 3.11+
- **AI**: Google Gemini API
- **資料庫**: Firestore
- **認證**: Firebase Auth

### 部署環境
- **平台**: Google Cloud Platform
- **容器**: Cloud Run (自動擴展)
- **CI/CD**: GitHub Actions
- **監控**: Cloud Monitoring

## 🔄 資料流

### 1. 靜態內容載入
```
用戶 → CDN → Next.js SSR → 返回 HTML
```

### 2. 動態資料請求
```
React → API Route → Backend API → Firestore → 返回 JSON
```

### 3. AI 互動流程 (計劃中)
```
用戶輸入 → Backend → Gemini API → 處理回應 → 返回結果
```

## 🏛️ 架構原則

### 1. 漸進式架構
- 從單體應用開始
- 需要時才拆分服務
- 保持簡單，避免過度設計

### 2. 關注點分離
- Frontend: 用戶體驗
- API Routes: BFF (Backend for Frontend)
- Backend: 業務邏輯和 AI 整合

### 3. 可擴展性
- 無狀態設計
- 水平擴展 (Cloud Run)
- 快取策略 (CDN + localStorage)

## 📍 當前狀態

### 已完成 ✅
- Next.js 基礎架構
- 多語言支援
- 認證系統（本地）
- 響應式設計

### 進行中 🚧
- 測試覆蓋率提升
- 效能優化
- 文檔完善

### 計劃中 📋
- FastAPI 後端
- Gemini AI 整合
- Firestore 資料庫
- OAuth 認證

## 🔗 相關文檔
- [技術棧決策](./tech-stack.md)
- [部署架構](./deployment.md)
- [API 設計規範](./api-design.md)