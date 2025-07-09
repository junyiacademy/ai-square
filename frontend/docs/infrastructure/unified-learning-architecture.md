# 統一學習架構設計 - Content Source → Scenario → Program → Task → Evaluation

## 1. 核心架構概念

### 1.1 統一學習流程
```
Content Source → Scenario → Program → Task → Evaluation
```

這個五層架構適用於所有學習模組：
- **Content Source**：原始內容來源（YAML、API、AI生成）
- **Scenario**：從內容源轉換的單一學習情境（UUID檔案）
- **Program**：每次練習情境時開的實例（向上關聯Scenario UUID）
- **Task**：具體的學習任務（向下隸屬於Program UUID）
- **Evaluation**：評估結果（Task級別和Program級別）

### 1.2 三大模組對應
```
PBL:       YAML → Scenario → Program → Tasks → Evaluations
Discovery: Path → Scenario → Workspace(Program) → Tasks → Evaluations  
Assessment: YAML → Scenario(Config) → Program → Tasks(Questions) → Evaluations
```

各模組特點：
- **PBL**：從YAML載入情境，每個Program包含多個Task，有Task和Program兩層評估
- **Discovery**：動態生成Scenario，Workspace即為Program，需遷移localStorage
- **Assessment**：Assessment config作為Scenario，Questions作為Tasks

## 2. 統一架構設計

### 2.1 核心資料模型
```typescript
// Content Source - 內容來源
interface IContentSource {
  type: 'yaml' | 'api' | 'ai-generated';
  path?: string;  // YAML檔案路徑
  sourceId?: string;  // API或AI生成的來源ID
  metadata: Record<string, unknown>;
}

// Scenario - 學習情境（UUID檔案）
interface IScenario {
  id: string;  // UUID
  sourceType: 'pbl' | 'discovery' | 'assessment';
  sourceRef: IContentSource;
  title: string;
  description: string;
  objectives: string[];
  taskTemplates: ITaskTemplate[];  // 任務模板
  createdAt: string;
  updatedAt: string;
}

// Program - 學習實例（每次開局）
interface IProgram {
  id: string;  // UUID
  scenarioId: string;  // 關聯Scenario UUID
  userId: string;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string;
  taskIds: string[];  // Task UUID列表
  currentTaskIndex: number;
  metadata: Record<string, unknown>;  // 特定類型的額外資料
}

// Task - 學習任務（UUID檔案）
interface ITask {
  id: string;  // UUID
  programId: string;  // 關聯Program UUID
  scenarioTaskIndex: number;  // 在Scenario中的任務索引
  title: string;
  type: 'question' | 'chat' | 'creation' | 'analysis';
  content: {
    instructions?: string;
    question?: string;
    options?: string[];
    context?: Record<string, unknown>;
  };
  interactions: IInteraction[];  // 答題歷程或AI對話log
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'active' | 'completed';
}

// Interaction - 互動記錄（存在Task內）
interface IInteraction {
  timestamp: string;
  type: 'user_input' | 'ai_response' | 'system_event';
  content: unknown;
  metadata?: Record<string, unknown>;
}

// Evaluation - 評估結果
interface IEvaluation {
  id: string;  // UUID
  targetType: 'task' | 'program';
  targetId: string;  // Task UUID 或 Program UUID
  evaluationType: string;  // 評估類型標識
  score?: number;
  feedback?: string;
  dimensions?: IDimensionScore[];
  createdAt: string;
  metadata: Record<string, unknown>;
}
```

### 2.2 統一評估系統
```typescript
// 評估系統介面
interface IEvaluationSystem {
  // Task級別評估
  evaluateTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation>;
  
  // Program級別總結評估
  evaluateProgram(program: IProgram, taskEvaluations: IEvaluation[]): Promise<IEvaluation>;
  
  // 產生回饋
  generateFeedback(evaluation: IEvaluation, language: string): Promise<string>;
}

// 評估上下文
interface IEvaluationContext {
  scenario: IScenario;
  program: IProgram;
  previousEvaluations?: IEvaluation[];
  rubric?: IRubric;
  aiModel?: string;
}

// 維度分數
interface IDimensionScore {
  dimension: string;
  score: number;
  maxScore: number;
  feedback?: string;
}
```

### 2.3 各模組實作細節

#### PBL 模組
```typescript
// PBL Content Source
interface PBLContentSource extends IContentSource {
  type: 'yaml';
  path: string;  // e.g., 'pbl_data/scenarios/ai_education_design/*.yaml'
}

// PBL Scenario
interface PBLScenario extends IScenario {
  sourceType: 'pbl';
  ksaMappings: KSAMapping[];  // PBL特有的KSA映射
  programs: {  // 原YAML中的program定義
    id: string;
    title: string;
    tasks: PBLTaskTemplate[];
  }[];
}

// PBL Task
interface PBLTask extends ITask {
  type: 'chat';  // PBL主要是AI對話
  ksaCodes: string[];  // 關聯的KSA代碼
  aiModules: string[];  // 使用的AI模組
  interactions: PBLInteraction[];  // AI對話記錄
}

// PBL Interaction
interface PBLInteraction extends IInteraction {
  type: 'user_input' | 'ai_response';
  content: {
    message: string;
    attachments?: string[];
  };
}

// PBL Evaluation
interface PBLEvaluation extends IEvaluation {
  targetType: 'task' | 'program';
  evaluationType: 'pbl_task' | 'pbl_completion';
  ksaScores?: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
  domainScores?: DomainScore[];  // 四大領域分數
}
```

#### Discovery 模組
```typescript
// Discovery Content Source  
interface DiscoveryContentSource extends IContentSource {
  type: 'ai-generated';
  sourceId: string;  // Path ID
  metadata: {
    category: 'science' | 'arts' | 'technology' | 'society';
    worldSetting: string;
    userInterests: string[];
  };
}

// Discovery Scenario (動態生成)
interface DiscoveryScenario extends IScenario {
  sourceType: 'discovery';
  path: {
    id: string;
    title: string;
    category: string;
    worldSetting: string;
  };
  generatedTasks: number;  // AI生成的任務數量
}

// Discovery Program (即Workspace)
interface DiscoveryProgram extends IProgram {
  metadata: {
    totalXp: number;
    achievements: Achievement[];
    skillProgress: SkillProgress[];
  };
}

// Discovery Task
interface DiscoveryTask extends ITask {
  type: 'creation' | 'analysis' | 'chat';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  xpReward: number;
  requiredSkills: string[];
  interactions: DiscoveryInteraction[];
}

// Discovery Evaluation  
interface DiscoveryEvaluation extends IEvaluation {
  targetType: 'task' | 'program';
  evaluationType: 'discovery_task' | 'discovery_milestone';
  xpEarned: number;
  skillsImproved: {
    skillId: string;
    improvement: number;
  }[];
  achievementsUnlocked?: string[];
}
```

#### Assessment 模組
```typescript
// Assessment Content Source
interface AssessmentContentSource extends IContentSource {
  type: 'yaml';
  path: string;  // e.g., 'assessment_data/ai_literacy/*.yaml'
}

// Assessment Scenario (即Assessment Config)
interface AssessmentScenario extends IScenario {
  sourceType: 'assessment';
  assessmentConfig: {
    questionsPerDomain: number;
    passingScore: number;
    timeLimit?: number;
  };
  domains: Domain[];  // 四大領域
  questionBank: AssessmentQuestion[];  // 題庫
}

// Assessment Program (測驗實例)
interface AssessmentProgram extends IProgram {
  metadata: {
    selectedQuestions: string[];  // 選中的題目ID
    timeStarted: string;
    timeLimit?: number;
  };
}

// Assessment Task (即單一題目)
interface AssessmentTask extends ITask {
  type: 'question';
  content: {
    question: string;
    options: string[];
    correctAnswer: number;
    domain: string;
    competencyCode: string;
  };
  interactions: AssessmentInteraction[];  // 答題記錄
}

// Assessment Interaction
interface AssessmentInteraction extends IInteraction {
  type: 'user_input';
  content: {
    selectedOption: number;
    timeSpent: number;
  };
}

// Assessment Evaluation
interface AssessmentEvaluation extends IEvaluation {
  targetType: 'task' | 'program';
  evaluationType: 'assessment_question' | 'assessment_complete';
  isCorrect?: boolean;  // Task級別
  domainScores?: DomainScore[];  // Program級別
  competencyMapping?: CompetencyResult[];  // Program級別
}
```

## 3. 統一儲存架構

### 3.1 Repository 層級
```typescript
// Scenario Repository
abstract class BaseScenarioRepository<T extends IScenario> {
  abstract create(scenario: Omit<T, 'id'>): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findBySource(sourceType: string, sourceId?: string): Promise<T[]>;
  abstract update(id: string, updates: Partial<T>): Promise<T>;
}

// Program Repository  
abstract class BaseProgramRepository<T extends IProgram> {
  abstract create(program: Omit<T, 'id'>): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findByUser(userId: string): Promise<T[]>;
  abstract findByScenario(scenarioId: string): Promise<T[]>;
  abstract updateProgress(id: string, taskIndex: number): Promise<T>;
  abstract complete(id: string): Promise<T>;
}

// Task Repository
abstract class BaseTaskRepository<T extends ITask> {
  abstract create(task: Omit<T, 'id'>): Promise<T>;
  abstract createBatch(tasks: Omit<T, 'id'>[]): Promise<T[]>;
  abstract findById(id: string): Promise<T | null>;
  abstract findByProgram(programId: string): Promise<T[]>;
  abstract updateInteractions(id: string, interactions: IInteraction[]): Promise<T>;
  abstract complete(id: string): Promise<T>;
}

// Evaluation Repository
abstract class BaseEvaluationRepository<T extends IEvaluation> {
  abstract create(evaluation: Omit<T, 'id'>): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findByTarget(targetType: string, targetId: string): Promise<T[]>;
  abstract findByProgram(programId: string): Promise<T[]>;
}
```

### 3.2 Service 層架構
```typescript
// 統一學習服務基礎類別
abstract class BaseLearningService<
  TScenario extends IScenario,
  TProgram extends IProgram,
  TTask extends ITask,
  TEvaluation extends IEvaluation
> {
  constructor(
    protected scenarioRepo: BaseScenarioRepository<TScenario>,
    protected programRepo: BaseProgramRepository<TProgram>,
    protected taskRepo: BaseTaskRepository<TTask>,
    protected evaluationRepo: BaseEvaluationRepository<TEvaluation>,
    protected evaluationSystem: IEvaluationSystem,
    protected aiService: BaseAIService
  ) {}
  
  // 開始學習（建立Program和Tasks）
  async startLearning(userId: string, scenarioId: string): Promise<TProgram> {
    const scenario = await this.scenarioRepo.findById(scenarioId);
    if (!scenario) throw new Error('Scenario not found');
    
    // 建立Program
    const program = await this.createProgram(userId, scenario);
    
    // 根據Scenario建立Tasks
    const tasks = await this.createTasksFromScenario(program, scenario);
    
    // 更新Program的taskIds
    await this.programRepo.update(program.id, {
      taskIds: tasks.map(t => t.id)
    });
    
    return program;
  }
  
  // 處理Task互動
  async handleTaskInteraction(
    taskId: string,
    interaction: IInteraction
  ): Promise<TTask> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw new Error('Task not found');
    
    // 更新互動記錄
    const updatedInteractions = [...task.interactions, interaction];
    await this.taskRepo.updateInteractions(taskId, updatedInteractions);
    
    // 檢查是否需要評估
    if (this.shouldEvaluate(task, interaction)) {
      await this.evaluateTask(task);
    }
    
    return this.taskRepo.findById(taskId)!;
  }
  
  // 完成Program
  async completeProgram(programId: string): Promise<TEvaluation> {
    const program = await this.programRepo.findById(programId);
    if (!program) throw new Error('Program not found');
    
    // 獲取所有Task評估
    const taskEvaluations = await this.evaluationRepo.findByTarget('task', program.taskIds);
    
    // 產生Program總結評估
    const scenario = await this.scenarioRepo.findById(program.scenarioId);
    const context: IEvaluationContext = {
      scenario,
      program,
      previousEvaluations: taskEvaluations
    };
    
    const programEvaluation = await this.evaluationSystem.evaluateProgram(
      program,
      taskEvaluations
    );
    
    // 儲存評估結果
    await this.evaluationRepo.create(programEvaluation);
    
    // 更新Program狀態
    await this.programRepo.complete(programId);
    
    return programEvaluation;
  }
  
  // 子類別必須實作的方法
  protected abstract createProgram(userId: string, scenario: TScenario): Promise<TProgram>;
  protected abstract createTasksFromScenario(program: TProgram, scenario: TScenario): Promise<TTask[]>;
  protected abstract shouldEvaluate(task: TTask, interaction: IInteraction): boolean;
  protected abstract evaluateTask(task: TTask): Promise<TEvaluation>;
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

### 4.3 Assessment Service 實作
```typescript
class AssessmentLearningService extends BaseLearningService<
  AssessmentScenario,
  AssessmentProgram,
  AssessmentTask,
  AssessmentEvaluation
> {
  // 從YAML載入Assessment config作為Scenario
  async createScenarioFromConfig(configPath: string): Promise<AssessmentScenario> {
    const config = await this.yamlLoader.load(configPath);
    return this.scenarioRepo.create({
      sourceType: 'assessment',
      sourceRef: {
        type: 'yaml',
        path: configPath,
        metadata: {}
      },
      title: config.title,
      description: config.description,
      objectives: config.objectives,
      taskTemplates: [],  // 將在createTasksFromScenario中動態選擇
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assessmentConfig: config.assessment_config,
      domains: config.domains,
      questionBank: config.questions
    });
  }
  
  protected async createProgram(
    userId: string,
    scenario: AssessmentScenario
  ): Promise<AssessmentProgram> {
    // 從題庫中選擇題目
    const selectedQuestions = this.selectQuestions(
      scenario.questionBank,
      scenario.assessmentConfig.questionsPerDomain
    );
    
    return this.programRepo.create({
      scenarioId: scenario.id,
      userId,
      status: 'active',
      startedAt: new Date().toISOString(),
      taskIds: [],
      currentTaskIndex: 0,
      metadata: {
        selectedQuestions: selectedQuestions.map(q => q.id),
        timeStarted: new Date().toISOString(),
        timeLimit: scenario.assessmentConfig.timeLimit
      }
    });
  }
  
  protected async createTasksFromScenario(
    program: AssessmentProgram,
    scenario: AssessmentScenario
  ): Promise<AssessmentTask[]> {
    const selectedQuestions = scenario.questionBank.filter(
      q => program.metadata.selectedQuestions.includes(q.id)
    );
    
    const tasks: AssessmentTask[] = [];
    for (let i = 0; i < selectedQuestions.length; i++) {
      const question = selectedQuestions[i];
      const task = await this.taskRepo.create({
        programId: program.id,
        scenarioTaskIndex: i,
        title: `Question ${i + 1}`,
        type: 'question',
        content: {
          question: question.question,
          options: question.options,
          correctAnswer: question.correct_answer,
          domain: question.domain,
          competencyCode: question.competency_code
        },
        interactions: [],
        startedAt: new Date().toISOString(),
        status: 'pending'
      });
      tasks.push(task);
    }
    
    return tasks;
  }
  
  protected shouldEvaluate(task: AssessmentTask, interaction: IInteraction): boolean {
    // Assessment在回答後立即評估
    return interaction.type === 'user_input';
  }
  
  protected async evaluateTask(task: AssessmentTask): Promise<AssessmentEvaluation> {
    const lastInteraction = task.interactions[task.interactions.length - 1];
    const isCorrect = lastInteraction.content.selectedOption === task.content.correctAnswer;
    
    const evaluation: AssessmentEvaluation = {
      id: this.generateUUID(),
      targetType: 'task',
      targetId: task.id,
      evaluationType: 'assessment_question',
      isCorrect,
      score: isCorrect ? 1 : 0,
      createdAt: new Date().toISOString(),
      metadata: {
        domain: task.content.domain,
        competencyCode: task.content.competencyCode,
        timeSpent: lastInteraction.content.timeSpent
      }
    };
    
    await this.evaluationRepo.create(evaluation);
    return evaluation;
  }
  
  // Assessment特有：計算領域分數
  async completeProgramWithDomainScores(programId: string): Promise<AssessmentEvaluation> {
    const evaluation = await this.completeProgram(programId);
    
    // 計算各領域分數
    const taskEvaluations = await this.evaluationRepo.findByProgram(programId);
    const domainScores = this.calculateDomainScores(taskEvaluations);
    
    // 更新評估結果
    evaluation.domainScores = domainScores;
    evaluation.competencyMapping = this.mapToCompetencies(domainScores);
    
    await this.evaluationRepo.update(evaluation.id, evaluation);
    return evaluation;
  }
  
  private selectQuestions(questionBank: AssessmentQuestion[], perDomain: number): AssessmentQuestion[] {
    // 從每個領域選擇指定數量的題目
    const selected: AssessmentQuestion[] = [];
    const domains = [...new Set(questionBank.map(q => q.domain))];
    
    domains.forEach(domain => {
      const domainQuestions = questionBank.filter(q => q.domain === domain);
      const shuffled = domainQuestions.sort(() => Math.random() - 0.5);
      selected.push(...shuffled.slice(0, perDomain));
    });
    
    return selected.sort(() => Math.random() - 0.5);
  }
  
  private calculateDomainScores(evaluations: AssessmentEvaluation[]): DomainScore[] {
    // 計算各領域的分數
    const domainMap = new Map<string, { correct: number; total: number }>();
    
    evaluations.forEach(eval => {
      if (eval.targetType === 'task') {
        const domain = eval.metadata.domain;
        if (!domainMap.has(domain)) {
          domainMap.set(domain, { correct: 0, total: 0 });
        }
        const stats = domainMap.get(domain)!;
        stats.total++;
        if (eval.isCorrect) stats.correct++;
      }
    });
    
    return Array.from(domainMap.entries()).map(([domain, stats]) => ({
      domain,
      score: (stats.correct / stats.total) * 100,
      questionsAnswered: stats.total,
      questionsCorrect: stats.correct
    }));
  }
  
  private mapToCompetencies(domainScores: DomainScore[]): CompetencyResult[] {
    // 將領域分數映射到AI素養能力
    return domainScores.map(ds => ({
      competencyId: ds.domain,
      competencyType: 'ai_literacy',
      level: ds.score / 100,
      evidence: {
        source: 'assessment',
        score: ds.score,
        date: new Date().toISOString()
      }
    }));
  }
}
```

## 5. 資料庫 Schema 設計

### 5.1 核心表格
```sql
-- Scenarios 表（學習情境UUID檔案）
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL, -- 'pbl', 'discovery', 'assessment'
  source_ref JSONB NOT NULL, -- Content Source資訊
  title VARCHAR(255) NOT NULL,
  description TEXT,
  objectives TEXT[],
  task_templates JSONB, -- 任務模板（PBL、Assessment使用）
  metadata JSONB NOT NULL, -- 特定類型的額外資料
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Programs 表（學習實例）
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES scenarios(id),
  user_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'abandoned'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  task_ids UUID[],  -- Task UUID列表
  current_task_index INTEGER DEFAULT 0,
  metadata JSONB NOT NULL, -- 特定類型資料（XP、achievements等）
  UNIQUE(scenario_id, user_id)
);

-- Tasks 表（學習任務UUID檔案）
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id),
  scenario_task_index INTEGER NOT NULL, -- 在Scenario中的任務索引
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'question', 'chat', 'creation', 'analysis'
  content JSONB NOT NULL, -- 任務內容
  interactions JSONB DEFAULT '[]', -- 互動記錄（答題歷程、AI對話）
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'completed'
  metadata JSONB DEFAULT '{}' -- 特定類型資料
);

-- Evaluations 表（評估結果）
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL, -- 'task', 'program'
  target_id UUID NOT NULL, -- Task UUID 或 Program UUID
  evaluation_type VARCHAR(100) NOT NULL, -- 評估類型標識
  score DECIMAL(5,2),
  feedback TEXT,
  dimensions JSONB, -- 各維度分數
  metadata JSONB NOT NULL, -- 特定評估資料
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_evaluations_target (target_type, target_id)
);

-- 能力進度表（統一追蹤各類能力）
CREATE TABLE competency_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  competency_id VARCHAR(100) NOT NULL,
  competency_type VARCHAR(50) NOT NULL, -- 'ai_literacy', 'skill', 'achievement'
  current_level DECIMAL(5,2) DEFAULT 0,
  evidence_refs JSONB DEFAULT '[]', -- 關聯Evaluation IDs
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, competency_id)
);
```

## 6. 統一架構的優勢

### 6.1 資料一致性
- **清晰的層級結構**：Content Source → Scenario → Program → Task → Evaluation
- **UUID為基礎的追蹤**：所有實體都有唯一識別碼，便於追蹤和關聯
- **統一的互動記錄**：所有學習互動都儲存在Task內

### 6.2 擴展性與靈活性
- **支援多種內容來源**：YAML、API、AI生成等
- **評佰分層設計**：Task級別和Program級別的評佰
- **模組化架構**：新增學習模組只需實作特定介面

### 6.3 使用者體驗
- **一致的學習流程**：所有模組都遵循相同的學習步驟
- **完整的進度追蹤**：從開始到完成的全程記錄
- **統一的評佰標準**：跨模組的能力評佰

### 6.4 技術優勢
- **簡化的資料遷移**：從localStorage遷移到統一儲存
- **減少程式碼重複**：共用基礎類別和服務
- **更好的可維護性**：清晰的責任劃分和資料流

## 7. 實施路線圖

### Phase 1: 建立核心架構（Week 1-2）
1. 定義所有核心介面（IScenario, IProgram, ITask, IEvaluation）
2. 實作基礎 Repository 和 Service 類別
3. 設計UUID檔案儲存結構

### Phase 2: 遷移 Discovery（Week 3-4）
1. 從localStorage遷移到統一儲存
2. 將Path轉換為Scenario模式
3. 將Workspace改為Program實作
4. 保持現有API相容

### Phase 3: 統一 PBL（Week 5-6）
1. 從YAML載入建立Scenario UUID檔案
2. 改造Program和Task建立流程
3. 實作Task和Program兩層評佰

### Phase 4: 整合 Assessment（Week 7）
1. 將Assessment config作為Scenario
2. 將Questions作為Tasks處理
3. 統一評佰結果格式

### Phase 5: 資料庫實作（Week 8-9）
1. 建立統一的資料庫 Schema
2. 實作資料庫Repository
3. 遷移現有資料到新結構

### Phase 6: 效能優化（Week 10）
1. 實作快取機制
2. 優化UUID檔案讀寫
3. 效能測試與調整

## 8. 結論

這個 Content Source → Scenario → Program → Task → Evaluation 的統一架構為 AI Square 平台提供了：

1. **一致的學習體驗**：不管是PBL、Discovery還是Assessment，都遵循相同的學習流程
2. **靈活的資料管理**：基於UUID的資料結構，便於追蹤和管理
3. **完整的評佰體系**：Task級別和Program級別的雙層評佰
4. **良好的擴展性**：新增學習模組只需遵循統一模式

通過這個架構，我們可以確保平台的持續發展和優化，同時提供高品質的學習體驗。