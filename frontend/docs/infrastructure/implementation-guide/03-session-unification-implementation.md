# Session 統一實作指南

## 實作概要

將 Assessment、PBL、Discovery 和 Chat 四個模組統一到 Session-based 架構。

## 1. Session 架構總覽

```typescript
                     BaseSession (抽象基類)
                           │
       ┌──────────────────┼──────────────────┬──────────────────┐
       │                  │                  │                  │
AssessmentSession    PBLSession      DiscoverySession     ChatSession
   (測驗會話)         (PBL會話)         (探索會話)         (對話會話)
```

## 2. BaseSession 實作

### 2.1 基礎 Session 類別
```typescript
// src/lib/sessions/base/base-session.ts
import { SessionEntity } from '@/lib/core/domain/entities';
import { IEvaluationService } from '@/lib/evaluation/interfaces';
import { IStorageProvider } from '@/lib/core/storage/interfaces';

export abstract class BaseSession<TContext = any, TProgress = any> {
  protected entity: SessionEntity;
  protected context: TContext;
  protected progress: TProgress;
  
  constructor(
    protected sessionId: string,
    protected storage: IStorageProvider,
    protected evaluationService: IEvaluationService
  ) {}
  
  // 生命週期方法
  async initialize(): Promise<void> {
    await this.loadSession();
    await this.loadContext();
    await this.loadProgress();
    await this.onInitialize();
  }
  
  async start(): Promise<void> {
    this.entity.start();
    await this.saveSession();
    await this.onStart();
  }
  
  async pause(): Promise<void> {
    this.entity.pause();
    await this.saveProgress();
    await this.saveSession();
    await this.onPause();
  }
  
  async resume(): Promise<void> {
    this.entity.resume();
    await this.saveSession();
    await this.onResume();
  }
  
  async complete(): Promise<CompletionResult> {
    const result = await this.generateCompletionResult();
    this.entity.complete();
    await this.saveSession();
    await this.onComplete(result);
    return result;
  }
  
  // 進度管理
  async updateProgress(update: Partial<TProgress>): Promise<void> {
    this.progress = { ...this.progress, ...update };
    this.entity.updateActivity();
    await this.saveProgress();
  }
  
  getProgress(): TProgress {
    return this.progress;
  }
  
  getProgressPercentage(): number {
    return this.calculateProgressPercentage();
  }
  
  // 評估相關
  async evaluate(input: any): Promise<EvaluationResult> {
    const context = this.buildEvaluationContext();
    const result = await this.evaluationService.evaluate({
      type: this.getEvaluationType(),
      sessionId: this.sessionId,
      input,
      context
    });
    
    await this.onEvaluationComplete(result);
    return result;
  }
  
  // 持久化
  protected async loadSession(): Promise<void> {
    const data = await this.storage.get<SessionEntity>(`session:${this.sessionId}`);
    if (!data) {
      throw new Error(`Session ${this.sessionId} not found`);
    }
    this.entity = SessionEntity.fromJSON(data);
  }
  
  protected async saveSession(): Promise<void> {
    await this.storage.set(`session:${this.sessionId}`, this.entity.toJSON());
  }
  
  protected async loadContext(): Promise<void> {
    const data = await this.storage.get<TContext>(`session:${this.sessionId}:context`);
    this.context = data || this.createDefaultContext();
  }
  
  protected async saveContext(): Promise<void> {
    await this.storage.set(`session:${this.sessionId}:context`, this.context);
  }
  
  protected async loadProgress(): Promise<void> {
    const data = await this.storage.get<TProgress>(`session:${this.sessionId}:progress`);
    this.progress = data || this.createDefaultProgress();
  }
  
  protected async saveProgress(): Promise<void> {
    await this.storage.set(`session:${this.sessionId}:progress`, this.progress);
  }
  
  // 抽象方法 - 子類必須實作
  protected abstract createDefaultContext(): TContext;
  protected abstract createDefaultProgress(): TProgress;
  protected abstract calculateProgressPercentage(): number;
  protected abstract getEvaluationType(): string;
  protected abstract buildEvaluationContext(): EvaluationContext;
  protected abstract generateCompletionResult(): Promise<CompletionResult>;
  
  // Hook 方法 - 子類可選實作
  protected async onInitialize(): Promise<void> {}
  protected async onStart(): Promise<void> {}
  protected async onPause(): Promise<void> {}
  protected async onResume(): Promise<void> {}
  protected async onComplete(result: CompletionResult): Promise<void> {}
  protected async onEvaluationComplete(result: EvaluationResult): Promise<void> {}
}

// Types
export interface CompletionResult {
  sessionId: string;
  completedAt: Date;
  duration: number;
  finalScore?: number;
  achievements?: Achievement[];
  certificate?: Certificate;
  recommendations?: Recommendation[];
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  competencies: CompetencyScore[];
}

export interface EvaluationContext {
  sessionType: string;
  userId: string;
  projectId: string;
  progress: any;
  previousEvaluations?: EvaluationResult[];
}
```

## 3. Assessment Session 實作

### 3.1 Assessment Session
```typescript
// src/lib/sessions/assessment/assessment-session.ts
import { BaseSession } from '../base/base-session';

interface AssessmentContext {
  assessmentId: string;
  questions: Question[];
  settings: AssessmentSettings;
}

interface AssessmentProgress {
  currentQuestionIndex: number;
  answers: Answer[];
  timeSpent: number;
  hintsUsed: number;
  revisits: QuestionRevisit[];
}

export class AssessmentSession extends BaseSession<AssessmentContext, AssessmentProgress> {
  protected createDefaultContext(): AssessmentContext {
    return {
      assessmentId: '',
      questions: [],
      settings: {
        timeLimit: null,
        allowRevisit: true,
        showFeedback: 'after_completion',
        randomizeQuestions: false
      }
    };
  }
  
  protected createDefaultProgress(): AssessmentProgress {
    return {
      currentQuestionIndex: 0,
      answers: [],
      timeSpent: 0,
      hintsUsed: 0,
      revisits: []
    };
  }
  
  protected calculateProgressPercentage(): number {
    if (this.context.questions.length === 0) return 0;
    return (this.progress.answers.length / this.context.questions.length) * 100;
  }
  
  protected getEvaluationType(): string {
    return 'assessment:quiz';
  }
  
  protected buildEvaluationContext(): EvaluationContext {
    return {
      sessionType: 'assessment',
      userId: this.entity.userId,
      projectId: this.entity.projectId,
      progress: {
        questionsAnswered: this.progress.answers.length,
        totalQuestions: this.context.questions.length,
        timeSpent: this.progress.timeSpent
      }
    };
  }
  
  // Assessment 特定方法
  async loadQuestions(assessmentId: string): Promise<void> {
    const assessment = await this.loadAssessment(assessmentId);
    this.context.assessmentId = assessmentId;
    this.context.questions = assessment.questions;
    
    if (this.context.settings.randomizeQuestions) {
      this.context.questions = this.shuffleArray(this.context.questions);
    }
    
    await this.saveContext();
  }
  
  getCurrentQuestion(): Question | null {
    return this.context.questions[this.progress.currentQuestionIndex] || null;
  }
  
  async submitAnswer(answer: string): Promise<AnswerResult> {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) {
      throw new Error('No current question');
    }
    
    // 記錄答案
    const answerRecord: Answer = {
      questionId: currentQuestion.id,
      answer,
      submittedAt: new Date(),
      timeSpent: this.calculateTimeForQuestion(),
      isCorrect: this.checkAnswer(currentQuestion, answer)
    };
    
    this.progress.answers.push(answerRecord);
    
    // 立即評估（如果設定允許）
    let feedback: string | null = null;
    if (this.context.settings.showFeedback === 'immediate') {
      feedback = await this.generateQuestionFeedback(currentQuestion, answer);
    }
    
    // 移到下一題
    if (this.progress.currentQuestionIndex < this.context.questions.length - 1) {
      this.progress.currentQuestionIndex++;
    }
    
    await this.updateProgress(this.progress);
    
    return {
      isCorrect: answerRecord.isCorrect,
      feedback,
      nextQuestion: this.getCurrentQuestion()
    };
  }
  
  async revisitQuestion(questionIndex: number): Promise<void> {
    if (!this.context.settings.allowRevisit) {
      throw new Error('Question revisit not allowed');
    }
    
    this.progress.revisits.push({
      fromIndex: this.progress.currentQuestionIndex,
      toIndex: questionIndex,
      timestamp: new Date()
    });
    
    this.progress.currentQuestionIndex = questionIndex;
    await this.updateProgress(this.progress);
  }
  
  async useHint(): Promise<string> {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion || !currentQuestion.hint) {
      throw new Error('No hint available');
    }
    
    this.progress.hintsUsed++;
    await this.updateProgress(this.progress);
    
    return currentQuestion.hint;
  }
  
  protected async generateCompletionResult(): Promise<CompletionResult> {
    // 計算最終分數
    const evaluation = await this.evaluate(this.progress.answers);
    
    // 生成證書（如果通過）
    let certificate: Certificate | undefined;
    if (evaluation.score >= 80) {
      certificate = await this.generateCertificate(evaluation);
    }
    
    // 生成建議
    const recommendations = await this.generateRecommendations(evaluation);
    
    return {
      sessionId: this.sessionId,
      completedAt: new Date(),
      duration: this.progress.timeSpent,
      finalScore: evaluation.score,
      certificate,
      recommendations,
      achievements: this.checkAchievements()
    };
  }
  
  private checkAnswer(question: Question, answer: string): boolean {
    return question.correctAnswer === answer;
  }
  
  private calculateTimeForQuestion(): number {
    // 實作計算單題時間的邏輯
    return 0;
  }
  
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  private checkAchievements(): Achievement[] {
    const achievements: Achievement[] = [];
    
    // 完美分數
    if (this.progress.answers.every(a => a.isCorrect)) {
      achievements.push({
        id: 'perfect_score',
        name: 'Perfect Score',
        description: 'Answered all questions correctly'
      });
    }
    
    // 快速完成
    const avgTimePerQuestion = this.progress.timeSpent / this.context.questions.length;
    if (avgTimePerQuestion < 30) {
      achievements.push({
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Completed assessment quickly'
      });
    }
    
    // 不使用提示
    if (this.progress.hintsUsed === 0) {
      achievements.push({
        id: 'no_hints',
        name: 'Independent Learner',
        description: 'Completed without using hints'
      });
    }
    
    return achievements;
  }
}

// Types
interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  hint?: string;
  explanation?: string;
  competencies: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Answer {
  questionId: string;
  answer: string;
  submittedAt: Date;
  timeSpent: number;
  isCorrect: boolean;
}

interface QuestionRevisit {
  fromIndex: number;
  toIndex: number;
  timestamp: Date;
}

interface AnswerResult {
  isCorrect: boolean;
  feedback: string | null;
  nextQuestion: Question | null;
}

interface AssessmentSettings {
  timeLimit: number | null;
  allowRevisit: boolean;
  showFeedback: 'immediate' | 'after_completion' | 'never';
  randomizeQuestions: boolean;
}
```

## 4. PBL Session 實作

### 4.1 PBL Session
```typescript
// src/lib/sessions/pbl/pbl-session.ts
import { BaseSession } from '../base/base-session';

interface PBLContext {
  scenarioId: string;
  programId: string;
  tasks: PBLTask[];
  ksaMappings: KSAMapping[];
  resources: Resource[];
}

interface PBLProgress {
  currentTaskId: string;
  completedTasks: string[];
  taskResponses: TaskResponse[];
  draftResponses: Map<string, string>;
  reflections: Reflection[];
  ksaProgress: KSAProgress;
}

export class PBLSession extends BaseSession<PBLContext, PBLProgress> {
  protected createDefaultContext(): PBLContext {
    return {
      scenarioId: '',
      programId: '',
      tasks: [],
      ksaMappings: [],
      resources: []
    };
  }
  
  protected createDefaultProgress(): PBLProgress {
    return {
      currentTaskId: '',
      completedTasks: [],
      taskResponses: [],
      draftResponses: new Map(),
      reflections: [],
      ksaProgress: {
        knowledge: {},
        skills: {},
        attitudes: {}
      }
    };
  }
  
  protected calculateProgressPercentage(): number {
    if (this.context.tasks.length === 0) return 0;
    return (this.progress.completedTasks.length / this.context.tasks.length) * 100;
  }
  
  protected getEvaluationType(): string {
    return 'pbl:task';
  }
  
  protected buildEvaluationContext(): EvaluationContext {
    return {
      sessionType: 'pbl',
      userId: this.entity.userId,
      projectId: this.entity.projectId,
      progress: {
        currentTask: this.progress.currentTaskId,
        completedTasks: this.progress.completedTasks,
        ksaProgress: this.progress.ksaProgress
      }
    };
  }
  
  // PBL 特定方法
  async loadScenario(scenarioId: string, programId: string): Promise<void> {
    const scenario = await this.loadPBLScenario(scenarioId);
    const program = scenario.programs.find(p => p.id === programId);
    
    if (!program) {
      throw new Error('Program not found in scenario');
    }
    
    this.context.scenarioId = scenarioId;
    this.context.programId = programId;
    this.context.tasks = program.tasks;
    this.context.ksaMappings = scenario.ksaMappings;
    this.context.resources = program.resources || [];
    
    // 設定第一個任務
    if (this.context.tasks.length > 0) {
      this.progress.currentTaskId = this.context.tasks[0].id;
    }
    
    await this.saveContext();
  }
  
  getCurrentTask(): PBLTask | null {
    return this.context.tasks.find(t => t.id === this.progress.currentTaskId) || null;
  }
  
  async saveDraft(taskId: string, content: string): Promise<void> {
    this.progress.draftResponses.set(taskId, content);
    await this.updateProgress(this.progress);
  }
  
  getDraft(taskId: string): string | undefined {
    return this.progress.draftResponses.get(taskId);
  }
  
  async submitTaskResponse(response: string): Promise<TaskResult> {
    const currentTask = this.getCurrentTask();
    if (!currentTask) {
      throw new Error('No current task');
    }
    
    // 創建任務回應
    const taskResponse: TaskResponse = {
      taskId: currentTask.id,
      response,
      submittedAt: new Date()
    };
    
    this.progress.taskResponses.push(taskResponse);
    
    // 評估任務
    const evaluation = await this.evaluate({
      task: currentTask,
      response,
      ksaMappings: this.context.ksaMappings
    });
    
    // 更新 KSA 進度
    this.updateKSAProgress(currentTask, evaluation);
    
    // 標記任務完成
    this.progress.completedTasks.push(currentTask.id);
    this.progress.draftResponses.delete(currentTask.id);
    
    // 移到下一個任務
    const nextTask = this.getNextTask();
    if (nextTask) {
      this.progress.currentTaskId = nextTask.id;
    }
    
    await this.updateProgress(this.progress);
    
    return {
      evaluation,
      nextTask,
      ksaProgress: this.progress.ksaProgress
    };
  }
  
  async addReflection(content: string): Promise<void> {
    const reflection: Reflection = {
      id: this.generateId(),
      content,
      taskId: this.progress.currentTaskId,
      createdAt: new Date()
    };
    
    this.progress.reflections.push(reflection);
    await this.updateProgress(this.progress);
  }
  
  getTaskHistory(): TaskHistory[] {
    return this.progress.taskResponses.map(response => {
      const task = this.context.tasks.find(t => t.id === response.taskId);
      return {
        task: task!,
        response: response.response,
        submittedAt: response.submittedAt,
        evaluation: response.evaluation
      };
    });
  }
  
  private getNextTask(): PBLTask | null {
    const currentIndex = this.context.tasks.findIndex(t => t.id === this.progress.currentTaskId);
    if (currentIndex === -1 || currentIndex === this.context.tasks.length - 1) {
      return null;
    }
    return this.context.tasks[currentIndex + 1];
  }
  
  private updateKSAProgress(task: PBLTask, evaluation: EvaluationResult): void {
    // 更新知識進度
    task.ksaCodes.knowledge?.forEach(code => {
      this.progress.ksaProgress.knowledge[code] = 
        (this.progress.ksaProgress.knowledge[code] || 0) + evaluation.score / 100;
    });
    
    // 更新技能進度
    task.ksaCodes.skills?.forEach(code => {
      this.progress.ksaProgress.skills[code] = 
        (this.progress.ksaProgress.skills[code] || 0) + evaluation.score / 100;
    });
    
    // 更新態度進度
    task.ksaCodes.attitudes?.forEach(code => {
      this.progress.ksaProgress.attitudes[code] = 
        (this.progress.ksaProgress.attitudes[code] || 0) + evaluation.score / 100;
    });
  }
  
  protected async generateCompletionResult(): Promise<CompletionResult> {
    const overallEvaluation = await this.evaluateOverallPerformance();
    
    return {
      sessionId: this.sessionId,
      completedAt: new Date(),
      duration: this.calculateTotalDuration(),
      finalScore: overallEvaluation.score,
      achievements: this.checkPBLAchievements(),
      recommendations: await this.generatePBLRecommendations()
    };
  }
  
  private checkPBLAchievements(): Achievement[] {
    const achievements: Achievement[] = [];
    
    // 全任務完成
    if (this.progress.completedTasks.length === this.context.tasks.length) {
      achievements.push({
        id: 'all_tasks_complete',
        name: 'Task Master',
        description: 'Completed all tasks in the program'
      });
    }
    
    // 深度反思
    if (this.progress.reflections.length >= 5) {
      achievements.push({
        id: 'reflective_learner',
        name: 'Reflective Learner',
        description: 'Added multiple reflections'
      });
    }
    
    return achievements;
  }
}

// Types
interface PBLTask {
  id: string;
  title: string;
  description: string;
  instructions: string;
  resources?: string[];
  ksaCodes: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
  estimatedTime: number;
}

interface TaskResponse {
  taskId: string;
  response: string;
  submittedAt: Date;
  evaluation?: EvaluationResult;
}

interface TaskResult {
  evaluation: EvaluationResult;
  nextTask: PBLTask | null;
  ksaProgress: KSAProgress;
}

interface KSAProgress {
  knowledge: Record<string, number>;
  skills: Record<string, number>;
  attitudes: Record<string, number>;
}

interface Reflection {
  id: string;
  content: string;
  taskId: string;
  createdAt: Date;
}
```

## 5. Discovery Session 實作

### 5.1 Discovery Session
```typescript
// src/lib/sessions/discovery/discovery-session.ts
import { BaseSession } from '../base/base-session';

interface DiscoveryContext {
  pathId: string;
  workspaceId: string;
  tasks: DiscoveryTask[];
  worldSetting: WorldSetting;
  aiMentors: AIMentor[];
}

interface DiscoveryProgress {
  currentTaskIndex: number;
  completedTasks: CompletedTask[];
  totalXP: number;
  achievements: string[];
  inventory: InventoryItem[];
  evaluations: {
    self: EvaluationRecord[];
    peer: EvaluationRecord[];
    mentor: EvaluationRecord[];
    ai: EvaluationRecord[];
  };
}

export class DiscoverySession extends BaseSession<DiscoveryContext, DiscoveryProgress> {
  protected createDefaultContext(): DiscoveryContext {
    return {
      pathId: '',
      workspaceId: '',
      tasks: [],
      worldSetting: {
        name: '',
        description: '',
        theme: '',
        rules: []
      },
      aiMentors: []
    };
  }
  
  protected createDefaultProgress(): DiscoveryProgress {
    return {
      currentTaskIndex: 0,
      completedTasks: [],
      totalXP: 0,
      achievements: [],
      inventory: [],
      evaluations: {
        self: [],
        peer: [],
        mentor: [],
        ai: []
      }
    };
  }
  
  protected calculateProgressPercentage(): number {
    // Discovery 可能有無限任務，所以用不同的計算方式
    const targetTasks = 10; // 假設 10 個任務為一個階段
    const completed = this.progress.completedTasks.length;
    return Math.min((completed / targetTasks) * 100, 100);
  }
  
  protected getEvaluationType(): string {
    return 'discovery:task';
  }
  
  // Discovery 特定方法
  async loadWorkspace(workspaceId: string): Promise<void> {
    const workspace = await this.loadDiscoveryWorkspace(workspaceId);
    
    this.context.workspaceId = workspaceId;
    this.context.pathId = workspace.pathId;
    this.context.worldSetting = workspace.worldSetting;
    this.context.aiMentors = workspace.aiMentors;
    
    // 載入或生成初始任務
    if (workspace.tasks.length === 0) {
      this.context.tasks = await this.generateInitialTasks();
    } else {
      this.context.tasks = workspace.tasks;
    }
    
    await this.saveContext();
  }
  
  getCurrentTask(): DiscoveryTask | null {
    return this.context.tasks[this.progress.currentTaskIndex] || null;
  }
  
  async completeTask(response: TaskCompletionData): Promise<TaskCompletionResult> {
    const currentTask = this.getCurrentTask();
    if (!currentTask) {
      throw new Error('No current task');
    }
    
    // 記錄完成的任務
    const completedTask: CompletedTask = {
      task: currentTask,
      response,
      completedAt: new Date(),
      xpEarned: 0,
      itemsEarned: []
    };
    
    // 執行多方評估
    const evaluations = await this.performMultiEvaluation(currentTask, response);
    
    // 計算獲得的 XP
    completedTask.xpEarned = this.calculateXP(evaluations);
    this.progress.totalXP += completedTask.xpEarned;
    
    // 檢查是否獲得物品或成就
    const rewards = this.checkRewards(currentTask, evaluations);
    completedTask.itemsEarned = rewards.items;
    this.progress.inventory.push(...rewards.items);
    this.progress.achievements.push(...rewards.achievements);
    
    // 記錄完成的任務
    this.progress.completedTasks.push(completedTask);
    
    // 生成下一個任務（Discovery 特色：動態生成）
    if (this.progress.currentTaskIndex === this.context.tasks.length - 1) {
      const nextTasks = await this.generateNextTasks();
      this.context.tasks.push(...nextTasks);
      await this.saveContext();
    }
    
    this.progress.currentTaskIndex++;
    await this.updateProgress(this.progress);
    
    return {
      xpEarned: completedTask.xpEarned,
      totalXP: this.progress.totalXP,
      itemsEarned: rewards.items,
      achievementsEarned: rewards.achievements,
      evaluations,
      nextTask: this.getCurrentTask()
    };
  }
  
  async submitSelfEvaluation(criteria: EvaluationCriteria[]): Promise<void> {
    const currentTask = this.getCurrentTask();
    if (!currentTask) return;
    
    const evaluation: EvaluationRecord = {
      taskId: currentTask.id,
      type: 'self',
      criteria,
      submittedAt: new Date()
    };
    
    this.progress.evaluations.self.push(evaluation);
    await this.updateProgress(this.progress);
  }
  
  async submitPeerEvaluation(
    peerId: string,
    feedback: string,
    rating: number
  ): Promise<void> {
    const currentTask = this.getCurrentTask();
    if (!currentTask) return;
    
    const evaluation: EvaluationRecord = {
      taskId: currentTask.id,
      type: 'peer',
      evaluatorId: peerId,
      feedback,
      rating,
      submittedAt: new Date()
    };
    
    this.progress.evaluations.peer.push(evaluation);
    await this.updateProgress(this.progress);
  }
  
  async chatWithMentor(mentorId: string, message: string): Promise<string> {
    const mentor = this.context.aiMentors.find(m => m.id === mentorId);
    if (!mentor) {
      throw new Error('Mentor not found');
    }
    
    // 與 AI 導師對話
    const response = await this.aiChat({
      mentor,
      message,
      context: {
        currentTask: this.getCurrentTask(),
        progress: this.progress,
        worldSetting: this.context.worldSetting
      }
    });
    
    return response;
  }
  
  private async performMultiEvaluation(
    task: DiscoveryTask,
    response: TaskCompletionData
  ): Promise<MultiEvaluation> {
    const evaluations: MultiEvaluation = {
      self: null,
      peers: [],
      mentor: null,
      ai: null
    };
    
    // 獲取自評
    const selfEval = this.progress.evaluations.self.find(e => e.taskId === task.id);
    if (selfEval) {
      evaluations.self = selfEval;
    }
    
    // 獲取同儕評價
    evaluations.peers = this.progress.evaluations.peer.filter(e => e.taskId === task.id);
    
    // AI 評估
    evaluations.ai = await this.evaluate({
      task,
      response,
      worldContext: this.context.worldSetting
    });
    
    return evaluations;
  }
  
  private calculateXP(evaluations: MultiEvaluation): number {
    let xp = 100; // 基礎 XP
    
    // 根據 AI 評估調整
    if (evaluations.ai) {
      xp = Math.round(xp * (evaluations.ai.score / 100));
    }
    
    // 自評加成
    if (evaluations.self) {
      xp += 10;
    }
    
    // 同儕評價加成
    xp += evaluations.peers.length * 5;
    
    return xp;
  }
  
  private checkRewards(
    task: DiscoveryTask,
    evaluations: MultiEvaluation
  ): { items: InventoryItem[]; achievements: string[] } {
    const items: InventoryItem[] = [];
    const achievements: string[] = [];
    
    // 根據表現給予獎勵
    if (evaluations.ai && evaluations.ai.score >= 90) {
      items.push({
        id: `item_${Date.now()}`,
        name: 'Excellence Badge',
        type: 'badge',
        rarity: 'rare'
      });
    }
    
    // 檢查成就
    if (this.progress.completedTasks.length === 10) {
      achievements.push('first_milestone');
    }
    
    if (this.progress.totalXP >= 1000) {
      achievements.push('xp_collector');
    }
    
    return { items, achievements };
  }
  
  private async generateInitialTasks(): Promise<DiscoveryTask[]> {
    // 使用 AI 生成初始任務
    return this.generateTasks({
      count: 3,
      difficulty: 'beginner',
      context: this.context.worldSetting
    });
  }
  
  private async generateNextTasks(): Promise<DiscoveryTask[]> {
    // 根據用戶表現動態生成下一批任務
    const performance = this.analyzePerformance();
    
    return this.generateTasks({
      count: 3,
      difficulty: performance.suggestedDifficulty,
      context: this.context.worldSetting,
      previousTasks: this.progress.completedTasks
    });
  }
  
  private analyzePerformance(): PerformanceAnalysis {
    const recentTasks = this.progress.completedTasks.slice(-5);
    const avgXP = recentTasks.reduce((sum, t) => sum + t.xpEarned, 0) / recentTasks.length;
    
    let suggestedDifficulty: 'beginner' | 'intermediate' | 'advanced';
    if (avgXP < 80) {
      suggestedDifficulty = 'beginner';
    } else if (avgXP < 120) {
      suggestedDifficulty = 'intermediate';
    } else {
      suggestedDifficulty = 'advanced';
    }
    
    return {
      averageXP: avgXP,
      suggestedDifficulty,
      strengths: [],
      weaknesses: []
    };
  }
}

// Types
interface DiscoveryTask {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedXP: number;
  requiredItems?: string[];
}

interface CompletedTask {
  task: DiscoveryTask;
  response: TaskCompletionData;
  completedAt: Date;
  xpEarned: number;
  itemsEarned: InventoryItem[];
}

interface TaskCompletionData {
  solution: string;
  artifacts?: string[];
  timeSpent: number;
}

interface MultiEvaluation {
  self: EvaluationRecord | null;
  peers: EvaluationRecord[];
  mentor: EvaluationRecord | null;
  ai: EvaluationResult | null;
}

interface InventoryItem {
  id: string;
  name: string;
  type: 'badge' | 'tool' | 'resource';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
```

## 6. Session Manager 實作

### 6.1 統一的 Session 管理器
```typescript
// src/lib/sessions/session-manager.ts
import { IStorageProvider } from '@/lib/core/storage/interfaces';
import { IEvaluationService } from '@/lib/evaluation/interfaces';
import { SessionEntity } from '@/lib/core/domain/entities';
import { BaseSession } from './base/base-session';
import { AssessmentSession } from './assessment/assessment-session';
import { PBLSession } from './pbl/pbl-session';
import { DiscoverySession } from './discovery/discovery-session';
import { ChatSession } from './chat/chat-session';

export class SessionManager {
  private activeSessions: Map<string, BaseSession> = new Map();
  
  constructor(
    private storage: IStorageProvider,
    private evaluationService: IEvaluationService
  ) {}
  
  async createSession(params: CreateSessionParams): Promise<BaseSession> {
    // 創建 Session Entity
    const entity = new SessionEntity({
      userId: params.userId,
      projectId: params.projectId,
      type: params.type,
      metadata: params.metadata
    });
    
    // 保存 Entity
    await this.storage.set(`session:${entity.id}`, entity.toJSON());
    
    // 創建對應的 Session 實例
    const session = this.createSessionInstance(entity.id, params.type);
    
    // 初始化 Session
    await session.initialize();
    
    // 載入專案特定資料
    switch (params.type) {
      case 'assessment':
        await (session as AssessmentSession).loadQuestions(params.projectId);
        break;
      case 'pbl':
        const { scenarioId, programId } = params.metadata;
        await (session as PBLSession).loadScenario(scenarioId, programId);
        break;
      case 'discovery':
        const { workspaceId } = params.metadata;
        await (session as DiscoverySession).loadWorkspace(workspaceId);
        break;
    }
    
    // 快取 Session
    this.activeSessions.set(entity.id, session);
    
    return session;
  }
  
  async getSession(sessionId: string): Promise<BaseSession> {
    // 檢查快取
    const cached = this.activeSessions.get(sessionId);
    if (cached) {
      return cached;
    }
    
    // 從儲存載入
    const data = await this.storage.get<any>(`session:${sessionId}`);
    if (!data) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const entity = SessionEntity.fromJSON(data);
    const session = this.createSessionInstance(sessionId, entity.type);
    
    await session.initialize();
    
    // 快取
    this.activeSessions.set(sessionId, session);
    
    return session;
  }
  
  async listUserSessions(userId: string): Promise<SessionSummary[]> {
    const sessions = await this.storage.list<any>('session:');
    
    return sessions
      .filter(s => s.userId === userId)
      .map(s => ({
        id: s.id,
        type: s.type,
        status: s.status,
        projectId: s.projectId,
        startedAt: new Date(s.startedAt),
        lastActiveAt: new Date(s.lastActiveAt),
        progressPercentage: 0 // TODO: Calculate from progress
      }));
  }
  
  async cleanupInactiveSessions(): Promise<void> {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [sessionId, session] of this.activeSessions) {
      const entity = await this.storage.get<any>(`session:${sessionId}`);
      const lastActive = new Date(entity.lastActiveAt).getTime();
      
      if (lastActive < cutoffTime) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
  
  private createSessionInstance(sessionId: string, type: SessionType): BaseSession {
    switch (type) {
      case 'assessment':
        return new AssessmentSession(sessionId, this.storage, this.evaluationService);
      case 'pbl':
        return new PBLSession(sessionId, this.storage, this.evaluationService);
      case 'discovery':
        return new DiscoverySession(sessionId, this.storage, this.evaluationService);
      case 'chat':
        return new ChatSession(sessionId, this.storage, this.evaluationService);
      default:
        throw new Error(`Unknown session type: ${type}`);
    }
  }
}

// Types
interface CreateSessionParams {
  userId: string;
  projectId: string;
  type: SessionType;
  metadata?: any;
}

interface SessionSummary {
  id: string;
  type: SessionType;
  status: string;
  projectId: string;
  startedAt: Date;
  lastActiveAt: Date;
  progressPercentage: number;
}
```

## 7. Hook 整合

### 7.1 useSession Hook
```typescript
// src/hooks/useSession.ts
import { useState, useEffect, useCallback } from 'react';
import { SessionManager } from '@/lib/sessions/session-manager';
import { BaseSession } from '@/lib/sessions/base/base-session';

export function useSession(sessionId?: string) {
  const [session, setSession] = useState<BaseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const sessionManager = useSessionManager();
  
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    
    loadSession();
  }, [sessionId]);
  
  const loadSession = async () => {
    try {
      setLoading(true);
      const loadedSession = await sessionManager.getSession(sessionId!);
      setSession(loadedSession);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  
  const createSession = useCallback(async (params: CreateSessionParams) => {
    try {
      setLoading(true);
      const newSession = await sessionManager.createSession(params);
      setSession(newSession);
      return newSession;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionManager]);
  
  const startSession = useCallback(async () => {
    if (!session) return;
    
    try {
      await session.start();
      // Trigger re-render
      setSession({ ...session });
    } catch (err) {
      setError(err as Error);
    }
  }, [session]);
  
  const pauseSession = useCallback(async () => {
    if (!session) return;
    
    try {
      await session.pause();
      setSession({ ...session });
    } catch (err) {
      setError(err as Error);
    }
  }, [session]);
  
  const resumeSession = useCallback(async () => {
    if (!session) return;
    
    try {
      await session.resume();
      setSession({ ...session });
    } catch (err) {
      setError(err as Error);
    }
  }, [session]);
  
  const completeSession = useCallback(async () => {
    if (!session) return;
    
    try {
      const result = await session.complete();
      setSession({ ...session });
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [session]);
  
  return {
    session,
    loading,
    error,
    createSession,
    startSession,
    pauseSession,
    resumeSession,
    completeSession
  };
}
```

## 8. 測試範例

```typescript
// src/lib/sessions/__tests__/assessment-session.test.ts
import { AssessmentSession } from '../assessment/assessment-session';
import { MockStorageProvider } from '@/lib/core/storage/__mocks__';
import { MockEvaluationService } from '@/lib/evaluation/__mocks__';

describe('AssessmentSession', () => {
  let session: AssessmentSession;
  let mockStorage: MockStorageProvider;
  let mockEvaluation: MockEvaluationService;
  
  beforeEach(async () => {
    mockStorage = new MockStorageProvider();
    mockEvaluation = new MockEvaluationService();
    
    // Create session entity
    const entity = {
      id: 'test-session',
      userId: 'user123',
      projectId: 'assessment123',
      type: 'assessment',
      status: 'created',
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };
    
    await mockStorage.set('session:test-session', entity);
    
    session = new AssessmentSession('test-session', mockStorage, mockEvaluation);
    await session.initialize();
  });
  
  describe('question flow', () => {
    it('should load questions and start assessment', async () => {
      // Arrange
      const mockAssessment = {
        id: 'assessment123',
        questions: [
          {
            id: 'q1',
            text: 'What is AI?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'B'
          },
          {
            id: 'q2',
            text: 'What is ML?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'C'
          }
        ]
      };
      
      jest.spyOn(session as any, 'loadAssessment')
        .mockResolvedValue(mockAssessment);
      
      // Act
      await session.loadQuestions('assessment123');
      await session.start();
      
      // Assert
      const currentQuestion = session.getCurrentQuestion();
      expect(currentQuestion).toEqual(mockAssessment.questions[0]);
      expect(session.getProgressPercentage()).toBe(0);
    });
    
    it('should submit answer and move to next question', async () => {
      // Arrange
      await setupQuestionsAndStart(session);
      
      // Act
      const result = await session.submitAnswer('B');
      
      // Assert
      expect(result.isCorrect).toBe(true);
      expect(result.nextQuestion?.id).toBe('q2');
      expect(session.getProgressPercentage()).toBe(50);
    });
    
    it('should complete assessment after all questions', async () => {
      // Arrange
      await setupQuestionsAndStart(session);
      mockEvaluation.evaluate.mockResolvedValue({
        score: 100,
        feedback: 'Perfect!',
        strengths: ['AI knowledge'],
        improvements: [],
        competencies: []
      });
      
      // Act
      await session.submitAnswer('B'); // Question 1
      await session.submitAnswer('C'); // Question 2
      const result = await session.complete();
      
      // Assert
      expect(result.finalScore).toBe(100);
      expect(result.completedAt).toBeDefined();
      expect(mockStorage.get('session:test-session')).resolves.toMatchObject({
        status: 'completed'
      });
    });
  });
});
```

## 9. 遷移策略

### 9.1 現有程式碼遷移
```typescript
// Before: Direct localStorage access
function saveAssessmentProgress(answers: any[]) {
  localStorage.setItem('assessment_progress', JSON.stringify(answers));
}

// After: Using Session
async function saveProgress() {
  const session = await sessionManager.getSession(sessionId) as AssessmentSession;
  await session.submitAnswer(currentAnswer);
}
```

### 9.2 向後相容 Adapter
```typescript
// src/lib/sessions/adapters/legacy-adapter.ts
export class LegacyAssessmentAdapter {
  constructor(private sessionManager: SessionManager) {}
  
  async saveAssessmentProgress(userId: string, answers: any[]) {
    // Find or create session
    let session = await this.findActiveAssessmentSession(userId);
    
    if (!session) {
      session = await this.sessionManager.createSession({
        userId,
        projectId: 'legacy-assessment',
        type: 'assessment'
      });
    }
    
    // Convert legacy format to new format
    for (const answer of answers) {
      await (session as AssessmentSession).submitAnswer(answer.value);
    }
  }
  
  async getAssessmentProgress(userId: string) {
    const session = await this.findActiveAssessmentSession(userId);
    if (!session) return null;
    
    const progress = session.getProgress();
    
    // Convert to legacy format
    return {
      answers: progress.answers,
      currentQuestion: progress.currentQuestionIndex,
      score: null // Not calculated until completion
    };
  }
}
```

## 10. 下一步

完成 Session 統一後：
1. 實作統一的評估系統
2. 建立 Session UI 元件
3. 遷移現有功能使用新 Session
4. 實作 Session 持久化到資料庫

這個實作提供了完整的 Session-based 架構，統一了所有學習活動的管理方式。