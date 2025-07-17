# Epic: AI 素養能力框架系統

## 📋 Epic 概述

**Epic ID**: AIL-001  
**優先級**: 核心  
**預估工作量**: 持續迭代  
**目標 Phase**: Phase 1 (基礎) → Phase 4 (完善)

## 🎯 Epic 目標

建立完整的 AI 素養能力框架，提供標準化的評估與學習體系。

## 🏆 成功標準

### 功能指標
- [x] 四大領域能力視覺化 (Engaging, Creating, Managing, Designing)
- [x] KSA (Knowledge, Skills, Attitudes) 三維指標系統
- [x] 多語言能力描述 (9 種語言)
- [ ] 動態能力評估系統
- [ ] 個人化學習路徑推薦

### 內容指標
- 涵蓋 4 個核心領域
- 包含 16+ 個能力指標 (E1-E4, C1-C4, M1-M4, D1-D4)
- 支援 100+ 個 KSA 編碼
- 提供 50+ 個學習情境範例

## 👥 相關用戶角色

### 核心受益者
- **學習者 Alex**: 系統性理解 AI 素養架構
- **教育者 Prof. Chen**: 標準化教學框架
- **企業培訓者 Manager Kim**: 員工能力評估標準

## 🗺️ 領域架構

### 1. Engaging with AI (與 AI 互動) 🎯
**核心概念**: 使用 AI 工具獲取資訊和建議

**能力指標**:
- E1: 辨識 AI 在不同情境中的角色與影響力
- E2: 評估 AI 輸出的準確性與相關性  
- E3: 理解 AI 系統的技術基礎
- E4: 批判性分析 AI 的能力與限制

### 2. Creating with AI (與 AI 創作) 🎨
**核心概念**: 運用 AI 輔助內容創作和問題解決

**能力指標**:
- C1: 使用 AI 工具進行內容生成
- C2: 設計有效的 AI Prompt
- C3: 結合人類創意與 AI 能力
- C4: 評估創作品質與原創性

### 3. Managing AI (管理 AI ) 📊
**核心概念**: 管理 AI 系統和相關風險

**能力指標**:
- M1: 評估 AI 專案的可行性
- M2: 管理 AI 系統的生命週期
- M3: 識別並緩解 AI 風險
- M4: 建立 AI 治理框架

### 4. Designing AI (設計 AI) 🛠️
**核心概念**: 設計包含 AI 的系統和體驗

**能力指標**:
- D1: 識別 AI 應用機會
- D2: 設計人機協作介面
- D3: 考慮倫理與社會影響
- D4: 評估 AI 系統效果

## 📊 KSA 三維架構

### Knowledge (知識) 📚
**主題分類**:
- K1: AI 的本質與基礎
- K2: AI 反映人類選擇與觀點
- K3: AI 重塑工作與人類角色
- K4: AI 的能力與限制
- K5: AI 在社會中的角色

### Skills (技能) 🛠️
**能力分類**:
- S1: 批判性思考
- S2: 創造力
- S3: 計算思維
- S4: 協作能力
- S5: 問題解決
- S6: 自我與社會意識
- S7: 溝通能力

### Attitudes (態度) 💡
**價值觀分類**:
- A1: 負責任
- A2: 好奇心
- A3: 創新精神
- A4: 適應性
- A5: 同理心

## 🌍 多語言支援

### 支援語言
- 🇺🇸 English (預設)
- 🇹🇼 繁體中文
- 🇪🇸 Español
- 🇯🇵 日本語
- 🇰🇷 한국어
- 🇫🇷 Français
- 🇩🇪 Deutsch
- 🇷🇺 Русский
- 🇮🇹 Italiano

### 在地化策略
- 核心概念統一翻譯
- 文化適應的情境範例
- 地區相關的應用案例

## 🛠️ 技術實作

### 資料結構
```yaml
# ai_lit_domains.yaml
domains:
  Engaging_with_AI:
    emoji: "🎯"
    overview: "領域概述"
    overview_zh: "中文概述"
    competencies:
      E1:
        description: "能力描述"
        knowledge: [K1.4, K5.1]
        skills: [S6.1]
        attitudes: [A2.1, A1.1]
```

### API 設計
```typescript
// GET /api/relations?lang=zhTW
interface AILiteracyResponse {
  domains: Domain[]
  kMap: Record<string, KSAItem>
  sMap: Record<string, KSAItem> 
  aMap: Record<string, KSAItem>
}
```

## 📋 用戶故事

### 學習者故事
```
As a learner
I want to explore AI literacy competencies in my native language
So that I can understand which skills I need to develop

As a learner  
I want to see detailed explanations for each KSA code
So that I can understand what specific knowledge/skills/attitudes are required
```

### 教育者故事
```
As an educator
I want to map curriculum to AI literacy competencies  
So that I can ensure comprehensive coverage of essential skills

As an educator
I want to track student progress across different competency areas
So that I can identify learning gaps and adjust teaching
```

## 🔄 迭代計劃

### Phase 1: 靜態展示 ✅
- [x] 基礎四領域架構
- [x] KSA 三維系統  
- [x] 多語言介面
- [x] 互動式手風琴展示

### Phase 2: 動態評估
- [ ] 能力自評問卷
- [ ] 基線測試系統
- [ ] 進度追蹤機制
- [ ] 個人能力雷達圖

### Phase 3: 適應性學習
- [ ] AI 驅動的能力評估
- [ ] 個人化學習路徑
- [ ] 智能內容推薦
- [ ] 同儕比較分析

### Phase 4: 深度整合
- [ ] 實作專案評估
- [ ] 作品集系統
- [ ] 認證機制
- [ ] 企業能力標準對接

## 📈 成功指標

### 使用指標
- 領域探索完成率 > 80%
- KSA 詳細查看率 > 60%
- 多語言使用分佈均衡
- 用戶停留時間 > 5 分鐘

### 內容品質
- 翻譯準確性驗證
- 教育專家內容審查
- 用戶反饋持續改善
- 國際標準對標分析

---

> **設計原則**: 基於研究、實用導向、全球適用、持續進化