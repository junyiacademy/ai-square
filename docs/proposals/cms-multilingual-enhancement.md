# CMS 多語言內容管理增強提案

## 現況分析

目前的 CMS 系統：
- ✅ 支援 YAML 格式編輯
- ✅ 支援多語言內容存儲（透過欄位後綴，如 `_zh`、`_es`）
- ❌ 缺乏多語言內容輔助工具
- ❌ 需要手動管理所有語言版本

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

## 實作方案

### Phase 1：基礎多語言編輯器（1-2 週）
1. 將純文字編輯器改為結構化表單
2. 自動識別多語言欄位
3. 提供語言切換介面

### Phase 2：翻譯管理（2-3 週）
1. 翻譯狀態追蹤
2. 翻譯進度報表
3. 缺失翻譯提醒

### Phase 3：AI 整合（3-4 週）
1. 整合翻譯 API
2. 實作批量翻譯
3. 建立審核流程

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

## 結論

此增強功能將大幅改善 CMS 的多語言內容管理體驗，使內容編輯者能更有效率地維護多語言版本，確保所有語言版本的一致性和完整性。