/**
 * Type definitions for the GCS v2 Index System
 */

// ===== Relationship Indexes =====

/**
 * Scenario to Programs mapping
 * Stored in scenario file as programIds[]
 */
export interface ScenarioPrograms {
  scenarioId: string;
  programIds: string[];
  programCount: number;
  lastProgramCreated?: string;
}

/**
 * Program to Tasks/Evaluations mapping
 * Stored in program file
 */
export interface ProgramRelations {
  programId: string;
  scenarioId: string; // Parent
  taskIds: string[];  // Children
  evaluationIds: string[]; // Children
  currentTaskIndex: number;
}

/**
 * Task to Evaluations mapping
 * Stored in task file
 */
export interface TaskRelations {
  taskId: string;
  programId: string; // Parent
  evaluationIds: string[]; // Children
}

// ===== Cross-cutting Indexes =====

/**
 * User activity index
 * Separate index file per user
 */
export interface UserActivityIndex {
  userId: string;
  email: string;
  programs: UserProgramSummary[];
  scenarios: UserScenarioProgress[];
  lastActivity: string;
  stats: {
    totalPrograms: number;
    completedPrograms: number;
    totalTasks: number;
    completedTasks: number;
    averageScore?: number;
  };
}

export interface UserProgramSummary {
  programId: string;
  scenarioId: string;
  scenarioTitle: string;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string;
  score?: number;
  taskProgress: {
    total: number;
    completed: number;
  };
}

export interface UserScenarioProgress {
  scenarioId: string;
  scenarioTitle: string;
  programCount: number;
  bestScore?: number;
  lastAttempt: string;
  totalTimeSpent: number; // seconds
}

// ===== Statistics Indexes =====

/**
 * Scenario-level statistics
 * Aggregated from all programs
 */
export interface ScenarioStatistics {
  scenarioId: string;
  stats: {
    totalPrograms: number;
    activePrograms: number;
    completedPrograms: number;
    abandonedPrograms: number;
    averageScore?: number;
    averageCompletionTime?: number; // seconds
    successRate?: number; // percentage
  };
  distribution: {
    scoreRanges: {
      '0-25': number;
      '26-50': number;
      '51-75': number;
      '76-100': number;
    };
    completionTimes: {
      'under5min': number;
      '5-15min': number;
      '15-30min': number;
      'over30min': number;
    };
  };
  lastUpdated: string;
}

/**
 * System-wide daily statistics
 */
export interface DailyStatistics {
  date: string; // YYYY-MM-DD
  metrics: {
    newUsers: number;
    activeUsers: number;
    programsStarted: number;
    programsCompleted: number;
    tasksCompleted: number;
    evaluationsCreated: number;
    averageSessionDuration: number; // seconds
  };
  peakHours: Array<{
    hour: number; // 0-23
    activeUsers: number;
  }>;
}

// ===== Query Result Types =====

export interface HierarchyQueryResult {
  scenario: {
    id: string;
    title: string;
    programs: Array<{
      id: string;
      status: string;
      tasks: Array<{
        id: string;
        status: string;
        evaluations: string[];
      }>;
    }>;
  };
}

export interface UserLearningPath {
  userId: string;
  email: string;
  learningJourney: Array<{
    date: string;
    activities: Array<{
      type: 'program_start' | 'task_complete' | 'evaluation' | 'program_complete';
      timestamp: string;
      entityId: string;
      score?: number;
      duration?: number;
    }>;
  }>;
}

// ===== Index Update Operations =====

export interface IndexUpdateOperation {
  type: 'increment' | 'decrement' | 'set' | 'append' | 'remove';
  indexType: 'user' | 'scenario' | 'daily';
  indexId: string;
  field: string;
  value: any;
  timestamp: string;
}

export interface IndexTransaction {
  id: string;
  operations: IndexUpdateOperation[];
  status: 'pending' | 'committed' | 'failed';
  createdAt: string;
  committedAt?: string;
  error?: string;
}