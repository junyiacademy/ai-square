# Knowledge Graph Phase 4 技術規格書

## 1. 概述

Phase 4 的知識圖譜系統將建立在現有的視覺化基礎上，擴展成為完整的智能學習路徑系統。

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

## 5. 實施計畫

### Month 1-2: 資料模型與基礎設施
- [ ] Neo4j 資料庫設置
- [ ] 資料模型實作
- [ ] 基礎 API 開發
- [ ] 資料遷移腳本

### Month 3-4: 核心功能開發
- [ ] 知識點關聯系統
- [ ] 路徑計算演算法
- [ ] 基礎推薦引擎

### Month 5-6: 視覺化開發
- [ ] 三種視圖模式
- [ ] 互動功能
- [ ] 效能優化

### Month 7-8: 智能功能
- [ ] 進階推薦演算法
- [ ] 學習分析
- [ ] A/B 測試框架

### Month 9: 整合與優化
- [ ] 系統整合測試
- [ ] 效能調校
- [ ] 使用者測試
- [ ] 文檔完善

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