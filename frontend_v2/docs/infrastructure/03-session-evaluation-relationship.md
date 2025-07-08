# Session 與評估考試的依存關係分析

## 概念釐清

在統一架構中，Session 和評估考試的關係需要明確定義，避免概念混淆。

## 1. 關係定義

### 1.1 層次關係
```
┌─────────────────────────────────────────────────────┐
│                   Learning Session                   │
│  (學習會話 - 容器概念)                                │
│                                                      │
│  ┌─────────────────┐    ┌─────────────────┐        │
│  │  Learning Phase  │    │ Evaluation Phase│        │
│  │   (學習階段)     │───▶│   (評估階段)    │        │
│  └─────────────────┘    └─────────────────┘        │
│           │                       │                  │
│           ▼                       ▼                  │
│    ┌──────────────┐       ┌──────────────┐         │
│    │   Content    │       │     Test     │         │
│    │  Interaction │       │   Evaluation │         │
│    └──────────────┘       └──────────────┘         │
└─────────────────────────────────────────────────────┘
```

### 1.2 概念區分

| 概念 | Session (會話) | Evaluation (評估) |
|------|----------------|-------------------|
| **定義** | 一次完整的學習活動容器 | 對學習成果的測量方法 |
| **範圍** | 包含學習+評估的全過程 | 只是 Session 中的一個環節 |
| **生命週期** | 創建→進行→暫停→完成 | 開始評估→提交→得分 |
| **持續性** | 可暫停、可恢復 | 通常一次性完成 |
| **資料** | 包含所有互動記錄 | 只有評估相關資料 |

## 2. 依存關係模式

### 2.1 包含關係 (Composition)
```typescript
// Session 包含 Evaluations
interface LearningSession {
  id: string;
  userId: string;
  projectId: string;
  
  // 學習活動
  activities: Activity[];
  
  // 評估活動 (Session 的一部分)
  evaluations: Evaluation[];
  
  // 整體進度
  progress: SessionProgress;
}

// Evaluation 依賴於 Session
interface Evaluation {
  id: string;
  sessionId: string;  // 必須屬於某個 Session
  type: 'quiz' | 'task' | 'self' | 'peer';
  evaluatedAt: Date;
  result: EvaluationResult;
}
```

### 2.2 時序關係
```
Session 開始
    │
    ├─→ 學習內容展示
    │
    ├─→ 用戶互動/練習
    │
    ├─→ 形成性評估 (Formative Evaluation)
    │      └─→ 即時回饋
    │
    ├─→ 更多學習活動
    │
    └─→ 總結性評估 (Summative Evaluation)
           └─→ 最終成績

Session 結束
```

## 3. 不同模組的實作模式

### 3.1 Assessment 模組
```typescript
// Assessment 是一種特殊的 Session，專注於評估
class AssessmentSession extends BaseSession {
  assessmentType: 'ai-literacy' | 'skill-test';
  questions: Question[];
  
  // 整個 Session 就是一個大評估
  async complete(): Promise<AssessmentResult> {
    const evaluation = await this.evaluateAllAnswers();
    return {
      sessionId: this.id,
      evaluation,
      competencyMapping: this.mapToCompetencies(evaluation)
    };
  }
}
```

### 3.2 PBL 模組
```typescript
// PBL Session 包含多個任務，每個任務有評估
class PBLSession extends BaseSession {
  program: Program;
  tasks: Task[];
  
  // 每個任務完成時進行評估
  async completeTask(taskId: string, response: any): Promise<void> {
    const evaluation = await this.evaluateTaskResponse(taskId, response);
    
    this.evaluations.push({
      type: 'task',
      taskId,
      evaluation,
      timestamp: new Date()
    });
    
    await this.updateProgress();
  }
  
  // Session 結束時的綜合評估
  async complete(): Promise<PBLResult> {
    const overallEvaluation = await this.evaluateOverallPerformance();
    return {
      sessionId: this.id,
      taskEvaluations: this.evaluations,
      overallEvaluation,
      ksaProgress: this.calculateKSAProgress()
    };
  }
}
```

### 3.3 Discovery 模組
```typescript
// Discovery Session 有持續的評估
class DiscoverySession extends BaseSession {
  workspace: Workspace;
  
  // 多種評估類型
  evaluationTypes = {
    self: SelfEvaluation,
    peer: PeerEvaluation,
    ai: AIEvaluation,
    mentor: MentorEvaluation
  };
  
  // 任務完成時的 360 度評估
  async evaluateTask(taskId: string): Promise<void> {
    const evaluations = await Promise.all([
      this.collectSelfEvaluation(taskId),
      this.collectPeerEvaluations(taskId),
      this.generateAIEvaluation(taskId)
    ]);
    
    this.aggregateEvaluations(evaluations);
  }
}
```

## 4. 統一設計模式

### 4.1 Session 作為上下文
```typescript
abstract class BaseSession {
  // Session 提供評估所需的上下文
  getEvaluationContext(): EvaluationContext {
    return {
      userId: this.userId,
      projectId: this.projectId,
      sessionType: this.type,
      startTime: this.startedAt,
      interactions: this.interactions,
      previousEvaluations: this.evaluations
    };
  }
  
  // 標準化的評估流程
  async evaluate(input: any): Promise<Evaluation> {
    const context = this.getEvaluationContext();
    const evaluation = await this.evaluationService.evaluate(
      input,
      context
    );
    
    // 評估結果記錄在 Session 中
    this.evaluations.push(evaluation);
    
    // 更新 Session 狀態
    await this.updateBasedOnEvaluation(evaluation);
    
    return evaluation;
  }
}
```

### 4.2 評估作為服務
```typescript
interface IEvaluationService {
  // 評估不知道 Session 的具體類型
  // 只依賴於提供的上下文
  evaluate(
    input: EvaluationInput,
    context: EvaluationContext
  ): Promise<EvaluationResult>;
}

class UnifiedEvaluationService implements IEvaluationService {
  async evaluate(
    input: EvaluationInput,
    context: EvaluationContext
  ): Promise<EvaluationResult> {
    // 根據輸入類型選擇評估策略
    const strategy = this.selectStrategy(input.type);
    
    // 執行評估
    const result = await strategy.evaluate(input, context);
    
    // 記錄評估歷史
    await this.recordEvaluation(result, context);
    
    return result;
  }
}
```

## 5. 資料模型關係

### 5.1 資料庫設計
```sql
-- Session 表 (主表)
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  metadata JSONB
);

-- Evaluation 表 (從屬表)
CREATE TABLE evaluations (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES learning_sessions(id),
  type VARCHAR(50) NOT NULL,
  evaluated_at TIMESTAMP NOT NULL,
  input JSONB NOT NULL,
  result JSONB NOT NULL,
  INDEX idx_session_evaluations (session_id)
);

-- 關係：一個 Session 可以有多個 Evaluations
-- 但 Evaluation 必須屬於某個 Session
```

### 5.2 查詢模式
```typescript
// 獲取 Session 時包含所有評估
async function getSessionWithEvaluations(sessionId: string) {
  return db.session.findUnique({
    where: { id: sessionId },
    include: {
      evaluations: {
        orderBy: { evaluatedAt: 'asc' }
      }
    }
  });
}

// 獲取用戶的學習歷程（Sessions + Evaluations）
async function getUserLearningHistory(userId: string) {
  return db.session.findMany({
    where: { userId },
    include: {
      evaluations: true,
      project: true
    },
    orderBy: { startedAt: 'desc' }
  });
}
```

## 6. 實務應用範例

### 6.1 純評估型 Session
```typescript
// AI Literacy 測驗：Session = 評估
const assessmentSession = {
  type: 'assessment',
  duration: '30 minutes',
  activities: [
    { type: 'quiz', questions: 25 }
  ],
  evaluations: [
    { type: 'final-score', timing: 'at-completion' }
  ]
};
```

### 6.2 學習+評估型 Session
```typescript
// PBL 任務：Session 包含學習和多次評估
const pblSession = {
  type: 'pbl-program',
  duration: '2-3 hours',
  activities: [
    { type: 'scenario-intro', duration: '10 min' },
    { type: 'task-1', duration: '30 min' },
    { type: 'task-2', duration: '45 min' },
    { type: 'reflection', duration: '15 min' }
  ],
  evaluations: [
    { type: 'task', timing: 'after-each-task' },
    { type: 'overall', timing: 'at-completion' }
  ]
};
```

### 6.3 持續評估型 Session
```typescript
// Discovery 探索：Session 有持續的評估
const discoverySession = {
  type: 'discovery-workspace',
  duration: 'unlimited',
  activities: [
    { type: 'exploration', ongoing: true },
    { type: 'challenges', asNeeded: true }
  ],
  evaluations: [
    { type: 'self', timing: 'after-each-task' },
    { type: 'peer', timing: 'when-available' },
    { type: 'ai', timing: 'continuous' }
  ]
};
```

## 7. 關鍵設計決策

### 7.1 Session 是容器，Evaluation 是內容
- Session 管理整個學習過程
- Evaluation 是過程中的測量點
- 可以有 Session 沒有 Evaluation（純學習）
- 不能有 Evaluation 沒有 Session（需要上下文）

### 7.2 評估時機由 Session 類型決定
- Assessment: Session 結束時一次性評估
- PBL: 每個任務結束時評估
- Discovery: 持續評估 + 階段評估
- Chat: 對話品質即時評估

### 7.3 評估結果影響 Session 狀態
- 評估通過 → Session 進度更新
- 評估失敗 → 可能需要重做
- 評估優秀 → 解鎖新內容

## 8. 實作建議

### 8.1 保持關注點分離
```typescript
// ❌ 錯誤：混合 Session 和 Evaluation 邏輯
class Session {
  calculateScore() { }  // 不應該在這裡
  generateCertificate() { }  // 不應該在這裡
}

// ✅ 正確：清晰的職責劃分
class Session {
  async requestEvaluation() {
    return this.evaluationService.evaluate(this.getContext());
  }
}

class EvaluationService {
  evaluate() { }
  calculateScore() { }
}
```

### 8.2 使用事件驅動更新
```typescript
// 評估完成時發出事件
class EvaluationService {
  async evaluate(input, context) {
    const result = await this.performEvaluation(input);
    
    // 發出事件讓 Session 更新
    this.eventBus.emit('evaluation.completed', {
      sessionId: context.sessionId,
      result
    });
    
    return result;
  }
}

// Session 監聽評估事件
class Session {
  constructor() {
    this.eventBus.on('evaluation.completed', this.handleEvaluationCompleted);
  }
  
  handleEvaluationCompleted(event) {
    if (event.sessionId === this.id) {
      this.updateProgress(event.result);
    }
  }
}
```

## 結論

Session 和 Evaluation 是互補的概念：
- **Session** 是學習活動的容器和管理者
- **Evaluation** 是測量學習成效的工具
- Session 包含 Evaluation，但不等於 Evaluation
- 這種設計提供了最大的靈活性和擴展性

透過清晰的依存關係設計，我們可以支援各種學習和評估模式，同時保持系統的一致性和可維護性。