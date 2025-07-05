/**
 * Evaluation 領域模型定義
 * 統一的評估系統
 */

import { IEntity, ISoftDeletableEntity } from '../../repository/interfaces';

/**
 * Evaluation 類型
 */
export enum EvaluationType {
  TASK = 'task',           // PBL 任務評估
  ASSESSMENT = 'assessment', // 測驗評估
  DISCOVERY = 'discovery',   // 探索評估
  CHAT = 'chat',            // 對話評估
  MANUAL = 'manual'         // 手動評估
}

/**
 * Evaluation 狀態
 */
export enum EvaluationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 基礎 Evaluation 介面
 */
export interface IEvaluation extends IEntity {
  trackId: string;
  userId: string;
  type: EvaluationType;
  status: EvaluationStatus;
  score: number;
  maxScore: number;
  percentage: number;
  startedAt: Date;
  completedAt?: Date;
  evaluationData: EvaluationData;
  feedback: EvaluationFeedback;
  metadata: EvaluationMetadata;
}

/**
 * 可軟刪除的 Evaluation
 */
export interface ISoftDeletableEvaluation extends IEvaluation, ISoftDeletableEntity {}

/**
 * Evaluation Data
 * 根據不同類型有不同的評估資料
 */
export type EvaluationData = 
  | TaskEvaluationData 
  | AssessmentEvaluationData 
  | DiscoveryEvaluationData 
  | ChatEvaluationData
  | ManualEvaluationData;

/**
 * Task Evaluation Data (PBL)
 */
export interface TaskEvaluationData {
  type: 'task';
  taskId: string;
  scenarioId: string;
  programId: string;
  userResponse: string;
  modelResponse?: string;
  rubrics: TaskRubric[];
  timeSpent: number;
  attempts: number;
}

/**
 * Task 評分標準
 */
export interface TaskRubric {
  criterionId: string;
  name: string;
  description: string;
  weight: number;
  score: number;
  maxScore: number;
  feedback?: string;
}

/**
 * Assessment Evaluation Data
 */
export interface AssessmentEvaluationData {
  type: 'assessment';
  assessmentId: string;
  questions: QuestionEvaluation[];
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completionRate: number;
}

/**
 * 問題評估
 */
export interface QuestionEvaluation {
  questionId: string;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  isCorrect: boolean;
  score: number;
  maxScore: number;
  feedback?: string;
  timeSpent: number;
}

/**
 * Discovery Evaluation Data
 */
export interface DiscoveryEvaluationData {
  type: 'discovery';
  workspaceId: string;
  pathId?: string;
  tasksCompleted: number;
  totalTasks: number;
  explorationDepth: number;
  creativityScore: number;
  learningObjectivesMet: string[];
  insights: DiscoveryInsight[];
}

/**
 * Discovery 洞察
 */
export interface DiscoveryInsight {
  type: 'strength' | 'improvement' | 'suggestion';
  category: string;
  description: string;
  evidence?: string[];
}

/**
 * Chat Evaluation Data
 */
export interface ChatEvaluationData {
  type: 'chat';
  conversationId: string;
  messageCount: number;
  qualityMetrics: ChatQualityMetrics;
  topicsCovered: string[];
  learningOutcomes: string[];
}

/**
 * Chat 品質指標
 */
export interface ChatQualityMetrics {
  relevance: number;      // 0-100
  coherence: number;      // 0-100
  depth: number;         // 0-100
  engagement: number;    // 0-100
  understanding: number; // 0-100
}

/**
 * Manual Evaluation Data
 */
export interface ManualEvaluationData {
  type: 'manual';
  evaluatorId: string;
  criteria: ManualCriterion[];
  comments: string;
}

/**
 * 手動評估標準
 */
export interface ManualCriterion {
  name: string;
  score: number;
  maxScore: number;
  comments?: string;
}

/**
 * Evaluation Feedback
 * AI 生成的質性回饋
 */
export interface EvaluationFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  detailedFeedback?: DetailedFeedback;
}

/**
 * 詳細回饋
 */
export interface DetailedFeedback {
  content: string;
  examples?: FeedbackExample[];
  resources?: LearningResource[];
  nextSteps?: string[];
}

/**
 * 回饋範例
 */
export interface FeedbackExample {
  title: string;
  description: string;
  code?: string;
  explanation?: string;
}

/**
 * 學習資源
 */
export interface LearningResource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'tutorial' | 'documentation';
  description?: string;
}

/**
 * Evaluation Metadata
 */
export interface EvaluationMetadata {
  evaluationEngine: string;
  engineVersion: string;
  model?: string;
  temperature?: number;
  language: string;
  tags?: string[];
  customData?: Record<string, any>;
}

/**
 * Evaluation 建立參數
 */
export interface CreateEvaluationParams {
  trackId: string;
  userId: string;
  type: EvaluationType;
  evaluationData: Partial<EvaluationData>;
  metadata?: Partial<EvaluationMetadata>;
}

/**
 * Evaluation 更新參數
 */
export interface UpdateEvaluationParams {
  status?: EvaluationStatus;
  score?: number;
  feedback?: Partial<EvaluationFeedback>;
  evaluationData?: Partial<EvaluationData>;
  completedAt?: Date;
}

/**
 * Evaluation 查詢選項
 */
export interface EvaluationQueryOptions {
  trackId?: string;
  userId?: string;
  type?: EvaluationType;
  status?: EvaluationStatus;
  minScore?: number;
  maxScore?: number;
  startDate?: Date;
  endDate?: Date;
  includeDeleted?: boolean;
}

/**
 * Evaluation 統計
 */
export interface EvaluationStatistics {
  totalEvaluations: number;
  averageScore: number;
  medianScore: number;
  minScore: number;
  maxScore: number;
  standardDeviation: number;
  completionRate: number;
  averageTimeSpent: number;
  scoreDistribution: ScoreRange[];
}

/**
 * 分數範圍
 */
export interface ScoreRange {
  min: number;
  max: number;
  count: number;
  percentage: number;
}