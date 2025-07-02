# 動態語言系統技術規格

> **Related Documents**:
> - [CMS Multilingual Enhancement](./cms-multilingual-enhancement.md) - Backend multilingual content management
> - [Content Management Spec](./content-management.md) - Content system architecture
> - [Product Requirements](../product-requirements-document.md) - Business requirements

## Overview

本文檔定義動態語言系統的技術規格，實現從預設 9 種語言（Phase 1）到無限語言支援（Phase 4+）的演進。系統將利用 LLM 提供即時翻譯，並透過智能快取優化成本。

## 現況分析 (Phase 1-2)

### 已實現功能
- ✅ 支援 9 種預設語言（en, zhTW, es, ja, ko, fr, de, ru, it）
- ✅ 基於 YAML 欄位後綴的多語言存儲
- ✅ react-i18next 前端國際化框架
- ✅ 語言切換功能

### 限制
- ❌ 只能使用預設語言
- ❌ 新增語言需要修改程式碼
- ❌ 無法動態載入翻譯
- ❌ 缺少翻譯品質管理

## 2. 核心理念

### 2.1 無限語言支援
- 用戶可以輸入任何語言代碼或名稱
- 系統自動識別並提供該語言支援
- 不限於 ISO 639-1 標準語言代碼

### 2.2 智能快取管理
- LLM 翻譯結果自動存儲到 GCS
- 追蹤使用頻率和翻譯品質
- 高頻內容自動同步到版本控制

### 2.3 成本優化
- 優先使用快取內容
- 批量翻譯以減少 API 呼叫
- 智能預載可能需要的翻譯

## 3. 技術架構

### 3.1 系統架構圖
```
┌─────────────────────────────────────────────────┐
│                用戶介面                          │
│         語言選擇器 | 自定義語言輸入              │
├─────────────────────────────────────────────────┤
│              翻譯管理層                          │
│    快取檢查 → LLM 翻譯 → 品質評分 → 儲存        │
├─────────────────────────────────────────────────┤
│              資料儲存層                          │
│   Memory Cache | GCS Storage | Git Repository   │
└─────────────────────────────────────────────────┘
```

### 3.2 資料模型
```typescript
interface Translation {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  context?: string; // 上下文資訊
  quality: {
    score: number; // 0-1
    provider: string;
    timestamp: Date;
  };
  usage: {
    count: number;
    lastAccessed: Date;
    locations: string[]; // 使用位置
  };
}

interface LanguageProfile {
  code: string; // 如 'th', 'vi', 'ar'
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  script: string; // 如 'Latin', 'Arabic', 'Cyrillic'
  supportLevel: 'native' | 'llm' | 'partial';
  translations: Map<string, Translation>;
}
```

## 4. 功能實現

### 4.1 語言選擇介面
```typescript
// 擴展現有的語言選擇器
interface LanguageSelector {
  // 預設語言
  defaultLanguages: Language[];
  
  // 自定義語言輸入
  customLanguageInput: {
    enabled: boolean;
    placeholder: "輸入語言代碼或名稱...";
    suggestions: Language[]; // 基於輸入的建議
    validation: (input: string) => boolean;
  };
  
  // 最近使用
  recentLanguages: Language[];
}
```

### 4.2 翻譯流程
```typescript
async function translateContent(
  content: string, 
  targetLang: string,
  context?: TranslationContext
): Promise<TranslatedContent> {
  // 1. 檢查記憶體快取
  const cached = await memoryCache.get(content, targetLang);
  if (cached) return cached;
  
  // 2. 檢查 GCS 快取
  const gcsCache = await gcsStorage.getTranslation(content, targetLang);
  if (gcsCache) {
    memoryCache.set(content, targetLang, gcsCache);
    return gcsCache;
  }
  
  // 3. LLM 翻譯
  const translation = await llmTranslate(content, targetLang, context);
  
  // 4. 品質評分
  const quality = await evaluateTranslation(translation);
  
  // 5. 儲存結果
  if (quality.score > 0.8) {
    await gcsStorage.saveTranslation(translation);
    memoryCache.set(content, targetLang, translation);
  }
  
  return translation;
}
```

### 4.3 同步機制
```typescript
// 定期執行（每週）
async function syncHighFrequencyTranslations() {
  // 1. 分析使用統計
  const stats = await gcsStorage.getUsageStats();
  
  // 2. 識別高頻翻譯
  const highFreq = stats.filter(s => 
    s.usage.count > 100 && 
    s.quality.score > 0.9
  );
  
  // 3. 按語言分組
  const byLanguage = groupBy(highFreq, 'targetLanguage');
  
  // 4. 生成 locale 檔案
  for (const [lang, translations] of byLanguage) {
    const localeFile = generateLocaleFile(lang, translations);
    
    // 5. 創建 PR
    await createGitPR({
      branch: `i18n/add-${lang}`,
      files: {
        [`public/locales/${lang}/common.json`]: localeFile
      },
      title: `Add ${lang} translations from dynamic system`,
      description: `Auto-generated from high-frequency translations`
    });
  }
}
```

## 5. Implementation Roadmap

### Phase 2: Extended Language Support (2025/07-09)
**目標**: 支援更多預設語言

#### 功能實作
- [ ] 新增 5-10 種常用語言
- [ ] 改善語言切換 UX
- [ ] Local Storage 語言偏好
- [ ] 語言自動檢測

#### 技術需求
- 擴展 YAML 結構
- 優化載入效能
- 瀏覽器語言檢測

**成本影響**: 人工翻譯成本（一次性）

### Phase 3: Dynamic Loading (2025/10-12)
**目標**: 動態載入語言包

#### 功能實作
- [ ] 語言包分離載入
- [ ] 翻譯快取機制
- [ ] 離線語言支援
- [ ] 翻譯品質指標

#### 技術需求
- Dynamic import 實作
- IndexedDB 快取
- Service Worker 整合
- 品質評分演算法

**成本影響**: 包含在 Production 成本內

### Phase 4+: AI-Powered Translation (2026+)
**目標**: 無限語言支援

#### 功能實作
- [ ] 自定義語言輸入
- [ ] LLM 即時翻譯
- [ ] 智能快取管理
- [ ] 翻譯品質審核
- [ ] 社群貢獻機制

#### 技術需求
- LLM API 整合（GPT-4/Gemini）
- Redis 翻譯快取
- Git 自動同步
- 品質評分模型

**成本影響**: 
- LLM API: ~$500-1000/月（依使用量）
- 額外儲存: ~$50/月

## 6. 成本估算

### API 成本
- OpenAI GPT-4: ~$0.03/1K tokens
- 平均每頁內容: ~2K tokens
- 預估月成本: $500-1000（依使用量）

### 優化策略
1. 積極快取（減少 80% API 呼叫）
2. 批量翻譯（提高效率）
3. 降級策略（GPT-3.5 for 低優先內容）

## 7. 成功指標

### 技術指標
- 翻譯回應時間 < 2s（快取命中）
- 快取命中率 > 80%
- 翻譯品質分數 > 0.85

### 業務指標
- 支援語言數量無限制
- 用戶滿意度 > 90%
- 翻譯成本控制在預算內

## 8. 風險與緩解

### 風險 1: 翻譯品質
- **緩解**: 多模型驗證、用戶反饋機制

### 風險 2: 成本超支
- **緩解**: 使用量限制、智能快取

### 風險 3: 響應延遲
- **緩解**: 預載策略、漸進式載入

## 9. 技術考量

### Git-Based 優勢
1. **版本控制**: 所有翻譯都有歷史記錄
2. **協作翻譯**: 社群可透過 PR 貢獻翻譯
3. **品質保證**: PR 審核確保翻譯品質
4. **成本優化**: 高品質翻譯可永久保存

### 漸進式架構
- **Phase 2**: 手動新增語言，建立流程
- **Phase 3**: 動態載入，改善效能
- **Phase 4+**: AI 翻譯，無限擴展

### 整合策略
- 保持與現有 react-i18next 相容
- 漸進增強，不破壞現有功能
- 統一前後端語言處理邏輯

## 10. 結論

動態語言系統遵循 PRD 的漸進式設計原則，從基礎多語言支援開始，逐步演進到 AI 驅動的無限語言平台。每個階段都專注於特定目標，確保系統穩定性的同時持續創新。