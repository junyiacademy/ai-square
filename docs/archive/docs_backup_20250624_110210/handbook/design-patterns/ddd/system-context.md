# 系統上下文 - AI Square

## 🌐 系統概覽

AI Square 是一個多智能體學習平台，專注於 AI 素養教育。系統採用微服務架構，支援大規模多語言用戶的個人化學習體驗。

## 🏗️ 高層架構

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Square Platform                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js)  │  Backend Services  │  AI Services   │
│  ┌─────────────────┐ │  ┌───────────────┐ │ ┌─────────────┐ │
│  │ Web App         │ │  │ FastAPI Core  │ │ │ Gemini API  │ │
│  │ - Relations UI  │ │  │ - Auth        │ │ │ - Content   │ │
│  │ - i18n System   │ │  │ - Practice    │ │ │ - Assessment│ │
│  │ - User Dashboard│ │  │ - Analytics   │ │ │ - Tutor     │ │
│  └─────────────────┘ │  └───────────────┘ │ └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
           │                       │                │
           ▼                       ▼                ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Data Layer    │  │  External APIs  │  │   Cloud Infra   │
│ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │
│ │ Cloud SQL   │ │  │ │ Google Auth │ │  │ │ Cloud Run   │ │
│ │ - Users     │ │  │ │ Google Gemini│ │  │ │ Cloud Build │ │
│ │ - Practice  │ │  │ │ Email (SMTP) │ │  │ │ Cloud CDN   │ │
│ │ - Progress  │ │  │ └─────────────┘ │  │ │ Cloud SQL   │ │
│ └─────────────┘ │  └─────────────────┘  │ └─────────────┘ │
│ ┌─────────────┐ │                       │ ┌─────────────┐ │
│ │ File Store  │ │                       │ │ Monitoring  │ │
│ │ - YAML Data │ │                       │ │ - Logs      │ │
│ │ - Images    │ │                       │ │ - Metrics   │ │
│ │ - Content   │ │                       │ │ - Alerts    │ │
│ └─────────────┘ │                       │ └─────────────┘ │
└─────────────────┘                       └─────────────────┘
```

## 🎯 核心能力

### 1. AI 素養框架 (Core Domain)
- **四大領域**: Engaging, Creating, Managing, Designing with AI
- **KSA 三維**: Knowledge, Skills, Attitudes 指標系統
- **多語言支援**: 9 種語言的完整本地化

### 2. 學習體驗 (Learning Domain)
- **個人化評估**: 基線測試與適應性學習
- **進度追蹤**: 學習歷程記錄與分析
- **社交學習**: 同儕互動與協作功能

### 3. 內容管理 (Content Domain)
- **動態內容**: YAML 驅動的可配置內容
- **多媒體支援**: 圖片、影片、互動內容
- **版本控制**: Git-based 內容管理流程

### 4. 用戶管理 (Identity Domain)
- **多元認證**: Google OAuth, Email/Password
- **角色管理**: 學習者、教育者、管理者
- **權限控制**: 細粒度的功能權限管理

## 🌍 外部系統整合

### 認證與授權
```
Google OAuth 2.0
├── 用戶身份驗證
├── 個人資料同步
└── 單點登入 (SSO)

Email Service (SMTP)
├── 註冊驗證郵件
├── 密碼重設通知
└── 學習進度報告
```

### AI 服務整合
```
Google Gemini API
├── 內容生成與補強
├── 個人化學習建議
├── 智能評估與回饋
└── 自然語言處理

Future AI Services
├── OpenAI GPT-4 (備選)
├── Claude API (對話)
├── LangChain (Orchestration)
└── CrewAI (Multi-Agent)
```

### 雲端基礎設施
```
Google Cloud Platform
├── Cloud Run (容器化部署)
├── Cloud SQL (關聯式資料庫)
├── Cloud Storage (檔案存儲)
├── Cloud CDN (內容分發)
├── Cloud Build (CI/CD)
└── Cloud Monitoring (監控)
```

## 📊 資料流架構

### 讀取路徑 (Query)
```
User Request
    ↓
Next.js Frontend
    ↓
API Routes (/api/*)
    ↓
Data Layer (YAML + SQL)
    ↓
Response (JSON)
    ↓
UI Rendering
```

### 寫入路徑 (Command)
```
User Action
    ↓
Frontend Validation
    ↓
API Endpoint
    ↓
Business Logic
    ↓
Database Transaction
    ↓
Event Publishing
    ↓
Background Processing
```

## 🔒 安全性考量

### 認證與授權
- **JWT Token**: 無狀態認證機制
- **RBAC**: 角色基礎存取控制
- **CSRF Protection**: 跨站請求偽造防護
- **Rate Limiting**: API 請求頻率限制

### 資料保護
- **HTTPS Everywhere**: 全站 SSL 加密
- **Data Encryption**: 敏感資料加密存儲
- **GDPR Compliance**: 歐盟資料保護法規遵循
- **Backup & Recovery**: 資料備份與災難恢復

### 隱私設計
- **Minimal Data Collection**: 最小化資料收集原則
- **User Control**: 用戶資料控制權
- **Anonymization**: 分析資料匿名化
- **Audit Logs**: 存取記錄審計追蹤

## 📈 可擴展性設計

### 水平擴展
```
Load Balancer
├── Frontend Instance 1 (Cloud Run)
├── Frontend Instance 2 (Cloud Run)
└── Frontend Instance N (Cloud Run)
    ↓
API Gateway
├── Backend Service 1 (FastAPI)
├── Backend Service 2 (FastAPI)
└── Backend Service N (FastAPI)
    ↓
Database Cluster
├── Primary (Read/Write)
└── Replicas (Read Only)
```

### 垂直擴展
- **Cloud Run**: 自動擴展容器資源
- **Cloud SQL**: 動態 CPU/Memory 調整
- **CDN**: 全球內容分發加速
- **Caching**: Redis/Memcached 快取層

## 🎯 效能目標

### 回應時間
- **首頁載入**: < 2 秒 (LCP)
- **API 回應**: < 500ms (95th percentile)
- **語言切換**: < 300ms
- **頁面轉換**: < 1 秒

### 可用性
- **系統可用性**: 99.9% (SLA)
- **錯誤率**: < 0.1%
- **恢復時間**: < 5 分鐘 (RTO)
- **資料遺失**: 零容忍 (RPO = 0)

### 容量規劃
- **並發用戶**: 10,000 active users
- **峰值 QPS**: 1,000 requests/second
- **資料成長**: 1TB/year
- **全球延遲**: < 200ms (主要地區)

## 🔄 演進策略

### Phase 1: Monolith First (當前)
- Next.js Full-Stack Application
- 整合式前後端架構
- 快速原型驗證

### Phase 2: API Separation
- 前後端分離
- FastAPI 獨立服務
- 資料層標準化

### Phase 3: Microservices
- 領域服務拆分
- Event-Driven Architecture
- 獨立部署與擴展

### Phase 4: AI-Native
- 智能化微服務
- 多模型整合
- 自適應學習系統

---

> **架構原則**: 簡單優先、漸進演化、安全第一、用戶體驗為王