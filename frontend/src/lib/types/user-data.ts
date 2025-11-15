/**
 * User Data Type Definitions
 *
 * Central location for all user data related types
 */

// Assessment related types
export interface AssessmentResults {
  tech: number;
  creative: number;
  business: number;
}

export interface AssessmentSession {
  id: string;
  createdAt: string;
  results: AssessmentResults;
  answers?: Record<string, string[]>;
  generatedPaths?: string[]; // IDs of paths generated from this assessment
}

// Achievement system types
export interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  unlockedAt: string;
  category: 'exploration' | 'learning' | 'mastery' | 'community' | 'special';
  xpReward: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  requiredCount: number;
  currentCount: number;
  unlockedAt?: string;
  category: string;
}

export interface UserAchievements {
  badges: Badge[];
  totalXp: number;
  level: number;
  completedTasks: string[];
  achievements?: Achievement[];
}

// Main user data interface
export interface UserData {
  // Core data
  assessmentResults?: AssessmentResults | null;
  achievements: UserAchievements;
  assessmentSessions: AssessmentSession[];

  // UI state
  currentView?: string;

  // Metadata
  lastUpdated: string;
  version: string; // For future migration compatibility
}

// Service operation types
export interface UserDataOperations {
  // Core operations
  loadUserData: () => Promise<UserData | null>;
  saveUserData: (data: UserData) => Promise<void>;
  userDataExists: () => Promise<boolean>;

  // Specific operations
  saveAssessmentResults: (results: AssessmentResults) => Promise<void>;
  saveAchievements: (achievements: UserAchievements) => Promise<void>;
  addAssessmentSession: (session: AssessmentSession) => Promise<void>;
  updateAchievements: (updates: Partial<UserAchievements>) => Promise<void>;

  // Utility operations
  clearAllData: () => Promise<void>;
  exportData: () => Promise<UserData | null>;
  importData: (data: UserData) => Promise<void>;
  migrateFromLocalStorage?: () => Promise<boolean>;
}

// Evaluation system types (separate from user data)
export interface EvaluationData {
  id: string;
  type: string;
  userId: string;
  userEmail?: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface EvaluationOperations {
  saveEvaluation: (type: string, id: string, data: Record<string, unknown>) => Promise<void>;
  loadEvaluation: (type: string, id: string) => Promise<Record<string, unknown> | null>;
  loadEvaluationsByType: (type: string) => Promise<Record<string, unknown>[]>;
  deleteEvaluation: (type: string, id: string) => Promise<void>;
}
