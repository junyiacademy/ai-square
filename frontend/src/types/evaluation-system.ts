/**
 * 評估系統類型定義
 * 包含自評、他評、mentor回饋的完整類型系統
 */

// 基礎評估項目
export interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  weight: number; // 權重 (0-1)
}

// 評分等級
export type ScoreLevel = 1 | 2 | 3 | 4 | 5;

export interface ScoreLevelInfo {
  level: ScoreLevel;
  label: string;
  description: string;
  color: string;
}

// 單項評分
export interface CriteriaScore {
  criteriaId: string;
  score: ScoreLevel;
  comment?: string;
  evidence?: string; // 證據或範例
}

// 自評表單
export interface SelfAssessment {
  id: string;
  taskId: string;
  workspaceId: string;
  userId: string;
  submittedAt: string;
  scores: CriteriaScore[];
  overallReflection: string; // 整體反思
  learningGoals?: string; // 學習目標設定
  challenges?: string; // 遇到的挑戰
  improvements?: string; // 改進計畫
  status: 'draft' | 'submitted';
}

// 同儕評估
export interface PeerReview {
  id: string;
  taskId: string;
  workspaceId: string;
  reviewerId: string; // 評審者
  revieweeId: string; // 被評審者
  submittedAt: string;
  scores: CriteriaScore[];
  constructiveFeedback: string; // 建設性回饋
  strengths: string[]; // 優點
  suggestions: string[]; // 改進建議
  anonymousMode: boolean; // 是否匿名
  status: 'pending' | 'submitted' | 'acknowledged';
}

// Mentor回饋
export interface MentorFeedback {
  id: string;
  taskId: string;
  workspaceId: string;
  mentorId: string;
  studentId: string;
  submittedAt: string;
  scores: CriteriaScore[];
  detailedFeedback: string; // 詳細回饋
  strengths: string[]; // 優點
  areasForImprovement: string[]; // 改進領域
  nextSteps: string[]; // 後續步驟建議
  resourceRecommendations?: string[]; // 推薦資源
  followUpDate?: string; // 後續追蹤日期
  visibility: 'student_only' | 'peers_and_student' | 'public';
  status: 'draft' | 'submitted' | 'acknowledged';
}

// 評估摘要
export interface EvaluationSummary {
  taskId: string;
  workspaceId: string;
  selfAssessment?: SelfAssessment;
  peerReviews: PeerReview[];
  mentorFeedback?: MentorFeedback;
  aiEvaluation?: {
    score: number;
    feedback: string;
    generatedAt: string;
  };
  aggregatedScores: {
    [criteriaId: string]: {
      self?: number;
      peers: number[];
      mentor?: number;
      ai?: number;
      average: number;
    };
  };
  overallScore: number;
  lastUpdated: string;
}

// 評估配置
export interface EvaluationConfig {
  taskId: string;
  criteria: EvaluationCriteria[];
  enableSelfAssessment: boolean;
  enablePeerReview: boolean;
  enableMentorFeedback: boolean;
  enableAIEvaluation: boolean;
  peerReviewCount: number; // 需要多少位同儕評審
  anonymousPeerReview: boolean;
  deadlines: {
    selfAssessment?: string;
    peerReview?: string;
    mentorFeedback?: string;
  };
}

// 使用者角色
export type UserRole = 'student' | 'peer' | 'mentor' | 'instructor' | 'admin';

// 評估權限
export interface EvaluationPermissions {
  canViewSelfAssessment: boolean;
  canViewPeerReviews: boolean;
  canViewMentorFeedback: boolean;
  canViewAIEvaluation: boolean;
  canSubmitSelfAssessment: boolean;
  canSubmitPeerReview: boolean;
  canSubmitMentorFeedback: boolean;
  canEditSubmitted: boolean;
  canViewAggregatedResults: boolean;
}

// 評估通知
export interface EvaluationNotification {
  id: string;
  type: 'self_assessment_due' | 'peer_review_assigned' | 'feedback_received' | 'deadline_reminder';
  userId: string;
  taskId: string;
  workspaceId: string;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  dueDate?: string;
}

// 預設評估標準
export const DEFAULT_EVALUATION_CRITERIA: EvaluationCriteria[] = [
  {
    id: 'knowledge_application',
    name: '知識應用',
    description: '能否正確應用相關概念和知識',
    weight: 0.25
  },
  {
    id: 'problem_solving',
    name: '問題解決',
    description: '解決問題的方法和策略是否有效',
    weight: 0.25
  },
  {
    id: 'critical_thinking',
    name: '批判性思維',
    description: '分析和評估資訊的能力',
    weight: 0.2
  },
  {
    id: 'communication',
    name: '溝通表達',
    description: '想法表達的清晰度和有效性',
    weight: 0.15
  },
  {
    id: 'collaboration',
    name: '協作能力',
    description: '團隊合作和互動的品質',
    weight: 0.15
  }
];

// 評分等級定義
export const SCORE_LEVELS: ScoreLevelInfo[] = [
  {
    level: 1,
    label: '需要改進',
    description: '明顯低於期望標準',
    color: 'text-red-600 bg-red-100'
  },
  {
    level: 2,
    label: '接近標準',
    description: '部分達到期望標準',
    color: 'text-orange-600 bg-orange-100'
  },
  {
    level: 3,
    label: '符合標準',
    description: '達到期望標準',
    color: 'text-yellow-600 bg-yellow-100'
  },
  {
    level: 4,
    label: '超越標準',
    description: '超過期望標準',
    color: 'text-green-600 bg-green-100'
  },
  {
    level: 5,
    label: '卓越表現',
    description: '遠超期望標準',
    color: 'text-blue-600 bg-blue-100'
  }
];