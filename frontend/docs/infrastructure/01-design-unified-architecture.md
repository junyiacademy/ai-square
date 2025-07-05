# /design - 統一學習架構設計文檔

## 設計目標

基於前面的分析，設計一個統一的學習平台架構，整合 Assessment、PBL、Discovery 和 Chat 四大模組。

## 1. 核心架構設計

### 1.1 分層架構
```
┌─────────────────────────────────────────────────────────┐
│                  Presentation Layer                      │
│              (React Components & Hooks)                  │
├─────────────────────────────────────────────────────────┤
│                  Application Layer                       │
│            (Business Logic & Use Cases)                  │
├─────────────────────────────────────────────────────────┤
│                   Domain Layer                           │
│        (Core Business Entities & Rules)                 │
├─────────────────────────────────────────────────────────┤
│                Infrastructure Layer                      │
│         (Data Access & External Services)                │
└─────────────────────────────────────────────────────────┘
```

### 1.2 領域模型設計

#### 核心實體
```typescript
// 1. 學習專案 (統一 Scenario/Path/Assessment)
interface LearningProject {
  id: string;
  type: ProjectType;
  title: string;
  description: string;
  objectives: LearningObjective[];
  prerequisites?: Prerequisite[];
  metadata: ProjectMetadata;
}

// 2. 學習會話 (統一所有學習活動)
interface LearningSession {
  id: string;
  projectId: string;
  userId: string;
  type: SessionType;
  status: SessionStatus;
  startedAt: Date;
  lastActiveAt: Date;
  completedAt?: Date;
  progress: SessionProgress;
  context: SessionContext;
}

// 3. 評估系統 (統一所有評估活動)
interface Evaluation {
  id: string;
  sessionId: string;
  type: EvaluationType;
  input: EvaluationInput;
  result: EvaluationResult;
  feedback?: Feedback;
  createdAt: Date;
}

// 4. 能力模型 (統一追蹤所有能力)
interface Competency {
  id: string;
  domain: string;
  name: string;
  description: string;
  level: CompetencyLevel;
  evidence: Evidence[];
}
```

## 2. 統一 Session 架構

### 2.1 Session 生命週期
```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌───────────┐
│ Created │ --> │ Active  │ --> │ Paused   │ --> │ Completed │
└─────────┘     └─────────┘     └──────────┘     └───────────┘
                     │                 │
                     └─────────────────┘
                          可暫停/繼續
```

### 2.2 Session 類型層次
```typescript
abstract class BaseSession {
  abstract id: string;
  abstract userId: string;
  abstract projectId: string;
  abstract status: SessionStatus;
  
  // 共同行為
  abstract start(): Promise<void>;
  abstract pause(): Promise<void>;
  abstract resume(): Promise<void>;
  abstract complete(): Promise<CompletionResult>;
  abstract saveProgress(): Promise<void>;
}

// Assessment Session
class AssessmentSession extends BaseSession {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Answer[];
  timeSpent: TimeTracking;
  
  async submitAnswer(answer: Answer): Promise<void> {
    // Assessment 特定邏輯
  }
}

// PBL Session
class PBLSession extends BaseSession {
  program: Program;
  currentTaskId: string;
  taskResponses: TaskResponse[];
  ksaProgress: KSAProgress;
  
  async submitTaskResponse(response: TaskResponse): Promise<void> {
    // PBL 特定邏輯
  }
}

// Discovery Session
class DiscoverySession extends BaseSession {
  workspace: Workspace;
  currentTask: Task;
  completedTasks: string[];
  achievements: Achievement[];
  totalXP: number;
  
  async completeTask(evaluation: TaskEvaluation): Promise<void> {
    // Discovery 特定邏輯
  }
}

// Chat Session
class ChatSession extends BaseSession {
  conversationId: string;
  messages: Message[];
  context: ChatContext;
  
  async sendMessage(message: string): Promise<AIResponse> {
    // Chat 特定邏輯
  }
}
```

## 3. 統一評估架構

### 3.1 評估系統介面
```typescript
interface IEvaluationService {
  // 評估方法
  evaluate(input: EvaluationInput): Promise<EvaluationResult>;
  
  // 評分方法
  calculateScore(result: EvaluationResult): Score;
  
  // 能力映射
  mapToCompetencies(score: Score): CompetencyMapping;
  
  // 回饋生成
  generateFeedback(result: EvaluationResult, language: string): Feedback;
}

// 評估輸入類型
type EvaluationInput = 
  | QuizAnswers        // Assessment
  | TaskPerformance    // PBL/Discovery
  | ChatInteraction    // Chat
  | PeerReview        // 互評
  | SelfAssessment;   // 自評

// 評估結果類型
interface EvaluationResult {
  sessionId: string;
  evaluationType: string;
  scores: ScoreBreakdown;
  competencies: CompetencyScore[];
  strengths: string[];
  improvements: string[];
  recommendations: Recommendation[];
}
```

### 3.2 評估策略模式
```typescript
// 策略介面
interface EvaluationStrategy {
  canEvaluate(type: EvaluationType): boolean;
  evaluate(input: EvaluationInput): Promise<EvaluationResult>;
}

// 具體策略
class QuizEvaluationStrategy implements EvaluationStrategy {
  canEvaluate(type: EvaluationType): boolean {
    return type === 'quiz';
  }
  
  async evaluate(input: QuizAnswers): Promise<EvaluationResult> {
    // 選擇題評分邏輯
  }
}

class RubricEvaluationStrategy implements EvaluationStrategy {
  canEvaluate(type: EvaluationType): boolean {
    return type === 'task' || type === 'project';
  }
  
  async evaluate(input: TaskPerformance): Promise<EvaluationResult> {
    // 評分標準評估邏輯
  }
}

class AIEvaluationStrategy implements EvaluationStrategy {
  canEvaluate(type: EvaluationType): boolean {
    return type === 'open-ended' || type === 'chat';
  }
  
  async evaluate(input: any): Promise<EvaluationResult> {
    // AI 評估邏輯
  }
}

// 評估服務
class UnifiedEvaluationService implements IEvaluationService {
  private strategies: EvaluationStrategy[] = [
    new QuizEvaluationStrategy(),
    new RubricEvaluationStrategy(),
    new AIEvaluationStrategy()
  ];
  
  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const strategy = this.strategies.find(s => 
      s.canEvaluate(input.type)
    );
    
    if (!strategy) {
      throw new Error(`No strategy for type: ${input.type}`);
    }
    
    return strategy.evaluate(input);
  }
}
```

## 4. Data Layer 架構

### 4.1 Repository 模式
```typescript
// 基礎 Repository 介面
interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(filter?: QueryFilter): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: ID, updates: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
  exists(id: ID): Promise<boolean>;
}

// 基礎實作
abstract class BaseRepository<T extends { id: string }> 
  implements IRepository<T> {
  
  constructor(
    protected storage: IStorageProvider,
    protected collectionName: string
  ) {}
  
  async findById(id: string): Promise<T | null> {
    return this.storage.get<T>(`${this.collectionName}/${id}`);
  }
  
  async create(entity: Omit<T, 'id'>): Promise<T> {
    const id = this.generateId();
    const fullEntity = { ...entity, id } as T;
    await this.storage.set(`${this.collectionName}/${id}`, fullEntity);
    return fullEntity;
  }
  
  protected abstract generateId(): string;
}

// 具體 Repository
class SessionRepository extends BaseRepository<LearningSession> {
  async findActiveByUser(userId: string): Promise<LearningSession[]> {
    const all = await this.findAll();
    return all.filter(s => 
      s.userId === userId && s.status === 'active'
    );
  }
  
  async findByProject(projectId: string): Promise<LearningSession[]> {
    const all = await this.findAll();
    return all.filter(s => s.projectId === projectId);
  }
}
```

### 4.2 Unit of Work 模式
```typescript
interface IUnitOfWork {
  sessions: ISessionRepository;
  evaluations: IEvaluationRepository;
  competencies: ICompetencyRepository;
  projects: IProjectRepository;
  
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

class UnitOfWork implements IUnitOfWork {
  private transaction?: DatabaseTransaction;
  
  constructor(
    private storage: IStorageProvider,
    public sessions: ISessionRepository,
    public evaluations: IEvaluationRepository,
    public competencies: ICompetencyRepository,
    public projects: IProjectRepository
  ) {}
  
  async beginTransaction(): Promise<void> {
    this.transaction = await this.storage.beginTransaction();
  }
  
  async commit(): Promise<void> {
    if (!this.transaction) throw new Error('No active transaction');
    await this.transaction.commit();
    this.transaction = undefined;
  }
  
  async rollback(): Promise<void> {
    if (!this.transaction) throw new Error('No active transaction');
    await this.transaction.rollback();
    this.transaction = undefined;
  }
}
```

## 5. 服務層架構

### 5.1 領域服務
```typescript
// 學習服務基礎類別
abstract class BaseLearningService {
  constructor(
    protected uow: IUnitOfWork,
    protected evaluationService: IEvaluationService,
    protected aiService: IAIService
  ) {}
  
  // 開始學習
  async startLearning(
    userId: string, 
    projectId: string
  ): Promise<LearningSession> {
    await this.uow.beginTransaction();
    
    try {
      // 檢查先決條件
      await this.checkPrerequisites(userId, projectId);
      
      // 創建 Session
      const session = await this.createSession(userId, projectId);
      
      // 初始化學習內容
      await this.initializeContent(session);
      
      await this.uow.commit();
      return session;
    } catch (error) {
      await this.uow.rollback();
      throw error;
    }
  }
  
  // 提交學習成果
  async submitProgress(
    sessionId: string,
    progress: any
  ): Promise<EvaluationResult> {
    const session = await this.uow.sessions.findById(sessionId);
    if (!session) throw new Error('Session not found');
    
    // 評估成果
    const evaluation = await this.evaluationService.evaluate({
      type: this.getEvaluationType(),
      sessionId,
      input: progress
    });
    
    // 更新能力
    await this.updateCompetencies(session.userId, evaluation);
    
    // 儲存評估結果
    await this.uow.evaluations.create(evaluation);
    
    return evaluation;
  }
  
  protected abstract getEvaluationType(): EvaluationType;
  protected abstract createSession(userId: string, projectId: string): Promise<LearningSession>;
  protected abstract initializeContent(session: LearningSession): Promise<void>;
}
```

## 6. API 設計

### 6.1 RESTful API
```typescript
// Session API
POST   /api/sessions                    // 創建新 Session
GET    /api/sessions/:id                // 獲取 Session 詳情
PUT    /api/sessions/:id                // 更新 Session
DELETE /api/sessions/:id                // 刪除 Session
POST   /api/sessions/:id/pause          // 暫停 Session
POST   /api/sessions/:id/resume         // 繼續 Session
POST   /api/sessions/:id/complete       // 完成 Session

// Evaluation API
POST   /api/evaluations                 // 創建評估
GET    /api/evaluations/:id             // 獲取評估結果
GET    /api/sessions/:id/evaluations    // 獲取 Session 的所有評估

// Competency API
GET    /api/users/:id/competencies      // 獲取用戶能力
GET    /api/competencies/:id/progress   // 獲取能力進展
```

### 6.2 GraphQL Schema (Alternative)
```graphql
type LearningSession {
  id: ID!
  project: LearningProject!
  user: User!
  status: SessionStatus!
  progress: SessionProgress!
  evaluations: [Evaluation!]!
  createdAt: DateTime!
  completedAt: DateTime
}

type Query {
  session(id: ID!): LearningSession
  userSessions(userId: ID!, status: SessionStatus): [LearningSession!]!
  projectSessions(projectId: ID!): [LearningSession!]!
}

type Mutation {
  createSession(input: CreateSessionInput!): LearningSession!
  updateSession(id: ID!, input: UpdateSessionInput!): LearningSession!
  submitProgress(sessionId: ID!, progress: ProgressInput!): EvaluationResult!
}
```

## 7. 技術決策記錄 (ADR)

### ADR-001: 採用 Session 為核心概念
**決策**: 所有學習活動都基於 Session
**原因**: 
- 統一用戶體驗
- 支援暫停/繼續
- 完整的學習追蹤

### ADR-002: 使用策略模式處理評估
**決策**: 不同評估類型使用不同策略
**原因**:
- 易於擴展新評估類型
- 分離評估邏輯
- 提高可測試性

### ADR-003: Repository 模式與 Unit of Work
**決策**: 使用 Repository 模式管理資料存取
**原因**:
- 抽象化儲存細節
- 支援事務處理
- 便於測試和遷移

## 8. 實施優先順序

1. **Phase 1**: 建立基礎設施
   - 實作 Storage Provider 介面
   - 建立 Base Repository
   - 實作 Unit of Work

2. **Phase 2**: 統一 Session 管理
   - 實作 BaseSession
   - 遷移 Assessment 到 Session
   - 統一 PBL/Discovery Session

3. **Phase 3**: 統一評估系統
   - 實作評估策略
   - 整合現有評估邏輯
   - 建立統一的能力追蹤

4. **Phase 4**: 資料遷移
   - 遷移現有資料到新結構
   - 實作資料庫 Storage Provider
   - 漸進式切換到資料庫

這個設計提供了清晰的架構藍圖，確保系統的可擴展性、可維護性和一致性。