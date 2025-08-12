# 統一學習架構設計 - Content Source → Scenario → Program → Task → Evaluation

> **更新日期**: 2025-08-12  
> **狀態**: Phase 1 完成，Phase 2 進行中

> See also: [產品需求文檔（PRD）](../../handbook/product-requirements-document.md)

## 實作進度摘要

### ✅ Phase 1: Foundation (已完成)
- **統一學習架構**: Content Source → Scenario → Program → Task → Evaluation
- **基礎 CRUD 功能**: 所有模組的增刪改查
- **多語言系統**: 14 種語言完整支援
- **PostgreSQL 整合**: Schema v3、Mode 繼承、JSONB 多語言
- **型別系統**: 零 any 類型、嚴格 TypeScript 檢查

### 🚀 Phase 2: Enhancement (進行中)
- **Redis 快取優化** ✅: 多層快取架構完成，主要 API 已整合
- **測試覆蓋率** ✅: 76.59% (核心模組達標)
- **Content API 架構**: 進行中
- **效能優化**: 5-10x 效能提升

### 📊 三大模組實作狀態
- **Assessment 模組** ✅: 100% 完成，完整 TDD 實作
- **PBL 模組** 🚧: 基礎功能完成，AI 導師整合中
- **Discovery 模組** 🚧: 架構設計完成，動態任務生成開發中

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

### 1.2 共同模式（所有模組共享）

1. **Repository Pattern**: PostgreSQL 統一資料存取層
2. **UUID 識別**: 所有實體唯一識別，支援分散式擴展
3. **狀態管理**: `pending → active → completed` 生命週期
4. **多語言支援**: 14 種語言，JSONB 儲存，LLM 翻譯整合
5. **快取策略**: Memory → localStorage → Redis → PostgreSQL 多層架構

### 1.3 三大模組對應
```
PBL:       YAML → Scenario → Program → Task → Evaluations
Discovery: Path → Scenario → Program → Task → Evaluations  
Assessment: YAML → Scenario(Config) → Program → Task(All Questions) → Evaluations
```

各模組特點：
- **PBL**：從YAML載入情境，每個Program包含一個Task（整個學習會話），有Task和Program兩層評估
- **Discovery**：動態生成Scenario，一個Program代表一次學習歷程，包含多個Tasks
- **Assessment**：Assessment config作為Scenario，可以有多個Tasks，每個Task包含一組Questions及其互動記錄

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
  type: 'user_input' | 'ai_response' | 'system_event' | 'assessment_answer';
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

// PBL Task (整個學習會話)
interface PBLTask extends ITask {
  type: 'chat';  // PBL主要是AI對話
  content: {
    instructions?: string;
    context: {
      ksaCodes: string[];     // 關聯的KSA代碼
      aiModules: string[];    // 使用的AI模組
      taskTemplates: any[];   // 原YAML中的任務定義
      language?: string;
    };
  };
  interactions: PBLInteraction[];  // 所有AI對話記錄
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

// Discovery Task (工作階段)
interface DiscoveryTask extends ITask {
  type: 'creation' | 'analysis' | 'chat';
  content: {
    instructions?: string;
    context: {
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      xpReward: number;
      requiredSkills: string[];
      worldSetting?: string;
      currentChallenge?: any;
    };
  };
  interactions: DiscoveryInteraction[];  // 整個工作階段的互動
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

// Assessment Task (包含所有題目的測驗會話)
interface AssessmentTask extends ITask {
  type: 'question';
  content: {
    instructions?: string;
    context: {
      questions: AssessmentQuestion[];  // 所有題目
      timeLimit?: number;
      language?: string;
    };
  };
  interactions: AssessmentInteraction[];  // 所有答題記錄
}

// Assessment Interaction
interface AssessmentInteraction extends IInteraction {
  type: 'assessment_answer';
  content: {
    questionId: string;      // 題目ID
    selectedAnswer: string;  // 選擇的答案
    isCorrect: boolean;      // 是否正確
    timeSpent: number;       // 花費時間
    ksa_mapping?: any;       // KSA映射
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

## 4. 實作模式與流程

### 4.1 Service Pattern 規範

#### Assessment Service Pattern
- **題目選擇**: 每領域隨機選擇指定數量
- **批次答案**: 將所有答案轉換為 interactions
- **領域評分**: 統計各領域正確率並計算分數

#### PBL Service Pattern  
- **任務結構**: 多任務對應學習目標
- **AI 整合**: 導師對話與即時回饋
- **KSA 映射**: 能力追蹤與評估

#### Discovery Service Pattern
- **動態生成**: AI 生成個人化任務
- **進度系統**: XP 與成就追蹤
- **階段設計**: 探索、挑戰、成就

### 4.2 統一工作流程 SOP

1. **啟動學習**
   - 載入 Scenario
   - 創建 Program
   - 生成 Tasks
   - 初始化狀態

2. **互動處理**
   - 接收用戶輸入
   - 更新 interactions
   - 即時評估判斷
   - 狀態轉換

3. **評估流程**
   - Task 級別評估
   - Program 總結評估
   - 能力映射更新
   - 回饋生成

4. **完成處理**
   - 狀態更新
   - 成就計算
   - 報告生成
   - 資料歸檔

## 5. 資料庫 Schema 設計原則

### 5.1 核心表格結構
1. **scenarios**: 學習情境定義 (UUID, source_type, metadata)
2. **programs**: 學習實例 (scenario_id, user_id, status, task_ids)
3. **tasks**: 學習任務 (program_id, type, content, interactions)
4. **evaluations**: 評估結果 (target_type, target_id, score, dimensions)
5. **competency_progress**: 能力進度 (user_id, competency_id, level)

### 5.2 設計特點
- UUID 作為主鍵確保全局唯一
- JSONB 儲存靈活的結構化資料
- 多語言欄位使用 Record<string, string> 格式
- Mode 欄位透過 trigger 繼承，減少 JOIN
- 索引優化查詢效能

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

## 7. YAML to Scenarios 初始化機制

### 7.1 統一初始化架構

所有模組（PBL、Discovery、Assessment）都遵循相同的初始化流程：

```
YAML Files → YAML Loader → Scenario Initialization Service → Scenario Repository → GCS
```

#### 核心組件

1. **BaseYAMLLoader**：提供統一的 YAML 載入機制
   - 多語言支援
   - 快取機制
   - 錯誤處理
   - Schema 驗證

2. **Module-specific YAML Loaders**：各模組專用的載入器
   - `AssessmentYAMLLoader`：處理 Assessment YAML 格式
   - `PBLYAMLLoader`：處理 PBL Scenario YAML
   - `DiscoveryYAMLLoader`：處理 Discovery Path YAML

3. **ScenarioInitializationService**：統一的初始化服務
   - 掃描 YAML 檔案
   - 轉換為 Scenario 格式
   - 檢查重複並更新
   - 批次處理

### 7.2 初始化流程 SOP

1. **掃描**: 找出所有 YAML 檔案位置
2. **載入**: 使用專用 Loader 處理各模組格式
3. **轉換**: YAML 資料轉換為 Scenario 格式
4. **存儲**: 檢查重複並建立/更新 Scenario

### 7.3 執行初始化

#### 手動執行（開發/部署時）
```bash
# 初始化所有 Scenarios
npm run init:scenarios

# 只初始化特定模組
npm run init:scenarios -- --assessment
npm run init:scenarios -- --pbl
npm run init:scenarios -- --discovery

# Dry run（預覽不實際執行）
npm run init:scenarios -- --dry-run

# 強制更新已存在的 Scenarios
npm run init:scenarios -- --force
```

#### 自動執行時機
1. **部署時**：CI/CD pipeline 中執行
2. **開發時**：偵測 YAML 變更自動更新
3. **定期排程**：每日檢查並同步

### 7.4 YAML 變更處理策略

#### 1. 版本控制模式
```typescript
interface IScenario {
  sourceRef: {
    version?: string;  // 追蹤 YAML 版本
    checksum?: string; // 檔案 checksum
    lastSync?: string; // 最後同步時間
  }
}
```

#### 2. 更新策略
- **內容更新**（錯字、翻譯）：直接更新現有 Scenario
- **結構變更**：通知管理員審核
- **破壞性變更**：創建新版本，保留舊版

#### 3. 智能同步策略
- 定期檢查 YAML 變更
- 使用 checksum 比對
- 支援增量更新  
- 保留變更歷史

### 7.5 最佳實踐

1. **初始化優先順序**
   - Assessment：題庫穩定，優先初始化
   - PBL：情境固定，其次初始化
   - Discovery：動態生成，最後處理

2. **錯誤處理**
   - 單一 YAML 錯誤不影響其他檔案
   - 詳細錯誤日誌便於除錯
   - 提供 rollback 機制

3. **效能考量**
   - 批次處理減少 GCS 操作
   - 使用快取避免重複載入
   - 支援增量更新

## 8. 實施路線圖

### Phase 1: 建立核心架構（Week 1-2）
1. 定義所有核心介面（IScenario, IProgram, ITask, IEvaluation）
2. 實作基礎 Repository 和 Service 類別
3. 設計UUID檔案儲存結構
4. **實作統一的 YAML to Scenarios 初始化機制**

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

## 9. 設計原理與最佳實踐

### 9.1 統一設計原則

#### 核心架構：Program → Multiple Tasks
```
任何學習模式 → Program → Multiple Tasks → Evaluations
```

#### 現狀與未來展望
- **Assessment**: 現在單一 Task，未來可分卷或分領域
- **PBL**: 已經是多任務結構（理解、研究、實作）
- **Discovery**: 已經是多階段結構（探索、挑戰、成就）

#### Task 粒度設計
1. **Assessment**: 一個完整題組或按領域分割
2. **PBL**: 每個學習目標 30-60 分鐘
3. **Discovery**: 按自然斷點切割階段

### 9.2 實作準則

1. **Program 生命週期**: 每次新學習創建新 Program
2. **Task 狀態**: `pending → active → completed`
3. **Interaction 記錄**: 保留完整學習歷程，支援重播

## 10. 結論

統一學習架構為 AI Square 平台提供一致的學習體驗、靈活的資料管理、完整的評估體系，並保持良好的擴展性。通過這個架構，我們確保平台的持續發展和優化，同時提供高品質的學習體驗。

## 11. Staging 部署檢查清單

### 必要條件確認

#### 環境配置
- [ ] 所有環境變數已設定 (.env.staging)
- [ ] PostgreSQL Schema v3 已部署
- [ ] 資料庫遷移腳本已執行

#### 程式碼品質
- [x] TypeScript 編譯無錯誤 (0 errors)
- [x] ESLint 檢查無錯誤 (0 errors, 0 warnings)
- [ ] 單元測試通過率 > 70%
- [x] 建置成功 (npm run build)

### 功能完整性
- **Assessment 模組**: 100% 完成 ✓
- **PBL 模組**: 基礎功能進行中
- **Discovery 模組**: 待實作

### 已知限制
1. PBL 模組: AI 導師功能使用模擬回應
2. Discovery 模組: 動態任務生成待開發
3. Redis 快取: 使用記憶體快取 fallback
4. AI 回饋生成: 返回預設文字

### 部署前必須
- 完成 PBL 基本功能
- 修復失敗的測試
- 設定環境變數
EOF < /dev/null