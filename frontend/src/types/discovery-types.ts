/**
 * Discovery Module Types
 * 職涯探索模組專屬型別定義
 */

import { IScenario, IProgram, ITask, IEvaluation } from "./unified-learning";

/**
 * Discovery Scenario 擴展介面
 */
export interface IDiscoveryScenario extends IScenario {
  mode: "discovery";
  discoveryData: {
    careerPath: string;
    requiredSkills: string[];
    industryInsights: Record<string, unknown>;
    careerLevel: "entry" | "intermediate" | "senior" | "expert";
    estimatedSalaryRange?: {
      min: number;
      max: number;
      currency: string;
    };
    relatedCareers: string[];
    dayInLife?: Record<string, string>; // 多語言支援
    challenges?: Record<string, string[]>; // 多語言支援
    rewards?: Record<string, string[]>; // 多語言支援
  };
}

/**
 * Discovery Program 擴展介面
 */
export interface IDiscoveryProgram extends IProgram {
  mode: "discovery";
  discoveryData: {
    explorationPath: string[];
    milestones: IDiscoveryMilestone[];
    personalityMatch?: number; // 0-100 匹配度
    skillGapAnalysis?: ISkillGap[];
    careerReadiness?: number; // 0-100 準備度
  };
}

/**
 * Discovery Task 擴展介面
 */
export interface IDiscoveryTask extends ITask {
  mode: "discovery";
  discoveryData: {
    taskCategory: "exploration" | "skill_assessment" | "project" | "reflection";
    realWorldContext: string;
    industryRelevance: string[];
    toolsUsed?: string[];
    collaborationType?: "individual" | "team" | "mentor-guided";
  };
}

/**
 * Discovery Evaluation 擴展介面
 */
export interface IDiscoveryEvaluation extends IEvaluation {
  mode: "discovery";
  discoveryData: {
    careerFit: number; // 0-100
    skillsAcquired: string[];
    portfolioItems?: IPortfolioItem[];
    mentorFeedback?: string;
    peerReview?: IPeerReview[];
    industryReadiness: {
      technical: number;
      soft_skills: number;
      domain_knowledge: number;
    };
  };
}

/**
 * Discovery 里程碑
 */
export interface IDiscoveryMilestone {
  id: string;
  name: string;
  description: string;
  achievedAt?: string;
  criteria: {
    tasksCompleted?: number;
    minimumScore?: number;
    specificSkills?: string[];
  };
  rewards: {
    xp: number;
    badges?: string[];
    unlocks?: string[];
  };
}

/**
 * 技能差距分析
 */
export interface ISkillGap {
  skill: string;
  currentLevel: number; // 0-100
  requiredLevel: number; // 0-100
  importance: "critical" | "important" | "nice-to-have";
  suggestedResources: string[];
}

/**
 * 作品集項目
 */
export interface IPortfolioItem {
  id: string;
  title: string;
  description: string;
  taskId: string;
  createdAt: string;
  artifacts: {
    type: "code" | "design" | "document" | "presentation";
    url: string;
    thumbnail?: string;
  }[];
  skills: string[];
  feedback?: string;
}

/**
 * 同儕評價
 */
export interface IPeerReview {
  reviewerId: string;
  rating: number; // 1-5
  comments: string;
  helpful: boolean;
  createdAt: string;
}

/**
 * Discovery 推薦系統
 */
export interface ICareerRecommendation {
  careerPath: string;
  matchScore: number; // 0-100
  reasons: string[];
  requiredSkills: {
    skill: string;
    userLevel: number;
    requiredLevel: number;
  }[];
  estimatedTimeToReady: number; // in weeks
  suggestedScenarios: string[];
}

/**
 * Discovery Repository 介面
 */
export interface IDiscoveryRepository {
  // Career paths
  findCareerPaths(): Promise<IDiscoveryScenario[]>;
  findCareerPathById(id: string): Promise<IDiscoveryScenario | null>;
  findCareerPathBySlug(slug: string): Promise<IDiscoveryScenario | null>;

  // Recommendations
  getCareerRecommendations(userId: string): Promise<ICareerRecommendation[]>;

  // Progress tracking
  getUserDiscoveryProgress(userId: string): Promise<{
    exploredCareers: string[];
    completedMilestones: IDiscoveryMilestone[];
    portfolioItems: IPortfolioItem[];
    overallProgress: number;
  }>;

  // Portfolio management
  addPortfolioItem(
    userId: string,
    item: Omit<IPortfolioItem, "id" | "createdAt">,
  ): Promise<IPortfolioItem>;
  updatePortfolioItem(
    userId: string,
    itemId: string,
    updates: Partial<IPortfolioItem>,
  ): Promise<IPortfolioItem>;
  deletePortfolioItem(userId: string, itemId: string): Promise<void>;
  getPortfolioItems(userId: string): Promise<IPortfolioItem[]>;
}
