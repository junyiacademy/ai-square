# 統一 SCENARIO 架構設計 V2

## 概述

本文檔定義 AI Square V2 的統一學習架構，採用 SCENARIO → PROGRAM → TASK → LOG 的層級結構，可兼容 PBL、Discovery 和 Assessment 三種學習模式。

## 核心設計原則

1. **統一的資料模型**：所有學習活動都遵循相同的層級結構
2. **關聯式資料庫思維（RDB）**：
   - 使用 UUID 作為所有實體的唯一識別碼
   - 扁平化資料結構，避免巢狀儲存
   - 透過 ID 列表建立實體間的關聯（Foreign Keys）
   - 每個實體都包含上下游的 ID 參照
3. **資料來源追蹤**：從 YAML 建立資料時保留原始來源資訊
4. **GCS 實現 RDB 模式**：使用 Google Cloud Storage 實現關聯式資料庫的儲存模式

## 統一架構的三種實現

### 1. 來源（Project）層
```
PBL:       Scenario (情境卡片) → 定義學習目標和任務
Discovery: Career Card (職業卡片) → 定義職業和可能場景
Assessment: Exam (考卷) → 定義題目和評分標準
```

### 2. 結構層（完全相同）
```
所有模式：Scenario → Programs → Tasks → Logs
```

### 3. 語義層（用途不同）

| 層級 | PBL | Discovery | Assessment |
|------|-----|-----------|------------|
| **Scenario** | 學習歷程 | 職業探索歷程 | 測驗歷程 |
| **Program** | 學習階段<br>(基礎→進階) | 劇本場景<br>(日常→挑戰→成長) | 測驗回合<br>(練習1→練習2→正式) |
| **Task** | 學習任務 | 體驗任務 | 考題 |
| **Log** | 對話記錄 | 互動記錄 | 答題記錄 |

### 4. Task 特性對比

| 特性 | PBL | Discovery | Assessment |
|------|-----|-----------|------------|
| **評估方式** | AI 對話評估 | 多元彈性評估 | 標準答案 |
| **Task 數量** | 固定（由 Scenario 定義） | 動態（可無限增加） | 固定（由 Exam 定義） |
| **Task 內容** | 預設任務 | AI 生成或動態添加 | 預設題目 |
| **重複性** | 可重複練習 | 每個都是新體驗 | 可重複作答 |

### 5. Program 設計理念

| 模式 | Program 用途 | 特點 |
|------|-------------|------|
| **PBL** | 學習階段分組 | 任務可能重複或遞進，強調練習和掌握 |
| **Discovery** | 不同情境體驗 | 每個 Program 是獨立場景，任務集互不重複 |
| **Assessment** | 測驗回合記錄 | 相同題目集的多次嘗試，追蹤進步 |

## GCS 儲存架構優化策略

### 優化方案（暫時性，未來遷移至 RDB）

1. **簡單記憶體快取**
   - 5 分鐘 TTL 的記憶體快取
   - 減少重複的 GCS 讀取操作

2. **批次讀取**
   - 一次載入相關聯的資料
   - 使用 Promise.all 平行處理

3. **Task 內嵌 Log**
   - 對話記錄和答題歷程直接儲存在 Task JSON 中
   - 避免額外的 Log 查詢開銷

4. **簡化索引結構**
   ```
   v2/
   ├── scenarios/
   │   └── {scenarioId}.json
   ├── programs/
   │   └── {programId}.json  
   ├── tasks/
   │   └── {taskId}.json     # 包含所有 logs
   ├── evaluations/
   │   └── {evaluationId}.json
   ├── completions/
   │   └── {completionId}.json
   └── indexes/
       └── users/
           └── {userEmail}/
               ├── programs.json   # 程式 ID 列表
               └── scenarios.json  # 情境 ID 列表
   ```

5. **延遲載入策略**
   - 列表頁只載入摘要資訊
   - 詳細內容按需載入

### Task Log 設計

**重要決定**：將 Log 直接嵌入 Task JSON 中，而非分開儲存

優點：
1. 減少查詢次數 - 一次讀取即可獲得完整歷程
2. 原子性更新 - 確保 Task 狀態與 Log 的一致性
3. 簡化架構 - 不需要額外的 Log 索引和關聯

```typescript
// Assessment Task 包含完整答題歷程
answerHistory: [
  {
    timestamp: "2024-01-01T10:00:00Z",
    action: "view",       // 查看題目
    timeSpent: 0
  },
  {
    timestamp: "2024-01-01T10:00:30Z",
    action: "answer",    // 首次作答
    answer: "b",
    timeSpent: 30
  },
  {
    timestamp: "2024-01-01T10:01:00Z",
    action: "change",    // 修改答案
    answer: "a",
    timeSpent: 30
  },
  {
    timestamp: "2024-01-01T10:01:30Z",
    action: "submit",    // 提交答案
    answer: "a",
    timeSpent: 30
  }
]

// PBL Task 包含對話記錄
aiInteractions: [
  {
    timestamp: "2024-01-01T10:00:00Z",
    userMessage: "我不太理解這個概念",
    aiResponse: "讓我用簡單的例子解釋...",
    tokensUsed: 150
  }
]
```

## 資料庫 Schema (V2)

### 1. 學習專案表 (learning_projects_v2)

```sql
CREATE TABLE learning_projects_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'pbl', 'discovery', 'assessment'
    code VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    objectives JSONB NOT NULL DEFAULT '[]',
    prerequisites JSONB DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}', -- 特定類型的額外資料
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_v2_type ON learning_projects_v2(type);
CREATE INDEX idx_projects_v2_code ON learning_projects_v2(code);
```

### 2. 學習情境表 (scenarios_v2)

```sql
CREATE TABLE scenarios_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    project_id UUID NOT NULL REFERENCES learning_projects_v2(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'pbl', 'discovery', 'assessment'
    title VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'created', -- 'created', 'active', 'paused', 'completed', 'abandoned'
    metadata JSONB DEFAULT '{}', -- Scenario 特定資料
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scenarios_v2_user_email ON scenarios_v2(user_email);
CREATE INDEX idx_scenarios_v2_project_id ON scenarios_v2(project_id);
CREATE INDEX idx_scenarios_v2_status ON scenarios_v2(status);
CREATE INDEX idx_scenarios_v2_type ON scenarios_v2(type);

-- 確保用戶在同一個專案只有一個活躍的 scenario
CREATE UNIQUE INDEX unique_active_scenario_v2 ON scenarios_v2(user_email, project_id) 
WHERE status IN ('active', 'paused');
```

### 3. 學習項目表 (programs_v2)

```sql
CREATE TABLE programs_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES scenarios_v2(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    program_order INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed', 'skipped'
    config JSONB DEFAULT '{}', -- Program 配置（如 PBL 的 AI modules）
    metadata JSONB DEFAULT '{}', -- Program 特定資料（如 Discovery 的 XP）
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_programs_v2_scenario_id ON programs_v2(scenario_id);
CREATE INDEX idx_programs_v2_status ON programs_v2(status);
CREATE UNIQUE INDEX unique_program_order_v2 ON programs_v2(scenario_id, program_order);
```

### 4. 學習任務表 (tasks_v2)

```sql
CREATE TABLE tasks_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES programs_v2(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    instructions TEXT,
    task_order INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'chat', 'code', 'quiz', 'submission', 'discussion'
    required_ksa TEXT[] DEFAULT '{}', -- 需要的能力代碼
    config JSONB DEFAULT '{}', -- Task 配置（如題目、選項、rubric）
    metadata JSONB DEFAULT '{}', -- Task 特定資料
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed', 'skipped'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_v2_program_id ON tasks_v2(program_id);
CREATE INDEX idx_tasks_v2_status ON tasks_v2(status);
CREATE INDEX idx_tasks_v2_type ON tasks_v2(type);
CREATE UNIQUE INDEX unique_task_order_v2 ON tasks_v2(program_id, task_order);
```

### 5. 活動日誌表 (logs_v2)

```sql
CREATE TABLE logs_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES scenarios_v2(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs_v2(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks_v2(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    log_type VARCHAR(50) NOT NULL, -- 'chat', 'submission', 'evaluation', 'completion', 'feedback', 'achievement'
    activity VARCHAR(100) NOT NULL, -- 具體活動名稱
    data JSONB NOT NULL DEFAULT '{}', -- 活動資料
    metadata JSONB DEFAULT '{}', -- 額外資訊（如 AI token 使用）
    duration_seconds INTEGER, -- 活動持續時間
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_v2_scenario_id ON logs_v2(scenario_id);
CREATE INDEX idx_logs_v2_program_id ON logs_v2(program_id);
CREATE INDEX idx_logs_v2_task_id ON logs_v2(task_id);
CREATE INDEX idx_logs_v2_user_email ON logs_v2(user_email);
CREATE INDEX idx_logs_v2_log_type ON logs_v2(log_type);
CREATE INDEX idx_logs_v2_created_at ON logs_v2(created_at DESC);
```

### 6. 評估結果表 (evaluations_v2)

```sql
CREATE TABLE evaluations_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES logs_v2(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenarios_v2(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks_v2(id) ON DELETE CASCADE,
    evaluation_type VARCHAR(50) NOT NULL, -- 'ai', 'rubric', 'quiz', 'peer', 'self'
    input JSONB NOT NULL, -- 評估輸入
    result JSONB NOT NULL, -- 評估結果
    scores JSONB NOT NULL DEFAULT '{}', -- 各維度分數
    feedback JSONB DEFAULT '{}', -- 回饋內容
    ksa_mapping JSONB DEFAULT '{}', -- KSA 能力映射
    evaluated_by VARCHAR(100), -- 'system', 'ai:model-name', 'peer:user-id'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evaluations_v2_log_id ON evaluations_v2(log_id);
CREATE INDEX idx_evaluations_v2_scenario_id ON evaluations_v2(scenario_id);
CREATE INDEX idx_evaluations_v2_task_id ON evaluations_v2(task_id);
CREATE INDEX idx_evaluations_v2_type ON evaluations_v2(evaluation_type);
```

## 具體實作範例

### PBL 範例：AI-Powered Job Search
```
Scenario: "AI-Powered Job Search"
└── Scenario: "John's AI Job Search Learning Journey"
    ├── Program 1: "Foundation" (基礎階段)
    │   ├── Task A: Understanding AI Tools
    │   ├── Task B: Resume Optimization
    │   └── Task C: Job Matching
    │
    └── Program 2: "Advanced" (進階階段)
        ├── Task A': Advanced AI Tools (深化 Task A)
        ├── Task B': Portfolio Building (延伸 Task B)
        └── Task D: Interview Preparation (新任務)
```

### Discovery 範例：AI Product Manager Career
```
Career Card: "AI Product Manager"
└── Scenario: "Exploring AI PM Career Path"
    ├── Program 1: "Day in the Life" (日常場景)
    │   ├── Task: Morning Team Briefing
    │   ├── Task: Feature Planning
    │   └── Task: Stakeholder Meeting
    │
    ├── Program 2: "Crisis Management" (挑戰場景)
    │   ├── Task: Problem Analysis
    │   ├── Task: Solution Design
    │   └── Task: Crisis Communication
    │
    └── Program 3: "Career Growth" (成長場景)
        ├── Task: Skill Assessment
        ├── Task: Career Planning
        └── Task: Decision Making
```

### Assessment 範例：AI Literacy Certification
```
Exam: "AI Literacy Foundation Assessment"
└── Scenario: "Mary's AI Literacy Assessment Journey"
    ├── Program 1: "Practice Round 1" (2025-01-08)
    │   ├── Question 1: Score 80%
    │   ├── Question 2: Score 60%
    │   └── Question 3: Score 100%
    │
    ├── Program 2: "Practice Round 2" (2025-01-09)
    │   ├── Question 1: Score 100%
    │   ├── Question 2: Score 80%
    │   └── Question 3: Score 100%
    │
    └── Program 3: "Formal Assessment" (2025-01-10)
        ├── Question 1: Score 100%
        ├── Question 2: Score 90%
        └── Question 3: Score 100%
```

## 實作架構

### 1. 基礎介面定義

```typescript
// src/lib/v2/interfaces/base.ts

export interface ITrackableEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ILearningProject extends ITrackableEntity {
  type: 'pbl' | 'discovery' | 'assessment';
  code: string;
  title: string;
  description: string;
  objectives: string[];
  prerequisites: string[];
  metadata: Record<string, any>;
  is_active: boolean;
}

export interface IScenario extends ITrackableEntity {
  user_email: string;
  project_id: string;
  type: 'pbl' | 'discovery' | 'assessment';
  title: string;
  status: 'created' | 'active' | 'paused' | 'completed' | 'abandoned';
  metadata: Record<string, any>;
  started_at?: string;
  completed_at?: string;
  last_active_at?: string;
}

export interface IProgram extends ITrackableEntity {
  scenario_id: string;
  title: string;
  description?: string;
  program_order: number;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  config: Record<string, any>;
  metadata: Record<string, any>;
  started_at?: string;
  completed_at?: string;
}

export interface ITask extends ITrackableEntity {
  program_id: string;
  title: string;
  description?: string;
  instructions?: string;
  task_order: number;
  type: 'chat' | 'code' | 'quiz' | 'submission' | 'discussion';
  required_ksa: string[];
  config: Record<string, any>;
  metadata: Record<string, any>;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  started_at?: string;
  completed_at?: string;
}

export interface ILog extends ITrackableEntity {
  scenario_id: string;
  program_id?: string;
  task_id?: string;
  user_email: string;
  log_type: 'chat' | 'submission' | 'evaluation' | 'completion' | 'feedback' | 'achievement';
  activity: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  duration_seconds?: number;
}

export interface IEvaluation extends ITrackableEntity {
  log_id: string;
  scenario_id: string;
  task_id?: string;
  evaluation_type: 'ai' | 'rubric' | 'quiz' | 'peer' | 'self';
  input: Record<string, any>;
  result: Record<string, any>;
  scores: Record<string, number>;
  feedback?: Record<string, any>;
  ksa_mapping?: Record<string, any>;
  evaluated_by?: string;
}
```

### 2. Repository 基礎類別

```typescript
// src/lib/v2/repositories/base.repository.ts

export abstract class BaseRepository<T extends ITrackableEntity> {
  constructor(
    protected tableName: string,
    protected db: Database
  ) {}

  async findById(id: string): Promise<T | null> {
    return this.db.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
  }

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    // 實作建立邏輯
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    // 實作更新邏輯
  }

  async delete(id: string): Promise<boolean> {
    // 實作刪除邏輯
  }
}
```

### 3. Service 基礎類別

```typescript
// src/lib/v2/services/base.service.ts

export abstract class BaseLearningService {
  constructor(
    protected projectRepo: IProjectRepository,
    protected scenarioRepo: IScenarioRepository,
    protected programRepo: IProgramRepository,
    protected taskRepo: ITaskRepository,
    protected logRepo: ILogRepository,
    protected evaluationRepo: IEvaluationRepository,
    protected storageService: IStorageService,
    protected aiService: IAIService
  ) {}

  // 開始新的學習情境
  async startScenario(userId: string, projectId: string): Promise<IScenario> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new Error('Project not found');

    // 檢查是否已有活躍的 scenario
    const existingScenario = await this.scenarioRepo.findActiveByUserAndProject(userId, projectId);
    if (existingScenario) {
      return existingScenario;
    }

    // 建立新 scenario
    const scenario = await this.scenarioRepo.create({
      user_id: userId,
      project_id: projectId,
      type: project.type,
      title: `${project.title} - ${new Date().toISOString()}`,
      status: 'active',
      metadata: {},
      started_at: new Date().toISOString()
    });

    // 建立初始 programs
    await this.createInitialPrograms(scenario, project);

    // 記錄開始 log
    await this.logActivity(scenario.id, null, null, userId, 'scenario_started', {
      project_id: projectId,
      project_title: project.title
    });

    return scenario;
  }

  // 提交任務回應
  async submitTaskResponse(
    taskId: string,
    userId: string,
    response: any
  ): Promise<IEvaluation> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw new Error('Task not found');

    const program = await this.programRepo.findById(task.program_id);
    if (!program) throw new Error('Program not found');

    // 記錄提交 log
    const log = await this.logActivity(
      program.scenario_id,
      program.id,
      taskId,
      userId,
      'task_submitted',
      { response }
    );

    // 評估回應
    const evaluation = await this.evaluateResponse(task, response, log);

    // 更新任務狀態
    await this.taskRepo.update(taskId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    // 檢查是否完成 program
    await this.checkProgramCompletion(program.id);

    return evaluation;
  }

  // 記錄活動
  protected async logActivity(
    scenarioId: string,
    programId: string | null,
    taskId: string | null,
    userId: string,
    activity: string,
    data: any,
    metadata?: any
  ): Promise<ILog> {
    const logType = this.getLogType(activity);
    
    return this.logRepo.create({
      scenario_id: scenarioId,
      program_id: programId,
      task_id: taskId,
      user_id: userId,
      log_type: logType,
      activity,
      data,
      metadata
    });
  }

  // 子類別需要實作的方法
  protected abstract createInitialPrograms(scenario: IScenario, project: ILearningProject): Promise<void>;
  protected abstract evaluateResponse(task: ITask, response: any, log: ILog): Promise<IEvaluation>;
  protected abstract getLogType(activity: string): ILog['log_type'];
}
```

### 4. Discovery 的獨特能力

```typescript
class DiscoveryServiceV2 {
  // Discovery 可以動態新增任務
  async addDynamicTask(programId: string, context: string) {
    const newTask = await this.aiService.generateTask(context);
    return this.taskRepo.create({
      program_id: programId,
      ...newTask,
      metadata: { 
        generated: true,
        generation_context: context 
      }
    });
  }
  
  // Discovery 可以分支探索
  async branchExploration(scenarioId: string, newDirection: string) {
    // 在現有 scenario 中創建新的探索 program
    return this.createProgram({
      scenario_id: scenarioId,
      title: `Exploring: ${newDirection}`,
      metadata: { 
        branch_type: 'user_initiated',
        parent_program: currentProgramId
      }
    });
  }
  
  // Discovery 可以無限增加任務
  async continueExploration(programId: string, userInterest: string) {
    const program = await this.programRepo.findById(programId);
    const existingTasks = await this.taskRepo.findByProgram(programId);
    
    // AI 根據用戶興趣和已完成任務生成新任務
    const newTasks = await this.aiService.generateFollowUpTasks({
      career: program.metadata.career,
      scenario: program.metadata.scenario_type,
      completed_tasks: existingTasks,
      user_interest: userInterest
    });
    
    // 添加新任務到現有 program
    for (const task of newTasks) {
      await this.taskRepo.create({
        program_id: programId,
        ...task,
        order_index: existingTasks.length + 1
      });
    }
  }
}
```

## V2 Assessment Storage 實作完成

### 已實作功能

1. **完整的 Assessment 儲存服務**
   - `AssessmentStorageV2Service` - 主要服務類別
   - 支援 Scenario、Program、Task、Evaluation、Completion 的完整 CRUD
   - 遵循統一架構設計

2. **效能優化**
   - 5 分鐘 TTL 的記憶體快取
   - 批次載入相關資料（`getProgramWithDetails`）
   - 簡化的索引結構

3. **Task Log 內嵌設計**
   - `answerHistory` - 記錄所有答題動作
   - `aiInteractions` - AI 互動記錄
   - 自動計算每個動作的時間間隔

4. **測試覆蓋**
   - 單元測試：13 個測試案例全部通過
   - 整合測試：完整流程測試通過
   - 測試覆蓋：Scenario、Program、Task、Evaluation、Completion

### 使用範例

```typescript
// 1. 建立測驗情境
const scenario = await storage.saveScenario({
  sourceFile: 'ai_literacy.yaml',
  sourceId: 'ai_literacy',
  type: 'assessment',
  title: { en: 'AI Literacy Test' },
  // ...
});

// 2. 用戶開始測驗
const program = await storage.createProgram(
  'user@example.com',
  scenario.id,
  { language: 'zh' }
);

// 3. 載入題目
const tasks = await storage.createTasksForProgram(
  program.id,
  questions
);

// 4. 記錄答題歷程
await storage.addAnswerToHistory(taskId, 'view');
await storage.addAnswerToHistory(taskId, 'answer', 'a');
await storage.addAnswerToHistory(taskId, 'submit', 'a');

// 5. 評分
await storage.createEvaluation(taskId, true, 100);

// 6. 完成測驗
const completion = await storage.createCompletion(programId);
```

### 檔案結構

```
src/lib/v2/
├── schemas/
│   ├── assessment-v2.schema.ts    # Assessment 專用 Schema
│   └── pbl.schema.ts              # PBL 專用 Schema
├── services/
│   ├── assessment-storage-v2.service.ts  # Assessment 儲存服務
│   ├── pbl-storage.service.ts           # PBL 儲存服務
│   └── __tests__/
│       ├── assessment-storage-v2.test.ts
│       └── assessment-v2-integration.test.ts
```

## 具體實作範例

### PBL V2 Service - 學習階段分組

```typescript
// src/lib/v2/services/pbl.service.ts

export class PBLServiceV2 extends BaseLearningService {
  protected async createInitialPrograms(scenario: IScenario, project: ILearningProject): Promise<void> {
    // PBL 的 Programs 代表學習階段（基礎、進階等）
    const pblPrograms = project.metadata.programs || [];
    
    for (let i = 0; i < pblPrograms.length; i++) {
      const pblProgram = pblPrograms[i];
      
      const program = await this.programRepo.create({
        scenario_id: scenario.id,
        title: pblProgram.title,  // 例如："Foundation", "Advanced"
        description: pblProgram.description,
        program_order: i,
        status: i === 0 ? 'active' : 'pending',
        metadata: {
          stage: pblProgram.stage,  // 'foundation', 'advanced'
          prerequisites: pblProgram.prerequisites
        }
      });

      // 建立該階段的所有任務
      for (let j = 0; j < pblProgram.tasks.length; j++) {
        const pblTask = pblProgram.tasks[j];
        
        await this.taskRepo.create({
          program_id: program.id,
          title: pblTask.title,
          task_type: 'standard',  // PBL 任務是標準學習任務
          task_variant: 'standard',
          required_ksa: pblTask.required_ksa || [],
          metadata: {
            can_repeat: true,  // PBL 任務可重複練習
            difficulty: pblTask.difficulty
          }
        });
      }
    }
  }

  protected async evaluateResponse(task: ITask, response: any, log: ILog): Promise<IEvaluation> {
    // PBL 使用 AI 對話評估
    const evaluation = await this.aiService.evaluateConversation({
      task: task,
      conversation: response,
      rubric: task.config.rubric,
      required_ksa: task.required_ksa
    });

    return this.evaluationRepo.create({
      log_id: log.id,
      evaluation_type: 'ai',
      input: { conversation: response },
      result: evaluation,
      feedback: evaluation.feedback,
      ksa_mapping: evaluation.ksa_achievement
    });
  }
}
```

### Discovery V2 Service - 職業場景體驗

```typescript
// src/lib/v2/services/discovery.service.ts

export class DiscoveryServiceV2 extends BaseLearningService {
  protected async createInitialPrograms(scenario: IScenario, project: ILearningProject): Promise<void> {
    // Discovery 的 Programs 代表不同的職業場景
    const career = project.metadata.career;
    const scenarios = [
      { type: 'daily_routine', title: `Day in the Life of ${career}` },
      { type: 'challenge', title: `${career} Challenge Scenario` },
      { type: 'career_growth', title: `${career} Career Growth` }
    ];
    
    for (const scenario of scenarios) {
      const program = await this.programRepo.create({
        scenario_id: scenario.id,
        title: scenario.title,
        metadata: {
          scenario_type: scenario.type,
          career: career,
          is_expandable: true  // Discovery programs 可以無限擴展
        }
      });

      // 為每個場景生成初始任務
      const tasks = await this.generateScenarioTasks(career, scenario.type);
      for (const task of tasks) {
        await this.taskRepo.create({
          program_id: program.id,
          ...task,
          task_variant: 'exploration',  // Discovery 任務是探索性的
          metadata: {
            ...task.metadata,
            can_branch: true  // 可以從這個任務分支出新方向
          }
        });
      }
    }
  }

  // Discovery 特有：動態增加任務
  async addTaskToScenario(programId: string, userRequest: string) {
    const newTask = await this.aiService.generateContextualTask({
      program_id: programId,
      user_request: userRequest,
      existing_tasks: await this.taskRepo.findByProgram(programId)
    });
    
    return this.taskRepo.create({
      program_id: programId,
      ...newTask,
      metadata: {
        generated_from: userRequest,
        generated_at: new Date().toISOString()
      }
    });
  }
}
```

### Assessment V2 Service - 測驗回合管理

```typescript
// src/lib/v2/services/assessment.service.ts

export class AssessmentServiceV2 extends BaseLearningService {
  async createNewAssessmentRound(
    userId: string,
    examId: string,
    roundType: 'practice' | 'formal'
  ) {
    // 找到或創建 Scenario
    let scenario = await this.findActiveScenario(userId, examId);
    if (!scenario) {
      scenario = await this.createScenarioFromExam(userId, examId);
    }

    // Assessment 的每個 Program 代表一次測驗回合
    const roundNumber = scenario.programs.length + 1;
    const program = await this.programRepo.create({
      scenario_id: scenario.id,
      title: roundType === 'practice' 
        ? `Practice Round ${roundNumber}` 
        : `Formal Assessment`,
      metadata: {
        round_type: roundType,
        attempt_number: roundNumber,
        started_at: new Date().toISOString()
      }
    });

    // 從考卷定義創建題目（相同題目，新的嘗試）
    const exam = await this.loadExam(examId);
    for (const question of exam.questions) {
      await this.taskRepo.create({
        program_id: program.id,
        title: question.text,
        task_type: 'quiz',
        task_variant: 'question',  // Assessment 任務是題目
        config: {
          question_id: question.id,
          options: question.options,
          correct_answer: question.correct_answer,
          points: question.points
        },
        metadata: {
          can_skip: exam.allow_skip,
          time_limit: question.time_limit
        }
      });
    }

    return { scenario, program };
  }

  protected async evaluateResponse(task: ITask, response: any, log: ILog): Promise<IEvaluation> {
    // Assessment 使用標準答案評估
    const isCorrect = response.answer === task.config.correct_answer;
    const score = isCorrect ? task.config.points : 0;

    return this.evaluationRepo.create({
      log_id: log.id,
      evaluation_type: 'quiz',
      input: { answer: response.answer },
      result: { 
        is_correct: isCorrect,
        correct_answer: task.config.correct_answer
      },
      scores: { points: score, percentage: isCorrect ? 100 : 0 },
      feedback: {
        message: isCorrect ? 'Correct!' : 'Incorrect',
        explanation: task.config.explanation
      }
    });
  }
}
```

## GCS V2 存儲架構（實現 RDB 模式）

### 核心概念：扁平化儲存 + ID 關聯

不同於傳統的巢狀資料夾結構，V2 採用扁平化儲存，透過 UUID 建立關聯：

```
ai-square-db-v2/
├── scenarios/
│   └── {scenario_uuid}.json
│       {
│         "id": "scenario_uuid",
│         "user_email": "user@example.com",
│         "source_type": "assessment",
│         "source_id": "ai_literacy",
│         "program_ids": ["program_uuid_1", "program_uuid_2"],
│         "created_at": "2025-01-08T10:00:00Z"
│       }
├── programs/
│   └── {program_uuid}.json
│       {
│         "id": "program_uuid",
│         "scenario_id": "scenario_uuid",
│         "title": "Practice Round 1",
│         "task_ids": ["task_uuid_1", "task_uuid_2", ...],
│         "created_at": "2025-01-08T10:00:00Z"
│       }
├── tasks/
│   └── {task_uuid}.json
│       {
│         "id": "task_uuid",
│         "program_id": "program_uuid",
│         "source_id": "E001",  // 原始題目 ID
│         "title": "What is the most effective way...",
│         "created_at": "2025-01-08T10:00:00Z"
│       }
├── evaluations/
│   └── {evaluation_uuid}.json
│       {
│         "id": "evaluation_uuid",
│         "task_id": "task_uuid",
│         "user_answer": "b",
│         "is_correct": true,
│         "score": 100,
│         "created_at": "2025-01-08T10:05:00Z"
│       }
├── completions/
│   └── {completion_uuid}.json
│       {
│         "id": "completion_uuid",
│         "program_id": "program_uuid",
│         "overall_score": 85,
│         "passed": true,
│         "completed_at": "2025-01-08T10:30:00Z"
│       }
└── logs/
    └── {log_uuid}.json
        {
          "id": "log_uuid",
          "scenario_id": "scenario_uuid",
          "program_id": "program_uuid",
          "task_id": "task_uuid",
          "action": "answer_submitted",
          "data": { "answer": "b", "time_spent": 45 },
          "created_at": "2025-01-08T10:05:00Z"
        }
```

### 索引檔案（實現查詢效率）

為了提高查詢效率，使用索引檔案：

```
indexes/
├── user_scenarios/
│   └── {user_email}.json
│       {
│         "scenario_ids": ["scenario_uuid_1", "scenario_uuid_2", ...]
│       }
├── scenario_programs/
│   └── {scenario_uuid}.json
│       {
│         "program_ids": ["program_uuid_1", "program_uuid_2", ...]
│       }
└── program_tasks/
    └── {program_uuid}.json
        {
          "task_ids": ["task_uuid_1", "task_uuid_2", ...]
        }
```

```typescript
// src/lib/v2/storage/gcs.service.ts

export class GCSServiceV2 {
  private bucket: string;

  constructor() {
    this.bucket = process.env.GCS_BUCKET_NAME_V2!;
    if (!this.bucket) {
      throw new Error('GCS_BUCKET_NAME_V2 not configured');
    }
  }

  // V2 的存儲路徑結構
  private getPath(type: string, userId: string, scenarioId: string): string {
    return `v2/${type}/${userId}/${scenarioId}`;
  }

  async saveScenarioData(userId: string, scenarioId: string, data: any): Promise<void> {
    const path = `${this.getPath('scenarios', userId, scenarioId)}/data.json`;
    await this.uploadJSON(path, data);
  }

  async saveLog(userId: string, scenarioId: string, logId: string, data: any): Promise<void> {
    const path = `${this.getPath('logs', userId, scenarioId)}/${logId}.json`;
    await this.uploadJSON(path, data);
  }

  async saveEvaluation(userId: string, scenarioId: string, evalId: string, data: any): Promise<void> {
    const path = `${this.getPath('evaluations', userId, scenarioId)}/${evalId}.json`;
    await this.uploadJSON(path, data);
  }

  private async uploadJSON(path: string, data: any): Promise<void> {
    // 實作 GCS 上傳邏輯
  }
}
```

## API Routes V2

```typescript
// src/app/api/v2/scenarios/route.ts

export async function POST(request: Request) {
  const { projectId } = await request.json();
  const userId = await getUserId(request);

  const service = getServiceForProject(projectId);
  const scenario = await service.startScenario(userId, projectId);

  return NextResponse.json(scenario);
}

// src/app/api/v2/tasks/[taskId]/submit/route.ts

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const { response } = await request.json();
  const userId = await getUserId(request);

  const service = await getServiceForTask(params.taskId);
  const evaluation = await service.submitTaskResponse(params.taskId, userId, response);

  return NextResponse.json(evaluation);
}
```

## 遷移策略

### 第一階段：建立 V2 基礎設施
1. 建立所有 V2 資料表
2. 實作基礎 Repository 和 Service 類別
3. 設定 GCS_BUCKET_NAME_V2 環境變數
4. 建立 V2 API routes

### 第二階段：並行運作
1. 新功能使用 V2 架構
2. 舊功能繼續使用原架構
3. 提供資料同步機制

### 第三階段：逐步遷移
1. 先遷移 Discovery (最簡單)
2. 再遷移 PBL
3. 最後遷移 Assessment

### 第四階段：清理舊代碼
1. 確認所有功能正常
2. 移除舊的 API routes
3. 清理舊的資料結構

## 測試策略

```typescript
// src/lib/v2/__tests__/scenario.service.test.ts

describe('ScenarioService V2', () => {
  it('should create a new scenario', async () => {
    const scenario = await service.startScenario(userId, projectId);
    expect(scenario.status).toBe('active');
    expect(scenario.project_id).toBe(projectId);
  });

  it('should handle task submission', async () => {
    const evaluation = await service.submitTaskResponse(taskId, userId, response);
    expect(evaluation.evaluation_type).toBe('ai');
    expect(evaluation.scores).toBeDefined();
  });
});
```

## 總結

這個 V2 架構提供了：

1. **統一的資料模型**：SCENARIO → PROGRAM → TASK → LOG
2. **完整的關聯性**：所有資料透過 UUID 連結
3. **增量式遷移**：新舊系統可並存
4. **環境隔離**：使用獨立的 GCS bucket
5. **擴展性**：易於新增其他學習模式

透過這個架構，你可以：
- 先建立 V2 系統並測試
- 逐步遷移各個模組
- 保持系統穩定性
- 避免一次性重構的風險

---

*文檔版本: 2.0*
*最後更新: 2025-01-08*