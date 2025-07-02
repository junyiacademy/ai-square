# CMS 多語言內容管理增強技術規格

> **Related Documents**:
> - [CMS Setup Guide](./cms-setup.md) - CMS architecture and deployment
> - [Dynamic Language System](./dynamic-language-system.md) - Frontend language switching
> - [Product Requirements](../product-requirements-document.md) - Business requirements

## Overview

本文檔定義 CMS 多語言內容管理功能的技術規格，基於 PRD 的漸進式架構設計。系統將從手動管理（Phase 1）演進到 AI 輔助翻譯（Phase 4）。

## 現況分析 (Phase 1-2)

### 已實現功能
- ✅ YAML 格式多語言存儲（欄位後綴：`_zh`、`_es` 等）
- ✅ 支援 9 種語言（en, zhTW, es, ja, ko, fr, de, ru, it）
- ✅ Git-Based 內容管理

### 待改進項目
- ❌ 缺乏多語言編輯介面
- ❌ 無翻譯狀態追蹤
- ❌ 需手動維護所有語言版本
- ❌ 無法批量處理翻譯

## 建議功能

### 1. 多語言欄位自動生成
當編輯內容時，自動為所有支援的語言生成對應欄位：

```yaml
# 用戶輸入
description: "AI literacy domain"

# 系統自動生成
description: "AI literacy domain"
description_zh: ""
description_es: ""
description_ja: ""
description_ko: ""
description_fr: ""
description_de: ""
description_ru: ""
description_it: ""
```

### 2. 語言切換介面
在編輯器上方新增語言標籤切換：
```
[English] [中文] [Español] [日本語] [한국어] [Français] [Deutsch] [Русский] [Italiano]
```

### 3. 翻譯狀態追蹤
顯示每個欄位的翻譯完成度：
- 🟢 已翻譯
- 🟡 需要更新（原文已修改）
- 🔴 未翻譯

### 4. AI 輔助翻譯
整合 Google Translate API 或 DeepL API：
- 一鍵翻譯所有語言
- 批量翻譯功能
- 保留人工審核機制

### 5. 多語言預覽
即時預覽不同語言版本的顯示效果

## Implementation Roadmap

### Phase 2: Basic Enhancement (2025/07-09)
**目標**: 改善手動翻譯流程

#### 功能實作
- [ ] 結構化多語言編輯介面
- [ ] 語言切換標籤
- [ ] 基礎翻譯狀態標示
- [ ] YAML 語法驗證

#### 技術需求
- Monaco Editor 客製化
- YAML 解析器增強
- 簡單的狀態管理

**成本影響**: 包含在 CMS Service 成本內（~$50/月）

### Phase 3: Advanced Features (2025/10-12)
**目標**: 翻譯流程自動化

#### 功能實作
- [ ] 翻譯進度儀表板
- [ ] 批量操作功能
- [ ] 版本比較（顯示原文變更）
- [ ] 翻譯工作流程管理

#### 技術需求
- PostgreSQL 儲存翻譯狀態
- Background job 處理
- WebSocket 即時更新

**成本影響**: 包含在 Production 成本內（~$200/月）

### Phase 4+: AI Integration (2026+)
**目標**: AI 輔助翻譯

#### 功能實作
- [ ] Google Translate API 整合
- [ ] DeepL API 整合（可選）
- [ ] 一鍵翻譯所有語言
- [ ] AI 翻譯品質評分
- [ ] 人工審核流程

#### 技術需求
- Translation API 整合
- Queue 系統處理批量翻譯
- 翻譯記憶庫（Translation Memory）

**成本影響**: 
- Translation API: ~$20/百萬字元
- 額外運算資源: ~$100/月

## 技術架構

```typescript
interface MultilingualField {
  fieldName: string;
  translations: {
    [lang: string]: {
      value: string;
      status: 'translated' | 'needs_update' | 'untranslated';
      lastUpdated?: Date;
      translator?: string;
    }
  }
}

interface CMSContent {
  fields: MultilingualField[];
  metadata: {
    primaryLanguage: string;
    supportedLanguages: string[];
    translationProgress: {
      [lang: string]: number; // percentage
    }
  }
}
```

## 使用範例

### 編輯器介面
```
┌─────────────────────────────────────────────────────┐
│ Domain: Engaging_with_AI                            │
├─────────────────────────────────────────────────────┤
│ [EN] [中文] [ES] [JA] [KO] [FR] [DE] [RU] [IT]    │
├─────────────────────────────────────────────────────┤
│ Overview:                                           │
│ ┌─────────────────────────────────────────────────┐│
│ │ AI 涉及運用AI作為工具來獲取新內容、資訊或建議... ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ [自動翻譯] [儲存草稿] [發布]                       │
└─────────────────────────────────────────────────────┘
```

## 預期效益

1. **提升效率**：減少 80% 的多語言內容管理時間
2. **降低錯誤**：避免遺漏語言版本
3. **改善品質**：統一管理所有語言版本
4. **加速國際化**：快速新增語言支援

## 技術考量

### Git-Based 架構優勢
1. **版本追蹤**: 每個語言版本的變更都有完整歷史
2. **協作翻譯**: 透過 PR 進行翻譯審核
3. **回滾能力**: 可恢復到任何歷史版本
4. **分支策略**: 可建立翻譯專用分支

### 效能優化
- **Phase 2**: Client-side YAML 解析，減少伺服器負擔
- **Phase 3**: 增量更新，只傳送變更的語言欄位
- **Phase 4**: 翻譯快取，避免重複翻譯相同內容

### 整合考量
- 與現有 YAML 結構完全相容
- 保持 Git-Based 工作流程
- 支援漸進式升級
- 不影響現有前端讀取邏輯

## 結論

此多語言增強功能遵循 PRD 的漸進式架構原則，從基礎編輯介面開始，逐步演進到 AI 輔助翻譯。每個階段都能獨立運作，確保系統穩定性的同時持續改善使用者體驗。