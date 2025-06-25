# AI Square CMS 設定指南

## 概述

AI Square CMS 是一個基於 GCS (Google Cloud Storage) 的內容管理系統，允許管理員在不修改程式碼的情況下編輯 YAML 內容。

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

## GCS 結構

```
ai-square-db/
└── cms/
    ├── overrides/      # 已發布的覆蓋
    │   ├── domain/
    │   └── question/
    ├── drafts/         # 草稿
    ├── history/        # 版本歷史
    └── metadata/       # 內容元數據
```

## API 整合

所有現有 API 已自動整合 CMS：
- `/api/relations` - 領域和 KSA 數據
- `/api/assessment` - 評估題目

## 注意事項

1. **不修改 Repository**: 所有變更只存在 GCS
2. **即時生效**: 發布後立即在所有 API 生效
3. **權限控制**: 確保只有授權用戶可以編輯

## 未來擴展

- 多語言批量編輯
- AI 輔助翻譯
- 內容審核流程
- API 緩存優化