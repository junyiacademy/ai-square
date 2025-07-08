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

// 2. 學習軌跡 (統一所有學習活動)
interface LearningTrack {
  id: string;  // Primary Key
  projectId: string;  // Foreign Key to LearningProject
  userId: string;  // Foreign Key to User
  type: TrackType;
  status: TrackStatus;
  startedAt: Date;
  lastActiveAt: Date;
  completedAt?: Date;
  metadata: TrackMetadata;
}

// 3. 學習方案 (Track 下的學習方案)
interface Program {
  id: string;  // Primary Key
  trackId: string;  // Foreign Key to LearningTrack
  title: string;
  description: string;
  order: number;
  status: ProgramStatus;
  startedAt?: Date;
  completedAt?: Date;
}

// 4. 學習任務 (Program 下的具體任務)
interface Task {
  id: string;  // Primary Key
  programId: string;  // Foreign Key to Program
  title: string;
  description: string;
  order: number;
  type: TaskType;
  requiredKSA: string[];  // Required competencies
  status: TaskStatus;
  startedAt?: Date;
  completedAt?: Date;
}

// 5. 任務日誌 (記錄任務執行過程)
interface TaskLog {
  id: string;  // Primary Key
  taskId: string;  // Foreign Key to Task
  userId: string;  // Foreign Key to User
  type: LogType;  // 'attempt', 'submission', 'interaction', 'feedback'
  data: any;  // JSON data
  createdAt: Date;
}

// 6. 評估系統 (統一所有評估活動)
interface Evaluation {
  id: string;  // Primary Key
  trackId: string;  // Foreign Key to LearningTrack
  taskId?: string;  // Foreign Key to Task (optional, for task-level evaluations)
  type: EvaluationType;
  input: EvaluationInput;
  result: EvaluationResult;
  feedback?: Feedback;
  createdAt: Date;
}

// 7. 能力模型 (統一追蹤所有能力)
interface Competency {
  id: string;  // Primary Key
  domain: string;
  name: string;
  description: string;
  ksaCode: string;  // K001, S002, A003, etc.
}

// 8. 用戶能力進展
interface UserCompetencyProgress {
  id: string;  // Primary Key
  userId: string;  // Foreign Key to User
  competencyId: string;  // Foreign Key to Competency
  level: CompetencyLevel;
  evidence: Evidence[];
  lastUpdated: Date;
}
```

## 2. 統一 Track 架構

### 2.1 Track 層級結構
```
LearningTrack (學習軌跡)
├── Program 1 (方案 1)
│   ├── Task 1.1 (任務 1.1)
│   │   └── TaskLog[] (任務日誌)
│   ├── Task 1.2
│   │   └── TaskLog[]
│   └── Task 1.3
│       └── TaskLog[]
├── Program 2
│   ├── Task 2.1
│   │   └── TaskLog[]
│   └── Task 2.2
│       └── TaskLog[]
└── Evaluations[] (評估記錄)
```

### 2.2 Track 生命週期
```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌───────────┐
│ Created │ --> │ Active  │ --> │ Paused   │ --> │ Completed │
└─────────┘     └─────────┘     └──────────┘     └───────────┘
                     │                 │
                     └─────────────────┘
                          可暫停/繼續
```

### 2.3 Track 類型層次
```typescript
abstract class BaseTrack {
  abstract id: string;
  abstract userId: string;
  abstract projectId: string;
  abstract status: TrackStatus;
  
  // 共同行為
  abstract start(): Promise<void>;
  abstract pause(): Promise<void>;
  abstract resume(): Promise<void>;
  abstract complete(): Promise<CompletionResult>;
  abstract getProgress(): Promise<TrackProgress>;
}

// Assessment Track
class AssessmentTrack extends BaseTrack {
  programs: AssessmentProgram[];  // 測驗模組
  
  async createProgram(config: AssessmentConfig): Promise<Program> {
    // 創建測驗方案
  }
}

// PBL Track
class PBLTrack extends BaseTrack {
  scenario: PBLScenario;
  programs: PBLProgram[];  // PBL 方案
  
  async createProgram(config: PBLProgramConfig): Promise<Program> {
    // 創建 PBL 方案
  }
}

// Discovery Track
class DiscoveryTrack extends BaseTrack {
  workspace: Workspace;
  programs: DiscoveryProgram[];  // 探索路徑
  
  async createProgram(path: DiscoveryPath): Promise<Program> {
    // 創建探索方案
  }
}

// Chat Track
class ChatTrack extends BaseTrack {
  topic: string;
  programs: ChatProgram[];  // 對話主題
  
  async createProgram(topic: ChatTopic): Promise<Program> {
    // 創建對話方案
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
  trackId: string;  // Foreign Key to Track
  taskId?: string;  // Foreign Key to Task (optional)
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
class TrackRepository extends BaseRepository<LearningTrack> {
  async findActiveByUser(userId: string): Promise<LearningTrack[]> {
    const all = await this.findAll();
    return all.filter(t => 
      t.userId === userId && t.status === 'active'
    );
  }
  
  async findByProject(projectId: string): Promise<LearningTrack[]> {
    const all = await this.findAll();
    return all.filter(t => t.projectId === projectId);
  }
}

class ProgramRepository extends BaseRepository<Program> {
  async findByTrack(trackId: string): Promise<Program[]> {
    const all = await this.findAll();
    return all.filter(p => p.trackId === trackId);
  }
}

class TaskRepository extends BaseRepository<Task> {
  async findByProgram(programId: string): Promise<Task[]> {
    const all = await this.findAll();
    return all.filter(t => t.programId === programId)
      .sort((a, b) => a.order - b.order);
  }
}

class TaskLogRepository extends BaseRepository<TaskLog> {
  async findByTask(taskId: string): Promise<TaskLog[]> {
    const all = await this.findAll();
    return all.filter(l => l.taskId === taskId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}
```

### 4.2 Unit of Work 模式
```typescript
interface IUnitOfWork {
  tracks: ITrackRepository;
  programs: IProgramRepository;
  tasks: ITaskRepository;
  taskLogs: ITaskLogRepository;
  evaluations: IEvaluationRepository;
  competencies: ICompetencyRepository;
  userProgress: IUserCompetencyProgressRepository;
  projects: IProjectRepository;
  
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

class UnitOfWork implements IUnitOfWork {
  private transaction?: DatabaseTransaction;
  
  constructor(
    private storage: IStorageProvider,
    public tracks: ITrackRepository,
    public programs: IProgramRepository,
    public tasks: ITaskRepository,
    public taskLogs: ITaskLogRepository,
    public evaluations: IEvaluationRepository,
    public competencies: ICompetencyRepository,
    public userProgress: IUserCompetencyProgressRepository,
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
  ): Promise<LearningTrack> {
    await this.uow.beginTransaction();
    
    try {
      // 檢查先決條件
      await this.checkPrerequisites(userId, projectId);
      
      // 創建 Track
      const track = await this.createTrack(userId, projectId);
      
      // 初始化學習內容
      await this.initializeContent(track);
      
      await this.uow.commit();
      return track;
    } catch (error) {
      await this.uow.rollback();
      throw error;
    }
  }
  
  // 提交任務成果
  async submitTaskProgress(
    taskId: string,
    userId: string,
    progress: any
  ): Promise<EvaluationResult> {
    const task = await this.uow.tasks.findById(taskId);
    if (!task) throw new Error('Task not found');
    
    const program = await this.uow.programs.findById(task.programId);
    if (!program) throw new Error('Program not found');
    
    // 記錄任務日誌
    await this.uow.taskLogs.create({
      taskId,
      userId,
      type: 'submission',
      data: progress,
      createdAt: new Date()
    });
    
    // 評估成果
    const evaluation = await this.evaluationService.evaluate({
      type: this.getEvaluationType(),
      trackId: program.trackId,
      taskId,
      input: progress
    });
    
    // 更新能力
    await this.updateCompetencies(userId, evaluation);
    
    // 儲存評估結果
    await this.uow.evaluations.create(evaluation);
    
    return evaluation;
  }
  
  protected abstract getEvaluationType(): EvaluationType;
  protected abstract createTrack(userId: string, projectId: string): Promise<LearningTrack>;
  protected abstract initializeContent(track: LearningTrack): Promise<void>;
}
```

## 6. API 設計

### 6.1 RESTful API
```typescript
// Track API
POST   /api/tracks                      // 創建新 Track
GET    /api/tracks/:id                  // 獲取 Track 詳情
PUT    /api/tracks/:id                  // 更新 Track
DELETE /api/tracks/:id                  // 刪除 Track
POST   /api/tracks/:id/pause            // 暫停 Track
POST   /api/tracks/:id/resume           // 繼續 Track
POST   /api/tracks/:id/complete         // 完成 Track

// Program API
GET    /api/tracks/:trackId/programs    // 獲取 Track 的所有 Program
POST   /api/tracks/:trackId/programs    // 創建新 Program
GET    /api/programs/:id                // 獲取 Program 詳情
PUT    /api/programs/:id                // 更新 Program

// Task API
GET    /api/programs/:programId/tasks   // 獲取 Program 的所有 Task
POST   /api/programs/:programId/tasks   // 創建新 Task
GET    /api/tasks/:id                   // 獲取 Task 詳情
PUT    /api/tasks/:id                   // 更新 Task
POST   /api/tasks/:id/submit            // 提交 Task 成果

// Task Log API
GET    /api/tasks/:taskId/logs          // 獲取 Task 的所有日誌
POST   /api/tasks/:taskId/logs          // 創建新日誌

// Evaluation API
POST   /api/evaluations                 // 創建評估
GET    /api/evaluations/:id             // 獲取評估結果
GET    /api/tracks/:id/evaluations      // 獲取 Track 的所有評估
GET    /api/tasks/:id/evaluations       // 獲取 Task 的所有評估

// Competency API
GET    /api/users/:id/competencies      // 獲取用戶能力
GET    /api/competencies/:id/progress   // 獲取能力進展
```

### 6.2 GraphQL Schema (Alternative)
```graphql
type LearningTrack {
  id: ID!
  project: LearningProject!
  user: User!
  status: TrackStatus!
  programs: [Program!]!
  evaluations: [Evaluation!]!
  createdAt: DateTime!
  completedAt: DateTime
}

type Program {
  id: ID!
  track: LearningTrack!
  title: String!
  description: String!
  order: Int!
  status: ProgramStatus!
  tasks: [Task!]!
  startedAt: DateTime
  completedAt: DateTime
}

type Task {
  id: ID!
  program: Program!
  title: String!
  description: String!
  order: Int!
  type: TaskType!
  requiredKSA: [String!]!
  status: TaskStatus!
  logs: [TaskLog!]!
  startedAt: DateTime
  completedAt: DateTime
}

type TaskLog {
  id: ID!
  task: Task!
  user: User!
  type: LogType!
  data: JSON!
  createdAt: DateTime!
}

type Query {
  track(id: ID!): LearningTrack
  userTracks(userId: ID!, status: TrackStatus): [LearningTrack!]!
  projectTracks(projectId: ID!): [LearningTrack!]!
  program(id: ID!): Program
  task(id: ID!): Task
  taskLogs(taskId: ID!): [TaskLog!]!
}

type Mutation {
  createTrack(input: CreateTrackInput!): LearningTrack!
  updateTrack(id: ID!, input: UpdateTrackInput!): LearningTrack!
  createProgram(trackId: ID!, input: CreateProgramInput!): Program!
  createTask(programId: ID!, input: CreateTaskInput!): Task!
  submitTaskProgress(taskId: ID!, progress: ProgressInput!): EvaluationResult!
}
```

## 7. 技術決策記錄 (ADR)

### ADR-001: 採用 Track 為核心概念
**決策**: 所有學習活動都基於 Track > Program > Task > Log 層級結構
**原因**: 
- 更清晰的學習路徑結構
- 支援多層次的學習組織
- 更細粒度的進度追蹤

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

1. **Phase 1**: 建立基礎設施 [✓ 已完成]
   - 實作 Storage Provider 介面
   - 建立 Base Repository
   - 實作 Unit of Work

2. **Phase 2**: 統一 Track 管理 [當前目標]
   - 實作 BaseTrack
   - 實作 Program/Task/TaskLog 實體
   - 遷移 Assessment 到 Track 架構
   - 統一 PBL/Discovery Track

3. **Phase 3**: 統一評佰系統
   - 實作評佰策略
   - 整合現有評佰邏輯
   - 建立統一的能力追蹤

4. **Phase 4**: 資料遷移
   - 設計關聯式資料庫 schema
   - 遷移現有資料到新結構
   - 實作資料庫 Storage Provider
   - 漸進式切換到資料庫

這個設計提供了清晰的架構藍圖，確保系統的可擴展性、可維護性和一致性。