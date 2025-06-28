# Knowledge Graph Technical Specification

> **Related Documents**:
> - [Learning System Spec](./learning-system.md) - Core learning functionality
> - [AI Integration Spec](./ai-integration.md) - AI/MCP integration
> - [Product Requirements](../product-requirements-document.md) - Business requirements

## Overview

本文檔定義知識圖譜系統的技術規格，這是 Phase 4+ (2026+) 的進階功能。系統將建立在現有的 AI 素養領域視覺化基礎上，演進成智能學習路徑推薦系統。

## 現況分析 (Phase 1-2)

### 已實現功能
- ✅ 4 個 AI 素養領域的視覺化
- ✅ 領域與能力的關聯展示
- ✅ KSA (Knowledge, Skills, Attitudes) 映射
- ✅ 基礎的 D3.js 視覺化

### Phase 4+ 目標
- 🎯 動態學習路徑生成
- 🎯 個人化推薦系統
- 🎯 知識點依賴關係
- 🎯 學習進度預測

## 2. 資料模型擴展

### 2.1 概念節點 (ConceptNode)
```typescript
interface ConceptNode {
  id: string;
  type: 'domain' | 'competency' | 'concept' | 'skill' | 'knowledge';
  name: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5; // 難度等級
  estimatedTime: number; // 預估學習時間（分鐘）
  tags: string[];
  metadata: {
    created: Date;
    updated: Date;
    author: string;
    version: number;
  };
}
```

### 2.2 關係邊 (RelationshipEdge)
```typescript
interface RelationshipEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  type: 'prerequisite' | 'related' | 'extends' | 'contrasts';
  strength: number; // 0-1 關係強度
  metadata: {
    description?: string;
    bidirectional: boolean;
  };
}
```

### 2.3 學習路徑 (LearningPath)
```typescript
interface LearningPath {
  id: string;
  userId: string;
  goal: string; // target competency
  nodes: string[]; // ordered node ids
  progress: {
    completed: string[];
    current: string;
    remaining: string[];
  };
  estimatedTime: number;
  actualTime: number;
  optimizationScore: number; // 路徑最優化分數
}
```

## 3. 功能規格

### 3.1 知識點關聯系統

#### 資料結構
- **前置關係圖**：有向無環圖（DAG）儲存前置知識
- **相似度矩陣**：計算概念間的相似度（0-1）
- **難度梯度**：自動計算學習曲線

#### API 端點
```typescript
// 獲取概念關聯
GET /api/knowledge-graph/concept/:id/relations
Response: {
  prerequisites: ConceptNode[]
  related: ConceptNode[]
  extensions: ConceptNode[]
}

// 計算概念路徑
POST /api/knowledge-graph/path
Body: { from: string, to: string, userId?: string }
Response: {
  paths: LearningPath[]
  recommended: LearningPath
}
```

### 3.2 學習路徑優化

#### 演算法
1. **Dijkstra 最短路徑**：基於時間成本
2. **A* 啟發式搜尋**：考慮個人學習風格
3. **強化學習**：基於歷史數據優化

#### 優化因素
- 學習時間最小化
- 難度梯度平滑
- 興趣匹配度
- 前置知識覆蓋

### 3.3 概念視覺化

#### 視圖模式
1. **層級視圖**（Hierarchical）
   ```
   Domain
     ├── Competency 1
     │   ├── Concept 1.1
     │   └── Concept 1.2
     └── Competency 2
   ```

2. **網絡視圖**（Network）
   - Force-directed layout
   - 節點大小 = 重要性
   - 邊粗細 = 關係強度

3. **時間軸視圖**（Timeline）
   - X軸：時間進度
   - Y軸：難度層級
   - 顯示學習順序

#### 互動功能
- 節點展開/收合
- 路徑高亮
- 篩選器（難度、類型、狀態）
- 搜尋功能
- 匯出功能（PNG、SVG、JSON）

### 3.4 智能推薦引擎

#### 推薦策略
1. **協同過濾**：基於相似用戶的學習路徑
2. **內容過濾**：基於概念相似度
3. **混合推薦**：結合多種策略

#### 推薦 API
```typescript
GET /api/knowledge-graph/recommendations
Query: {
  userId: string
  type: 'next' | 'path' | 'review'
  limit: number
}
Response: {
  recommendations: {
    node: ConceptNode
    reason: string
    score: number
  }[]
}
```

## 4. 技術架構

### 4.1 後端架構
```
┌─────────────────────────────────┐
│      Graph Database (Neo4j)      │
├─────────────────────────────────┤
│    Graph Processing Service      │
│  (NetworkX / Graph Algorithms)  │
├─────────────────────────────────┤
│      Recommendation Engine       │
│    (TensorFlow / Scikit-learn)  │
├─────────────────────────────────┤
│         FastAPI REST API         │
└─────────────────────────────────┘
```

### 4.2 前端架構
```
┌─────────────────────────────────┐
│    Graph Visualization Layer     │
│  (D3.js / Cytoscape.js / Sigma) │
├─────────────────────────────────┤
│     State Management (Zustand)   │
├─────────────────────────────────┤
│    Graph Utilities Library       │
└─────────────────────────────────┘
```

## 5. Implementation Roadmap

### Phase 4 Prerequisites (2025)
**必須先完成**:
- ✅ 穩定的學習平台
- ✅ 豐富的內容庫
- ✅ 用戶學習數據累積
- ✅ 基礎 AI 整合

### Phase 4: Basic Knowledge Graph (2026 Q1-Q2)
**目標**: 建立知識關聯基礎

#### 功能實作
- [ ] 知識點依賴關係定義
- [ ] 基礎路徑計算（最短路徑）
- [ ] 視覺化增強（顯示關聯）
- [ ] 手動路徑編輯

#### 技術需求
- PostgreSQL 圖擴展（初期）
- D3.js 力導向圖
- 路徑演算法實作

**成本影響**: 包含在 Phase 4 基礎設施內

### Phase 4+: Smart Learning Paths (2026 Q3-Q4)
**目標**: 個人化學習路徑

#### 功能實作
- [ ] AI 驅動路徑推薦
- [ ] 學習風格分析
- [ ] 進度預測模型
- [ ] 適應性調整

#### 技術需求
- Neo4j 圖資料庫（選用）
- 機器學習模型
- 即時推薦引擎

**成本影響**: 
- Neo4j: ~$200/月
- ML 運算: ~$100/月

### Phase 5: Advanced Analytics (2027+)
**目標**: 企業級學習分析

#### 功能實作
- [ ] 組織知識圖譜
- [ ] 技能差距分析
- [ ] 團隊學習路徑
- [ ] 預測性分析

#### 技術需求
- 大規模圖處理
- 分散式計算
- 即時分析引擎

**成本影響**: 企業級定價

## 6. 成功指標

### 技術指標
- 圖查詢響應時間 < 100ms
- 路徑計算時間 < 500ms
- 支援 10,000+ 節點規模

### 業務指標
- 學習路徑完成率提升 30%
- 平均學習時間減少 20%
- 用戶滿意度 > 4.5/5

## 7. 風險與緩解

### 技術風險
1. **圖資料庫效能**
   - 緩解：使用快取、預計算常用路徑

2. **視覺化效能**
   - 緩解：虛擬化渲染、WebGL 加速

3. **推薦準確性**
   - 緩解：持續收集反饋、模型迭代

### 業務風險
1. **內容品質**
   - 緩解：專家審核、社群貢獻

2. **用戶採用度**
   - 緩解：漸進式推出、用戶教育

## 8. 技術考量

### 為什麼在 Phase 4？
1. **需要數據累積**: 有效的推薦需要足夠的學習數據
2. **內容成熟度**: 需要完整的內容關聯定義
3. **技術複雜度**: 圖資料庫和 ML 增加系統複雜度
4. **成本考量**: 圖資料庫和運算資源成本較高

### 漸進式實作策略
1. **Phase 1-3**: 使用現有視覺化，收集使用數據
2. **Phase 4 初期**: PostgreSQL + 簡單演算法
3. **Phase 4 中期**: 評估是否需要專用圖資料庫
4. **Phase 5**: 企業級圖分析平台

### 技術選型考量
- **PostgreSQL vs Neo4j**: 初期用 PostgreSQL 足夠，規模大時再遷移
- **D3.js vs WebGL**: 節點數 < 1000 用 D3.js，更多則需 WebGL
- **演算法選擇**: 從簡單開始，根據效果逐步優化

## 結論

知識圖譜系統是 AI Square 的長期願景功能，將在平台成熟後（Phase 4+）實施。透過漸進式開發策略，我們可以在控制成本和複雜度的同時，為用戶提供越來越智能的學習體驗。