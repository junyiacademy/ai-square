/**
 * Track 領域模型定義
 * 統一的活動軌跡管理
 */

import { IEntity, ISoftDeletableEntity } from '../../repository/interfaces';

/**
 * Track 類型
 */
export enum TrackType {
  PBL = 'pbl',
  ASSESSMENT = 'assessment',
  DISCOVERY = 'discovery',
  CHAT = 'chat'
}

/**
 * Track 狀態
 */
export enum TrackStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

/**
 * 基礎 Track 介面
 */
export interface ITrack extends IEntity {
  userId: string;
  projectId: string;
  type: TrackType;
  status: TrackStatus;
  startedAt: Date;
  completedAt?: Date;
  metadata: TrackMetadata;
  context: TrackContext;
  summary?: TrackSummary;           // 軌跡總結
}

/**
 * 可軟刪除的 Track
 */
export interface ISoftDeletableTrack extends ITrack, ISoftDeletableEntity {}

/**
 * Track Metadata
 * 儲存 Track 的基本資訊
 */
export interface TrackMetadata {
  title?: string;
  description?: string;
  language: string;
  tags?: string[];
  version: string;
  clientInfo?: ClientInfo;
}

/**
 * Client 資訊
 */
export interface ClientInfo {
  userAgent: string;
  ip?: string;
  device?: string;
  browser?: string;
  os?: string;
}

/**
 * Track Context
 * 根據不同類型有不同的上下文資料
 */
export type TrackContext = 
  | PBLTrackContext 
  | AssessmentTrackContext 
  | DiscoveryTrackContext 
  | ChatTrackContext;

/**
 * PBL Track Context
 */
export interface PBLTrackContext {
  type: 'pbl';
  scenarioId: string;
  programId: string;
  currentTaskId?: string;
  completedTaskIds: string[];
  taskProgress: Record<string, TaskProgress>;
}

/**
 * Task 進度
 */
export interface TaskProgress {
  taskId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  score?: number;
}

/**
 * Assessment Track Context
 */
export interface AssessmentTrackContext {
  type: 'assessment';
  assessmentId: string;
  currentQuestionIndex: number;
  answers: AssessmentAnswer[];
  timeSpent: number; // seconds
  settings: AssessmentSettings;
}

/**
 * Assessment 答案
 */
export interface AssessmentAnswer {
  questionId: string;
  answer: string | string[];
  confidence?: number;
  timeSpent: number;
  timestamp: Date;
}

/**
 * Assessment 設定
 */
export interface AssessmentSettings {
  randomizeQuestions: boolean;
  showFeedback: boolean;
  allowSkip: boolean;
  timeLimit?: number; // seconds
}

/**
 * Discovery Track Context
 */
export interface DiscoveryTrackContext {
  type: 'discovery';
  workspaceId: string;
  currentPathId?: string;
  completedPaths: string[];
  generatedTasks: DiscoveryTask[];
  explorationHistory: ExplorationStep[];
}

/**
 * Discovery 任務
 */
export interface DiscoveryTask {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // minutes
  generatedAt: Date;
  completedAt?: Date;
  feedback?: string;
}

/**
 * 探索步驟
 */
export interface ExplorationStep {
  timestamp: Date;
  action: string;
  data: any;
  result?: any;
}

/**
 * Chat Track Context
 */
export interface ChatTrackContext {
  type: 'chat';
  conversationId: string;
  messages: ChatMessage[];
  model: string;
  systemPrompt?: string;
  temperature?: number;
}

/**
 * Chat 訊息
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Track 建立參數
 */
export interface CreateTrackParams {
  userId: string;
  projectId: string;
  type: TrackType;
  metadata?: Partial<TrackMetadata>;
  context: Partial<TrackContext>;
}

/**
 * Track 更新參數
 */
export interface UpdateTrackParams {
  status?: TrackStatus;
  metadata?: Partial<TrackMetadata>;
  context?: Partial<TrackContext>;
}

/**
 * Track 查詢選項
 */
export interface TrackQueryOptions {
  userId?: string;
  projectId?: string;
  type?: TrackType;
  status?: TrackStatus;
  startDate?: Date;
  endDate?: Date;
  includeDeleted?: boolean;
}

/**
 * Track 總結
 */
export interface TrackSummary {
  totalTimeSpent: number;           // 總花費時間（秒）
  totalPrograms: number;            // 總程序數
  completedPrograms: number;        // 已完成程序數
  averagePerformance: number;       // 平均表現分數
  achievements: string[];           // 達成的成就
  insights: string[];               // 獲得的洞察
  skillsLearned: string[];         // 學到的技能
  areasImproved: string[];         // 改進的領域
  recommendations: string[];        // 建議
  createdAt?: Date;                // 總結建立時間
  updatedAt?: Date;                // 總結更新時間
}