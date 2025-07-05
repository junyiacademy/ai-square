# 統一學習架構設計 - 深度模式分析

## 1. 核心模式識別

### 1.1 Project → Sessions 模式
```
PBL:       Scenario → Programs → Tasks → Learning Sessions
Discovery: Path → Workspace → Tasks → Learning Sessions
```

兩者都有類似的層級結構：
- **專案層級**（Scenario/Path）：定義學習目標和範圍
- **執行層級**（Program/Workspace）：實際的學習容器
- **任務層級**（Tasks）：具體的學習活動
- **會話層級**（Sessions）：每次的學習記錄

### 1.2 Assessment → Score 模式
```
Assessment: Questions → Answers → Domain Scores → Competency Mapping
Discovery:  Tasks → Evaluations → XP/Achievements → Skill Progress
```

兩者都有評估到成績的轉換：
- **輸入**：用戶的回答或表現
- **評估**：AI 或規則評分
- **輸出**：能力分數或成就

## 2. 統一架構設計

### 2.1 核心概念模型
```typescript
// 學習專案基礎類別
interface ILearningProject {
  id: string;
  title: string;
  description: string;
  objectives: LearningObjective[];
  prerequisites?: string[];
  estimatedDuration: number;
  difficulty: DifficultyLevel;
}

// 學習容器基礎類別（Program/Workspace）
interface ILearningContainer {
  id: string;
  projectId: string;  // 關聯到 Project
  userId: string;
  status: ContainerStatus;
  startedAt: string;
  completedAt?: string;
  sessions: ILearningSession[];
  currentTaskIndex: number;
}

// 學習任務基礎類別
interface ILearningTask {
  id: string;
  containerId: string;
  title: string;
  instructions: string;
  requiredInputType: InputType;  // text, code, choice, file
  evaluationCriteria: EvaluationCriteria[];
  estimatedDuration: number;
}

// 學習會話基礎類別
interface ILearningSession {
  id: string;
  taskId: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  inputs: SessionInput[];
  evaluations: SessionEvaluation[];
  status: SessionStatus;
}
```

### 2.2 評估系統統一架構
```typescript
// 統一的評估介面
interface IEvaluationSystem {
  // 評估輸入
  evaluate(input: EvaluationInput): Promise<EvaluationResult>;
  
  // 產生成績
  generateScore(result: EvaluationResult): ScoreData;
  
  // 映射到能力
  mapToCompetencies(score: ScoreData): CompetencyMapping;
  
  // 產生回饋
  generateFeedback(result: EvaluationResult, language: string): Feedback;
}

// 評估輸入
interface EvaluationInput {
  type: 'assessment' | 'task' | 'project';
  responses: any;
  context: EvaluationContext;
  rubric?: EvaluationRubric;
}

// 統一的成績資料
interface ScoreData {
  rawScore: number;
  normalizedScore: number;  // 0-100
  dimensions: ScoreDimension[];
  achievements?: Achievement[];
  competencies?: CompetencyScore[];
}
```

### 2.3 具體實作對應

#### PBL 對應
```typescript
class PBLScenario implements ILearningProject {
  id: string;
  title: string;
  description: string;
  objectives: LearningObjective[];
  programs: PBLProgram[];  // 特定於 PBL
  ksaMappings: KSAMapping[];  // 特定於 PBL
}

class PBLProgram implements ILearningContainer {
  id: string;
  scenarioId: string;  // projectId
  userId: string;
  tasks: PBLTask[];
  sessions: PBLSession[];
  status: ContainerStatus;
}

class PBLEvaluationSystem implements IEvaluationSystem {
  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    // PBL 特定的評估邏輯
    // 包含 KSA 映射
  }
  
  mapToCompetencies(score: ScoreData): CompetencyMapping {
    // 映射到 AI Literacy 框架的四大領域
  }
}
```

#### Discovery 對應
```typescript
class DiscoveryPath implements ILearningProject {
  id: string;
  title: string;
  description: string;
  objectives: LearningObjective[];
  category: PathCategory;  // 特定於 Discovery
  worldSetting: string;    // 特定於 Discovery
}

class DiscoveryWorkspace implements ILearningContainer {
  id: string;
  pathId: string;  // projectId
  userId: string;
  tasks: DiscoveryTask[];
  sessions: DiscoverySession[];
  totalXp: number;  // 特定於 Discovery
  achievements: Achievement[];  // 特定於 Discovery
}

class DiscoveryEvaluationSystem implements IEvaluationSystem {
  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    // Discovery 特定的評估邏輯
    // 包含 XP 計算和成就判定
  }
  
  generateScore(result: EvaluationResult): ScoreData {
    // 計算 XP 和技能進度
  }
}
```

#### Assessment 對應
```typescript
class AssessmentTest implements ILearningProject {
  id: string;
  title: string;
  questions: AssessmentQuestion[];
  domains: Domain[];
  passingScore: number;
}

// Assessment 沒有明確的 Container，直接是 Session
class AssessmentSession implements ILearningSession {
  id: string;
  testId: string;  // 對應到 project
  userId: string;
  answers: Answer[];
  domainScores: DomainScore[];
  competencyResults: CompetencyResult[];
}

class AssessmentEvaluationSystem implements IEvaluationSystem {
  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    // 計算各領域分數
  }
  
  mapToCompetencies(score: ScoreData): CompetencyMapping {
    // 直接映射到四大領域能力
  }
}
```

## 3. 統一資料層架構

### 3.1 Repository 層級
```typescript
// 專案層級 Repository
abstract class BaseLearningProjectRepository<T extends ILearningProject> {
  abstract create(project: Omit<T, 'id'>): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(filters?: ProjectFilters): Promise<T[]>;
  abstract update(id: string, updates: Partial<T>): Promise<T>;
}

// 容器層級 Repository  
abstract class BaseLearningContainerRepository<T extends ILearningContainer> {
  abstract create(container: Omit<T, 'id'>): Promise<T>;
  abstract findByUser(userId: string): Promise<T[]>;
  abstract findByProject(projectId: string): Promise<T[]>;
  abstract updateProgress(id: string, taskIndex: number): Promise<T>;
}

// 會話層級 Repository
abstract class BaseLearningSessionRepository<T extends ILearningSession> {
  abstract create(session: Omit<T, 'id'>): Promise<T>;
  abstract findByContainer(containerId: string): Promise<T[]>;
  abstract findActiveByUser(userId: string): Promise<T | null>;
  abstract complete(id: string, evaluation: SessionEvaluation): Promise<T>;
}

// 評估結果 Repository
abstract class BaseEvaluationRepository<T extends EvaluationResult> {
  abstract save(evaluation: T): Promise<T>;
  abstract findBySession(sessionId: string): Promise<T[]>;
  abstract getAggregatedScores(userId: string, projectId: string): Promise<AggregatedScore>;
}
```

### 3.2 Service 層架構
```typescript
// 統一的學習服務基礎類別
abstract class BaseLearningService<
  TProject extends ILearningProject,
  TContainer extends ILearningContainer,
  TSession extends ILearningSession
> {
  constructor(
    protected projectRepo: BaseLearningProjectRepository<TProject>,
    protected containerRepo: BaseLearningContainerRepository<TContainer>,
    protected sessionRepo: BaseLearningSessionRepository<TSession>,
    protected evaluationSystem: IEvaluationSystem,
    protected aiService: BaseAIService
  ) {}
  
  // 共同的業務邏輯
  async startLearning(userId: string, projectId: string): Promise<TContainer> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new Error('Project not found');
    
    // 檢查先修條件
    await this.checkPrerequisites(userId, project);
    
    // 創建容器
    const container = await this.createContainer(userId, project);
    
    // 初始化第一個任務
    await this.initializeFirstTask(container);
    
    return container;
  }
  
  async submitTaskResponse(
    sessionId: string, 
    response: any
  ): Promise<EvaluationResult> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) throw new Error('Session not found');
    
    // 評估回應
    const evaluation = await this.evaluationSystem.evaluate({
      type: this.getEvaluationType(),
      responses: response,
      context: await this.buildEvaluationContext(session)
    });
    
    // 更新會話
    await this.sessionRepo.complete(sessionId, evaluation);
    
    // 更新容器進度
    await this.updateContainerProgress(session.containerId);
    
    // 產生回饋
    const feedback = await this.generateFeedback(evaluation);
    
    return { ...evaluation, feedback };
  }
  
  // 子類別需要實作的方法
  protected abstract createContainer(userId: string, project: TProject): Promise<TContainer>;
  protected abstract getEvaluationType(): string;
  protected abstract buildEvaluationContext(session: TSession): Promise<EvaluationContext>;
}
```

## 4. 實作範例

### 4.1 PBL Service 實作
```typescript
class PBLLearningService extends BaseLearningService<
  PBLScenario,
  PBLProgram,
  PBLSession
> {
  protected async createContainer(
    userId: string, 
    scenario: PBLScenario
  ): Promise<PBLProgram> {
    return this.containerRepo.create({
      scenarioId: scenario.id,
      userId,
      status: 'active',
      startedAt: new Date().toISOString(),
      currentTaskIndex: 0,
      tasks: scenario.programs[0].tasks,  // 第一個 program 的任務
      sessions: []
    });
  }
  
  protected getEvaluationType(): string {
    return 'pbl_task';
  }
  
  protected async buildEvaluationContext(session: PBLSession): Promise<EvaluationContext> {
    const program = await this.containerRepo.findById(session.containerId);
    const scenario = await this.projectRepo.findById(program.scenarioId);
    
    return {
      ksaMappings: scenario.ksaMappings,
      taskObjectives: session.task.objectives,
      previousResponses: session.previousResponses
    };
  }
}
```

### 4.2 Discovery Service 實作
```typescript
class DiscoveryLearningService extends BaseLearningService<
  DiscoveryPath,
  DiscoveryWorkspace,
  DiscoverySession
> {
  protected async createContainer(
    userId: string,
    path: DiscoveryPath
  ): Promise<DiscoveryWorkspace> {
    // 生成初始任務
    const initialTasks = await this.generateInitialTasks(path);
    
    return this.containerRepo.create({
      pathId: path.id,
      userId,
      status: 'active',
      startedAt: new Date().toISOString(),
      currentTaskIndex: 0,
      tasks: initialTasks,
      sessions: [],
      totalXp: 0,
      achievements: []
    });
  }
  
  private async generateInitialTasks(path: DiscoveryPath): Promise<DiscoveryTask[]> {
    // 使用 AI 生成個人化任務
    return this.aiService.generateTasks({
      pathContext: path,
      count: 3,
      difficulty: 'progressive'
    });
  }
  
  protected async updateContainerProgress(containerId: string): Promise<void> {
    const workspace = await this.containerRepo.findById(containerId);
    const completedSessions = await this.sessionRepo.findByContainer(containerId);
    
    // 計算 XP
    const totalXp = completedSessions.reduce((sum, s) => sum + s.xpEarned, 0);
    
    // 檢查成就
    const newAchievements = await this.checkAchievements(workspace, completedSessions);
    
    // 更新工作區
    await this.containerRepo.update(containerId, {
      totalXp,
      achievements: [...workspace.achievements, ...newAchievements],
      completedTasksCount: completedSessions.length
    });
  }
}
```

## 5. 資料庫 Schema 統一設計

### 5.1 核心表格
```sql
-- 學習專案表（統一 PBL Scenarios 和 Discovery Paths）
CREATE TABLE learning_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'pbl_scenario', 'discovery_path', 'assessment'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  objectives JSONB NOT NULL,
  metadata JSONB NOT NULL, -- 存放特定類型的額外資料
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 學習容器表（統一 PBL Programs 和 Discovery Workspaces）
CREATE TABLE learning_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES learning_projects(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  current_task_index INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB NOT NULL, -- 存放特定類型的額外資料（如 XP、achievements）
  UNIQUE(project_id, user_id, type)
);

-- 學習會話表
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id UUID REFERENCES learning_containers(id),
  task_id VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'active',
  inputs JSONB,
  metadata JSONB
);

-- 評估結果表
CREATE TABLE evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES learning_sessions(id),
  evaluation_type VARCHAR(50) NOT NULL,
  raw_score DECIMAL(5,2),
  normalized_score DECIMAL(5,2),
  dimensions JSONB NOT NULL,
  feedback JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 能力進度表（統一追蹤所有類型的能力進展）
CREATE TABLE competency_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  competency_id VARCHAR(100) NOT NULL,
  competency_type VARCHAR(50) NOT NULL, -- 'ai_literacy', 'skill', 'achievement'
  current_level DECIMAL(5,2) DEFAULT 0,
  target_level DECIMAL(5,2),
  evidence JSONB, -- 連結到相關的評估結果
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, competency_id, competency_type)
);
```

## 6. 統一架構的優勢

### 6.1 程式碼重用
- **減少 70% 重複程式碼**：共用基礎類別處理通用邏輯
- **統一的錯誤處理**：所有模組使用相同的錯誤處理機制
- **一致的快取策略**：評估結果和進度資料的快取

### 6.2 功能一致性
- **統一的進度追蹤**：所有學習活動都有標準的進度記錄
- **標準化的評估流程**：從輸入到成績到能力映射
- **一致的 AI 整合**：所有模組使用相同的 AI 服務介面

### 6.3 擴展性
- **新增學習模組簡單**：繼承基礎類別即可
- **評估系統可插拔**：實作 IEvaluationSystem 介面即可
- **儲存後端可替換**：Repository 模式支援多種儲存

### 6.4 維護性
- **清晰的責任劃分**：Project → Container → Session → Evaluation
- **統一的資料流**：所有模組遵循相同的資料流程
- **集中的業務邏輯**：共同邏輯在基礎類別中維護

## 7. 實施建議

### Phase 1: 建立基礎架構（Week 1-2）
1. 創建所有基礎介面和抽象類別
2. 實作共用的 Repository 基礎類別
3. 建立統一的評估系統介面

### Phase 2: 重構 Discovery（Week 3-4）
1. 將 Discovery 改為使用新架構
2. 保持現有 API 不變（使用 Adapter）
3. 完整測試確保功能正常

### Phase 3: 重構 PBL（Week 5-6）
1. 統一 PBL 的資料模型
2. 實作 PBL 特定的評估邏輯
3. 遷移現有資料

### Phase 4: 整合 Assessment（Week 7）
1. 將 Assessment 納入統一架構
2. 簡化評估到成績的流程
3. 統一能力映射邏輯

### Phase 5: 資料庫遷移（Week 8-9）
1. 基於統一模型設計資料庫
2. 實作資料庫 Repository
3. 漸進式遷移資料

這個統一架構不僅解決了程式碼重複的問題，更重要的是建立了一個可擴展、可維護的學習平台基礎。