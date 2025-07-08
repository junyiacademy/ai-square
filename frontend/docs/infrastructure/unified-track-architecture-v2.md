# 統一 TRACK 架構設計 V2

## 概述

本文檔定義 AI Square V2 的統一學習架構，採用 TRACK → PROGRAM → TASK → LOG 的層級結構，可兼容 PBL、Discovery 和 Assessment 三種學習模式。

## 核心設計原則

1. **統一的資料模型**：所有學習活動都遵循相同的層級結構
2. **關聯式資料庫**：使用 UUID 連結所有相關資料
3. **增量式遷移**：新舊系統並存，逐步遷移
4. **環境隔離**：使用 GCS_BUCKET_NAME_V2 確保資料隔離

## 統一層級結構

```
Learning Project (Scenario/Path/Domain)
    ↓
TRACK (學習軌跡)
    ↓
PROGRAM (學習項目)
    ↓
TASK (學習任務)
    ↓
LOG (活動記錄)
```

### 各層級對應關係

| 層級 | PBL | Discovery | Assessment |
|------|-----|-----------|------------|
| Project | Scenario | Path | Domain/KSA |
| Track | 從 Scenario 建立的學習軌跡 | 從 Path 建立的學習軌跡 | 從 Domain 建立的測驗軌跡 |
| Program | Program (多任務組合) | Workspace (任務工作區) | Exam (測驗實例) |
| Task | Task (學習任務) | Task (探索任務) | Question (測驗題目) |
| Log | 對話、評估、完成記錄 | 對話、評估、XP 記錄 | 答案、評分、能力映射 |

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

### 2. 學習軌跡表 (tracks_v2)

```sql
CREATE TABLE tracks_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES learning_projects_v2(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'pbl', 'discovery', 'assessment'
    title VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'created', -- 'created', 'active', 'paused', 'completed', 'abandoned'
    metadata JSONB DEFAULT '{}', -- Track 特定資料
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tracks_v2_user_id ON tracks_v2(user_id);
CREATE INDEX idx_tracks_v2_project_id ON tracks_v2(project_id);
CREATE INDEX idx_tracks_v2_status ON tracks_v2(status);
CREATE INDEX idx_tracks_v2_type ON tracks_v2(type);

-- 確保用戶在同一個專案只有一個活躍的 track
CREATE UNIQUE INDEX unique_active_track_v2 ON tracks_v2(user_id, project_id) 
WHERE status IN ('active', 'paused');
```

### 3. 學習項目表 (programs_v2)

```sql
CREATE TABLE programs_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID NOT NULL REFERENCES tracks_v2(id) ON DELETE CASCADE,
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

CREATE INDEX idx_programs_v2_track_id ON programs_v2(track_id);
CREATE INDEX idx_programs_v2_status ON programs_v2(status);
CREATE UNIQUE INDEX unique_program_order_v2 ON programs_v2(track_id, program_order);
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
    track_id UUID NOT NULL REFERENCES tracks_v2(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs_v2(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks_v2(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_type VARCHAR(50) NOT NULL, -- 'chat', 'submission', 'evaluation', 'completion', 'feedback', 'achievement'
    activity VARCHAR(100) NOT NULL, -- 具體活動名稱
    data JSONB NOT NULL DEFAULT '{}', -- 活動資料
    metadata JSONB DEFAULT '{}', -- 額外資訊（如 AI token 使用）
    duration_seconds INTEGER, -- 活動持續時間
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_v2_track_id ON logs_v2(track_id);
CREATE INDEX idx_logs_v2_program_id ON logs_v2(program_id);
CREATE INDEX idx_logs_v2_task_id ON logs_v2(task_id);
CREATE INDEX idx_logs_v2_user_id ON logs_v2(user_id);
CREATE INDEX idx_logs_v2_log_type ON logs_v2(log_type);
CREATE INDEX idx_logs_v2_created_at ON logs_v2(created_at DESC);
```

### 6. 評估結果表 (evaluations_v2)

```sql
CREATE TABLE evaluations_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES logs_v2(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES tracks_v2(id) ON DELETE CASCADE,
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
CREATE INDEX idx_evaluations_v2_track_id ON evaluations_v2(track_id);
CREATE INDEX idx_evaluations_v2_task_id ON evaluations_v2(task_id);
CREATE INDEX idx_evaluations_v2_type ON evaluations_v2(evaluation_type);
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

export interface ITrack extends ITrackableEntity {
  user_id: string;
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
  track_id: string;
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
  track_id: string;
  program_id?: string;
  task_id?: string;
  user_id: string;
  log_type: 'chat' | 'submission' | 'evaluation' | 'completion' | 'feedback' | 'achievement';
  activity: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  duration_seconds?: number;
}

export interface IEvaluation extends ITrackableEntity {
  log_id: string;
  track_id: string;
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
    protected trackRepo: ITrackRepository,
    protected programRepo: IProgramRepository,
    protected taskRepo: ITaskRepository,
    protected logRepo: ILogRepository,
    protected evaluationRepo: IEvaluationRepository,
    protected storageService: IStorageService,
    protected aiService: IAIService
  ) {}

  // 開始新的學習軌跡
  async startTrack(userId: string, projectId: string): Promise<ITrack> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new Error('Project not found');

    // 檢查是否已有活躍的 track
    const existingTrack = await this.trackRepo.findActiveByUserAndProject(userId, projectId);
    if (existingTrack) {
      return existingTrack;
    }

    // 建立新 track
    const track = await this.trackRepo.create({
      user_id: userId,
      project_id: projectId,
      type: project.type,
      title: `${project.title} - ${new Date().toISOString()}`,
      status: 'active',
      metadata: {},
      started_at: new Date().toISOString()
    });

    // 建立初始 programs
    await this.createInitialPrograms(track, project);

    // 記錄開始 log
    await this.logActivity(track.id, null, null, userId, 'track_started', {
      project_id: projectId,
      project_title: project.title
    });

    return track;
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
      program.track_id,
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
    trackId: string,
    programId: string | null,
    taskId: string | null,
    userId: string,
    activity: string,
    data: any,
    metadata?: any
  ): Promise<ILog> {
    const logType = this.getLogType(activity);
    
    return this.logRepo.create({
      track_id: trackId,
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
  protected abstract createInitialPrograms(track: ITrack, project: ILearningProject): Promise<void>;
  protected abstract evaluateResponse(task: ITask, response: any, log: ILog): Promise<IEvaluation>;
  protected abstract getLogType(activity: string): ILog['log_type'];
}
```

## 具體實作範例

### PBL V2 Service

```typescript
// src/lib/v2/services/pbl.service.ts

export class PBLServiceV2 extends BaseLearningService {
  protected async createInitialPrograms(track: ITrack, project: ILearningProject): Promise<void> {
    // 從 project metadata 取得 PBL programs
    const pblPrograms = project.metadata.programs || [];
    
    for (let i = 0; i < pblPrograms.length; i++) {
      const pblProgram = pblPrograms[i];
      
      const program = await this.programRepo.create({
        track_id: track.id,
        title: pblProgram.title,
        description: pblProgram.description,
        program_order: i,
        status: i === 0 ? 'active' : 'pending',
        config: {
          ai_modules: pblProgram.ai_modules || []
        },
        metadata: {}
      });

      // 建立 tasks
      for (let j = 0; j < pblProgram.tasks.length; j++) {
        const pblTask = pblProgram.tasks[j];
        
        await this.taskRepo.create({
          program_id: program.id,
          title: pblTask.title,
          description: pblTask.description,
          instructions: pblTask.instructions,
          task_order: j,
          type: this.mapTaskType(pblTask.type),
          required_ksa: pblTask.required_ksa || [],
          config: {
            estimated_duration: pblTask.estimated_duration,
            ai_assistance: pblTask.ai_assistance
          },
          metadata: {},
          status: j === 0 && i === 0 ? 'active' : 'pending'
        });
      }
    }
  }

  protected async evaluateResponse(task: ITask, response: any, log: ILog): Promise<IEvaluation> {
    // PBL 使用 AI 評估
    const rubric = task.config.rubric || {};
    const aiResponse = await this.aiService.evaluate({
      task: task,
      response: response,
      rubric: rubric,
      required_ksa: task.required_ksa
    });

    return this.evaluationRepo.create({
      log_id: log.id,
      track_id: log.track_id,
      task_id: task.id,
      evaluation_type: 'ai',
      input: { response, rubric },
      result: aiResponse,
      scores: aiResponse.scores,
      feedback: aiResponse.feedback,
      ksa_mapping: aiResponse.ksa_mapping,
      evaluated_by: `ai:${aiResponse.model}`
    });
  }

  private mapTaskType(pblType: string): ITask['type'] {
    const typeMap: Record<string, ITask['type']> = {
      'conversation': 'chat',
      'coding': 'code',
      'quiz': 'quiz',
      'submission': 'submission'
    };
    return typeMap[pblType] || 'chat';
  }

  protected getLogType(activity: string): ILog['log_type'] {
    const typeMap: Record<string, ILog['log_type']> = {
      'track_started': 'chat',
      'task_submitted': 'submission',
      'task_evaluated': 'evaluation',
      'program_completed': 'completion',
      'feedback_generated': 'feedback'
    };
    return typeMap[activity] || 'chat';
  }
}
```

## GCS V2 存儲架構

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
  private getPath(type: string, userId: string, trackId: string): string {
    return `v2/${type}/${userId}/${trackId}`;
  }

  async saveTrackData(userId: string, trackId: string, data: any): Promise<void> {
    const path = `${this.getPath('tracks', userId, trackId)}/data.json`;
    await this.uploadJSON(path, data);
  }

  async saveLog(userId: string, trackId: string, logId: string, data: any): Promise<void> {
    const path = `${this.getPath('logs', userId, trackId)}/${logId}.json`;
    await this.uploadJSON(path, data);
  }

  async saveEvaluation(userId: string, trackId: string, evalId: string, data: any): Promise<void> {
    const path = `${this.getPath('evaluations', userId, trackId)}/${evalId}.json`;
    await this.uploadJSON(path, data);
  }

  private async uploadJSON(path: string, data: any): Promise<void> {
    // 實作 GCS 上傳邏輯
  }
}
```

## API Routes V2

```typescript
// src/app/api/v2/tracks/route.ts

export async function POST(request: Request) {
  const { projectId } = await request.json();
  const userId = await getUserId(request);

  const service = getServiceForProject(projectId);
  const track = await service.startTrack(userId, projectId);

  return NextResponse.json(track);
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
// src/lib/v2/__tests__/track.service.test.ts

describe('TrackService V2', () => {
  it('should create a new track', async () => {
    const track = await service.startTrack(userId, projectId);
    expect(track.status).toBe('active');
    expect(track.project_id).toBe(projectId);
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

1. **統一的資料模型**：TRACK → PROGRAM → TASK → LOG
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