# AI Square CMS 設定指南

> **Related Documents**:
> - [Content Management Spec](./content-management.md) - Detailed feature specifications
> - [Infrastructure Spec](./infrastructure.md) - Infrastructure and deployment details
> - [Product Requirements](../product-requirements-document.md) - Business requirements

## 概述

AI Square CMS 採用 Git-Based 架構，以 GitHub 作為唯一內容來源（Single Source of Truth）。本文檔說明系統架構、部署策略和配置方法。技術功能細節請參考 [Content Management Spec](./content-management.md)。

## 架構

```
Repository (Source of Truth)
    ↓
Content Service
    ↓
GCS Override Check
    ↓
Merged Content → API Response
```

## 功能

### 1. 內容編輯
- 使用 Monaco Editor 編輯 YAML
- 即時語法高亮和驗證
- 草稿和發布狀態管理

### 2. 版本控制
- 自動版本追蹤
- 完整的變更歷史
- 可回滾到任何版本

### 3. 權限管理
- 只有 admin role 可以訪問
- 基於 cookie 的認證

## 使用方式

### 訪問 CMS

1. 使用管理員帳號登入
2. 訪問 `/admin`
3. 瀏覽和編輯內容

### 編輯流程

1. **瀏覽內容**: `/admin/content`
2. **編輯**: 點擊 Edit 進入編輯器
3. **保存草稿**: 儲存但不影響線上內容
4. **發布**: 立即生效到線上環境
5. **刪除覆蓋**: 恢復到 repository 版本

## 技術實現細節

### Git-Based 內容工作流程

#### 核心概念
1. **Single Source of Truth**: GitHub repository 是唯一內容來源
2. **Pull Request Workflow**: 所有內容變更透過 PR 審核
3. **Automatic Formatting**: 自動格式化 YAML/JSON 確保一致性
4. **Version Tracking**: Git 自動追蹤所有變更歷史

#### Content Storage Structure
```
content/                    # GitHub Pages 根目錄
├── rubrics/               # Rubrics YAML 檔案
│   ├── ai-literacy.yaml
│   └── assessment.yaml
├── quizzes/               # 測驗題目 JSON 檔案
│   ├── beginner/
│   └── advanced/
├── lessons/               # 課程內容 Markdown
│   └── modules/
└── tree.json             # 內容索引檔案
```

### 內部抽象層演進（根據 PRD 4.3）

#### Storage Service 抽象
```python
# Phase 1: 直接使用 GitHub Pages
response = requests.get(f"{GITHUB_PAGES_URL}/content/tree.json")

# Phase 2: 抽象化後
class StorageBackend(ABC):
    async def load_content(self, path: str) -> dict:
        pass

class GitHubPagesBackend(StorageBackend):
    async def load_content(self, path: str) -> dict:
        # 實作 GitHub Pages 讀取
        pass

class GCSBackend(StorageBackend):
    async def load_content(self, path: str) -> dict:
        # 未來可切換到 GCS
        pass
```

#### Cache Service 實作
```python
# Phase 2: DAU > 100 時導入
class CacheService:
    def __init__(self):
        self.redis = None  # Phase 2 才實作
        self.memory_cache = {}  # Phase 1 使用
    
    async def get_or_fetch(self, key: str, fetch_func):
        # Phase 1: 記憶體快取
        if key in self.memory_cache:
            return self.memory_cache[key]
        
        # Phase 2: Redis 快取
        if self.redis:
            cached = await self.redis.get(key)
            if cached:
                return json.loads(cached)
        
        # 取得資料並快取
        data = await fetch_func()
        await self.cache(key, data)
        return data
```

#### Git Content Operations (Phase 2+)
```python
class GitContentManager:
    """管理 Git-based 內容操作"""
    
    async def save_content(self, content_type: str, content_id: str, data: dict):
        """儲存內容到 Git"""
        # 1. 格式化內容
        formatted = self.format_content(content_type, data)
        
        # 2. 寫入檔案
        file_path = self.get_file_path(content_type, content_id)
        await self.write_file(file_path, formatted)
        
        # 3. 創建 commit
        commit_msg = f"Update {content_type}: {content_id}"
        await self.git_commit(file_path, commit_msg)
        
        # 4. 可選：自動創建 PR
        if self.auto_pr_enabled:
            await self.create_pull_request(content_type, content_id)
```

### GCS 結構（過渡期使用）
```
ai-square-db/
└── cms/
    ├── overrides/      # 暫時覆蓋
    │   ├── rubrics/    # Rubrics 編輯
    │   └── content/    # 其他內容
    ├── drafts/         # 草稿
    ├── history/        # 版本歷史
    └── metadata/       # 內容元數據
```

## API 設計概要

### Content API 架構原則
- **Git-Based**: 所有內容來自 Git repository
- **Cache-First**: 優先從快取讀取，減少 Git 操作
- **Version-Aware**: 每個回應包含版本資訊
- **Source Transparent**: 明確標示資料來源

### API 分層
1. **Content Layer**: 內容讀取 API (tree, quiz, rubrics)
2. **Management Layer**: 內容管理 API (edit, version, diff)
3. **Cache Layer**: 快取管理 API (invalidate, stats)

詳細 API 規格請參考 [Content Management Spec - API Specifications](./content-management.md#api-specifications)

## 部署說明

### 漸進式部署策略

#### Phase 1-2: GitHub Pages Only
```yaml
# 部署流程
1. Push to GitHub
2. GitHub Actions 自動建置
3. 發布到 GitHub Pages
4. Frontend 直接讀取

# 成本: $0
```

#### Phase 2: 加入 CMS Service
```yaml
# 部署架構
- CMS Service: Cloud Run
- Cache: Redis (Memory Store)
- Storage: GitHub + GCS backup

# 成本: ~$50/月
```

#### Phase 3: 完整 CMS
```yaml
# 部署架構
- CMS UI: Cloud Run
- API Gateway: Cloud Endpoints
- Database: PostgreSQL
- CDN: Cloud CDN

# 成本: ~$200/月
```

## 安全考量

### Git-Based 安全優勢
1. **完整的審計記錄**：每次修改都有紀錄
2. **PR 審核機制**：防止未經授權的修改
3. **版本回滾**：可快速恢復到安全狀態
4. **分散式備份**：每個 clone 都是完整備份

### 權限管理演進
- **Phase 1-2**: 依賴 GitHub 權限
- **Phase 3**: 加入角色基礎存取控制 (RBAC)
- **Phase 4**: 細粒度權限控制

## Implementation Roadmap

### Phase 1-2: MVP (2025/01-06) - Git-Based Foundation
**架構**: GitHub Pages Only
**成本**: $0

#### 已完成
- [x] GitHub Pages 作為內容來源
- [x] YAML/JSON 內容格式定義
- [x] 前端直接讀取 GitHub Pages

#### 待完成
- [ ] 基礎內容版本追蹤
- [ ] PR-based 內容審核流程
- [ ] 內容格式驗證工具

### Phase 2: Enhanced MVP (2025/07-09) - CMS Service Layer
**架構**: GitHub + CMS Service + Redis
**成本**: ~$50/月

#### CMS 功能
- [ ] CMS API Service (FastAPI)
- [ ] Redis 快取層（DAU > 100）
- [ ] GitHub API 整合
- [ ] 基礎內容編輯 API

#### 編輯器功能
- [ ] Monaco Editor 整合
- [ ] Rubrics 基礎編輯器
- [ ] YAML 語法驗證
- [ ] 即時預覽

### Phase 3: Production (2025/10-12) - Advanced Features
**架構**: Full CMS + PostgreSQL + CDN
**成本**: ~$200/月

#### 內容管理
- [ ] 視覺化 Rubrics 編輯器
- [ ] 專家審核工作流程
- [ ] 版本比較與合併工具
- [ ] 多語言內容管理

#### AI 整合
- [ ] AI 內容生成整合
- [ ] Agent 系統架構
- [ ] 內容品質評估
- [ ] 自動標籤系統

#### 基礎設施
- [ ] PostgreSQL 資料庫（如需要）
- [ ] Cloud CDN 整合
- [ ] 進階快取策略
- [ ] 效能監控

### Phase 4+: Scale (2026+) - Enterprise Features
**架構**: Enterprise CMS Platform
**成本**: $1000+/月

#### 企業功能
- [ ] MCP 完整實作
- [ ] 多租戶內容隔離
- [ ] 企業級權限管理（RBAC）
- [ ] SSO 整合

#### 進階功能
- [ ] AI 內容品質自動評估
- [ ] 跨語言內容同步
- [ ] 自動化翻譯系統
- [ ] 內容推薦引擎

#### 擴展性
- [ ] 分散式內容儲存
- [ ] 全球內容分發
- [ ] 即時協作編輯
- [ ] API Rate Limiting

## 技術決策紀錄

### 為什麼選擇 Git-Based 架構？
1. **版本控制**: 內建完整版本歷史
2. **協作流程**: PR-based 審核機制
3. **備份安全**: 分散式儲存
4. **成本效益**: Phase 1-2 零成本
5. **漸進升級**: 可逐步加入進階功能

### 何時需要資料庫？
- DAU > 1000
- 需要使用者個人化內容
- 複雜的權限管理需求
- 即時協作編輯功能